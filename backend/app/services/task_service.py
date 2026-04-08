"""
TaskService — logique métier des tâches.
Centralise les transitions de statut, la validation des règles métier
et les opérations sur les sessions de travail.
"""

from datetime import datetime, timezone, timedelta

from app.database import db
from app.models.task import Task, TASK_STATUSES
from app.models.work_session import WorkSession

# Transitions de statut autorisées : {statut_source: [statuts_cibles_autorisés]}
ALLOWED_TRANSITIONS = {
    "unorganized": ["backlog"],
    "backlog": ["today", "cancelled"],
    "today": ["in_progress", "backlog", "cancelled"],
    "in_progress": ["today", "done"],
    "done": [],
    "cancelled": [],
}

# Nombre maximal de tâches autorisées en statut today pour une même priority_date
MAX_TODAY_TASKS = 3

# Délai en minutes pour considérer une session "efficient"
EFFICIENT_CLOSE_WINDOW_MINUTES = 5


class TaskService:
    """Service de gestion du cycle de vie des tâches."""

    def create_task(self, user_id: str, title: str, category_id: str = None, deliverable_id: str = None) -> Task:
        """
        Crée une nouvelle tâche.
        Statut initial : 'backlog' si catégorie fournie, 'unorganized' sinon.
        """
        initial_status = "backlog" if category_id else "unorganized"
        task = Task(
            user_id=user_id,
            title=title,
            category_id=category_id,
            deliverable_id=deliverable_id,
            status=initial_status,
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
            "delegation", "estimated_minutes", "priority_date",
        }

        qualification_fields = {"urgency", "importance", "horizon"}
        needs_qualification_recalc = False

        for field, value in data.items():
            if field not in modifiable_fields:
                continue
            setattr(task, field, value)
            if field in qualification_fields:
                needs_qualification_recalc = True

        # Si la catégorie est maintenant renseignée et la tâche était non organisée, on la fait passer en backlog
        if "category_id" in data and data["category_id"] and task.status == "unorganized":
            task.status = "backlog"

        if needs_qualification_recalc:
            task.recalculate_is_qualified()

        db.session.commit()
        return task

    def qualify_task(self, task: Task, urgency: str, importance: str, horizon: str, delegation: str = None) -> Task:
        """
        Applique les critères de qualification à une tâche et recalcule is_qualified.
        Lève ValueError si les valeurs sont invalides.
        """
        from app.models.task import URGENCY_VALUES, IMPORTANCE_VALUES, HORIZON_VALUES, DELEGATION_VALUES

        if urgency not in URGENCY_VALUES:
            raise ValueError(f"Urgence invalide. Valeurs acceptées : {URGENCY_VALUES}")
        if importance not in IMPORTANCE_VALUES:
            raise ValueError(f"Importance invalide. Valeurs acceptées : {IMPORTANCE_VALUES}")
        if horizon not in HORIZON_VALUES:
            raise ValueError(f"Horizon invalide. Valeurs acceptées : {HORIZON_VALUES}")
        if delegation and delegation not in DELEGATION_VALUES:
            raise ValueError(f"Délégation invalide. Valeurs acceptées : {DELEGATION_VALUES}")

        task.urgency = urgency
        task.importance = importance
        task.horizon = horizon
        task.delegation = delegation
        task.recalculate_is_qualified()

        db.session.commit()
        return task

    def prioritize_task(self, task: Task, priority_date, user_id: str) -> Task:
        """
        Marque une tâche comme priorité pour une date donnée (statut → today).
        Lève ValueError si la limite de 3 tâches today est atteinte.
        """
        today_count = Task.query.filter_by(
            user_id=user_id,
            status="today",
            priority_date=priority_date,
        ).count()

        if today_count >= MAX_TODAY_TASKS:
            raise ValueError(f"Maximum {MAX_TODAY_TASKS} tâches prioritaires par jour")

        task.status = "today"
        task.priority_date = priority_date
        db.session.commit()
        return task

    def start_task(self, task: Task, user_id: str) -> WorkSession:
        """
        Démarre une session de travail sur la tâche.
        Lève ValueError si une autre session est déjà active.
        """
        # Vérifie qu'aucune autre session n'est en cours pour cet utilisateur
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
        Met en pause la session active sur la tâche (statut → today).
        Lève ValueError si aucune session active n'est trouvée.
        """
        session = self._get_active_session(task.id)
        if not session:
            raise ValueError("Aucune session active sur cette tâche")

        now = datetime.now(timezone.utc)
        session.stopped_at = now
        session.duration_minutes = _calculate_duration_minutes(session.started_at, now)

        task.status = "today"
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
            # efficient = tâche closée dans les 5 min après fin de session
            session.efficient = True

        # Marque toutes les sessions récentes comme efficient si applicable
        self._mark_recent_sessions_efficient(task.id, now)

        task.status = "done"
        task.done_at = now
        db.session.commit()
        return task

    def cancel_task(self, task: Task) -> Task:
        """Annule une tâche (statut → cancelled)."""
        if task.status not in ("backlog", "today"):
            raise ValueError("Seules les tâches en backlog ou today peuvent être annulées")

        task.status = "cancelled"
        db.session.commit()
        return task

    def prepare_tomorrow(self, user_id: str) -> dict:
        """
        Remet toutes les tâches 'today' non done de l'utilisateur en 'backlog'.
        Enregistre la date dans missed_dates pour chaque tâche reportée.
        Retourne le nombre de tâches remises en backlog.
        """
        today_str = datetime.now(timezone.utc).date().isoformat()
        tasks_to_reset = Task.query.filter_by(
            user_id=user_id, status="today"
        ).all()

        count_reset = 0
        for task in tasks_to_reset:
            task.add_missed_date(today_str)
            task.status = "backlog"
            task.priority_date = None
            count_reset += 1

        db.session.commit()
        return {"tasks_reset": count_reset}

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
    # Normalise les deux timestamps pour la comparaison
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    if stopped_at.tzinfo is None:
        stopped_at = stopped_at.replace(tzinfo=timezone.utc)
    delta = stopped_at - started_at
    return max(0, int(delta.total_seconds() / 60))
