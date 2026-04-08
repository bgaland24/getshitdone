"""
Accès aux données de la table subjects.
"""

from typing import List, Optional
from app.database import get_connection
from app.models.subject import Subject
from app import config


def _row_to_subject(row) -> Subject:
    """Convertit une ligne SQLite en objet Subject."""
    return Subject(
        id=row["id"],
        user_id=row["user_id"],
        title=row["title"],
        description=row["description"],
        priority=row["priority"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        archived_at=row["archived_at"],
    )


class SubjectRepository:
    """Repository gérant la persistance des sujets."""

    def create(self, user_id: int, title: str, description: Optional[str], priority: int) -> Subject:
        """Crée un nouveau sujet et retourne l'entité."""
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO subjects (user_id, title, description, priority)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, title, description, priority),
            )
            row = connection.execute(
                "SELECT * FROM subjects WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            return _row_to_subject(row)

    def find_by_id(self, subject_id: int) -> Optional[Subject]:
        """Recherche un sujet par son identifiant."""
        with get_connection() as connection:
            row = connection.execute(
                "SELECT * FROM subjects WHERE id = ?", (subject_id,)
            ).fetchone()
            return _row_to_subject(row) if row else None

    def find_active_by_user(self, user_id: int) -> List[Subject]:
        """Retourne tous les sujets actifs d'un utilisateur, triés par priorité décroissante."""
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT * FROM subjects
                WHERE user_id = ? AND status = ?
                ORDER BY priority DESC, created_at ASC
                """,
                (user_id, config.STATUS_ACTIVE),
            ).fetchall()
            return [_row_to_subject(row) for row in rows]

    def find_archived_by_user(self, user_id: int) -> List[Subject]:
        """Retourne tous les sujets archivés d'un utilisateur."""
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT * FROM subjects
                WHERE user_id = ? AND status = ?
                ORDER BY archived_at DESC
                """,
                (user_id, config.STATUS_ARCHIVED),
            ).fetchall()
            return [_row_to_subject(row) for row in rows]

    def update(self, subject_id: int, title: str, description: Optional[str], priority: int) -> None:
        """Met à jour les informations d'un sujet."""
        with get_connection() as connection:
            connection.execute(
                """
                UPDATE subjects
                SET title = ?, description = ?, priority = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (title, description, priority, subject_id),
            )

    def archive(self, subject_id: int) -> None:
        """Archive un sujet et toutes ses tâches actives."""
        with get_connection() as connection:
            connection.execute(
                """
                UPDATE subjects
                SET status = 'archived', archived_at = datetime('now'), updated_at = datetime('now')
                WHERE id = ?
                """,
                (subject_id,),
            )
            # Archive également les tâches liées encore actives
            connection.execute(
                """
                UPDATE tasks
                SET status = 'archived', archived_at = datetime('now'), updated_at = datetime('now')
                WHERE subject_id = ? AND status = 'active'
                """,
                (subject_id,),
            )
