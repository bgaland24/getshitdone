"""
Accès aux données de la table login_codes (codes magiques de connexion).
"""

from typing import Optional
from app.database import get_connection
from app.models.login_code import LoginCode


def _row_to_login_code(row) -> LoginCode:
    """Convertit une ligne SQLite en objet LoginCode."""
    return LoginCode(
        id=row["id"],
        user_id=row["user_id"],
        code=row["code"],
        expires_at=row["expires_at"],
        used=bool(row["used"]),
        created_at=row["created_at"],
    )


class LoginCodeRepository:
    """Repository gérant la persistance des codes de connexion magique."""

    def create(self, user_id: int, code: str, expires_at: str) -> LoginCode:
        """Crée un nouveau code de connexion."""
        with get_connection() as connection:
            connection.execute(
                "INSERT INTO login_codes (user_id, code, expires_at) VALUES (?, ?, ?)",
                (user_id, code, expires_at),
            )
            row = connection.execute(
                "SELECT * FROM login_codes WHERE code = ?", (code,)
            ).fetchone()
            return _row_to_login_code(row)

    def find_by_code(self, code: str) -> Optional[LoginCode]:
        """Recherche un code de connexion par sa valeur."""
        with get_connection() as connection:
            row = connection.execute(
                "SELECT * FROM login_codes WHERE code = ?", (code,)
            ).fetchone()
            return _row_to_login_code(row) if row else None

    def mark_as_used(self, code_id: int) -> None:
        """Marque un code comme utilisé pour empêcher la réutilisation."""
        with get_connection() as connection:
            connection.execute(
                "UPDATE login_codes SET used = 1 WHERE id = ?", (code_id,)
            )

    def delete_expired(self) -> None:
        """Supprime les codes expirés."""
        with get_connection() as connection:
            connection.execute(
                "DELETE FROM login_codes WHERE expires_at < datetime('now')"
            )
