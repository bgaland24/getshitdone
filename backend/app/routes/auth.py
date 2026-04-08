"""
Blueprint auth — routes d'inscription, connexion et renouvellement de token.
"""

from flask import Blueprint, request

from app.services.auth_service import AuthService
from app.utils.response import success, error

auth_blueprint = Blueprint("auth", __name__, url_prefix="/api/auth")
auth_service = AuthService()


@auth_blueprint.post("/register")
def register():
    """Crée un nouveau compte utilisateur."""
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return error("Email et mot de passe obligatoires")

    if len(password) < 8:
        return error("Le mot de passe doit contenir au moins 8 caractères")

    try:
        user = auth_service.register(email, password)
    except ValueError as e:
        return error(str(e))

    access_token = auth_service.generate_access_token(user)
    refresh_token = auth_service.generate_refresh_token(user)

    return success(
        {"user": user.to_dict(), "access_token": access_token, "refresh_token": refresh_token},
        status_code=201,
    )


@auth_blueprint.post("/login")
def login():
    """Authentifie un utilisateur et retourne les tokens JWT."""
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return error("Email et mot de passe obligatoires")

    try:
        user = auth_service.login(email, password)
    except ValueError as e:
        return error(str(e), 401)

    access_token = auth_service.generate_access_token(user)
    refresh_token = auth_service.generate_refresh_token(user)

    return success(
        {"user": user.to_dict(), "access_token": access_token, "refresh_token": refresh_token}
    )


@auth_blueprint.post("/refresh")
def refresh():
    """Génère un nouvel access token à partir d'un refresh token valide."""
    data = request.get_json(silent=True) or {}
    refresh_token = data.get("refresh_token", "")

    if not refresh_token:
        return error("Refresh token manquant")

    try:
        user = auth_service.decode_refresh_token(refresh_token)
    except ValueError as e:
        return error(str(e), 401)

    access_token = auth_service.generate_access_token(user)

    return success({"access_token": access_token})
