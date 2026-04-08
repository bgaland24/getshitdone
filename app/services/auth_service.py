"""
Service d'authentification : inscription, vérification, connexion, déconnexion.
"""

import secrets
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

import bcrypt

from app import config
from app.models.user import User
from app.models.auth_session import AuthSession
from app.repositories.user_repository import UserRepository
from app.repositories.auth_session_repository import AuthSessionRepository
from app.repositories.login_code_repository import LoginCodeRepository
from app.services.email_service import EmailService


def _generate_numeric_code(length: int = 6) -> str:
    """Génère un code numérique aléatoire à usage unique."""
    return "".join(random.choices(string.digits, k=length))


def _future_iso(seconds: int) -> str:
    """Retourne une date ISO 8601 UTC correspondant à maintenant + seconds secondes."""
    return (datetime.now(timezone.utc) + timedelta(seconds=seconds)).strftime(
        "%Y-%m-%d %H:%M:%S"
    )


class AuthService:
    """Orchestre toutes les opérations d'authentification."""

    def __init__(
        self,
        user_repository: UserRepository,
        auth_session_repository: AuthSessionRepository,
        login_code_repository: LoginCodeRepository,
        email_service: EmailService,
    ):
        self._users = user_repository
        self._sessions = auth_session_repository
        self._login_codes = login_code_repository
        self._email = email_service

    # ------------------------------------------------------------------
    # Inscription
    # ------------------------------------------------------------------

    def register(self, email: str, password: str) -> Tuple[bool, str]:
        """
        Crée un compte utilisateur et envoie le code de vérification.
        Retourne (succès, message_erreur_ou_vide).
        """
        if self._users.find_by_email(email):
            return False, "Un compte existe déjà avec cet email."

        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        verification_code = _generate_numeric_code(6)
        expires_at = _future_iso(config.VERIFICATION_CODE_LIFETIME_SECONDS)

        self._users.create(email, password_hash, verification_code, expires_at)
        self._email.send_verification_code(email, verification_code)

        return True, ""

    # ------------------------------------------------------------------
    # Vérification du compte
    # ------------------------------------------------------------------

    def verify_account(self, email: str, code: str) -> Tuple[bool, str]:
        """
        Vérifie le code reçu par email et active le compte.
        Retourne (succès, message_erreur_ou_vide).
        """
        user = self._users.find_by_email(email)
        if not user:
            return False, "Compte introuvable."

        if user.is_verified:
            return True, ""  # Déjà vérifié, pas d'erreur

        if user.verification_code != code:
            return False, "Code incorrect."

        if user.verification_code_expires_at:
            expires = datetime.fromisoformat(user.verification_code_expires_at)
            if expires.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                return False, "Code expiré. Veuillez en demander un nouveau."

        self._users.verify(user.id)
        return True, ""

    def resend_verification_code(self, email: str) -> Tuple[bool, str]:
        """Génère et renvoie un nouveau code de vérification."""
        user = self._users.find_by_email(email)
        if not user:
            return False, "Compte introuvable."
        if user.is_verified:
            return False, "Ce compte est déjà vérifié."

        code = _generate_numeric_code(6)
        expires_at = _future_iso(config.VERIFICATION_CODE_LIFETIME_SECONDS)
        self._users.update_verification_code(user.id, code, expires_at)
        self._email.send_verification_code(email, code)
        return True, ""

    # ------------------------------------------------------------------
    # Connexion email + mot de passe
    # ------------------------------------------------------------------

    def login_with_password(self, email: str, password: str) -> Tuple[Optional[str], str]:
        """
        Authentifie l'utilisateur avec email + mot de passe.
        Retourne (token_de_session_ou_None, message_erreur_ou_vide).
        """
        user = self._users.find_by_email(email)
        if not user:
            return None, "Email ou mot de passe incorrect."

        if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
            return None, "Email ou mot de passe incorrect."

        if not user.is_verified:
            return None, "Veuillez vérifier votre email avant de vous connecter."

        token = secrets.token_urlsafe(32)
        expires_at = _future_iso(config.SESSION_LIFETIME_SECONDS)
        self._sessions.create(user.id, token, expires_at)

        return token, ""

    # ------------------------------------------------------------------
    # Connexion par code magique
    # ------------------------------------------------------------------

    def send_magic_code(self, email: str) -> Tuple[bool, str]:
        """
        Envoie un code de connexion magique à l'email indiqué.
        Retourne (succès, message_erreur_ou_vide).
        """
        user = self._users.find_by_email(email)
        if not user:
            # On ne révèle pas si l'email existe ou non (sécurité)
            return True, ""
        if not user.is_verified:
            return False, "Veuillez d'abord vérifier votre email."

        code = _generate_numeric_code(6)
        expires_at = _future_iso(config.MAGIC_CODE_LIFETIME_SECONDS)
        self._login_codes.create(user.id, code, expires_at)
        self._email.send_magic_login_code(email, code)
        return True, ""

    def login_with_magic_code(self, email: str, code: str) -> Tuple[Optional[str], str]:
        """
        Authentifie l'utilisateur avec le code magique reçu par email.
        Retourne (token_de_session_ou_None, message_erreur_ou_vide).
        """
        user = self._users.find_by_email(email)
        if not user:
            return None, "Code incorrect ou expiré."

        login_code = self._login_codes.find_by_code(code)
        if not login_code or login_code.user_id != user.id:
            return None, "Code incorrect ou expiré."
        if login_code.used:
            return None, "Ce code a déjà été utilisé."

        expires = datetime.fromisoformat(login_code.expires_at)
        if expires.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            return None, "Code expiré."

        self._login_codes.mark_as_used(login_code.id)

        token = secrets.token_urlsafe(32)
        expires_at = _future_iso(config.SESSION_LIFETIME_SECONDS)
        self._sessions.create(user.id, token, expires_at)

        return token, ""

    # ------------------------------------------------------------------
    # Résolution de session
    # ------------------------------------------------------------------

    def get_user_from_token(self, token: str) -> Optional[User]:
        """
        Retourne l'utilisateur associé à un token de session valide.
        Retourne None si le token est absent, expiré ou invalide.
        """
        session = self._sessions.find_by_token(token)
        if not session:
            return None

        expires = datetime.fromisoformat(session.expires_at)
        if expires.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            self._sessions.delete_by_token(token)
            return None

        return self._users.find_by_id(session.user_id)

    # ------------------------------------------------------------------
    # Déconnexion
    # ------------------------------------------------------------------

    def logout(self, token: str) -> None:
        """Invalide la session correspondant au token."""
        self._sessions.delete_by_token(token)
