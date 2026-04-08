"""
Modèle User — représente un compte utilisateur de l'application.
"""

import uuid
from datetime import datetime, timezone

from app.database import db


class User(db.Model):
    """Compte utilisateur avec email/mot de passe hashé."""

    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relations
    categories = db.relationship("Category", back_populates="user", cascade="all, delete-orphan")
    tasks = db.relationship("Task", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        """Sérialise l'utilisateur sans exposer le mot de passe."""
        return {
            "id": self.id,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
        }
