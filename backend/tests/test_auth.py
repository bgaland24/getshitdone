"""
Tests d'intégration pour les routes d'authentification.
"""


def test_register_success(client):
    """Un nouvel utilisateur peut s'inscrire et reçoit des tokens."""
    response = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "motdepasse123"},
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert "refresh_token" in data["data"]
    assert data["data"]["user"]["email"] == "test@example.com"


def test_register_duplicate_email(client):
    """L'inscription échoue si l'email est déjà utilisé."""
    client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "motdepasse123"},
    )
    response = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "autremotdepasse"},
    )
    assert response.status_code == 400
    assert response.get_json()["success"] is False


def test_login_success(client):
    """Un utilisateur inscrit peut se connecter."""
    client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "motdepasse123"},
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "motdepasse123"},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "access_token" in data["data"]


def test_login_wrong_password(client):
    """La connexion échoue avec un mauvais mot de passe."""
    client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "motdepasse123"},
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "mauvais"},
    )
    assert response.status_code == 401


def test_refresh_token(client):
    """Un refresh token valide génère un nouvel access token."""
    reg = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "motdepasse123"},
    )
    refresh_token = reg.get_json()["data"]["refresh_token"]

    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    assert "access_token" in response.get_json()["data"]
