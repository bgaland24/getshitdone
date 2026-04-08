"""
Factory de l'application Flask.
Initialise les extensions et enregistre les blueprints.
"""

from flask import Flask
from app import config
from app.database import initialize_database


def create_app() -> Flask:
    """Crée et configure l'instance Flask."""
    application = Flask(__name__)
    application.secret_key = config.SECRET_KEY

    # Initialisation de la base de données au démarrage
    initialize_database()

    # Enregistrement des blueprints
    from app.routes.auth_routes import auth_blueprint
    from app.routes.lobby_routes import lobby_blueprint
    from app.routes.task_routes import task_blueprint

    application.register_blueprint(auth_blueprint)
    application.register_blueprint(lobby_blueprint)
    application.register_blueprint(task_blueprint)

    return application
