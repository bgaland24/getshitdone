"""
Script de création d'un utilisateur de test local.
Crée un compte vérifié directement en base, sans envoi d'email.
Usage : python create_test_user.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import bcrypt
from app.database import initialize_database, get_connection

EMAIL = "test@test.com"
PASSWORD = "test1234"

initialize_database()

password_hash = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()

with get_connection() as connection:
    existing = connection.execute(
        "SELECT id FROM users WHERE email = ?", (EMAIL,)
    ).fetchone()

    if existing:
        print(f"Compte déjà existant pour {EMAIL}")
    else:
        connection.execute(
            """
            INSERT INTO users (email, password_hash, is_verified)
            VALUES (?, ?, 1)
            """,
            (EMAIL, password_hash),
        )
        print(f"Compte créé : {EMAIL} / {PASSWORD}")
