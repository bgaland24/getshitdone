"""
Modèle WorkSession — session de travail chronométrée sur une tâche.
Permet de mesurer le temps réel passé et d'évaluer la qualité de clôture.
"""

import uuid
from datetime import datetime, timezone

from app.database import db


class WorkSession(db.Model):
    """Session de travail avec chronomètre et indicateur d'efficacité."""

    __tablename__ = "work_sessions"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = db.Column(db.String(36), db.ForeignKey("tasks.id"), nullable=False)
    started_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    stopped_at = db.Column(db.DateTime, nullable=True)  # None si session en cours

    # Calculé à la clôture de la session
    duration_minutes = db.Column(db.Integer, nullable=True)

    # True si la tâche a été closée dans les 5 min après cette session
    efficient = db.Column(db.Boolean, nullable=True)

    # Relation
    task = db.relationship("Task", back_populates="work_sessions")

    def to_dict(self):
        """Sérialise la session de travail."""
        return {
            "id": self.id,
            "task_id": self.task_id,
            "started_at": self.started_at.isoformat(),
            "stopped_at": self.stopped_at.isoformat() if self.stopped_at else None,
            "duration_minutes": self.duration_minutes,
            "efficient": self.efficient,
        }
