"""
Blueprint categories — CRUD des catégories de vie de l'utilisateur.
"""

from flask import Blueprint, request, g

from app.database import db
from app.models.category import Category
from app.models.task import Task
from app.utils.auth_decorator import require_auth
from app.utils.response import success, error

categories_blueprint = Blueprint("categories", __name__, url_prefix="/api/categories")


@categories_blueprint.get("/")
@require_auth
def list_categories():
    """Retourne toutes les catégories de l'utilisateur connecté."""
    categories = Category.query.filter_by(user_id=g.current_user.id).all()
    return success([c.to_dict() for c in categories])


@categories_blueprint.post("/")
@require_auth
def create_category():
    """Crée une nouvelle catégorie."""
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    color = data.get("color", "").strip()
    weekly_target_minutes = data.get("weekly_target_minutes", 0)

    if not name:
        return error("Le nom est obligatoire")
    if not color or not color.startswith("#") or len(color) != 7:
        return error("La couleur doit être au format hexadécimal (#RRGGBB)")

    category = Category(
        user_id=g.current_user.id,
        name=name,
        color=color,
        weekly_target_minutes=int(weekly_target_minutes),
    )
    db.session.add(category)
    db.session.commit()
    return success(category.to_dict(), status_code=201)


@categories_blueprint.put("/<category_id>")
@require_auth
def update_category(category_id):
    """Modifie une catégorie existante."""
    category = _get_user_category(category_id)
    if not category:
        return error("Catégorie introuvable", 404)

    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = data["name"].strip()
        if not name:
            return error("Le nom ne peut pas être vide")
        category.name = name

    if "color" in data:
        color = data["color"].strip()
        if not color.startswith("#") or len(color) != 7:
            return error("La couleur doit être au format hexadécimal (#RRGGBB)")
        category.color = color

    if "weekly_target_minutes" in data:
        category.weekly_target_minutes = int(data["weekly_target_minutes"])

    db.session.commit()
    return success(category.to_dict())


@categories_blueprint.delete("/<category_id>")
@require_auth
def delete_category(category_id):
    """
    Supprime une catégorie.
    Les tâches associées perdent leur category_id et deliverable_id
    (les livrables de la catégorie sont aussi supprimés par cascade).
    """
    category = _get_user_category(category_id)
    if not category:
        return error("Catégorie introuvable", 404)

    # Nullifier les tâches qui appartiennent à cette catégorie
    # avant que SQLAlchemy cascade-delete les livrables
    Task.query.filter_by(category_id=category_id).update(
        {"category_id": None, "deliverable_id": None}
    )

    db.session.delete(category)
    db.session.commit()
    return success({"id": category_id})


def _get_user_category(category_id: str):
    """Récupère une catégorie appartenant à l'utilisateur connecté."""
    return Category.query.filter_by(
        id=category_id, user_id=g.current_user.id
    ).first()
