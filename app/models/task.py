"""
Modèle représentant une tâche / action.
"""

from dataclasses import dataclass
from typing import Optional
from app import config


@dataclass
class Task:
    """Tâche ou action, rattachée ou non à un sujet."""

    id: Optional[int]
    user_id: int
    subject_id: Optional[int]  # None si tâche indépendante
    title: str
    description: Optional[str]
    priority: int       # 0=aucune 1=faible 2=moyenne 3=haute
    urgency_level: int  # 0=aucune 1=faible 2=moyenne 3=urgente 4=critique
    deadline: Optional[str]  # ISO YYYY-MM-DD
    status: str         # active | completed | archived
    created_at: str
    updated_at: str
    archived_at: Optional[str]

    @property
    def urgency_label(self) -> str:
        """Retourne le libellé lisible du niveau d'urgence."""
        return config.URGENCY_LEVELS.get(self.urgency_level, "Inconnu")

    @property
    def priority_label(self) -> str:
        """Retourne le libellé lisible du niveau de priorité."""
        return config.PRIORITY_LEVELS.get(self.priority, "Inconnu")

    @property
    def is_active(self) -> bool:
        """Indique si la tâche est en cours (non complétée ni archivée)."""
        return self.status == config.STATUS_ACTIVE

    @property
    def is_completed(self) -> bool:
        """Indique si la tâche est marquée comme complétée."""
        return self.status == config.STATUS_COMPLETED
