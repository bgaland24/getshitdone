"""
Modèle UserPreferences — préférences de l'utilisateur.
Stocke notamment l'ordre des axes de tri de la liste des priorités.
"""

import uuid
import json

from app.database import db

# Axes de tri disponibles et leur ordre par défaut
DEFAULT_SORT_AXES = ["horizon", "delegation", "urgency", "importance"]


class UserPreferences(db.Model):
    """Préférences par utilisateur — une ligne par user."""

    __tablename__ = "user_preferences"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), unique=True, nullable=False)

    # Ordre des axes de tri stocké en JSON — ex: ["horizon","delegation","urgency","importance"]
    sort_axes = db.Column(db.Text, nullable=False, default=lambda: json.dumps(DEFAULT_SORT_AXES))

    # Relation
    user = db.relationship("User", back_populates="preferences")

    def get_sort_axes(self) -> list[str]:
        """Désérialise la liste des axes de tri."""
        return json.loads(self.sort_axes)

    def set_sort_axes(self, axes: list[str]) -> None:
        """Valide et sérialise la liste des axes de tri."""
        valid = {"horizon", "delegation", "urgency", "importance"}
        if not all(a in valid for a in axes):
            raise ValueError(f"Axes invalides. Valeurs acceptées : {valid}")
        if len(axes) != len(valid):
            raise ValueError("Les 4 axes doivent être présents")
        self.sort_axes = json.dumps(axes)

    def to_dict(self):
        """Sérialise les préférences."""
        return {
            "user_id": self.user_id,
            "sort_axes": self.get_sort_axes(),
        }
