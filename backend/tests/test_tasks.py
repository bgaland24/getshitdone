"""
Tests du cycle de vie complet des tâches.
Couvre : création, qualification, épinglage, timer, clôture, annulation,
         règles métier (max épinglées, transitions interdites, etc.)
"""

import pytest
import bcrypt
from datetime import date, timedelta

from app import create_app
from app.database import db as _db
from app.services.task_service import TaskService
from app.models.task import Task
from app.models.user import User
from app.models.user_preferences import UserPreferences


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def app():
    """Application Flask avec base SQLite en mémoire."""
    import os
    original_db_url = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    flask_app = create_app("development")
    flask_app.config["TESTING"] = True
    flask_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.drop_all()
    # Restaure la variable d'environnement pour ne pas polluer les processus suivants
    if original_db_url is not None:
        os.environ["DATABASE_URL"] = original_db_url
    else:
        os.environ.pop("DATABASE_URL", None)


@pytest.fixture(autouse=True)
def clean(app):
    """Vide toutes les tables entre chaque test."""
    with app.app_context():
        yield
        _db.session.rollback()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


@pytest.fixture
def ctx(app):
    with app.app_context():
        yield app


def _make_user(email="user@test.com") -> User:
    """Crée un utilisateur en base."""
    user = User(
        email=email,
        password_hash=bcrypt.hashpw(b"pass", bcrypt.gensalt()).decode(),
    )
    _db.session.add(user)
    _db.session.flush()
    return user


def _make_task(user_id: str, title="Tâche test") -> Task:
    """Crée une tâche via le service (statut initial : new)."""
    return TaskService().create_task(user_id=user_id, title=title)


def _tomorrow() -> date:
    return date.today() + timedelta(days=1)


def _horizon() -> str:
    """Date ISO J+7 — valide pour la qualification."""
    return (date.today() + timedelta(days=7)).isoformat()


# ─── Création ─────────────────────────────────────────────────────────────────

class TestCreation:
    """La création d'une tâche respecte les valeurs initiales."""

    def test_statut_initial_est_new(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            assert task.status == "new"

    def test_non_qualifie_par_defaut(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            assert task.is_qualified is False

    def test_champs_epinglage_nuls_par_defaut(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            assert task.priority_firstset_date is None
            assert task.priority_current_date is None

    def test_plusieurs_taches_independantes(self, ctx):
        with ctx.app_context():
            user = _make_user()
            t1 = _make_task(user.id, "Tâche A")
            t2 = _make_task(user.id, "Tâche B")
            assert t1.id != t2.id
            assert t1.status == t2.status == "new"


# ─── Qualification ────────────────────────────────────────────────────────────

class TestQualification:
    """Qualification : is_qualified, validation des valeurs, champs optionnels."""

    def test_qualification_complete_rend_qualifie(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            TaskService().qualify_task(task, "urgent", "important", _horizon())
            assert task.is_qualified is True

    def test_horizon_invalide_leve_valueerror(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            with pytest.raises(ValueError, match="Horizon"):
                TaskService().qualify_task(task, "urgent", "important", "pas-une-date")

    def test_urgence_invalide_leve_valueerror(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            with pytest.raises(ValueError, match="Urgence"):
                TaskService().qualify_task(task, "super_urgent", "important", _horizon())

    def test_importance_invalide_leve_valueerror(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            with pytest.raises(ValueError, match="Importance"):
                TaskService().qualify_task(task, "urgent", "mega_important", _horizon())

    def test_qualification_sans_horizon_non_qualifie(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            task.urgency = "urgent"
            task.importance = "important"
            task.recalculate_is_qualified()
            assert task.is_qualified is False

    def test_qualification_avec_champs_optionnels(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            TaskService().qualify_task(
                task, "non_urgent", "non_important", _horizon(),
                delegation="delegable", estimated_minutes=30,
            )
            assert task.is_qualified is True
            assert task.delegation == "delegable"
            assert task.estimated_minutes == 30

    def test_requalification_met_a_jour_les_champs(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            svc = TaskService()
            svc.qualify_task(task, "urgent", "important", _horizon())
            new_horizon = (date.today() + timedelta(days=14)).isoformat()
            svc.qualify_task(task, "non_urgent", "non_important", new_horizon)
            assert task.urgency == "non_urgent"
            assert task.horizon == new_horizon
            assert task.is_qualified is True


# ─── Épinglage ────────────────────────────────────────────────────────────────

class TestEpinglage:
    """Pin / unpin : statut, dates, règle max 3 par date."""

    def test_epinglage_passe_en_prioritized(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            TaskService().pin_task(task, _tomorrow(), user.id)
            assert task.status == "prioritized"

    def test_epinglage_set_priority_current_date(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            d = _tomorrow()
            TaskService().pin_task(task, d, user.id)
            assert task.priority_current_date == d

    def test_premier_epinglage_set_firstset_date(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            d = _tomorrow()
            TaskService().pin_task(task, d, user.id)
            assert task.priority_firstset_date == d

    def test_reepinglage_ne_change_pas_firstset_date(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            svc = TaskService()
            first = _tomorrow()
            svc.pin_task(task, first, user.id)
            assert task.priority_firstset_date == first

            # Désépingle puis réépingle sur une autre date
            svc.unpin_task(task)
            later = date.today() + timedelta(days=3)
            svc.pin_task(task, later, user.id)

            # firstset_date reste la première
            assert task.priority_firstset_date == first
            assert task.priority_current_date == later

    def test_maximum_3_epingles_par_date(self, ctx):
        with ctx.app_context():
            user = _make_user()
            svc = TaskService()
            d = _tomorrow()
            for _ in range(3):
                t = _make_task(user.id)
                svc.pin_task(t, d, user.id)
            quatrieme = _make_task(user.id)
            with pytest.raises(ValueError, match="Maximum"):
                svc.pin_task(quatrieme, d, user.id)

    def test_limite_par_date_pas_globale(self, ctx):
        """3 épinglées aujourd'hui + 3 demain = autorisé."""
        with ctx.app_context():
            user = _make_user()
            svc = TaskService()
            today = date.today()
            tomorrow = _tomorrow()
            for _ in range(3):
                svc.pin_task(_make_task(user.id), today, user.id)
            for _ in range(3):
                svc.pin_task(_make_task(user.id), tomorrow, user.id)
            # Aucune exception levée

    def test_depinglage_sans_session_repasse_new(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            svc = TaskService()
            svc.pin_task(task, _tomorrow(), user.id)
            svc.unpin_task(task)
            assert task.status == "new"
            assert task.priority_current_date is None

    # Désactivé : timer démarrer/pause
    # def test_depinglage_avec_session_repasse_in_progress(self, ctx):
    #     with ctx.app_context():
    #         user = _make_user()
    #         task = _make_task(user.id)
    #         svc = TaskService()
    #         svc.pin_task(task, _tomorrow(), user.id)
    #         svc.start_task(task, user.id)
    #         svc.pause_task(task, user.id)
    #         svc.unpin_task(task)
    #         assert task.status == "in_progress"

    def test_depinglage_conserve_firstset_date(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            svc = TaskService()
            d = _tomorrow()
            svc.pin_task(task, d, user.id)
            svc.unpin_task(task)
            assert task.priority_firstset_date == d
            assert task.priority_current_date is None


# Désactivé : timer démarrer/pause (sessions de travail)
#
# class TestTimer:
#     """Démarrage, pause, reprise et session unique par utilisateur."""
#
#     def test_start_passe_en_in_progress(self, ctx):
#         with ctx.app_context():
#             user = _make_user()
#             task = _make_task(user.id)
#             TaskService().start_task(task, user.id)
#             assert task.status == "in_progress"
#
#     def test_start_cree_une_session(self, ctx):
#         with ctx.app_context():
#             user = _make_user()
#             task = _make_task(user.id)
#             session = TaskService().start_task(task, user.id)
#             assert session.task_id == task.id
#             assert session.stopped_at is None
#
#     def test_deux_starts_simultanes_leve_valueerror(self, ctx):
#         with ctx.app_context():
#             user = _make_user()
#             svc = TaskService()
#             t1 = _make_task(user.id)
#             t2 = _make_task(user.id)
#             svc.start_task(t1, user.id)
#             with pytest.raises(ValueError, match="session"):
#                 svc.start_task(t2, user.id)
#
#     def test_pause_cloture_la_session(self, ctx):
#         with ctx.app_context():
#             user = _make_user()
#             task = _make_task(user.id)
#             svc = TaskService()
#             svc.start_task(task, user.id)
#             session = svc.pause_task(task, user.id)
#             assert session.stopped_at is not None
#             assert session.duration_minutes is not None
#
#     def test_pause_sur_tache_epinglee_repasse_prioritized(self, ctx):
#         with ctx.app_context():
#             user = _make_user()
#             task = _make_task(user.id)
#             svc = TaskService()
#             svc.pin_task(task, _tomorrow(), user.id)
#             svc.start_task(task, user.id)
#             svc.pause_task(task, user.id)
#             assert task.status == "prioritized"
#
#     def test_pause_sans_session_active_leve_valueerror(self, ctx):
#         with ctx.app_context():
#             user = _make_user()
#             task = _make_task(user.id)
#             with pytest.raises(ValueError, match="session"):
#                 TaskService().pause_task(task, user.id)
#
#     def test_plusieurs_sessions_successives(self, ctx):
#         with ctx.app_context():
#             user = _make_user()
#             task = _make_task(user.id)
#             svc = TaskService()
#             for _ in range(3):
#                 svc.start_task(task, user.id)
#                 svc.pause_task(task, user.id)
#             assert len(task.work_sessions) == 3


# ─── Clôture ──────────────────────────────────────────────────────────────────

class TestCloture:
    """complete_task : statut done, session fermée, done_at renseigné."""

    def test_done_depuis_new(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            TaskService().complete_task(task)
            assert task.status == "done"
            assert task.done_at is not None

    # Désactivé : timer démarrer/pause
    # def test_done_depuis_in_progress_ferme_session(self, ctx):
    #     with ctx.app_context():
    #         user = _make_user()
    #         task = _make_task(user.id)
    #         svc = TaskService()
    #         svc.start_task(task, user.id)
    #         svc.complete_task(task)
    #         assert task.status == "done"
    #         assert all(s.stopped_at is not None for s in task.work_sessions)

    def test_done_depuis_prioritized(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            svc = TaskService()
            svc.pin_task(task, _tomorrow(), user.id)
            svc.complete_task(task)
            assert task.status == "done"


# ─── Annulation ───────────────────────────────────────────────────────────────

class TestAnnulation:
    """cancel_task : autorisé depuis new/prioritized/in_progress, refusé depuis done."""

    def test_cancel_depuis_new(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            TaskService().cancel_task(task)
            assert task.status == "cancelled"

    def test_cancel_depuis_prioritized(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            svc = TaskService()
            svc.pin_task(task, _tomorrow(), user.id)
            svc.cancel_task(task)
            assert task.status == "cancelled"

    # Désactivé : timer démarrer/pause
    # def test_cancel_depuis_in_progress(self, ctx):
    #     with ctx.app_context():
    #         user = _make_user()
    #         task = _make_task(user.id)
    #         svc = TaskService()
    #         svc.start_task(task, user.id)
    #         svc.cancel_task(task)
    #         assert task.status == "cancelled"

    def test_cancel_depuis_done_leve_valueerror(self, ctx):
        with ctx.app_context():
            user = _make_user()
            task = _make_task(user.id)
            svc = TaskService()
            svc.complete_task(task)
            with pytest.raises(ValueError):
                svc.cancel_task(task)


# ─── Cycle de vie complet ─────────────────────────────────────────────────────

class TestCycleComplet:
    """Scénarios end-to-end représentatifs."""

    def test_scenario_nominal(self, ctx):
        """new → qualifiée → épinglée → terminée."""
        with ctx.app_context():
            user = _make_user()
            svc = TaskService()

            task = _make_task(user.id, "Préparer la démo")
            assert task.status == "new"

            svc.qualify_task(task, "urgent", "important", _horizon(), delegation="non_delegable")
            assert task.is_qualified is True

            svc.pin_task(task, _tomorrow(), user.id)
            assert task.status == "prioritized"
            assert task.priority_firstset_date == _tomorrow()

            # svc.start_task(task, user.id)       # désactivé : timer
            # assert task.status == "in_progress"
            # svc.pause_task(task, user.id)        # désactivé : timer
            # assert task.status == "prioritized"
            # svc.start_task(task, user.id)        # désactivé : timer

            svc.complete_task(task)
            assert task.status == "done"
            assert task.done_at is not None

    def test_scenario_tache_delegable(self, ctx):
        """Tâche délégable : qualifiée, épinglée, marquée done sans timer."""
        with ctx.app_context():
            user = _make_user()
            svc = TaskService()

            task = _make_task(user.id, "Rédiger le compte-rendu")
            svc.qualify_task(task, "non_urgent", "important", _horizon(), delegation="delegable")
            svc.pin_task(task, date.today(), user.id)
            svc.complete_task(task)

            assert task.status == "done"
            assert task.delegation == "delegable"

    def test_scenario_replanification(self, ctx):
        """Tâche épinglée, désépinglée, réépinglée sur une autre date."""
        with ctx.app_context():
            user = _make_user()
            svc = TaskService()

            task = _make_task(user.id, "Appel client")
            svc.qualify_task(task, "urgent", "important", _horizon())

            today = date.today()
            svc.pin_task(task, today, user.id)
            first = task.priority_firstset_date

            svc.unpin_task(task)
            assert task.status == "new"

            later = today + timedelta(days=2)
            svc.pin_task(task, later, user.id)
            assert task.priority_current_date == later
            assert task.priority_firstset_date == first  # immuable

    def test_scenario_trois_taches_paralleles(self, ctx):
        """3 tâches épinglées sur la même date, la 4ème est refusée."""
        with ctx.app_context():
            user = _make_user()
            svc = TaskService()
            d = _tomorrow()

            tasks = [_make_task(user.id, f"Tâche {i}") for i in range(4)]
            for t in tasks[:3]:
                svc.pin_task(t, d, user.id)

            with pytest.raises(ValueError, match="Maximum"):
                svc.pin_task(tasks[3], d, user.id)

            # Les 3 premières sont bien épinglées
            assert all(t.status == "prioritized" for t in tasks[:3])
            # La 4ème reste new
            assert tasks[3].status == "new"


# ─── Préférences utilisateur ──────────────────────────────────────────────────

class TestPreferences:
    """UserPreferences : valeurs par défaut, validation des axes."""

    def test_valeurs_par_defaut(self, ctx):
        with ctx.app_context():
            user = _make_user()
            prefs = UserPreferences(user_id=user.id)
            _db.session.add(prefs)
            _db.session.flush()
            assert prefs.get_sort_axes() == ["horizon", "delegation", "urgency", "importance"]

    def test_set_axes_valide(self, ctx):
        with ctx.app_context():
            user = _make_user()
            prefs = UserPreferences(user_id=user.id)
            _db.session.add(prefs)
            _db.session.flush()
            prefs.set_sort_axes(["importance", "urgency", "delegation", "horizon"])
            assert prefs.get_sort_axes() == ["importance", "urgency", "delegation", "horizon"]

    def test_set_axes_invalide_leve_valueerror(self, ctx):
        with ctx.app_context():
            user = _make_user()
            prefs = UserPreferences(user_id=user.id)
            _db.session.add(prefs)
            _db.session.flush()
            with pytest.raises(ValueError):
                prefs.set_sort_axes(["horizon", "delegation", "urgency", "inexistant"])

    def test_set_axes_incomplet_leve_valueerror(self, ctx):
        with ctx.app_context():
            user = _make_user()
            prefs = UserPreferences(user_id=user.id)
            _db.session.add(prefs)
            _db.session.flush()
            with pytest.raises(ValueError):
                prefs.set_sort_axes(["horizon", "delegation"])  # manque urgency + importance
