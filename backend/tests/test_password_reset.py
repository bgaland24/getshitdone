"""
Tests d'intégration pour les routes de réinitialisation de mot de passe.
L'EmailService est mocké dans tous les tests pour éviter tout envoi SMTP réel.
"""

from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

import pytest

from app.database import db
from app.models.password_reset_token import PasswordResetToken
from app.services.email_service import EmailService
from app.services.password_reset_service import PasswordResetService

# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------

VALID_EMAIL = "user@example.com"
VALID_PASSWORD = "motdepasse123"


def _register(client):
    """Inscrit un utilisateur et retourne sa réponse."""
    return client.post(
        "/api/auth/register",
        json={"email": VALID_EMAIL, "password": VALID_PASSWORD},
    )


def _mock_reset_service(mock_email_service=None):
    """Retourne un PasswordResetService avec un EmailService mocké."""
    email_svc = mock_email_service or MagicMock(spec=EmailService)
    return PasswordResetService(email_svc)


def _insert_token(app, user_id: str, *, expired: bool = False, used: bool = False) -> str:
    """Insère un token de réinitialisation en BDD et retourne sa valeur."""
    import secrets

    token_value = secrets.token_urlsafe(32)
    if expired:
        expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    else:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    with app.app_context():
        token = PasswordResetToken(
            token=token_value,
            user_id=user_id,
            expires_at=expires_at,
            used=used,
        )
        db.session.add(token)
        db.session.commit()

    return token_value


# -------------------------------------------------------------------
# Tests — POST /api/auth/forgot-password
# -------------------------------------------------------------------


def test_forgot_password_existing_email(client, app):
    """Un email existant reçoit la réponse générique 200."""
    _register(client)

    with patch("app.routes.auth._get_password_reset_service", return_value=_mock_reset_service()):
        response = client.post(
            "/api/auth/forgot-password",
            json={"email": VALID_EMAIL},
        )

    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "lien de réinitialisation" in data["data"]["message"]


def test_forgot_password_nonexistent_email(client):
    """Un email inexistant reçoit exactement la même réponse 200 (anti-énumération)."""
    with patch("app.routes.auth._get_password_reset_service", return_value=_mock_reset_service()):
        response = client.post(
            "/api/auth/forgot-password",
            json={"email": "inconnu@example.com"},
        )

    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "lien de réinitialisation" in data["data"]["message"]


def test_forgot_password_missing_email(client):
    """Une requête sans email retourne 400."""
    with patch("app.routes.auth._get_password_reset_service", return_value=_mock_reset_service()):
        response = client.post(
            "/api/auth/forgot-password",
            json={},
        )

    assert response.status_code == 400
    assert response.get_json()["success"] is False


# -------------------------------------------------------------------
# Tests — POST /api/auth/reset-password
# -------------------------------------------------------------------


def test_reset_password_success(client, app):
    """Un token valide permet de changer le mot de passe."""
    reg = _register(client)
    user_id = reg.get_json()["data"]["user"]["id"]
    token_value = _insert_token(app, user_id)

    with patch("app.routes.auth._get_password_reset_service", return_value=_mock_reset_service()):
        response = client.post(
            "/api/auth/reset-password",
            json={"token": token_value, "password": "nouveaumotdepasse"},
        )

    assert response.status_code == 200
    assert response.get_json()["success"] is True

    # Le nouveau mot de passe doit fonctionner à la connexion
    login_response = client.post(
        "/api/auth/login",
        json={"email": VALID_EMAIL, "password": "nouveaumotdepasse"},
    )
    assert login_response.status_code == 200


def test_reset_password_expired_token(client, app):
    """Un token expiré retourne 400."""
    reg = _register(client)
    user_id = reg.get_json()["data"]["user"]["id"]
    token_value = _insert_token(app, user_id, expired=True)

    with patch("app.routes.auth._get_password_reset_service", return_value=_mock_reset_service()):
        response = client.post(
            "/api/auth/reset-password",
            json={"token": token_value, "password": "nouveaumotdepasse"},
        )

    assert response.status_code == 400
    assert response.get_json()["success"] is False


def test_reset_password_used_token(client, app):
    """Un token déjà utilisé retourne 400."""
    reg = _register(client)
    user_id = reg.get_json()["data"]["user"]["id"]
    token_value = _insert_token(app, user_id, used=True)

    with patch("app.routes.auth._get_password_reset_service", return_value=_mock_reset_service()):
        response = client.post(
            "/api/auth/reset-password",
            json={"token": token_value, "password": "nouveaumotdepasse"},
        )

    assert response.status_code == 400
    assert response.get_json()["success"] is False


def test_reset_password_invalid_token(client):
    """Un token inexistant retourne 400."""
    with patch("app.routes.auth._get_password_reset_service", return_value=_mock_reset_service()):
        response = client.post(
            "/api/auth/reset-password",
            json={"token": "token-qui-nexiste-pas", "password": "nouveaumotdepasse"},
        )

    assert response.status_code == 400
    assert response.get_json()["success"] is False


def test_reset_password_weak_password(client, app):
    """Un mot de passe trop court (< 8 caractères) retourne 400."""
    reg = _register(client)
    user_id = reg.get_json()["data"]["user"]["id"]
    token_value = _insert_token(app, user_id)

    with patch("app.routes.auth._get_password_reset_service", return_value=_mock_reset_service()):
        response = client.post(
            "/api/auth/reset-password",
            json={"token": token_value, "password": "court"},
        )

    assert response.status_code == 400
    assert response.get_json()["success"] is False


def test_reset_password_token_used_after_success(client, app):
    """Après un reset réussi, réutiliser le même token retourne 400."""
    reg = _register(client)
    user_id = reg.get_json()["data"]["user"]["id"]
    token_value = _insert_token(app, user_id)

    with patch("app.routes.auth._get_password_reset_service", return_value=_mock_reset_service()):
        # Premier usage — succès
        client.post(
            "/api/auth/reset-password",
            json={"token": token_value, "password": "nouveaumotdepasse"},
        )

        # Deuxième usage — doit échouer
        response = client.post(
            "/api/auth/reset-password",
            json={"token": token_value, "password": "autremotdepasse"},
        )

    assert response.status_code == 400
    assert response.get_json()["success"] is False


def test_forgot_password_sends_email(client, app):
    """L'email est effectivement envoyé quand l'utilisateur existe."""
    _register(client)

    mock_email_svc = MagicMock(spec=EmailService)
    service = _mock_reset_service(mock_email_svc)

    with patch("app.routes.auth._get_password_reset_service", return_value=service):
        client.post(
            "/api/auth/forgot-password",
            json={"email": VALID_EMAIL},
        )

    mock_email_svc.send_password_reset.assert_called_once()
    call_args = mock_email_svc.send_password_reset.call_args
    assert call_args[0][0] == VALID_EMAIL
    assert "/reset-password/" in call_args[0][1]
