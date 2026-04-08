"""
Décorateur @require_auth — vérifie le JWT dans l'en-tête Authorization.
Injecte l'utilisateur courant dans g.current_user pour les routes protégées.
"""

import jwt
from functools import wraps
from flask import request, g, current_app

from app.utils.response import error


def require_auth(f):
    """Décorateur qui valide le Bearer JWT et expose g.current_user."""

    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return error("Token d'authentification manquant", 401)

        token = auth_header[len("Bearer "):]

        try:
            payload = jwt.decode(
                token,
                current_app.config["JWT_SECRET_KEY"],
                algorithms=["HS256"],
            )
        except jwt.ExpiredSignatureError:
            return error("Token expiré", 401)
        except jwt.InvalidTokenError:
            return error("Token invalide", 401)

        # Charge l'utilisateur depuis la base et l'expose dans le contexte Flask
        from app.models.user import User
        from app.database import db

        user = db.session.get(User, payload.get("user_id"))
        if not user:
            return error("Utilisateur introuvable", 401)

        g.current_user = user
        return f(*args, **kwargs)

    return decorated
