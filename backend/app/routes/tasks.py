"""
Blueprint tasks — CRUD et actions métier du cycle de vie des tâches.
"""

from datetime import date

from flask import Blueprint, request, g

from app.database import db
from app.models.task import Task
from app.services.task_service import TaskService
from app.utils.auth_decorator import require_auth
from app.utils.response import success, error

tasks_blueprint = Blueprint("tasks", __name__, url_prefix="/api/tasks")
task_service = TaskService()


@tasks_blueprint.get("/")
@require_auth
def list_tasks():
    """
    Retourne les tâches de l'utilisateur.
    Filtres optionnels : status, category_id, qualified (true/false).
    """
    status_filter = request.args.get("status")
    category_id_filter = request.args.get("category_id")
    qualified_filter = request.args.get("qualified")

    query = Task.query.filter_by(user_id=g.current_user.id)

    if status_filter:
        query = query.filter_by(status=status_filter)
    if category_id_filter:
        query = query.filter_by(category_id=category_id_filter)
    if qualified_filter is not None:
        is_qualified = qualified_filter.lower() == "true"
        query = query.filter_by(is_qualified=is_qualified)

    tasks = query.order_by(Task.created_at.desc()).all()
    return success([t.to_dict() for t in tasks])


@tasks_blueprint.post("/")
@require_auth
def create_task():
    """Crée une nouvelle tâche."""
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()

    if not title:
        return error("Le titre est obligatoire")

    task = task_service.create_task(
        user_id=g.current_user.id,
        title=title,
        category_id=data.get("category_id"),
        deliverable_id=data.get("deliverable_id"),
    )
    return success(task.to_dict(), status_code=201)


@tasks_blueprint.put("/<task_id>")
@require_auth
def update_task(task_id):
    """Modifie les champs d'une tâche."""
    task = _get_user_task(task_id)
    if not task:
        return error("Tâche introuvable", 404)

    data = request.get_json(silent=True) or {}
    task = task_service.update_task(task, data)
    return success(task.to_dict())


@tasks_blueprint.delete("/<task_id>")
@require_auth
def delete_task(task_id):
    """Supprime une tâche."""
    task = _get_user_task(task_id)
    if not task:
        return error("Tâche introuvable", 404)

    db.session.delete(task)
    db.session.commit()
    return success({"id": task_id})


@tasks_blueprint.post("/<task_id>/qualify")
@require_auth
def qualify_task(task_id):
    """Applique les critères de qualification à une tâche."""
    task = _get_user_task(task_id)
    if not task:
        return error("Tâche introuvable", 404)

    data = request.get_json(silent=True) or {}
    urgency = data.get("urgency", "")
    importance = data.get("importance", "")
    horizon = data.get("horizon", "")
    delegation = data.get("delegation")

    if not urgency or not importance or not horizon:
        return error("urgency, importance et horizon sont obligatoires pour qualifier")

    try:
        task = task_service.qualify_task(task, urgency, importance, horizon, delegation)
    except ValueError as e:
        return error(str(e))

    return success(task.to_dict())


@tasks_blueprint.post("/<task_id>/prioritize")
@require_auth
def prioritize_task(task_id):
    """Marque une tâche comme priorité pour une date donnée (statut → today)."""
    task = _get_user_task(task_id)
    if not task:
        return error("Tâche introuvable", 404)

    data = request.get_json(silent=True) or {}
    priority_date_str = data.get("priority_date")

    if not priority_date_str:
        return error("priority_date est obligatoire (format YYYY-MM-DD)")

    try:
        priority_date = date.fromisoformat(priority_date_str)
    except ValueError:
        return error("Format de date invalide (attendu : YYYY-MM-DD)")

    try:
        task = task_service.prioritize_task(task, priority_date, g.current_user.id)
    except ValueError as e:
        return error(str(e), 422)

    return success(task.to_dict())


@tasks_blueprint.post("/<task_id>/start")
@require_auth
def start_task(task_id):
    """Démarre une session de travail sur la tâche."""
    task = _get_user_task(task_id)
    if not task:
        return error("Tâche introuvable", 404)

    if task.status not in ("today", "in_progress"):
        return error("La tâche doit être en statut today pour démarrer")

    try:
        session = task_service.start_task(task, g.current_user.id)
    except ValueError as e:
        return error(str(e), 422)

    return success({"task": task.to_dict(), "session": session.to_dict()})


@tasks_blueprint.post("/<task_id>/pause")
@require_auth
def pause_task(task_id):
    """Met en pause la session active sur la tâche."""
    task = _get_user_task(task_id)
    if not task:
        return error("Tâche introuvable", 404)

    try:
        session = task_service.pause_task(task, g.current_user.id)
    except ValueError as e:
        return error(str(e), 422)

    return success({"task": task.to_dict(), "session": session.to_dict()})


@tasks_blueprint.post("/<task_id>/done")
@require_auth
def complete_task(task_id):
    """Clôture la tâche (statut → done)."""
    task = _get_user_task(task_id)
    if not task:
        return error("Tâche introuvable", 404)

    if task.status not in ("today", "in_progress"):
        return error("Seules les tâches today ou in_progress peuvent être clôturées")

    task = task_service.complete_task(task)
    return success(task.to_dict())


@tasks_blueprint.post("/<task_id>/cancel")
@require_auth
def cancel_task(task_id):
    """Annule une tâche."""
    task = _get_user_task(task_id)
    if not task:
        return error("Tâche introuvable", 404)

    try:
        task = task_service.cancel_task(task)
    except ValueError as e:
        return error(str(e), 422)

    return success(task.to_dict())


@tasks_blueprint.post("/prepare-tomorrow")
@require_auth
def prepare_tomorrow():
    """Remet toutes les tâches 'today' non done en 'backlog' et enregistre les missed_dates."""
    result = task_service.prepare_tomorrow(g.current_user.id)
    return success(result)


def _get_user_task(task_id: str):
    """Récupère une tâche appartenant à l'utilisateur connecté."""
    return Task.query.filter_by(id=task_id, user_id=g.current_user.id).first()
