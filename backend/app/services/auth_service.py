"""
AuthService — logique métier pour l'authentification.
Gère le hachage des mots de passe, la création de comptes et la génération de tokens JWT.
"""

import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from flask import current_app

from app.database import db
from app.models.user import User


class AuthService:
    """Service d'authentification : inscription, connexion, tokens JWT."""

    def register(self, email: str, password: str) -> User:
        """
        Crée un nouveau compte utilisateur.
        Lève ValueError si l'email est déjà utilisé.
        """
        if User.query.filter_by(email=email).first():
            raise ValueError("Cet email est déjà utilisé")

        password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        user = User(email=email, password_hash=password_hash)
        db.session.add(user)
        db.session.commit()
        return user

    def login(self, email: str, password: str) -> User:
        """
        Vérifie les identifiants et retourne l'utilisateur.
        Lève ValueError si les identifiants sont incorrects.
        """
        user = User.query.filter_by(email=email).first()
        if not user:
            raise ValueError("Email ou mot de passe incorrect")

        if not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8")):
            raise ValueError("Email ou mot de passe incorrect")

        return user

    def generate_access_token(self, user: User) -> str:
        """Génère un access token JWT valable 24h."""
        expiry_hours = current_app.config["JWT_ACCESS_TOKEN_EXPIRY_HOURS"]
        payload = {
            "user_id": user.id,
            "email": user.email,
            "exp": datetime.now(timezone.utc) + timedelta(hours=expiry_hours),
            "type": "access",
        }
        return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")

    def generate_refresh_token(self, user: User) -> str:
        """Génère un refresh token JWT valable 30 jours."""
        expiry_days = current_app.config["JWT_REFRESH_TOKEN_EXPIRY_DAYS"]
        payload = {
            "user_id": user.id,
            "exp": datetime.now(timezone.utc) + timedelta(days=expiry_days),
            "type": "refresh",
        }
        return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")

    def decode_refresh_token(self, token: str) -> User:
        """
        Valide un refresh token et retourne l'utilisateur associé.
        Lève ValueError si le token est invalide ou expiré.
        """
        try:
            payload = jwt.decode(
                token,
                current_app.config["JWT_SECRET_KEY"],
                algorithms=["HS256"],
            )
        except jwt.ExpiredSignatureError:
            raise ValueError("Refresh token expiré")
        except jwt.InvalidTokenError:
            raise ValueError("Refresh token invalide")

        if payload.get("type") != "refresh":
            raise ValueError("Type de token incorrect")

        from app.database import db
        user = db.session.get(User, payload["user_id"])
        if not user:
            raise ValueError("Utilisateur introuvable")

        return user
