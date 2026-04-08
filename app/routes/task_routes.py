"""
Routes du module de suivi de tâches.
"""

from flask import Blueprint, request, render_template, redirect, url_for, session, flash, jsonify

from app.routes.utils import get_current_user
from app.repositories.user_repository import UserRepository
from app.repositories.subject_repository import SubjectRepository
from app.repositories.task_repository import TaskRepository
from app.services.claude_service import ClaudeService
from app.services.task_service import TaskService

task_blueprint = Blueprint("tasks", __name__, url_prefix="/tasks")


def _make_task_service() -> TaskService:
    """Instancie le service de tâches avec ses dépendances."""
    return TaskService(
        subject_repository=SubjectRepository(),
        task_repository=TaskRepository(),
    )


def _require_user():
    """Retourne l'utilisateur connecté ou None si non connecté."""
    return get_current_user()


# ---------------------------------------------------------------------------
# Configuration de la clé Claude
# ---------------------------------------------------------------------------

@task_blueprint.route("/setup", methods=["GET", "POST"])
def setup():
    """Permet à l'utilisateur de renseigner sa clé API Claude."""
    user = _require_user()
    if not user:
        return redirect(url_for("auth.login"))

    if request.method == "POST":
        api_key = request.form.get("api_key", "").strip()
        if not api_key:
            flash("La clé API ne peut pas être vide.", "error")
            return render_template("tasks/setup.html", user=user)

        UserRepository().update_claude_api_key(user.id, api_key)
        flash("Clé API enregistrée avec succès.", "success")
        return redirect(url_for("tasks.index"))

    return render_template("tasks/setup.html", user=user)


# ---------------------------------------------------------------------------
# Vue principale du module
# ---------------------------------------------------------------------------

@task_blueprint.route("/")
def index():
    """Affiche la vue principale : sujets et tâches de l'utilisateur."""
    user = _require_user()
    if not user:
        return redirect(url_for("auth.login"))

    if not user.has_claude_api_key:
        return redirect(url_for("tasks.setup"))

    service = _make_task_service()
    overview = service.get_overview(user.id)

    return render_template(
        "tasks/index.html",
        user=user,
        subjects_with_tasks=overview["subjects_with_tasks"],
        standalone_tasks=overview["standalone_tasks"],
    )


# ---------------------------------------------------------------------------
# Traitement d'une dictée (appel AJAX)
# ---------------------------------------------------------------------------

@task_blueprint.route("/process", methods=["POST"])
def process_dictation():
    """
    Reçoit le texte dicté (voix ou saisie manuelle), appelle Claude,
    persiste les entités et retourne le résultat en JSON.
    """
    user = _require_user()
    if not user:
        return jsonify({"error": "Non connecté"}), 401

    if not user.has_claude_api_key:
        return jsonify({"error": "Clé Claude manquante"}), 403

    data = request.get_json()
    user_input = (data or {}).get("text", "").strip()

    if not user_input:
        return jsonify({"error": "Texte vide"}), 400

    try:
        claude_service = ClaudeService(user_api_key=user.claude_api_key)
        task_service = _make_task_service()
        result = task_service.process_dictation(user.id, user_input, claude_service)

        return jsonify({
            "created_subjects": [
                {"id": s.id, "title": s.title, "priority": s.priority}
                for s in result["created_subjects"]
            ],
            "created_tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "urgency_level": t.urgency_level,
                    "priority": t.priority,
                    "deadline": t.deadline,
                    "subject_id": t.subject_id,
                }
                for t in result["created_tasks"]
            ],
        })

    except Exception as error:
        return jsonify({"error": str(error)}), 500


# ---------------------------------------------------------------------------
# Actions sur les tâches
# ---------------------------------------------------------------------------

@task_blueprint.route("/task/<int:task_id>/complete", methods=["POST"])
def complete_task(task_id: int):
    """Marque une tâche comme complétée."""
    user = _require_user()
    if not user:
        return jsonify({"error": "Non connecté"}), 401

    success = _make_task_service().complete_task(task_id, user.id)
    if not success:
        return jsonify({"error": "Tâche introuvable"}), 404

    return jsonify({"success": True})


@task_blueprint.route("/task/<int:task_id>/archive", methods=["POST"])
def archive_task(task_id: int):
    """Archive une tâche."""
    user = _require_user()
    if not user:
        return jsonify({"error": "Non connecté"}), 401

    success = _make_task_service().archive_task(task_id, user.id)
    if not success:
        return jsonify({"error": "Tâche introuvable"}), 404

    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# Actions sur les sujets
# ---------------------------------------------------------------------------

@task_blueprint.route("/subject/<int:subject_id>/archive", methods=["POST"])
def archive_subject(subject_id: int):
    """Archive un sujet et ses tâches actives."""
    user = _require_user()
    if not user:
        return jsonify({"error": "Non connecté"}), 401

    success = _make_task_service().archive_subject(subject_id, user.id)
    if not success:
        return jsonify({"error": "Sujet introuvable"}), 404

    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# Vue liste de tâches (todo)
# ---------------------------------------------------------------------------

@task_blueprint.route("/todo")
def todo():
    """Affiche la liste de toutes les tâches actives priorisées."""
    user = _require_user()
    if not user:
        return redirect(url_for("auth.login"))

    if not user.has_claude_api_key:
        return redirect(url_for("tasks.setup"))

    tasks = _make_task_service().get_todo_list(user.id)
    return render_template("tasks/todo.html", user=user, tasks=tasks)
