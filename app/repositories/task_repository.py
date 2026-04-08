"""
Accès aux données de la table tasks.
"""

from typing import List, Optional
from app.database import get_connection
from app.models.task import Task
from app import config


def _row_to_task(row) -> Task:
    """Convertit une ligne SQLite en objet Task."""
    return Task(
        id=row["id"],
        user_id=row["user_id"],
        subject_id=row["subject_id"],
        title=row["title"],
        description=row["description"],
        priority=row["priority"],
        urgency_level=row["urgency_level"],
        deadline=row["deadline"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        archived_at=row["archived_at"],
    )


class TaskRepository:
    """Repository gérant la persistance des tâches."""

    def create(
        self,
        user_id: int,
        title: str,
        description: Optional[str],
        priority: int,
        urgency_level: int,
        deadline: Optional[str],
        subject_id: Optional[int],
    ) -> Task:
        """Crée une nouvelle tâche et retourne l'entité."""
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO tasks (user_id, subject_id, title, description, priority, urgency_level, deadline)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (user_id, subject_id, title, description, priority, urgency_level, deadline),
            )
            row = connection.execute(
                "SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            return _row_to_task(row)

    def find_by_id(self, task_id: int) -> Optional[Task]:
        """Recherche une tâche par son identifiant."""
        with get_connection() as connection:
            row = connection.execute(
                "SELECT * FROM tasks WHERE id = ?", (task_id,)
            ).fetchone()
            return _row_to_task(row) if row else None

    def find_active_by_user(self, user_id: int) -> List[Task]:
        """Retourne toutes les tâches actives de l'utilisateur, triées par urgence puis priorité."""
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT * FROM tasks
                WHERE user_id = ? AND status = ?
                ORDER BY urgency_level DESC, priority DESC, deadline ASC NULLS LAST
                """,
                (user_id, config.STATUS_ACTIVE),
            ).fetchall()
            return [_row_to_task(row) for row in rows]

    def find_active_by_subject(self, subject_id: int) -> List[Task]:
        """Retourne les tâches actives d'un sujet donné."""
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT * FROM tasks
                WHERE subject_id = ? AND status = ?
                ORDER BY urgency_level DESC, priority DESC, deadline ASC NULLS LAST
                """,
                (subject_id, config.STATUS_ACTIVE),
            ).fetchall()
            return [_row_to_task(row) for row in rows]

    def find_standalone_active_by_user(self, user_id: int) -> List[Task]:
        """Retourne les tâches actives sans sujet rattaché."""
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT * FROM tasks
                WHERE user_id = ? AND subject_id IS NULL AND status = ?
                ORDER BY urgency_level DESC, priority DESC, deadline ASC NULLS LAST
                """,
                (user_id, config.STATUS_ACTIVE),
            ).fetchall()
            return [_row_to_task(row) for row in rows]

    def update(
        self,
        task_id: int,
        title: str,
        description: Optional[str],
        priority: int,
        urgency_level: int,
        deadline: Optional[str],
        subject_id: Optional[int],
    ) -> None:
        """Met à jour les informations d'une tâche."""
        with get_connection() as connection:
            connection.execute(
                """
                UPDATE tasks
                SET title = ?, description = ?, priority = ?, urgency_level = ?,
                    deadline = ?, subject_id = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (title, description, priority, urgency_level, deadline, subject_id, task_id),
            )

    def mark_completed(self, task_id: int) -> None:
        """Marque une tâche comme complétée."""
        with get_connection() as connection:
            connection.execute(
                """
                UPDATE tasks
                SET status = 'completed', updated_at = datetime('now')
                WHERE id = ?
                """,
                (task_id,),
            )

    def archive(self, task_id: int) -> None:
        """Archive une tâche."""
        with get_connection() as connection:
            connection.execute(
                """
                UPDATE tasks
                SET status = 'archived', archived_at = datetime('now'), updated_at = datetime('now')
                WHERE id = ?
                """,
                (task_id,),
            )
