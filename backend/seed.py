"""
Seed de la base de données de test.

Recrée entièrement la BDD de test (intentionality_test.db) dans un état connu et riche,
couvrant tous les cas utiles pour les tests backend (pytest) et E2E (Playwright).

Usage :
    python seed.py                  # Seed la BDD de test
    python seed.py --reset-only     # Vide la BDD sans la remplir

Compte principal (pour les tests E2E Playwright) :
    email    : test@getshitdone.local
    password : testpassword123
"""

import os
import sys
import argparse
from datetime import datetime, timezone, timedelta, date

# Force la BDD de test avant tout import de l'app
os.environ["DATABASE_URL"] = "sqlite:///intentionality_test.db"
os.environ["FLASK_ENV"] = "development"
os.environ["ONBOARDING_DISABLED"] = "1"  # Pas de données démo en contexte de test

from app import create_app
from app.database import db
from app.models.user import User
from app.models.category import Category
from app.models.deliverable import Deliverable
from app.models.task import Task
from app.models.work_session import WorkSession
from app.models.user_preferences import UserPreferences
from app.services.auth_service import AuthService

auth_service = AuthService()

# ─── Données du seed ──────────────────────────────────────────────────────────

SEED_USER_EMAIL    = "test@getshitdone.local"
SEED_USER_PASSWORD = "testpassword123"

TODAY     = date.today()
YESTERDAY = TODAY - timedelta(days=1)
TOMORROW  = TODAY + timedelta(days=1)
IN_7_DAYS = TODAY + timedelta(days=7)
IN_30_DAYS = TODAY + timedelta(days=30)
IN_90_DAYS = TODAY + timedelta(days=90)


def reset_database(app):
    """Vide toutes les tables dans l'ordre inverse des dépendances."""
    with app.app_context():
        db.session.rollback()
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()
    print("  > Base videe")


def seed_database(app):
    """Remplit la BDD avec un jeu de données connu et représentatif."""
    with app.app_context():

        # ── Utilisateur principal (compte E2E) ────────────────────────────────
        user = auth_service.register(SEED_USER_EMAIL, SEED_USER_PASSWORD)
        print(f"  > Utilisateur cree : {SEED_USER_EMAIL}")

        # ── Préférences ───────────────────────────────────────────────────────
        prefs = UserPreferences(user_id=user.id)
        prefs.set_sort_axes(["horizon", "delegation", "urgency", "importance"])
        db.session.add(prefs)
        db.session.commit()

        # ── Catégories ────────────────────────────────────────────────────────
        cat_travail = Category(
            user_id=user.id, name="Travail", color="#E86B3E", weekly_target_minutes=1200
        )
        cat_perso = Category(
            user_id=user.id, name="Perso", color="#4CAF7D", weekly_target_minutes=300
        )
        cat_apprentissage = Category(
            user_id=user.id, name="Apprentissage", color="#6B8DE8", weekly_target_minutes=180
        )
        db.session.add_all([cat_travail, cat_perso, cat_apprentissage])
        db.session.commit()
        print("  > 3 categories creees")

        # ── Livrables ─────────────────────────────────────────────────────────
        del_sprint1 = Deliverable(name="Sprint 1", category_id=cat_travail.id)
        del_sprint2 = Deliverable(name="Sprint 2", category_id=cat_travail.id)
        del_refacto = Deliverable(name="Refacto auth", category_id=cat_travail.id)
        del_sport   = Deliverable(name="Sport", category_id=cat_perso.id)
        del_lecture = Deliverable(name="Lecture", category_id=cat_apprentissage.id)
        db.session.add_all([del_sprint1, del_sprint2, del_refacto, del_sport, del_lecture])
        db.session.commit()
        print("  > 5 livrables crees")

        # ── Tâches non organisées (status=new, pas de catégorie) ───────────────
        task_non_org_1 = Task(
            user_id=user.id, title="Idée à trier plus tard", status="new"
        )
        task_non_org_2 = Task(
            user_id=user.id, title="Rappel sans contexte", status="new"
        )
        db.session.add_all([task_non_org_1, task_non_org_2])

        # ── Tâches qualifiées — Travail / Sprint 1 ────────────────────────────
        task_urgent_imp = Task(
            user_id=user.id,
            title="Corriger le bug de prod critique",
            category_id=cat_travail.id,
            deliverable_id=del_sprint1.id,
            status="new",
            urgency="urgent",
            importance="important",
            horizon=IN_7_DAYS.isoformat(),
            delegation="non_delegable",
            estimated_minutes=90,
            is_qualified=True,
        )
        task_urgent_non_imp = Task(
            user_id=user.id,
            title="Répondre aux emails urgents",
            category_id=cat_travail.id,
            deliverable_id=del_sprint1.id,
            status="new",
            urgency="urgent",
            importance="non_important",
            horizon=TOMORROW.isoformat(),
            delegation="delegable",
            estimated_minutes=30,
            is_qualified=True,
        )
        task_non_urgent_imp = Task(
            user_id=user.id,
            title="Écrire les tests d'intégration",
            category_id=cat_travail.id,
            deliverable_id=del_sprint1.id,
            status="new",
            urgency="non_urgent",
            importance="important",
            horizon=IN_30_DAYS.isoformat(),
            delegation="non_delegable",
            estimated_minutes=180,
            is_qualified=True,
        )
        db.session.add_all([task_urgent_imp, task_urgent_non_imp, task_non_urgent_imp])

        # ── Tâches Travail / Sprint 2 ─────────────────────────────────────────
        task_sprint2_1 = Task(
            user_id=user.id,
            title="Implémenter la feature export CSV",
            category_id=cat_travail.id,
            deliverable_id=del_sprint2.id,
            status="new",
            urgency="non_urgent",
            importance="important",
            horizon=IN_30_DAYS.isoformat(),
            delegation="delegable",
            estimated_minutes=120,
            is_qualified=True,
        )
        task_sprint2_2 = Task(
            user_id=user.id,
            title="Mettre à jour la documentation API",
            category_id=cat_travail.id,
            deliverable_id=del_sprint2.id,
            status="new",
            urgency="non_urgent",
            importance="non_important",
            horizon=IN_90_DAYS.isoformat(),
            delegation="delegated",
            estimated_minutes=60,
            is_qualified=True,
        )
        db.session.add_all([task_sprint2_1, task_sprint2_2])

        # ── Tâche Travail sans livrable ───────────────────────────────────────
        task_travail_no_del = Task(
            user_id=user.id,
            title="Préparer la présentation client",
            category_id=cat_travail.id,
            status="new",
            urgency="urgent",
            importance="important",
            horizon=IN_7_DAYS.isoformat(),
            delegation="non_delegable",
            estimated_minutes=45,
            is_qualified=True,
        )
        db.session.add(task_travail_no_del)

        # ── Tâches Perso ──────────────────────────────────────────────────────
        task_sport = Task(
            user_id=user.id,
            title="Aller courir 45 minutes",
            category_id=cat_perso.id,
            deliverable_id=del_sport.id,
            status="new",
            urgency="non_urgent",
            importance="important",
            horizon=TOMORROW.isoformat(),
            delegation="non_delegable",
            estimated_minutes=45,
            is_qualified=True,
        )
        task_perso_no_del = Task(
            user_id=user.id,
            title="Appeler maman",
            category_id=cat_perso.id,
            status="new",
            urgency="urgent",
            importance="important",
            horizon=TODAY.isoformat(),
            delegation="non_delegable",
            estimated_minutes=15,
            is_qualified=True,
        )
        db.session.add_all([task_sport, task_perso_no_del])

        # ── Tâches Apprentissage ──────────────────────────────────────────────
        task_lecture = Task(
            user_id=user.id,
            title="Lire chapitre 5 de Clean Code",
            category_id=cat_apprentissage.id,
            deliverable_id=del_lecture.id,
            status="new",
            urgency="non_urgent",
            importance="important",
            horizon=IN_30_DAYS.isoformat(),
            delegation="non_delegable",
            estimated_minutes=60,
            is_qualified=True,
        )
        db.session.add(task_lecture)

        # ── Tâche épinglée aujourd'hui ─────────────────────────────────────────
        task_pinned = Task(
            user_id=user.id,
            title="Faire la revue de code du PR #42",
            category_id=cat_travail.id,
            deliverable_id=del_sprint1.id,
            status="prioritized",
            urgency="urgent",
            importance="important",
            horizon=TODAY.isoformat(),
            delegation="non_delegable",
            estimated_minutes=30,
            is_qualified=True,
            priority_firstset_date=TODAY,
            priority_current_date=TODAY,
        )
        db.session.add(task_pinned)

        # ── Tâche en cours (in_progress) ──────────────────────────────────────
        task_inprogress = Task(
            user_id=user.id,
            title="Refactoriser le module d'authentification",
            category_id=cat_travail.id,
            deliverable_id=del_refacto.id,
            status="in_progress",
            urgency="non_urgent",
            importance="important",
            horizon=IN_30_DAYS.isoformat(),
            delegation="non_delegable",
            estimated_minutes=240,
            is_qualified=True,
            priority_firstset_date=YESTERDAY,
            priority_current_date=None,
        )
        db.session.add(task_inprogress)
        db.session.commit()

        # Session de travail active sur la tâche in_progress
        active_session = WorkSession(
            task_id=task_inprogress.id,
            started_at=datetime.now(timezone.utc) - timedelta(minutes=25),
            stopped_at=None,
        )
        db.session.add(active_session)

        # ── Tâche terminée (done) ─────────────────────────────────────────────
        done_at = datetime.now(timezone.utc) - timedelta(hours=2)
        task_done = Task(
            user_id=user.id,
            title="Déployer la version 1.2 en staging",
            category_id=cat_travail.id,
            deliverable_id=del_sprint1.id,
            status="done",
            urgency="urgent",
            importance="important",
            horizon=YESTERDAY.isoformat(),
            delegation="non_delegable",
            estimated_minutes=20,
            is_qualified=True,
            priority_firstset_date=YESTERDAY,
            priority_current_date=None,
            done_at=done_at,
        )
        db.session.add(task_done)
        db.session.commit()

        # Session clôturée + efficient sur la tâche done
        session_done = WorkSession(
            task_id=task_done.id,
            started_at=done_at - timedelta(minutes=18),
            stopped_at=done_at,
            duration_minutes=18,
            efficient=True,
        )
        db.session.add(session_done)

        # ── Tâche annulée (cancelled) ─────────────────────────────────────────
        task_cancelled = Task(
            user_id=user.id,
            title="Migrer vers PostgreSQL (annulé)",
            category_id=cat_travail.id,
            status="cancelled",
            urgency="non_urgent",
            importance="non_important",
            horizon=IN_90_DAYS.isoformat(),
            delegation="delegable",
            is_qualified=True,
        )
        db.session.add(task_cancelled)

        # ── Tâche non qualifiée avec catégorie ────────────────────────────────
        task_not_qualified = Task(
            user_id=user.id,
            title="À qualifier : revoir l'architecture cache",
            category_id=cat_travail.id,
            deliverable_id=del_sprint2.id,
            status="new",
            is_qualified=False,
        )
        db.session.add(task_not_qualified)

        db.session.commit()

        # Résumé
        task_count = Task.query.filter_by(user_id=user.id).count()
        cat_count = Category.query.filter_by(user_id=user.id).count()
        del_count = Deliverable.query.count()
        print(f"  > {task_count} taches creees ({cat_count} categories, {del_count} livrables)")
        print("  > Taches : 2 non org. | 1 epinglee | 1 en cours | 1 done | 1 annulee | reste = new")

        return {
            "user": user,
            "categories": {"travail": cat_travail, "perso": cat_perso, "apprentissage": cat_apprentissage},
            "deliverables": {
                "sprint1": del_sprint1, "sprint2": del_sprint2,
                "refacto": del_refacto, "sport": del_sport, "lecture": del_lecture,
            },
        }


def main():
    parser = argparse.ArgumentParser(description="Seed de la BDD de test")
    parser.add_argument("--reset-only", action="store_true", help="Vide la BDD sans la remplir")
    args = parser.parse_args()

    print("\n-- Seed de la base de donnees de test --")
    app = create_app("development")

    print("  > Reset...")
    reset_database(app)

    if not args.reset_only:
        print("  > Insertion des donnees...")
        seed_database(app)

    print("  > Termine\n")


if __name__ == "__main__":
    main()
