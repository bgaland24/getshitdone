"""
Modèle Category — sphère de vie de l'utilisateur (Travail, Sport, Famille...).
Définit une couleur et un objectif de temps hebdomadaire.
"""

import uuid
from app.database import db


class Category(db.Model):
    """Catégorie de vie avec couleur et objectif temps hebdomadaire."""

    __tablename__ = "categories"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    color = db.Column(db.String(7), nullable=False)  # Format hex : #RRGGBB
    weekly_target_minutes = db.Column(db.Integer, nullable=False, default=0)

    # Relations
    user = db.relationship("User", back_populates="categories")
    deliverables = db.relationship(
        "Deliverable", back_populates="category", cascade="all, delete-orphan"
    )
    tasks = db.relationship("Task", back_populates="category")

    def to_dict(self):
        """Sérialise la catégorie."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "color": self.color,
            "weekly_target_minutes": self.weekly_target_minutes,
        }
