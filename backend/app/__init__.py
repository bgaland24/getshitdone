"""
Factory Flask — crée et configure l'application.
Pattern factory pour permettre les tests et le déploiement multi-environnements.
"""

import os
from flask import Flask, send_from_directory, jsonify, request as flask_request
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

    # Content Security Policy — appliquée sur toutes les réponses
    _register_security_headers(flask_app)

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


def _register_security_headers(flask_app: Flask) -> None:
    """
    Ajoute les en-têtes de sécurité HTTP sur toutes les réponses.

    CSP en mode report-only en développement (pas de blocage, juste des avertissements
    dans la console) et en mode enforce en production.
    Les routes /api/* reçoivent uniquement les headers non-CSP (évite les conflits CORS).
    """

    # Directives CSP communes aux deux environnements
    _CSP_DIRECTIVES = "; ".join([
        "default-src 'self'",
        # Scripts : uniquement 'self' — pas d'eval, pas d'inline (React buildé sans)
        "script-src 'self'",
        # Styles : unsafe-inline requis car Tailwind + React injectent des styles inline
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        # Polices Google Fonts
        "font-src 'self' https://fonts.gstatic.com",
        # Requêtes XHR/fetch : uniquement 'self' (API sur même origine en prod)
        "connect-src 'self'",
        # Images : 'self' + data: (favicon SVG inline, éventuels avatars base64)
        "img-src 'self' data:",
        # Pas d'embedding dans des frames tiers — protection clickjacking
        "frame-ancestors 'none'",
        # Pas de plugins (Flash, etc.)
        "object-src 'none'",
        # Pas de <base> piratée
        "base-uri 'self'",
        # Formulaires : uniquement 'self'
        "form-action 'self'",
    ])

    is_production = flask_app.config.get("DEBUG") is False

    @flask_app.after_request
    def add_security_headers(response):
        """Injecte les en-têtes de sécurité sur chaque réponse."""
        # Pas de CSP sur les routes API (réponses JSON — les navigateurs n'en ont pas besoin,
        # et cela évite tout conflit avec les en-têtes CORS déjà présents)
        if flask_request.path.startswith("/api/"):
            return response

        if is_production:
            # Mode enforce — bloque les ressources non conformes
            response.headers["Content-Security-Policy"] = _CSP_DIRECTIVES
        else:
            # Mode report-only — log dans la console sans bloquer (utile en dev)
            response.headers["Content-Security-Policy-Report-Only"] = _CSP_DIRECTIVES

        # En-têtes complémentaires indépendants de l'environnement
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        return response


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
