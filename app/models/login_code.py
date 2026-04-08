"""
Modèle représentant un code de connexion magique (login sans mot de passe).
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class LoginCode:
    """Code envoyé par email permettant une connexion sans mot de passe."""

    id: Optional[int]
    user_id: int
    code: str
    expires_at: str
    used: bool
    created_at: str
