"""
Configuration de l'application Flask.
Les valeurs sensibles sont injectées via les variables d'environnement définies dans wsgi.py.
"""

import os


class Config:
    """Configuration de base partagée entre tous les environnements."""

    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-in-production")

    # Durée de validité des tokens JWT
    JWT_ACCESS_TOKEN_EXPIRY_HOURS = 24
    JWT_REFRESH_TOKEN_EXPIRY_DAYS = 30

    # Envoi d'email via Gmail SMTP (App Password Google requis)
    GMAIL_USER = os.environ.get("GMAIL_USER", "")
    GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")

    # URL du frontend — utilisée pour construire le lien de réinitialisation dans l'email
    FRONTEND_BASE_URL = os.environ.get("FRONTEND_BASE_URL", "http://localhost:5173")

    # Durée de validité d'un token de réinitialisation de mot de passe (en minutes)
    PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 15

    # SQLAlchemy
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DevelopmentConfig(Config):
    """Configuration pour le développement local."""

    DEBUG = True
    # En mode E2E (tests Playwright), utilise une base séparée pour ne pas polluer la dev
    _default_db = "sqlite:///intentionality_e2e.db" if os.environ.get("E2E_TESTING") else "sqlite:///intentionality_dev.db"
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", _default_db)


class ProductionConfig(Config):
    """Configuration pour la production (PythonAnywhere)."""

    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///intentionality.db"
    )


# Mapping nom → classe de config
CONFIG_MAP = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}
