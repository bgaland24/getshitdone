"""
Accès aux données de la table users.
"""

from typing import Optional
from app.database import get_connection
from app.models.user import User


def _row_to_user(row) -> User:
    """Convertit une ligne SQLite en objet User."""
    return User(
        id=row["id"],
        email=row["email"],
        password_hash=row["password_hash"],
        is_verified=bool(row["is_verified"]),
        verification_code=row["verification_code"],
        verification_code_expires_at=row["verification_code_expires_at"],
        claude_api_key=row["claude_api_key"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class UserRepository:
    """Repository gérant la persistance des utilisateurs."""

    def create(self, email: str, password_hash: str, verification_code: str, expires_at: str) -> User:
        """Insère un nouvel utilisateur non vérifié et retourne l'entité créée."""
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (email, password_hash, is_verified, verification_code, verification_code_expires_at)
                VALUES (?, ?, 0, ?, ?)
                """,
                (email, password_hash, verification_code, expires_at),
            )
            row = connection.execute(
                "SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            return _row_to_user(row)

    def find_by_id(self, user_id: int) -> Optional[User]:
        """Recherche un utilisateur par son identifiant."""
        with get_connection() as connection:
            row = connection.execute(
                "SELECT * FROM users WHERE id = ?", (user_id,)
            ).fetchone()
            return _row_to_user(row) if row else None

    def find_by_email(self, email: str) -> Optional[User]:
        """Recherche un utilisateur par son email."""
        with get_connection() as connection:
            row = connection.execute(
                "SELECT * FROM users WHERE email = ?", (email,)
            ).fetchone()
            return _row_to_user(row) if row else None

    def verify(self, user_id: int) -> None:
        """Marque l'utilisateur comme vérifié et efface le code de vérification."""
        with get_connection() as connection:
            connection.execute(
                """
                UPDATE users
                SET is_verified = 1,
                    verification_code = NULL,
                    verification_code_expires_at = NULL,
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                (user_id,),
            )

    def update_claude_api_key(self, user_id: int, api_key: str) -> None:
        """Enregistre ou met à jour la clé API Claude de l'utilisateur."""
        with get_connection() as connection:
            connection.execute(
                "UPDATE users SET claude_api_key = ?, updated_at = datetime('now') WHERE id = ?",
                (api_key, user_id),
            )

    def update_verification_code(self, user_id: int, code: str, expires_at: str) -> None:
        """Met à jour le code de vérification (renvoi d'email)."""
        with get_connection() as connection:
            connection.execute(
                """
                UPDATE users
                SET verification_code = ?, verification_code_expires_at = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (code, expires_at, user_id),
            )
