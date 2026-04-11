"""
Factory Flask — crée et configure l'application.
Pattern factory pour permettre les tests et le déploiement multi-environnements.
"""

import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

from app.database import db
from app.config import CONFIG_MAP


def create_app(config_name: str = None) -> Flask:
    """
    Crée et configure l'instance Flask.
    config_name : 'development' | 'production' (défaut : variable ENV ou 'development')
    """
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    flask_app = Flask(__name__)

    # Chargement de la configuration
    config_class = CONFIG_MAP.get(config_name, CONFIG_MAP["development"])
    flask_app.config.from_object(config_class)

    # CORS : autorise le frontend React en développement
    CORS(flask_app, resources={r"/api/*": {"origins": "*"}})

    # Initialisation de la base de données
    db.init_app(flask_app)

    # Enregistrement des blueprints
    _register_blueprints(flask_app)

    # Création des tables si elles n'existent pas + migrations
    with flask_app.app_context():
        # Import des modèles pour que SQLAlchemy les découvre
        import app.models  # noqa: F401
        db.create_all()
        from app.migrations import run_migrations
        run_migrations()

    # Route catch-all : sert les fichiers statiques ou index.html (SPA routing)
    @flask_app.route("/", defaults={"path": ""})
    @flask_app.route("/<path:path>")
    def serve_frontend(path):
        """Sert le fichier statique demandé s'il existe, sinon index.html (SPA routing)."""
        static_dir = os.path.join(os.path.dirname(flask_app.root_path), "static")
        if path and os.path.exists(os.path.join(static_dir, path)):
            return send_from_directory(static_dir, path)
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return send_from_directory(static_dir, "index.html")
        # Pendant le développement, l'API répond seule
        return jsonify({"message": "API Intentionality App"}), 200

    return flask_app


def _register_blueprints(flask_app: Flask) -> None:
    """Enregistre tous les blueprints de l'application."""
    from app.routes.auth import auth_blueprint
    from app.routes.categories import categories_blueprint
    from app.routes.deliverables import deliverables_blueprint
    from app.routes.tasks import tasks_blueprint
    from app.routes.sessions import sessions_blueprint
    from app.routes.scores import scores_blueprint
    from app.routes.preferences import preferences_blueprint

    flask_app.register_blueprint(auth_blueprint)
    flask_app.register_blueprint(categories_blueprint)
    flask_app.register_blueprint(deliverables_blueprint)
    flask_app.register_blueprint(tasks_blueprint)
    flask_app.register_blueprint(sessions_blueprint)
    flask_app.register_blueprint(scores_blueprint)
    flask_app.register_blueprint(preferences_blueprint)
