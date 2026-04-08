"""
Gestion de la connexion SQLite et initialisation du schéma.
Fournit un helper thread-safe pour obtenir une connexion à la base de données.
"""

import sqlite3
import os
from app import config


def get_connection() -> sqlite3.Connection:
    """
    Retourne une connexion SQLite configurée.
    - row_factory = sqlite3.Row pour accéder aux colonnes par nom
    - foreign_keys activées
    """
    connection = sqlite3.connect(config.DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database() -> None:
    """
    Crée les tables à partir du fichier schema.sql si elles n'existent pas.
    Appelé au démarrage de l'application.
    """
    schema_path = os.path.join(
        os.path.dirname(__file__), "..", "database", "schema.sql"
    )

    with open(schema_path, "r", encoding="utf-8") as schema_file:
        schema_sql = schema_file.read()

    with get_connection() as connection:
        connection.executescript(schema_sql)
