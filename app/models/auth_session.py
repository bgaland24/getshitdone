"""
Modèle représentant une session d'authentification persistante.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class AuthSession:
    """Session d'authentification associée à un cookie de session."""

    id: Optional[int]
    user_id: int
    token: str
    expires_at: str
    created_at: str
