"""
Modèle SQLAlchemy pour les tokens de réinitialisation de mot de passe.
Chaque token est à usage unique et expire après PASSWORD_RESET_TOKEN_EXPIRY_MINUTES.
"""

import uuid
from datetime import datetime, timezone

from app.database import db


class PasswordResetToken(db.Model):
    """Token de réinitialisation de mot de passe lié à un utilisateur."""

    __tablename__ = "password_reset_tokens"

    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    token = db.Column(db.String(128), unique=True, nullable=False, index=True)
    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    expires_at = db.Column(db.DateTime, nullable=False)
    # Flag à usage unique — le token est marqué used=True après utilisation
    used = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship(
        "User",
        backref=db.backref("password_reset_tokens", cascade="all, delete-orphan"),
    )
