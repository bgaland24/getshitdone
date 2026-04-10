"""
OnboardingService — crée les données de démonstration pour un nouvel utilisateur.
Appelé automatiquement à l'inscription pour que l'application ne soit pas vide.
"""

from datetime import date, timedelta

from app.database import db
from app.models.category import Category
from app.models.deliverable import Deliverable
from app.models.task import Task


class OnboardingService:
    """Crée 2 catégories, 6 livrables et 10 tâches de démonstration."""

    def seed_demo_data(self, user_id: str) -> None:
        """
        Initialise le compte d'un nouvel utilisateur avec des données réalistes.
        Utilise flush() pour obtenir les IDs sans commit intermédiaire,
        puis un seul commit final pour atomicité.
        """
        today = date.today()

        # ── Catégories ────────────────────────────────────────────────────────
        travail = Category(
            user_id=user_id,
            name="Travail",
            color="#E86B3E",
            weekly_target_minutes=1200,
        )
        perso = Category(
            user_id=user_id,
            name="Perso",
            color="#4CAF7D",
            weekly_target_minutes=300,
        )
        db.session.add_all([travail, perso])
        db.session.flush()

        # ── Livrables ─────────────────────────────────────────────────────────
        projet    = Deliverable(category_id=travail.id, name="Projet client")
        formation = Deliverable(category_id=travail.id, name="Formation")
        admin     = Deliverable(category_id=travail.id, name="Admin")
        sport     = Deliverable(category_id=perso.id,   name="Sport")
        lecture   = Deliverable(category_id=perso.id,   name="Lecture")
        maison    = Deliverable(category_id=perso.id,   name="Projets maison")
        db.session.add_all([projet, formation, admin, sport, lecture, maison])
        db.session.flush()

        # ── Tâches ────────────────────────────────────────────────────────────
        # 7 qualifiées + 3 non qualifiées pour illustrer la file de qualification
        tasks_data = [
            # Tâches qualifiées
            dict(
                title="Préparer la réunion de lancement",
                category_id=travail.id,
                deliverable_id=projet.id,
                urgency="urgent",
                importance="important",
                horizon=str(today + timedelta(days=3)),
                delegation="non_delegable",
            ),
            dict(
                title="Rédiger le compte-rendu du sprint",
                category_id=travail.id,
                deliverable_id=projet.id,
                urgency="non_urgent",
                importance="important",
                horizon=str(today + timedelta(days=7)),
                delegation="delegable",
            ),
            dict(
                title="Revoir le module d'authentification",
                category_id=travail.id,
                deliverable_id=formation.id,
                urgency="non_urgent",
                importance="important",
                horizon=str(today + timedelta(days=14)),
                delegation="non_delegable",
            ),
            dict(
                title="Envoyer la facture du mois",
                category_id=travail.id,
                deliverable_id=admin.id,
                urgency="urgent",
                importance="important",
                horizon=str(today + timedelta(days=2)),
                delegation="delegable",
            ),
            dict(
                title="Planifier les congés",
                category_id=travail.id,
                deliverable_id=admin.id,
                urgency="non_urgent",
                importance="non_important",
                horizon=str(today + timedelta(days=30)),
                delegation="delegable",
            ),
            dict(
                title="Séance de sport 3x cette semaine",
                category_id=perso.id,
                deliverable_id=sport.id,
                urgency="urgent",
                importance="important",
                horizon=str(today + timedelta(days=7)),
                delegation="non_delegable",
            ),
            dict(
                title="Finir le livre en cours",
                category_id=perso.id,
                deliverable_id=lecture.id,
                urgency="non_urgent",
                importance="non_important",
                horizon=str(today + timedelta(days=14)),
                delegation="non_delegable",
            ),
            # Tâches non qualifiées — illustrent la file de l'écran Qualifier
            dict(
                title="Appeler le plombier",
                category_id=perso.id,
                deliverable_id=maison.id,
            ),
            dict(
                title="Réserver les billets de train",
                category_id=perso.id,
            ),
            dict(
                title="Idée : apprendre le piano",
            ),
        ]

        tasks = []
        for data in tasks_data:
            task = Task(user_id=user_id, status="new", **data)
            task.recalculate_is_qualified()
            tasks.append(task)

        db.session.add_all(tasks)
        db.session.commit()
