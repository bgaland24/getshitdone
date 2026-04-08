"""
Routes du lobby : page d'accueil après connexion listant les modules disponibles.
"""

from flask import Blueprint, render_template, redirect, url_for, session

from app.routes.utils import get_current_user

lobby_blueprint = Blueprint("lobby", __name__)


@lobby_blueprint.route("/")
def index():
    """Page d'accueil — redirige vers le lobby ou la connexion."""
    return redirect(url_for("lobby.lobby"))


@lobby_blueprint.route("/lobby")
def lobby():
    """Affiche le lobby avec les modules disponibles."""
    user = get_current_user()
    if not user:
        return redirect(url_for("auth.login"))

    return render_template("lobby/index.html", user=user)
