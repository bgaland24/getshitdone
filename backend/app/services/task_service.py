"""
TaskService — logique métier des tâches.
Centralise les transitions de statut, la validation des règles métier
et les opérations sur les sessions de travail.
"""

from datetime import datetime, timezone, timedelta, date as date_type

from app.database import db
from app.models.task import Task, TASK_STATUSES
from app.models.work_session import WorkSession

# Nombre maximal de tâches épinglées par date
MAX_PINNED_PER_DATE = 3

# Délai en minutes pour considérer une session "efficient"
EFFICIENT_CLOSE_WINDOW_MINUTES = 5


class TaskService:
    """Service de gestion du cycle de vie des tâches."""

    def create_task(self, user_id: str, title: str, category_id: str = None, deliverable_id: str = None) -> Task:
        """
        Crée une nouvelle tâche avec le statut initial 'new'.
        """
        task = Task(
            user_id=user_id,
            title=title,
            category_id=category_id,
            deliverable_id=deliverable_id,
            status="new",
        )
        db.session.add(task)
        db.session.commit()
        return task

    def update_task(self, task: Task, data: dict) -> Task:
        """
        Met à jour les champs modifiables d'une tâche.
        Recalcule is_qualified si les critères de qualification sont modifiés.
        """
        modifiable_fields = {
            "title", "category_id", "deliverable_id",
            "urgency", "importance", "horizon",
            "delegation", "estimated_minutes",
        }
        qualification_fields = {"urgency", "importance", "horizon"}

        for field, value in data.items():
            if field not in modifiable_fields:
                continue
            setattr(task, field, value)
            if field in qualification_fields:
                task.recalculate_is_qualified()

        db.session.commit()
        return task

    def qualify_task(
        self,
        task: Task,
        urgency: str,
        importance: str,
        horizon: str,
        delegation: str = None,
        category_id: str = None,
        deliverable_id: str = None,
        estimated_minutes=None,
    ) -> Task:
        """
        Applique les critères de qualification à une tâche et recalcule is_qualified.
        Lève ValueError si les valeurs de qualification sont invalides.
        """
        from app.models.task import URGENCY_VALUES, IMPORTANCE_VALUES, DELEGATION_VALUES

        if urgency not in URGENCY_VALUES:
            raise ValueError(f"Urgence invalide. Valeurs acceptées : {URGENCY_VALUES}")
        if importance not in IMPORTANCE_VALUES:
            raise ValueError(f"Importance invalide. Valeurs acceptées : {IMPORTANCE_VALUES}")
        try:
            date_type.fromisoformat(horizon)
        except (ValueError, TypeError):
            raise ValueError("Horizon invalide. Format attendu : YYYY-MM-DD")
        if delegation and delegation not in DELEGATION_VALUES:
            raise ValueError(f"Délégation invalide. Valeurs acceptées : {DELEGATION_VALUES}")

        task.urgency = urgency
        task.importance = importance
        task.horizon = horizon
        task.delegation = delegation

        if category_id is not None:
            task.category_id = category_id or None
        if deliverable_id is not None:
            task.deliverable_id = deliverable_id or None
        if estimated_minutes is not None:
            task.estimated_minutes = int(estimated_minutes) if estimated_minutes else None

        task.recalculate_is_qualified()
        db.session.commit()
        return task

    def pin_task(self, task: Task, pin_date: date_type, user_id: str) -> Task:
        """
        Épingle une tâche sur une date donnée (statut → prioritized).
        - priority_firstset_date : set uniquement au premier épinglage (immuable)
        - priority_current_date  : date d'épinglage actuelle (modifiable)
        Lève ValueError si la limite de MAX_PINNED_PER_DATE est atteinte pour cette date.
        """
        pinned_count = Task.query.filter_by(
            user_id=user_id,
            status="prioritized",
        ).filter(Task.priority_current_date == pin_date).count()

        if pinned_count >= MAX_PINNED_PER_DATE:
            raise ValueError(f"Maximum {MAX_PINNED_PER_DATE} tâches épinglées par date")

        task.priority_current_date = pin_date
        if task.priority_firstset_date is None:
            task.priority_firstset_date = pin_date

        task.status = "prioritized"
        db.session.commit()
        return task

    def unpin_task(self, task: Task) -> Task:
        """
        Désépingle une tâche.
        - priority_current_date → null
        - statut → 'in_progress' si sessions de travail existent, 'new' sinon
        """
        task.priority_current_date = None
        task.status = "in_progress" if task.has_work_sessions() else "new"
        db.session.commit()
        return task

    def start_task(self, task: Task, user_id: str) -> WorkSession:
        """
        Démarre une session de travail sur la tâche (statut → in_progress).
        Lève ValueError si une autre session est déjà active pour cet utilisateur.
        """
        active_session = (
            WorkSession.query
            .join(Task, WorkSession.task_id == Task.id)
            .filter(Task.user_id == user_id, WorkSession.stopped_at.is_(None))
            .first()
        )
        if active_session:
            raise ValueError("Une session est déjà en cours. Terminez-la avant d'en démarrer une nouvelle.")

        task.status = "in_progress"
        session = WorkSession(task_id=task.id)
        db.session.add(session)
        db.session.commit()
        return session

    def pause_task(self, task: Task, user_id: str) -> WorkSession:
        """
        Met en pause la session active (statut → prioritized si épinglée, sinon in_progress).
        Lève ValueError si aucune session active n'est trouvée.
        """
        session = self._get_active_session(task.id)
        if not session:
            raise ValueError("Aucune session active sur cette tâche")

        now = datetime.now(timezone.utc)
        session.stopped_at = now
        session.duration_minutes = _calculate_duration_minutes(session.started_at, now)

        # Si la tâche est épinglée, on revient à prioritized ; sinon in_progress
        task.status = "prioritized" if task.priority_current_date else "in_progress"
        db.session.commit()
        return session

    def complete_task(self, task: Task) -> Task:
        """
        Clôture la tâche (statut → done).
        Clôture la session active si elle existe et calcule efficient.
        """
        now = datetime.now(timezone.utc)
        session = self._get_active_session(task.id)

        if session:
            session.stopped_at = now
            session.duration_minutes = _calculate_duration_minutes(session.started_at, now)
            session.efficient = True

        self._mark_recent_sessions_efficient(task.id, now)

        task.status = "done"
        task.done_at = now
        db.session.commit()
        return task

    def cancel_task(self, task: Task) -> Task:
        """
        Annule une tâche (statut → cancelled).
        Autorisé depuis 'new', 'prioritized' ou 'in_progress'.
        """
        if task.status not in ("new", "prioritized", "in_progress"):
            raise ValueError("Seules les tâches new, prioritized ou in_progress peuvent être annulées")

        task.status = "cancelled"
        db.session.commit()
        return task

    def _get_active_session(self, task_id: str):
        """Récupère la session de travail active (non clôturée) d'une tâche."""
        return WorkSession.query.filter_by(
            task_id=task_id, stopped_at=None
        ).first()

    def _mark_recent_sessions_efficient(self, task_id: str, done_at: datetime) -> None:
        """
        Marque efficient=True pour toutes les sessions clôturées dans la fenêtre
        de EFFICIENT_CLOSE_WINDOW_MINUTES avant la clôture de la tâche.
        """
        window_start = done_at - timedelta(minutes=EFFICIENT_CLOSE_WINDOW_MINUTES)
        recent_sessions = WorkSession.query.filter(
            WorkSession.task_id == task_id,
            WorkSession.stopped_at.isnot(None),
            WorkSession.stopped_at >= window_start,
        ).all()
        for session in recent_sessions:
            session.efficient = True


def _calculate_duration_minutes(started_at: datetime, stopped_at: datetime) -> int:
    """Calcule la durée en minutes entre deux timestamps."""
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    if stopped_at.tzinfo is None:
        stopped_at = stopped_at.replace(tzinfo=timezone.utc)
    delta = stopped_at - started_at
    return max(0, int(delta.total_seconds() / 60))
