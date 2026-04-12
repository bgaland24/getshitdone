"""
Tests des routes HTTP non couvertes par test_organize.py.
Couvre : actions sur tâches (pin/unpin/start/pause/done/undone/cancel),
         auth (cas limites), préférences (GET/PUT), et création de tâche en mode détaillé.
"""

from datetime import date, timedelta


# ─── Helpers ──────────────────────────────────────────────────────────────────

def register_and_login(client, email="routes@test.com", password="password123"):
    resp = client.post("/api/auth/register", json={"email": email, "password": password})
    assert resp.status_code == 201
    return resp.get_json()["data"]["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def create_task(client, token, title="Tâche test", **kwargs):
    payload = {"title": title, **kwargs}
    resp = client.post("/api/tasks/", json=payload, headers=auth(token))
    assert resp.status_code == 201
    return resp.get_json()["data"]


def tomorrow_str():
    return (date.today() + timedelta(days=1)).isoformat()


# ─── Auth — cas limites ───────────────────────────────────────────────────────

class TestAuthCasLimites:
    """Validation des champs d'inscription et protection des routes."""

    def test_register_sans_email_retourne_400(self, client):
        resp = client.post("/api/auth/register", json={"password": "motdepasse123"})
        assert resp.status_code == 400

    def test_register_sans_password_retourne_400(self, client):
        resp = client.post("/api/auth/register", json={"email": "x@x.com"})
        assert resp.status_code == 400

    def test_route_protegee_sans_token_retourne_401(self, client):
        resp = client.get("/api/tasks/")
        assert resp.status_code == 401

    def test_route_protegee_token_invalide_retourne_401(self, client):
        resp = client.get("/api/tasks/", headers={"Authorization": "Bearer token_bidon"})
        assert resp.status_code == 401

    def test_refresh_token_invalide_retourne_401(self, client):
        resp = client.post("/api/auth/refresh", json={"refresh_token": "faux_token"})
        assert resp.status_code == 401


# ─── Création tâche en mode détaillé ─────────────────────────────────────────

class TestCreationTacheDetaillee:
    """POST /api/tasks/ avec critères de qualification → is_qualified = true."""

    def test_creation_avec_qualification_immediate(self, client):
        """Créer une tâche avec urgency + importance + horizon → is_qualified dès la création."""
        token = register_and_login(client, "detailed@test.com")
        resp = client.post(
            "/api/tasks/",
            json={
                "title": "Tâche détaillée",
                "urgency": "urgent",
                "importance": "important",
                "horizon": "2026-12-31",
                "delegation": "delegable",
                "estimated_minutes": 30,
            },
            headers=auth(token),
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["is_qualified"] is True
        assert data["urgency"] == "urgent"
        assert data["horizon"] == "2026-12-31"

    def test_creation_titre_vide_retourne_400(self, client):
        token = register_and_login(client, "empty_title@test.com")
        resp = client.post("/api/tasks/", json={"title": ""}, headers=auth(token))
        assert resp.status_code == 400

    def test_creation_sans_titre_retourne_400(self, client):
        token = register_and_login(client, "no_title@test.com")
        resp = client.post("/api/tasks/", json={}, headers=auth(token))
        assert resp.status_code == 400


# ─── Actions tâches — épinglage via routes HTTP ──────────────────────────────

class TestPinUnpinRoutes:
    """POST /api/tasks/<id>/pin et /unpin."""

    def test_pin_passe_en_prioritized(self, client):
        token = register_and_login(client, "pin1@test.com")
        task = create_task(client, token, "À épingler")

        resp = client.post(
            f"/api/tasks/{task['id']}/pin",
            json={"pin_date": tomorrow_str()},
            headers=auth(token),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["status"] == "prioritized"
        assert data["priority_current_date"] == tomorrow_str()

    def test_pin_sans_pin_date_retourne_400(self, client):
        token = register_and_login(client, "pin2@test.com")
        task = create_task(client, token)

        resp = client.post(
            f"/api/tasks/{task['id']}/pin",
            json={},
            headers=auth(token),
        )
        assert resp.status_code == 400

    def test_pin_date_invalide_retourne_400(self, client):
        token = register_and_login(client, "pin3@test.com")
        task = create_task(client, token)

        resp = client.post(
            f"/api/tasks/{task['id']}/pin",
            json={"pin_date": "pas-une-date"},
            headers=auth(token),
        )
        assert resp.status_code == 400

    def test_quatrieme_pin_meme_date_retourne_422(self, client):
        """La 4ème tâche épinglée sur la même date est refusée → 422."""
        token = register_and_login(client, "pin4@test.com")
        d = tomorrow_str()
        for i in range(3):
            t = create_task(client, token, f"Tâche {i}")
            resp = client.post(f"/api/tasks/{t['id']}/pin", json={"pin_date": d}, headers=auth(token))
            assert resp.status_code == 200

        quatrieme = create_task(client, token, "Tâche 4")
        resp = client.post(
            f"/api/tasks/{quatrieme['id']}/pin",
            json={"pin_date": d},
            headers=auth(token),
        )
        assert resp.status_code == 422

    def test_unpin_repasse_new(self, client):
        token = register_and_login(client, "unpin1@test.com")
        task = create_task(client, token)

        client.post(f"/api/tasks/{task['id']}/pin", json={"pin_date": tomorrow_str()}, headers=auth(token))

        resp = client.post(f"/api/tasks/{task['id']}/unpin", headers=auth(token))
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["status"] == "new"
        assert data["priority_current_date"] is None

    def test_unpin_tache_non_epinglee_retourne_400(self, client):
        token = register_and_login(client, "unpin2@test.com")
        task = create_task(client, token)

        resp = client.post(f"/api/tasks/{task['id']}/unpin", headers=auth(token))
        assert resp.status_code == 400


# Désactivé : timer démarrer/pause via routes HTTP
#
# class TestTimerRoutes:
#     """POST /api/tasks/<id>/start et /pause."""
#
#     def test_start_retourne_task_et_session(self, client):
#         token = register_and_login(client, "start1@test.com")
#         task = create_task(client, token)
#         resp = client.post(f"/api/tasks/{task['id']}/start", headers=auth(token))
#         assert resp.status_code == 200
#         data = resp.get_json()["data"]
#         assert data["task"]["status"] == "in_progress"
#         assert data["session"]["stopped_at"] is None
#
#     def test_start_deux_fois_retourne_422(self, client):
#         """Démarrer deux tâches simultanément → 422 sur la seconde."""
#         token = register_and_login(client, "start2@test.com")
#         t1 = create_task(client, token, "T1")
#         t2 = create_task(client, token, "T2")
#         client.post(f"/api/tasks/{t1['id']}/start", headers=auth(token))
#         resp = client.post(f"/api/tasks/{t2['id']}/start", headers=auth(token))
#         assert resp.status_code == 422
#
#     def test_start_tache_done_retourne_400(self, client):
#         token = register_and_login(client, "start3@test.com")
#         task = create_task(client, token)
#         client.post(f"/api/tasks/{task['id']}/done", headers=auth(token))
#         resp = client.post(f"/api/tasks/{task['id']}/start", headers=auth(token))
#         assert resp.status_code == 400
#
#     def test_pause_retourne_task_et_session_cloturee(self, client):
#         token = register_and_login(client, "pause1@test.com")
#         task = create_task(client, token)
#         client.post(f"/api/tasks/{task['id']}/start", headers=auth(token))
#         resp = client.post(f"/api/tasks/{task['id']}/pause", headers=auth(token))
#         assert resp.status_code == 200
#         data = resp.get_json()["data"]
#         assert data["session"]["stopped_at"] is not None
#         assert data["session"]["duration_minutes"] is not None
#
#     def test_pause_sans_session_active_retourne_422(self, client):
#         token = register_and_login(client, "pause2@test.com")
#         task = create_task(client, token)
#         resp = client.post(f"/api/tasks/{task['id']}/pause", headers=auth(token))
#         assert resp.status_code == 422


# ─── Actions tâches — done/undone/cancel ─────────────────────────────────────

class TestDoneUndoneCancel:
    """POST /api/tasks/<id>/done|undone|cancel."""

    def test_done_retourne_statut_done(self, client):
        token = register_and_login(client, "done1@test.com")
        task = create_task(client, token)

        resp = client.post(f"/api/tasks/{task['id']}/done", headers=auth(token))
        assert resp.status_code == 200
        assert resp.get_json()["data"]["status"] == "done"

    def test_done_deux_fois_retourne_400(self, client):
        token = register_and_login(client, "done2@test.com")
        task = create_task(client, token)
        client.post(f"/api/tasks/{task['id']}/done", headers=auth(token))

        resp = client.post(f"/api/tasks/{task['id']}/done", headers=auth(token))
        assert resp.status_code == 400

    def test_undone_remet_en_new(self, client):
        token = register_and_login(client, "undone1@test.com")
        task = create_task(client, token)
        client.post(f"/api/tasks/{task['id']}/done", headers=auth(token))

        resp = client.post(f"/api/tasks/{task['id']}/undone", headers=auth(token))
        assert resp.status_code == 200
        assert resp.get_json()["data"]["status"] == "new"

    def test_undone_depuis_new_retourne_422(self, client):
        token = register_and_login(client, "undone2@test.com")
        task = create_task(client, token)

        resp = client.post(f"/api/tasks/{task['id']}/undone", headers=auth(token))
        assert resp.status_code == 422

    def test_cancel_retourne_statut_cancelled(self, client):
        token = register_and_login(client, "cancel1@test.com")
        task = create_task(client, token)

        resp = client.post(f"/api/tasks/{task['id']}/cancel", headers=auth(token))
        assert resp.status_code == 200
        assert resp.get_json()["data"]["status"] == "cancelled"

    def test_cancel_depuis_done_retourne_422(self, client):
        token = register_and_login(client, "cancel2@test.com")
        task = create_task(client, token)
        client.post(f"/api/tasks/{task['id']}/done", headers=auth(token))

        resp = client.post(f"/api/tasks/{task['id']}/cancel", headers=auth(token))
        assert resp.status_code == 422


# ─── Préférences ─────────────────────────────────────────────────────────────

class TestPreferencesRoutes:
    """GET et PUT /api/preferences/."""

    def test_get_preferences_cree_si_absentes(self, client):
        """Premier appel GET → préférences créées avec valeurs par défaut."""
        token = register_and_login(client, "prefs_get@test.com")
        resp = client.get("/api/preferences/", headers=auth(token))
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["sort_axes"] == ["horizon", "delegation", "urgency", "importance"]

    def test_get_preferences_deux_fois_stable(self, client):
        """Appeler GET deux fois retourne les mêmes données sans erreur."""
        token = register_and_login(client, "prefs_get2@test.com")
        resp1 = client.get("/api/preferences/", headers=auth(token))
        resp2 = client.get("/api/preferences/", headers=auth(token))
        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp1.get_json()["data"] == resp2.get_json()["data"]

    def test_put_preferences_axes_valides(self, client):
        """PUT avec axes valides → mise à jour persistée."""
        token = register_and_login(client, "prefs_put@test.com")
        new_axes = ["importance", "urgency", "delegation", "horizon"]
        resp = client.put("/api/preferences/", json={"sort_axes": new_axes}, headers=auth(token))
        assert resp.status_code == 200
        assert resp.get_json()["data"]["sort_axes"] == new_axes

        # Vérification de la persistance
        get_resp = client.get("/api/preferences/", headers=auth(token))
        assert get_resp.get_json()["data"]["sort_axes"] == new_axes

    def test_put_preferences_axes_invalides_retourne_400(self, client):
        """PUT avec axe inconnu → 400."""
        token = register_and_login(client, "prefs_invalid@test.com")
        resp = client.put(
            "/api/preferences/",
            json={"sort_axes": ["horizon", "delegation", "urgency", "inexistant"]},
            headers=auth(token),
        )
        assert resp.status_code == 400

    def test_put_preferences_axes_incomplets_retourne_400(self, client):
        """PUT avec moins de 4 axes → 400."""
        token = register_and_login(client, "prefs_short@test.com")
        resp = client.put(
            "/api/preferences/",
            json={"sort_axes": ["horizon", "delegation"]},
            headers=auth(token),
        )
        assert resp.status_code == 400

    def test_put_preferences_sans_sort_axes_retourne_400(self, client):
        """PUT sans champ sort_axes → 400."""
        token = register_and_login(client, "prefs_empty@test.com")
        resp = client.put("/api/preferences/", json={}, headers=auth(token))
        assert resp.status_code == 400

    def test_preferences_sans_token_retourne_401(self, client):
        resp = client.get("/api/preferences/")
        assert resp.status_code == 401
