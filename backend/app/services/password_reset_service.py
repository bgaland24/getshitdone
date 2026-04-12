"""
PasswordResetService — cycle de vie complet de la réinitialisation de mot de passe.
Génération du token, stockage BDD, envoi email, vérification et mise à jour du mot de passe.
"""

import logging
import secrets
import time
from datetime import datetime, timezone, timedelta

import bcrypt

from app.database import db
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

# Nombre d'octets de la partie aléatoire — secrets.token_urlsafe(32) → ~192 bits d'entropie
TOKEN_BYTES = 32

# Délai artificiel (secondes) appliqué quand l'email n'existe pas,
# pour neutraliser l'oracle de timing (différence de temps visible/mesurable)
ANTI_TIMING_DELAY_SECONDS = 0.1


class PasswordResetService:
    """Orchestre la demande et la validation de réinitialisation de mot de passe."""

    def __init__(self, email_service: EmailService) -> None:
        self._email_service = email_service

    def request_reset(self, email: str, frontend_base_url: str) -> None:
        """
        Si l'email correspond à un compte existant :
          - invalide les anciens tokens non utilisés,
          - génère un nouveau token, le persiste,
          - envoie le lien de réinitialisation par email.
        Retourne toujours None, même si l'email est inconnu (anti-énumération).
        """
        user = User.query.filter_by(email=email).first()

        if not user:
            # Délai artificiellement équivalent pour éviter la détection par timing
            time.sleep(ANTI_TIMING_DELAY_SECONDS)
            return

        self._invalidate_old_tokens(user.id)

        token_value = self._generate_token()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        reset_token = PasswordResetToken(
            token=token_value,
            user_id=user.id,
            expires_at=expires_at,
        )
        db.session.add(reset_token)
        # Commit avant l'envoi email : si l'envoi échoue, le token est quand même
        # en base et l'utilisateur peut refaire une demande.
        db.session.commit()

        reset_link = f"{frontend_base_url}/reset-password/{token_value}"

        try:
            self._email_service.send_password_reset(email, reset_link)
        except RuntimeError as exc:
            # On log l'erreur SMTP sans la propager : révéler un échec d'envoi
            # permettrait indirectement de confirmer l'existence du compte.
            logger.error("Échec de l'envoi de l'email de réinitialisation : %s", exc)

    def reset_password(self, token: str, new_password: str) -> None:
        """
        Valide le token, met à jour le mot de passe et marque le token comme utilisé.
        Lève ValueError avec un message générique pour tout échec de validation,
        afin d'éviter les oracles (token expiré vs token invalide vs déjà utilisé).
        """
        reset_token = PasswordResetToken.query.filter_by(token=token, used=False).first()

        if reset_token is None:
            raise ValueError("Token invalide ou expiré")

        now = datetime.now(timezone.utc)
        # Normalise expires_at en UTC si la valeur BDD est naive (SQLite stocke sans timezone)
        expires_at = reset_token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if now > expires_at:
            raise ValueError("Token invalide ou expiré")

        user = reset_token.user
        new_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user.password_hash = new_hash

        # Marquage atomique avec la mise à jour du mot de passe
        reset_token.used = True
        db.session.commit()

    def _generate_token(self) -> str:
        """Retourne un token URL-safe cryptographiquement sécurisé."""
        return secrets.token_urlsafe(TOKEN_BYTES)

    def _invalidate_old_tokens(self, user_id: str) -> None:
        """Marque tous les tokens existants non utilisés de l'utilisateur comme utilisés."""
        PasswordResetToken.query.filter_by(user_id=user_id, used=False).update({"used": True})
        db.session.flush()
