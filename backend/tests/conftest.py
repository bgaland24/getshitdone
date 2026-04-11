"""
Configuration pytest — fixtures partagées entre tous les tests.
Utilise la base de données de test dédiée (intentionality_test.db).

Stratégie d'isolation :
- Les tables sont vidées AVANT chaque test (pas après)
- Garantit un état propre même si le test précédent a planté
- Le seed (seed.py) est réservé aux tests E2E Playwright
"""

import os
import pytest

# Force la BDD de test avant tout import de l'app
os.environ["DATABASE_URL"] = "sqlite:///intentionality_test.db"
os.environ["FLASK_ENV"] = "development"
os.environ["ONBOARDING_DISABLED"] = "1"

from app import create_app
from app.database import db as _db


@pytest.fixture(scope="session")
def app():
    """Crée l'application pointant sur intentionality_test.db."""
    application = create_app("development")
    application.config["TESTING"] = True

    with application.app_context():
        _db.create_all()
        yield application
        _db.drop_all()


@pytest.fixture
def client(app):
    """Client HTTP de test Flask."""
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app):
    """
    Vide toutes les tables AVANT chaque test.
    Garantit un état vierge même si le test précédent a planté
    ou si la session a été interrompue.
    """
    with app.app_context():
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()
    yield
