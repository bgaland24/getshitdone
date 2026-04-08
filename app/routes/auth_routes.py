"""
Routes d'authentification : inscription, vérification, connexion, déconnexion.
"""

from flask import Blueprint, request, render_template, redirect, url_for, session, flash

from app.repositories.user_repository import UserRepository
from app.repositories.auth_session_repository import AuthSessionRepository
from app.repositories.login_code_repository import LoginCodeRepository
from app.services.auth_service import AuthService
from app.services.email_service import EmailService

auth_blueprint = Blueprint("auth", __name__, url_prefix="/auth")


def _make_auth_service() -> AuthService:
    """Instancie le service d'auth avec ses dépendances."""
    return AuthService(
        user_repository=UserRepository(),
        auth_session_repository=AuthSessionRepository(),
        login_code_repository=LoginCodeRepository(),
        email_service=EmailService(),
    )


# ---------------------------------------------------------------------------
# Inscription
# ---------------------------------------------------------------------------

@auth_blueprint.route("/register", methods=["GET", "POST"])
def register():
    """Affiche et traite le formulaire d'inscription."""
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        password_confirm = request.form.get("password_confirm", "")

        if not email or not password:
            flash("Email et mot de passe requis.", "error")
            return render_template("auth/register.html")

        if password != password_confirm:
            flash("Les mots de passe ne correspondent pas.", "error")
            return render_template("auth/register.html")

        if len(password) < 8:
            flash("Le mot de passe doit contenir au moins 8 caractères.", "error")
            return render_template("auth/register.html")

        service = _make_auth_service()
        success, error = service.register(email, password)

        if not success:
            flash(error, "error")
            return render_template("auth/register.html")

        session["pending_verification_email"] = email
        flash("Compte créé ! Vérifiez votre email.", "success")
        return redirect(url_for("auth.verify"))

    return render_template("auth/register.html")


# ---------------------------------------------------------------------------
# Vérification de l'email
# ---------------------------------------------------------------------------

@auth_blueprint.route("/verify", methods=["GET", "POST"])
def verify():
    """Affiche et traite le formulaire de vérification du code email."""
    email = session.get("pending_verification_email", "")

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower() or email
        code = request.form.get("code", "").strip()

        service = _make_auth_service()
        success, error = service.verify_account(email, code)

        if not success:
            flash(error, "error")
            return render_template("auth/verify.html", email=email)

        session.pop("pending_verification_email", None)
        flash("Email vérifié ! Vous pouvez maintenant vous connecter.", "success")
        return redirect(url_for("auth.login"))

    return render_template("auth/verify.html", email=email)


@auth_blueprint.route("/verify/resend", methods=["POST"])
def resend_verification():
    """Renvoie un nouveau code de vérification."""
    email = request.form.get("email", "").strip().lower()
    service = _make_auth_service()
    success, error = service.resend_verification_code(email)

    if success:
        flash("Un nouveau code a été envoyé.", "success")
    else:
        flash(error, "error")

    return redirect(url_for("auth.verify"))


# ---------------------------------------------------------------------------
# Connexion
# ---------------------------------------------------------------------------

@auth_blueprint.route("/login", methods=["GET", "POST"])
def login():
    """Affiche et traite le formulaire de connexion email + mot de passe."""
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        service = _make_auth_service()
        token, error = service.login_with_password(email, password)

        if not token:
            flash(error, "error")
            return render_template("auth/login.html")

        session["auth_token"] = token
        return redirect(url_for("lobby.index"))

    return render_template("auth/login.html")


@auth_blueprint.route("/magic", methods=["GET", "POST"])
def magic_login():
    """Connexion par code magique envoyé par email."""
    if request.method == "POST":
        action = request.form.get("action")
        email = request.form.get("email", "").strip().lower()

        service = _make_auth_service()

        if action == "send_code":
            success, error = service.send_magic_code(email)
            if not success:
                flash(error, "error")
            else:
                flash("Code envoyé. Vérifiez votre email.", "success")
                session["magic_login_email"] = email
            return render_template("auth/magic_login.html", step="enter_code", email=email)

        if action == "verify_code":
            code = request.form.get("code", "").strip()
            token, error = service.login_with_magic_code(email, code)

            if not token:
                flash(error, "error")
                return render_template("auth/magic_login.html", step="enter_code", email=email)

            session.pop("magic_login_email", None)
            session["auth_token"] = token
            return redirect(url_for("lobby.index"))

    email = session.get("magic_login_email", "")
    return render_template("auth/magic_login.html", step="send_code", email=email)


# ---------------------------------------------------------------------------
# Déconnexion
# ---------------------------------------------------------------------------

@auth_blueprint.route("/logout", methods=["POST"])
def logout():
    """Invalide la session et redirige vers la page de connexion."""
    token = session.pop("auth_token", None)
    if token:
        from app.repositories.auth_session_repository import AuthSessionRepository
        AuthSessionRepository().delete_by_token(token)

    return redirect(url_for("auth.login"))
