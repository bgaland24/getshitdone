"""
Configuration pytest — fixtures partagées entre tous les tests.
Utilise une base SQLite en mémoire pour l'isolation.
"""

import pytest
from app import create_app
from app.database import db as _db


@pytest.fixture(scope="session")
def app():
    """Crée l'application en mode test avec base en mémoire."""
    import os
    original_db_url = os.environ.get("DATABASE_URL")
    os.environ["FLASK_ENV"] = "development"
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"

    application = create_app("development")
    application.config["TESTING"] = True
    application.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"

    with application.app_context():
        _db.create_all()
        yield application
        _db.drop_all()

    # Restaure la variable d'environnement pour ne pas polluer les processus suivants
    if original_db_url is not None:
        os.environ["DATABASE_URL"] = original_db_url
    else:
        os.environ.pop("DATABASE_URL", None)


@pytest.fixture
def client(app):
    """Client HTTP de test Flask."""
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app):
    """Vide les tables entre chaque test pour garantir l'isolation."""
    with app.app_context():
        yield
        _db.session.rollback()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()
