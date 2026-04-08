"""
Blueprint sessions — consultation des sessions de travail.
Les sessions sont créées/clôturées via les actions sur les tâches (start/pause/done).
"""

from flask import Blueprint, request, g

from app.models.work_session import WorkSession
from app.models.task import Task
from app.utils.auth_decorator import require_auth
from app.utils.response import success, error

sessions_blueprint = Blueprint("sessions", __name__, url_prefix="/api/sessions")


@sessions_blueprint.get("/")
@require_auth
def list_sessions():
    """
    Retourne les sessions de travail de l'utilisateur.
    Filtres optionnels : task_id, date (YYYY-MM-DD).
    """
    task_id_filter = request.args.get("task_id")
    date_filter = request.args.get("date")

    query = (
        WorkSession.query
        .join(Task, WorkSession.task_id == Task.id)
        .filter(Task.user_id == g.current_user.id)
    )

    if task_id_filter:
        query = query.filter(WorkSession.task_id == task_id_filter)

    if date_filter:
        try:
            from datetime import date
            filter_date = date.fromisoformat(date_filter)
            query = query.filter(
                WorkSession.started_at >= f"{filter_date}T00:00:00",
                WorkSession.started_at <= f"{filter_date}T23:59:59",
            )
        except ValueError:
            return error("Format de date invalide (attendu : YYYY-MM-DD)")

    sessions = query.order_by(WorkSession.started_at.desc()).all()
    return success([s.to_dict() for s in sessions])
