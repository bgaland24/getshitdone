"""
Tests du ScoreService et des routes de scores.
Couvre : score à 0 sans données, calcul des 3 sous-scores,
         et les endpoints GET /api/scores/today|weekly|history.

Deux niveaux de test :
- TestScore* : tests directs sur ScoreService (fixtures locales en mémoire)
- TestScoresRoutes : tests HTTP via client Flask (conftest)
"""

import pytest
import bcrypt
from datetime import date, timedelta, datetime, timezone

from app import create_app
from app.database import db as _db
from app.models.user import User
from app.models.task import Task
from app.models.category import Category
from app.models.work_session import WorkSession
from app.services.score_service import ScoreService


# ─── Fixtures locales (ScoreService direct) ───────────────────────────────────

@pytest.fixture(scope="module")
def score_app():
    """Application Flask en mémoire pour les tests ScoreService."""
    import os
    original = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    flask_app = create_app("development")
    flask_app.config["TESTING"] = True
    flask_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.drop_all()
    if original is not None:
        os.environ["DATABASE_URL"] = original
    else:
        os.environ.pop("DATABASE_URL", None)


@pytest.fixture(autouse=True)
def clean_score(score_app):
    """Vide les tables entre chaque test."""
    with score_app.app_context():
        yield
        _db.session.rollback()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


@pytest.fixture
def ctx(score_app):
    with score_app.app_context():
        yield score_app


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _make_user(email="score_user@test.com") -> User:
    user = User(
        email=email,
        password_hash=bcrypt.hashpw(b"pass", bcrypt.gensalt()).decode(),
    )
    _db.session.add(user)
    _db.session.flush()
    return user


def _make_category(user_id: str, name="Travail", target: int = 0) -> Category:
    cat = Category(name=name, color="#E86B3E", user_id=user_id, weekly_target_minutes=target)
    _db.session.add(cat)
    _db.session.flush()
    return cat


def _make_pinned_task(user_id: str, pin_date: date, status="prioritized", category_id=None) -> Task:
    """Crée une tâche épinglée sur une date donnée."""
    task = Task(
        user_id=user_id,
        title="Tâche score",
        category_id=category_id,
        status=status,
        is_qualified=True,
        urgency="urgent",
        importance="important",
        horizon=(date.today() + timedelta(days=7)).isoformat(),
        priority_firstset_date=pin_date,
        priority_current_date=pin_date if status != "done" else None,
    )
    _db.session.add(task)
    _db.session.flush()
    return task


def _make_closed_session(task: Task, efficient: bool) -> WorkSession:
    """Crée une session de travail clôturée dans la semaine en cours."""
    now = datetime.now(timezone.utc)
    session = WorkSession(
        task_id=task.id,
        started_at=now - timedelta(minutes=61),
        stopped_at=now - timedelta(minutes=1),
        duration_minutes=60,
        efficient=efficient,
    )
    _db.session.add(session)
    _db.session.flush()
    return session


def _make_session_with_duration(task: Task, duration_minutes: int) -> WorkSession:
    """Crée une session clôturée avec durée précise (pour les allocations)."""
    now = datetime.now(timezone.utc)
    session = WorkSession(
        task_id=task.id,
        started_at=now - timedelta(minutes=duration_minutes + 1),
        stopped_at=now - timedelta(minutes=1),
        duration_minutes=duration_minutes,
        efficient=None,
    )
    _db.session.add(session)
    _db.session.flush()
    return session


def register_and_login_http(client, email="score_http@test.com"):
    """Inscrit un utilisateur via HTTP et retourne son token."""
    resp = client.post("/api/auth/register", json={"email": email, "password": "password123"})
    assert resp.status_code == 201
    return resp.get_json()["data"]["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ─── Score à zéro sans données ────────────────────────────────────────────────

class TestScoreVide:
    """Sans données, tous les sous-scores sont à 0."""

    def test_score_global_zero_sans_donnees(self, ctx):
        with ctx.app_context():
            user = _make_user()
            scores = ScoreService().compute_today_scores(user.id)
            assert scores["global"] == 0
            assert scores["priorities"] == 0
            assert scores["allocations"] == 0
            assert scores["closure"] == 0

    def test_historique_retourne_n_semaines(self, ctx):
        with ctx.app_context():
            user = _make_user()
            history = ScoreService().compute_history(user.id, weeks=3)
            assert len(history) == 3
            for entry in history:
                assert "week_start" in entry
                assert "global" in entry
                assert entry["global"] == 0


# ─── Sous-score priorités ─────────────────────────────────────────────────────

class TestScorePriorites:
    """Calcul du sous-score priorités : done / épinglées dans les 7 derniers jours."""

    def test_toutes_done_score_100(self, ctx):
        with ctx.app_context():
            user = _make_user()
            today = date.today()
            _make_pinned_task(user.id, today, status="done")
            _make_pinned_task(user.id, today, status="done")
            _db.session.commit()

            scores = ScoreService().compute_today_scores(user.id)
            assert scores["priorities"] == 100

    def test_aucune_done_score_zero(self, ctx):
        with ctx.app_context():
            user = _make_user()
            today = date.today()
            _make_pinned_task(user.id, today, status="prioritized")
            _make_pinned_task(user.id, today, status="prioritized")
            _db.session.commit()

            scores = ScoreService().compute_today_scores(user.id)
            assert scores["priorities"] == 0

    def test_moitie_done_score_50(self, ctx):
        with ctx.app_context():
            user = _make_user()
            today = date.today()
            _make_pinned_task(user.id, today, status="done")
            _make_pinned_task(user.id, today, status="prioritized")
            _db.session.commit()

            scores = ScoreService().compute_today_scores(user.id)
            assert scores["priorities"] == 50


# ─── Sous-score allocations ───────────────────────────────────────────────────

class TestScoreAllocations:
    """Calcul du sous-score allocations : temps réel / cible par catégorie."""

    def test_categorie_sans_cible_ignoree(self, ctx):
        with ctx.app_context():
            user = _make_user()
            _make_category(user.id, target=0)
            _db.session.commit()

            scores = ScoreService().compute_today_scores(user.id)
            assert scores["allocations"] == 0

    def test_cible_atteinte_score_100(self, ctx):
        with ctx.app_context():
            user = _make_user()
            cat = _make_category(user.id, target=60)
            task = Task(
                user_id=user.id, title="T", category_id=cat.id,
                status="new", is_qualified=False,
            )
            _db.session.add(task)
            _db.session.flush()
            _make_session_with_duration(task, 60)
            _db.session.commit()

            scores = ScoreService().compute_today_scores(user.id)
            assert scores["allocations"] == 100

    def test_moitie_cible_score_50(self, ctx):
        with ctx.app_context():
            user = _make_user()
            cat = _make_category(user.id, target=60)
            task = Task(
                user_id=user.id, title="T", category_id=cat.id,
                status="new", is_qualified=False,
            )
            _db.session.add(task)
            _db.session.flush()
            _make_session_with_duration(task, 30)
            _db.session.commit()

            scores = ScoreService().compute_today_scores(user.id)
            assert scores["allocations"] == 50

    def test_depassement_cible_plafonne_a_100(self, ctx):
        with ctx.app_context():
            user = _make_user()
            cat = _make_category(user.id, target=30)
            task = Task(
                user_id=user.id, title="T", category_id=cat.id,
                status="new", is_qualified=False,
            )
            _db.session.add(task)
            _db.session.flush()
            _make_session_with_duration(task, 120)  # 4× la cible
            _db.session.commit()

            scores = ScoreService().compute_today_scores(user.id)
            assert scores["allocations"] == 100


# ─── Sous-score clôture ───────────────────────────────────────────────────────

class TestScoreCloture:
    """Calcul du sous-score clôture : sessions efficient / sessions clôturées."""

    def test_toutes_efficient_score_100(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = Task(user_id=user.id, title="T", status="new", is_qualified=False)
            _db.session.add(task)
            _db.session.flush()
            _make_closed_session(task, efficient=True)
            _make_closed_session(task, efficient=True)
            _db.session.commit()

            scores = ScoreService().compute_today_scores(user.id)
            assert scores["closure"] == 100

    def test_aucune_efficient_score_zero(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = Task(user_id=user.id, title="T", status="new", is_qualified=False)
            _db.session.add(task)
            _db.session.flush()
            _make_closed_session(task, efficient=False)
            _make_closed_session(task, efficient=False)
            _db.session.commit()

            scores = ScoreService().compute_today_scores(user.id)
            assert scores["closure"] == 0

    def test_moitie_efficient_score_50(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = Task(user_id=user.id, title="T", status="new", is_qualified=False)
            _db.session.add(task)
            _db.session.flush()
            _make_closed_session(task, efficient=True)
            _make_closed_session(task, efficient=False)
            _db.session.commit()

            scores = ScoreService().compute_today_scores(user.id)
            assert scores["closure"] == 50


# ─── Score global ─────────────────────────────────────────────────────────────

class TestScoreGlobal:
    """Score global = 40% priorités + 40% allocations + 20% clôture."""

    def test_calcul_pondere_priorites_et_cloture(self, ctx):
        """Priorités 100% + allocations 0% + clôture 100% → global = 60."""
        with ctx.app_context():
            user = _make_user()
            today = date.today()

            task = _make_pinned_task(user.id, today, status="done")
            _make_closed_session(task, efficient=True)
            _db.session.commit()

            scores = ScoreService().compute_today_scores(user.id)
            # 40% × 100 + 40% × 0 + 20% × 100 = 60
            assert scores["global"] == 60
            assert scores["priorities"] == 100
            assert scores["allocations"] == 0
            assert scores["closure"] == 100

    def test_weekly_contient_categories(self, ctx):
        with ctx.app_context():
            user = _make_user()
            _make_category(user.id)
            _db.session.commit()

            result = ScoreService().compute_weekly_scores(user.id)
            assert "categories" in result
            assert len(result["categories"]) == 1


# ─── Routes HTTP scores ───────────────────────────────────────────────────────

class TestScoresRoutes:
    """Endpoints GET /api/scores/today|weekly|history via HTTP."""

    def test_today_retourne_les_4_cles(self, client):
        token = register_and_login_http(client, "score_today@test.com")
        resp = client.get("/api/scores/today", headers=auth(token))
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert set(data.keys()) >= {"global", "priorities", "allocations", "closure"}

    def test_weekly_retourne_categories(self, client):
        token = register_and_login_http(client, "score_weekly@test.com")
        resp = client.get("/api/scores/weekly", headers=auth(token))
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert "categories" in data

    def test_history_defaut_4_semaines(self, client):
        token = register_and_login_http(client, "score_hist4@test.com")
        resp = client.get("/api/scores/history", headers=auth(token))
        assert resp.status_code == 200
        assert len(resp.get_json()["data"]) == 4

    def test_history_parametre_weeks(self, client):
        token = register_and_login_http(client, "score_hist2@test.com")
        resp = client.get("/api/scores/history?weeks=2", headers=auth(token))
        assert resp.status_code == 200
        assert len(resp.get_json()["data"]) == 2

    def test_history_weeks_zero_invalide(self, client):
        token = register_and_login_http(client, "score_hist0@test.com")
        resp = client.get("/api/scores/history?weeks=0", headers=auth(token))
        assert resp.status_code == 400

    def test_history_weeks_trop_grand(self, client):
        token = register_and_login_http(client, "score_hist53@test.com")
        resp = client.get("/api/scores/history?weeks=53", headers=auth(token))
        assert resp.status_code == 400

    def test_today_sans_token_retourne_401(self, client):
        resp = client.get("/api/scores/today")
        assert resp.status_code == 401

    def test_weekly_sans_token_retourne_401(self, client):
        resp = client.get("/api/scores/weekly")
        assert resp.status_code == 401

    def test_history_sans_token_retourne_401(self, client):
        resp = client.get("/api/scores/history")
        assert resp.status_code == 401
