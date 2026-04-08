"""
Utilitaires partagés entre les routes : résolution de l'utilisateur connecté.
"""

from typing import Optional
from flask import session

from app.models.user import User
from app.repositories.auth_session_repository import AuthSessionRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.repositories.login_code_repository import LoginCodeRepository


def get_current_user() -> Optional[User]:
    """
    Retourne l'utilisateur connecté à partir du token de session Flask,
    ou None si la session est absente ou expirée.
    """
    token = session.get("auth_token")
    if not token:
        return None

    auth_service = AuthService(
        user_repository=UserRepository(),
        auth_session_repository=AuthSessionRepository(),
        login_code_repository=LoginCodeRepository(),
        email_service=EmailService(),
    )
    return auth_service.get_user_from_token(token)
