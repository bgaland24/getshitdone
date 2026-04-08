"""
Modèle Deliverable — regroupement nommé de tâches au sein d'une catégorie.
Représente un résultat concret à produire (ex : "Rapport Q1", "Refonte site").
"""

import uuid
from datetime import datetime, timezone

from app.database import db


class Deliverable(db.Model):
    """Livrable : regroupement de tâches sous un résultat concret attendu."""

    __tablename__ = "deliverables"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    category_id = db.Column(db.String(36), db.ForeignKey("categories.id"), nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relations
    category = db.relationship("Category", back_populates="deliverables")
    tasks = db.relationship("Task", back_populates="deliverable")

    def to_dict(self):
        """Sérialise le livrable."""
        return {
            "id": self.id,
            "name": self.name,
            "category_id": self.category_id,
            "created_at": self.created_at.isoformat(),
        }
