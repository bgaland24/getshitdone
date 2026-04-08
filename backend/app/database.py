"""
Initialisation de SQLAlchemy.
L'instance `db` est importée par les modèles et par la factory Flask.
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
