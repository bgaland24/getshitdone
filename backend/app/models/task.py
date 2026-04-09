"""
Modèle Task — unité de travail atomique.
Toute intention d'action se traduit en tâche.
"""

import uuid
from datetime import datetime, timezone

from app.database import db


# Valeurs autorisées pour les champs enum
TASK_STATUSES = ("new", "prioritized", "in_progress", "done", "cancelled")
URGENCY_VALUES = ("urgent", "non_urgent")
IMPORTANCE_VALUES = ("important", "non_important")
# horizon est une date ISO (YYYY-MM-DD) — ex: "2026-04-10"
DELEGATION_VALUES = ("delegable", "non_delegable", "delegated")


class Task(db.Model):
    """Tâche avec cycle de vie complet et critères de qualification."""

    __tablename__ = "tasks"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(500), nullable=False)

    # Hiérarchie (optionnels)
    category_id = db.Column(db.String(36), db.ForeignKey("categories.id"), nullable=True)
    deliverable_id = db.Column(db.String(36), db.ForeignKey("deliverables.id"), nullable=True)

    # Cycle de vie
    status = db.Column(db.String(20), nullable=False, default="new")

    # Critères de qualification (obligatoires pour is_qualified = True)
    urgency = db.Column(db.String(20), nullable=True)
    importance = db.Column(db.String(20), nullable=True)
    horizon = db.Column(db.String(10), nullable=True)

    # Critère optionnel
    delegation = db.Column(db.String(20), nullable=True)

    # Planification
    estimated_minutes = db.Column(db.Integer, nullable=True)

    # Épinglage — priority_firstset_date : date du premier épinglage (immuable)
    # priority_current_date : date d'épinglage actuelle (null si non épinglée)
    priority_firstset_date = db.Column(db.Date, nullable=True)
    priority_current_date = db.Column(db.Date, nullable=True)

    # is_qualified est recalculé à chaque modification des critères
    is_qualified = db.Column(db.Boolean, nullable=False, default=False)

    # Timestamps
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    done_at = db.Column(db.DateTime, nullable=True)

    # Relations
    user = db.relationship("User", back_populates="tasks")
    category = db.relationship("Category", back_populates="tasks")
    deliverable = db.relationship("Deliverable", back_populates="tasks")
    work_sessions = db.relationship(
        "WorkSession", back_populates="task", cascade="all, delete-orphan"
    )

    def recalculate_is_qualified(self):
        """Recalcule is_qualified selon la règle : urgency + importance + horizon tous renseignés."""
        self.is_qualified = bool(self.urgency and self.importance and self.horizon)

    def has_work_sessions(self) -> bool:
        """Retourne True si la tâche a au moins une session de travail."""
        return bool(self.work_sessions)

    def to_dict(self):
        """Sérialise la tâche avec tous ses attributs."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "category_id": self.category_id,
            "deliverable_id": self.deliverable_id,
            "status": self.status,
            "urgency": self.urgency,
            "importance": self.importance,
            "horizon": self.horizon,
            "delegation": self.delegation,
            "estimated_minutes": self.estimated_minutes,
            "priority_firstset_date": self.priority_firstset_date.isoformat() if self.priority_firstset_date else None,
            "priority_current_date": self.priority_current_date.isoformat() if self.priority_current_date else None,
            "is_qualified": self.is_qualified,
            "created_at": self.created_at.isoformat(),
            "done_at": self.done_at.isoformat() if self.done_at else None,
        }
