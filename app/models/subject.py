"""
Modèle représentant un sujet (regroupement de tâches).
"""

from dataclasses import dataclass
from typing import Optional
from app import config


@dataclass
class Subject:
    """Sujet regroupant des tâches liées."""

    id: Optional[int]
    user_id: int
    title: str
    description: Optional[str]
    priority: int  # 0=aucune 1=faible 2=moyenne 3=haute
    status: str    # active | archived
    created_at: str
    updated_at: str
    archived_at: Optional[str]

    @property
    def priority_label(self) -> str:
        """Retourne le libellé lisible du niveau de priorité."""
        return config.PRIORITY_LEVELS.get(self.priority, "Inconnu")

    @property
    def is_active(self) -> bool:
        """Indique si le sujet est actif (non archivé)."""
        return self.status == config.STATUS_ACTIVE
