"""
Accès aux données de la table auth_sessions.
"""

from typing import Optional
from app.database import get_connection
from app.models.auth_session import AuthSession


def _row_to_session(row) -> AuthSession:
    """Convertit une ligne SQLite en objet AuthSession."""
    return AuthSession(
        id=row["id"],
        user_id=row["user_id"],
        token=row["token"],
        expires_at=row["expires_at"],
        created_at=row["created_at"],
    )


class AuthSessionRepository:
    """Repository gérant la persistance des sessions d'authentification."""

    def create(self, user_id: int, token: str, expires_at: str) -> AuthSession:
        """Crée une nouvelle session et retourne l'entité."""
        with get_connection() as connection:
            connection.execute(
                "INSERT INTO auth_sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
                (user_id, token, expires_at),
            )
            row = connection.execute(
                "SELECT * FROM auth_sessions WHERE token = ?", (token,)
            ).fetchone()
            return _row_to_session(row)

    def find_by_token(self, token: str) -> Optional[AuthSession]:
        """Recherche une session par son token."""
        with get_connection() as connection:
            row = connection.execute(
                "SELECT * FROM auth_sessions WHERE token = ?", (token,)
            ).fetchone()
            return _row_to_session(row) if row else None

    def delete_by_token(self, token: str) -> None:
        """Supprime une session (déconnexion)."""
        with get_connection() as connection:
            connection.execute(
                "DELETE FROM auth_sessions WHERE token = ?", (token,)
            )

    def delete_expired(self) -> None:
        """Supprime toutes les sessions expirées."""
        with get_connection() as connection:
            connection.execute(
                "DELETE FROM auth_sessions WHERE expires_at < datetime('now')"
            )
