"""
Blueprint preferences — gestion des préférences utilisateur.
GET  /api/preferences      → retourne les préférences (crée si inexistantes)
PUT  /api/preferences      → met à jour les préférences
"""

from flask import Blueprint, request, g

from app.database import db
from app.models.user_preferences import UserPreferences, DEFAULT_SORT_AXES
from app.utils.auth_decorator import require_auth
from app.utils.response import success, error

preferences_blueprint = Blueprint("preferences", __name__, url_prefix="/api/preferences")


def _get_or_create_preferences(user_id: str) -> UserPreferences:
    """Retourne les préférences de l'utilisateur, les crée avec les valeurs par défaut si absentes."""
    prefs = UserPreferences.query.filter_by(user_id=user_id).first()
    if not prefs:
        prefs = UserPreferences(user_id=user_id)
        db.session.add(prefs)
        db.session.commit()
    return prefs


@preferences_blueprint.get("/")
@require_auth
def get_preferences():
    """Retourne les préférences de l'utilisateur courant."""
    prefs = _get_or_create_preferences(g.current_user.id)
    return success(prefs.to_dict())


@preferences_blueprint.put("/")
@require_auth
def update_preferences():
    """
    Met à jour les préférences de l'utilisateur.
    Body : { "sort_axes": ["horizon", "delegation", "urgency", "importance"] }
    """
    data = request.get_json(silent=True) or {}
    sort_axes = data.get("sort_axes")

    if sort_axes is None:
        return error("sort_axes est obligatoire")
    if not isinstance(sort_axes, list):
        return error("sort_axes doit être un tableau")

    prefs = _get_or_create_preferences(g.current_user.id)

    try:
        prefs.set_sort_axes(sort_axes)
    except ValueError as e:
        return error(str(e))

    db.session.commit()
    return success(prefs.to_dict())
