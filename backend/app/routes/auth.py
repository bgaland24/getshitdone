"""
Blueprint auth — routes d'inscription, connexion et renouvellement de token.
"""

from flask import Blueprint, request, current_app

from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.services.password_reset_service import PasswordResetService
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


def _get_password_reset_service() -> PasswordResetService:
    """
    Factory — construit le PasswordResetService avec les credentials SMTP issus de la config.
    Instancié à la demande (et non au chargement du module) car current_app requiert
    un contexte d'application Flask actif.
    """
    email_service = EmailService(
        gmail_user=current_app.config["GMAIL_USER"],
        gmail_app_password=current_app.config["GMAIL_APP_PASSWORD"],
    )
    return PasswordResetService(email_service)


@auth_blueprint.post("/forgot-password")
def forgot_password():
    """
    Déclenche l'envoi d'un email de réinitialisation.
    Retourne toujours HTTP 200 avec le même message, que l'email existe ou non (anti-énumération).
    """
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return error("Email obligatoire")

    service = _get_password_reset_service()
    service.request_reset(email, current_app.config["FRONTEND_BASE_URL"])

    return success({
        "message": "Si cet email est enregistré, un lien de réinitialisation a été envoyé."
    })


@auth_blueprint.post("/reset-password")
def reset_password():
    """Valide le token de réinitialisation et met à jour le mot de passe."""
    data = request.get_json(silent=True) or {}
    token = data.get("token", "").strip()
    password = data.get("password", "")

    if not token or not password:
        return error("Token et nouveau mot de passe obligatoires")

    if len(password) < 8:
        return error("Le mot de passe doit contenir au moins 8 caractères")

    try:
        service = _get_password_reset_service()
        service.reset_password(token, password)
    except ValueError as exc:
        return error(str(exc), 400)

    return success({"message": "Mot de passe mis à jour avec succès."})
