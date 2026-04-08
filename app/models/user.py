"""
Modèle représentant un utilisateur de l'application.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class User:
    """Entité utilisateur."""

    id: Optional[int]
    email: str
    password_hash: str
    is_verified: bool
    verification_code: Optional[str]
    verification_code_expires_at: Optional[str]
    claude_api_key: Optional[str]
    created_at: str
    updated_at: str

    @property
    def has_claude_api_key(self) -> bool:
        """Indique si l'utilisateur a renseigné sa clé Claude."""
        return bool(self.claude_api_key)
