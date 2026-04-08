"""
Blueprint deliverables — CRUD des livrables au sein d'une catégorie.
"""

from flask import Blueprint, request, g

from app.database import db
from app.models.deliverable import Deliverable
from app.models.category import Category
from app.utils.auth_decorator import require_auth
from app.utils.response import success, error

deliverables_blueprint = Blueprint("deliverables", __name__, url_prefix="/api/deliverables")


@deliverables_blueprint.get("/")
@require_auth
def list_deliverables():
    """Retourne les livrables, filtrés par catégorie si précisé."""
    category_id = request.args.get("category_id")

    query = (
        Deliverable.query
        .join(Category, Deliverable.category_id == Category.id)
        .filter(Category.user_id == g.current_user.id)
    )

    if category_id:
        query = query.filter(Deliverable.category_id == category_id)

    deliverables = query.all()
    return success([d.to_dict() for d in deliverables])


@deliverables_blueprint.post("/")
@require_auth
def create_deliverable():
    """Crée un nouveau livrable dans une catégorie."""
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    category_id = data.get("category_id", "")

    if not name:
        return error("Le nom est obligatoire")
    if not category_id:
        return error("L'identifiant de catégorie est obligatoire")

    # Vérifie que la catégorie appartient bien à l'utilisateur
    category = Category.query.filter_by(
        id=category_id, user_id=g.current_user.id
    ).first()
    if not category:
        return error("Catégorie introuvable", 404)

    deliverable = Deliverable(name=name, category_id=category_id)
    db.session.add(deliverable)
    db.session.commit()
    return success(deliverable.to_dict(), status_code=201)


@deliverables_blueprint.put("/<deliverable_id>")
@require_auth
def update_deliverable(deliverable_id):
    """Modifie le nom d'un livrable."""
    deliverable = _get_user_deliverable(deliverable_id)
    if not deliverable:
        return error("Livrable introuvable", 404)

    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = data["name"].strip()
        if not name:
            return error("Le nom ne peut pas être vide")
        deliverable.name = name

    db.session.commit()
    return success(deliverable.to_dict())


@deliverables_blueprint.delete("/<deliverable_id>")
@require_auth
def delete_deliverable(deliverable_id):
    """Supprime un livrable."""
    deliverable = _get_user_deliverable(deliverable_id)
    if not deliverable:
        return error("Livrable introuvable", 404)

    db.session.delete(deliverable)
    db.session.commit()
    return success({"id": deliverable_id})


def _get_user_deliverable(deliverable_id: str):
    """Récupère un livrable appartenant à l'utilisateur connecté (via sa catégorie)."""
    return (
        Deliverable.query
        .join(Category, Deliverable.category_id == Category.id)
        .filter(
            Deliverable.id == deliverable_id,
            Category.user_id == g.current_user.id,
        )
        .first()
    )
