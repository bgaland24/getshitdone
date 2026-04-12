"""
Runner de migration SQLite minimaliste.
S'exécute au démarrage après db.create_all() pour ajouter les colonnes manquantes.
SQLite ne supporte pas DROP COLUMN < 3.35 — les anciennes colonnes sont ignorées.
"""

import logging
from app.database import db

logger = logging.getLogger(__name__)


def _column_exists(table: str, column: str) -> bool:
    """Vérifie si une colonne existe dans une table SQLite."""
    result = db.session.execute(
        db.text(f"PRAGMA table_info({table})")
    ).fetchall()
    return any(row[1] == column for row in result)


def _table_exists(table: str) -> bool:
    """Vérifie si une table existe dans la base SQLite."""
    result = db.session.execute(
        db.text("SELECT name FROM sqlite_master WHERE type='table' AND name=:t"),
        {"t": table},
    ).fetchone()
    return result is not None


def run_migrations() -> None:
    """Applique toutes les migrations nécessaires sur la base existante."""

    # Ajout des colonnes d'épinglage sur tasks
    if _table_exists("tasks"):
        if not _column_exists("tasks", "priority_firstset_date"):
            db.session.execute(db.text(
                "ALTER TABLE tasks ADD COLUMN priority_firstset_date DATE"
            ))
            logger.info("Migration : colonne tasks.priority_firstset_date ajoutée")

        if not _column_exists("tasks", "priority_current_date"):
            db.session.execute(db.text(
                "ALTER TABLE tasks ADD COLUMN priority_current_date DATE"
            ))
            logger.info("Migration : colonne tasks.priority_current_date ajoutée")

    # Création de la table de tokens de réinitialisation de mot de passe
    if not _table_exists("password_reset_tokens"):
        db.session.execute(db.text("""
            CREATE TABLE password_reset_tokens (
                id         TEXT PRIMARY KEY,
                token      TEXT NOT NULL UNIQUE,
                user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at DATETIME NOT NULL,
                used       INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL
            )
        """))
        db.session.execute(db.text(
            "CREATE INDEX IF NOT EXISTS ix_prt_token ON password_reset_tokens(token)"
        ))
        logger.info("Migration : table password_reset_tokens créée")

    db.session.commit()
    logger.info("Migrations terminées")
