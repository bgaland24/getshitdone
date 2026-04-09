"""
Tests d'intégration pour les fonctionnalités de l'écran Organiser.
Couvre : listing avec filtres, déplacement de tâche (category/deliverable),
         qualification depuis le modal, suppression, et le comportement
         des catégories/livrables (CRUD + cascade).
"""

import pytest

# ─── Helpers ──────────────────────────────────────────────────────────────────

def register_and_login(client, email="org@test.com", password="password123"):
    """Inscrit un utilisateur et retourne son token d'accès."""
    resp = client.post("/api/auth/register", json={"email": email, "password": password})
    assert resp.status_code == 201
    return resp.get_json()["data"]["access_token"]


def auth(token):
    """Retourne les headers d'autorisation."""
    return {"Authorization": f"Bearer {token}"}


def create_category(client, token, name="Travail", color="#E86B3E"):
    resp = client.post("/api/categories/", json={"name": name, "color": color}, headers=auth(token))
    assert resp.status_code == 201
    return resp.get_json()["data"]


def create_deliverable(client, token, category_id, name="V1"):
    resp = client.post("/api/deliverables/", json={"name": name, "category_id": category_id}, headers=auth(token))
    assert resp.status_code == 201
    return resp.get_json()["data"]


def create_task(client, token, title="Tâche test", **kwargs):
    payload = {"title": title, **kwargs}
    resp = client.post("/api/tasks/", json=payload, headers=auth(token))
    assert resp.status_code == 201
    return resp.get_json()["data"]


# ─── 1. Listing et filtres ─────────────────────────────────────────────────────

class TestListTasks:
    """L'endpoint GET /api/tasks/ applique correctement les filtres."""

    def test_liste_vide_au_depart(self, client):
        """Un utilisateur sans tâches reçoit une liste vide."""
        token = register_and_login(client)
        resp = client.get("/api/tasks/", headers=auth(token))
        assert resp.status_code == 200
        assert resp.get_json()["data"] == []

    def test_liste_toutes_taches(self, client):
        """Toutes les tâches de l'utilisateur sont retournées."""
        token = register_and_login(client)
        create_task(client, token, "T1")
        create_task(client, token, "T2")
        resp = client.get("/api/tasks/", headers=auth(token))
        assert len(resp.get_json()["data"]) == 2

    def test_filtre_par_status(self, client):
        """Le filtre ?status= retourne uniquement les tâches au bon statut."""
        token = register_and_login(client)
        t1 = create_task(client, token, "Nouvelle")
        create_task(client, token, "Autre")

        # Terminer t1
        client.post(f"/api/tasks/{t1['id']}/done", headers=auth(token))

        resp = client.get("/api/tasks/?status=done", headers=auth(token))
        data = resp.get_json()["data"]
        assert len(data) == 1
        assert data[0]["id"] == t1["id"]

        resp_new = client.get("/api/tasks/?status=new", headers=auth(token))
        assert len(resp_new.get_json()["data"]) == 1

    def test_filtre_par_category(self, client):
        """Le filtre ?category_id= retourne uniquement les tâches de cette catégorie."""
        token = register_and_login(client)
        cat = create_category(client, token)
        t_cat = create_task(client, token, "Avec catégorie", category_id=cat["id"])
        create_task(client, token, "Sans catégorie")

        resp = client.get(f"/api/tasks/?category_id={cat['id']}", headers=auth(token))
        data = resp.get_json()["data"]
        assert len(data) == 1
        assert data[0]["id"] == t_cat["id"]

    def test_filtre_par_qualified(self, client):
        """Le filtre ?qualified=true retourne uniquement les tâches qualifiées."""
        token = register_and_login(client)
        t_qual = create_task(
            client, token, "Qualifiée",
            urgency="urgent", importance="important", horizon="2026-12-31"
        )
        create_task(client, token, "Non qualifiée")

        resp = client.get("/api/tasks/?qualified=true", headers=auth(token))
        data = resp.get_json()["data"]
        assert len(data) == 1
        assert data[0]["id"] == t_qual["id"]
        assert data[0]["is_qualified"] is True

    def test_isolation_entre_utilisateurs(self, client):
        """Un utilisateur ne voit pas les tâches d'un autre."""
        token1 = register_and_login(client, "user1@test.com")
        token2 = register_and_login(client, "user2@test.com")
        create_task(client, token1, "Tâche user1")

        resp = client.get("/api/tasks/", headers=auth(token2))
        assert resp.get_json()["data"] == []


# ─── 2. Déplacement de tâche (PUT) ────────────────────────────────────────────

class TestMoveTask:
    """PUT /api/tasks/<id> — déplacement entre catégories et livrables."""

    def test_assigner_categorie(self, client):
        """Une tâche sans catégorie peut être assignée à une catégorie."""
        token = register_and_login(client)
        cat = create_category(client, token)
        task = create_task(client, token, "Sans catégorie")

        resp = client.put(
            f"/api/tasks/{task['id']}",
            json={"category_id": cat["id"]},
            headers=auth(token),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["category_id"] == cat["id"]

    def test_deplacer_vers_autre_categorie(self, client):
        """Une tâche peut être déplacée d'une catégorie à une autre."""
        token = register_and_login(client)
        cat1 = create_category(client, token, "Cat A", "#aaaaaa")
        cat2 = create_category(client, token, "Cat B", "#bbbbbb")
        task = create_task(client, token, "T", category_id=cat1["id"])

        resp = client.put(
            f"/api/tasks/{task['id']}",
            json={"category_id": cat2["id"], "deliverable_id": None},
            headers=auth(token),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["category_id"] == cat2["id"]
        assert data["deliverable_id"] is None

    def test_assigner_livrable(self, client):
        """Une tâche peut être assignée à un livrable."""
        token = register_and_login(client)
        cat = create_category(client, token)
        deliv = create_deliverable(client, token, cat["id"])
        task = create_task(client, token, "T", category_id=cat["id"])

        resp = client.put(
            f"/api/tasks/{task['id']}",
            json={"deliverable_id": deliv["id"]},
            headers=auth(token),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["deliverable_id"] == deliv["id"]

    def test_retirer_categorie_et_livrable(self, client):
        """Une tâche peut être renvoyée vers 'Non organisée' (category_id = null)."""
        token = register_and_login(client)
        cat = create_category(client, token)
        deliv = create_deliverable(client, token, cat["id"])
        task = create_task(client, token, "T", category_id=cat["id"], deliverable_id=deliv["id"])

        resp = client.put(
            f"/api/tasks/{task['id']}",
            json={"category_id": None, "deliverable_id": None},
            headers=auth(token),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["category_id"] is None
        assert data["deliverable_id"] is None

    def test_deplacement_tache_autre_utilisateur_interdit(self, client):
        """Un utilisateur ne peut pas modifier la tâche d'un autre."""
        token1 = register_and_login(client, "u1@test.com")
        token2 = register_and_login(client, "u2@test.com")
        task = create_task(client, token1, "T de user1")

        resp = client.put(
            f"/api/tasks/{task['id']}",
            json={"category_id": None},
            headers=auth(token2),
        )
        assert resp.status_code == 404


# ─── 3. Qualification depuis le modal ─────────────────────────────────────────

class TestQualifyModal:
    """POST /api/tasks/<id>/qualify — qualification depuis l'écran Organiser."""

    def test_qualifier_tache(self, client):
        """Une tâche peut être qualifiée avec urgency, importance, horizon."""
        token = register_and_login(client)
        task = create_task(client, token, "À qualifier")

        resp = client.post(
            f"/api/tasks/{task['id']}/qualify",
            json={
                "urgency": "urgent",
                "importance": "important",
                "horizon": "2026-12-31",
                "delegation": "delegable",
                "estimated_minutes": 45,
            },
            headers=auth(token),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["is_qualified"] is True
        assert data["urgency"] == "urgent"
        assert data["importance"] == "important"
        assert data["horizon"] == "2026-12-31"
        assert data["delegation"] == "delegable"
        assert data["estimated_minutes"] == 45

    def test_qualifier_avec_categorie(self, client):
        """La qualification peut assigner catégorie et livrable simultanément."""
        token = register_and_login(client)
        cat = create_category(client, token)
        deliv = create_deliverable(client, token, cat["id"])
        task = create_task(client, token, "T")

        resp = client.post(
            f"/api/tasks/{task['id']}/qualify",
            json={
                "urgency": "non_urgent",
                "importance": "important",
                "horizon": "2026-06-01",
                "category_id": cat["id"],
                "deliverable_id": deliv["id"],
            },
            headers=auth(token),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["is_qualified"] is True
        assert data["category_id"] == cat["id"]
        assert data["deliverable_id"] == deliv["id"]

    def test_qualify_champs_manquants(self, client):
        """La qualification échoue si urgency, importance ou horizon manque."""
        token = register_and_login(client)
        task = create_task(client, token, "T")

        resp = client.post(
            f"/api/tasks/{task['id']}/qualify",
            json={"urgency": "urgent"},
            headers=auth(token),
        )
        assert resp.status_code == 400

    def test_qualify_horizon_invalide(self, client):
        """La qualification échoue si horizon n'est pas une date ISO valide."""
        token = register_and_login(client)
        task = create_task(client, token, "T")

        resp = client.post(
            f"/api/tasks/{task['id']}/qualify",
            json={"urgency": "urgent", "importance": "important", "horizon": "dans_6_mois"},
            headers=auth(token),
        )
        assert resp.status_code == 400


# ─── 4. Suppression ───────────────────────────────────────────────────────────

class TestDeleteTask:
    """DELETE /api/tasks/<id> — suppression depuis l'écran Organiser."""

    def test_supprimer_tache(self, client):
        """Une tâche peut être supprimée ; elle disparaît du listing."""
        token = register_and_login(client)
        task = create_task(client, token, "À supprimer")

        resp = client.delete(f"/api/tasks/{task['id']}", headers=auth(token))
        assert resp.status_code == 200

        listing = client.get("/api/tasks/", headers=auth(token))
        assert listing.get_json()["data"] == []

    def test_supprimer_tache_autre_utilisateur_interdit(self, client):
        """Un utilisateur ne peut pas supprimer la tâche d'un autre."""
        token1 = register_and_login(client, "del1@test.com")
        token2 = register_and_login(client, "del2@test.com")
        task = create_task(client, token1, "T user1")

        resp = client.delete(f"/api/tasks/{task['id']}", headers=auth(token2))
        assert resp.status_code == 404

    def test_supprimer_tache_inexistante(self, client):
        """Supprimer un identifiant inconnu retourne 404."""
        token = register_and_login(client)
        resp = client.delete("/api/tasks/inexistant-id", headers=auth(token))
        assert resp.status_code == 404


# ─── 5. Catégories ────────────────────────────────────────────────────────────

class TestCategories:
    """CRUD des catégories — utilisé par les dropdowns de l'écran Organiser."""

    def test_creer_categorie(self, client):
        """Une catégorie peut être créée avec nom et couleur."""
        token = register_and_login(client)
        resp = client.post(
            "/api/categories/",
            json={"name": "Perso", "color": "#4CAF7D"},
            headers=auth(token),
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["name"] == "Perso"
        assert data["color"] == "#4CAF7D"

    def test_couleur_invalide(self, client):
        """La création échoue si la couleur n'est pas au format #RRGGBB."""
        token = register_and_login(client)
        resp = client.post(
            "/api/categories/",
            json={"name": "X", "color": "rouge"},
            headers=auth(token),
        )
        assert resp.status_code == 400

    def test_lister_categories(self, client):
        """Les catégories de l'utilisateur sont retournées."""
        token = register_and_login(client)
        create_category(client, token, "A", "#111111")
        create_category(client, token, "B", "#222222")
        resp = client.get("/api/categories/", headers=auth(token))
        assert len(resp.get_json()["data"]) == 2

    def test_modifier_categorie(self, client):
        """Le nom et la couleur d'une catégorie peuvent être modifiés."""
        token = register_and_login(client)
        cat = create_category(client, token)
        resp = client.put(
            f"/api/categories/{cat['id']}",
            json={"name": "Nouveau nom", "color": "#ffffff"},
            headers=auth(token),
        )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["name"] == "Nouveau nom"
        assert data["color"] == "#ffffff"

    def test_supprimer_categorie_nullifie_taches(self, client):
        """Supprimer une catégorie nullifie category_id et deliverable_id sur ses tâches."""
        token = register_and_login(client)
        cat = create_category(client, token)
        deliv = create_deliverable(client, token, cat["id"])
        task = create_task(client, token, "T", category_id=cat["id"], deliverable_id=deliv["id"])

        client.delete(f"/api/categories/{cat['id']}", headers=auth(token))

        resp = client.get(f"/api/tasks/", headers=auth(token))
        updated = next(t for t in resp.get_json()["data"] if t["id"] == task["id"])
        assert updated["category_id"] is None
        assert updated["deliverable_id"] is None

    def test_isolation_categories_entre_utilisateurs(self, client):
        """Un utilisateur ne voit pas les catégories d'un autre."""
        token1 = register_and_login(client, "cat1@test.com")
        token2 = register_and_login(client, "cat2@test.com")
        create_category(client, token1, "Cat user1", "#aaaaaa")

        resp = client.get("/api/categories/", headers=auth(token2))
        assert resp.get_json()["data"] == []


# ─── 6. Livrables ─────────────────────────────────────────────────────────────

class TestDeliverables:
    """CRUD des livrables — colonnes du Kanban."""

    def test_creer_livrable(self, client):
        """Un livrable peut être créé dans une catégorie existante."""
        token = register_and_login(client)
        cat = create_category(client, token)
        resp = client.post(
            "/api/deliverables/",
            json={"name": "Sprint 1", "category_id": cat["id"]},
            headers=auth(token),
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["name"] == "Sprint 1"
        assert data["category_id"] == cat["id"]

    def test_creer_livrable_categorie_autre_user_interdit(self, client):
        """Un livrable ne peut pas être créé dans la catégorie d'un autre utilisateur."""
        token1 = register_and_login(client, "del1@test.com")
        token2 = register_and_login(client, "del2@test.com")
        cat = create_category(client, token1)

        resp = client.post(
            "/api/deliverables/",
            json={"name": "Livrable", "category_id": cat["id"]},
            headers=auth(token2),
        )
        assert resp.status_code == 404

    def test_lister_livrables(self, client):
        """Les livrables d'une catégorie sont retournés."""
        token = register_and_login(client)
        cat = create_category(client, token)
        create_deliverable(client, token, cat["id"], "D1")
        create_deliverable(client, token, cat["id"], "D2")

        resp = client.get(f"/api/deliverables/?category_id={cat['id']}", headers=auth(token))
        assert len(resp.get_json()["data"]) == 2

    def test_modifier_livrable(self, client):
        """Le nom d'un livrable peut être modifié."""
        token = register_and_login(client)
        cat = create_category(client, token)
        deliv = create_deliverable(client, token, cat["id"])

        resp = client.put(
            f"/api/deliverables/{deliv['id']}",
            json={"name": "Nouveau nom"},
            headers=auth(token),
        )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["name"] == "Nouveau nom"

    def test_supprimer_livrable_nullifie_taches(self, client):
        """Supprimer un livrable nullifie deliverable_id sur ses tâches (category conservée)."""
        token = register_and_login(client)
        cat = create_category(client, token)
        deliv = create_deliverable(client, token, cat["id"])
        task = create_task(client, token, "T", category_id=cat["id"], deliverable_id=deliv["id"])

        client.delete(f"/api/deliverables/{deliv['id']}", headers=auth(token))

        resp = client.get("/api/tasks/", headers=auth(token))
        updated = next(t for t in resp.get_json()["data"] if t["id"] == task["id"])
        assert updated["deliverable_id"] is None
        assert updated["category_id"] == cat["id"]  # catégorie conservée

    def test_deplacer_livrable_vers_autre_categorie(self, client):
        """Déplacer un livrable vers une autre catégorie met à jour les tâches associées."""
        token = register_and_login(client)
        cat1 = create_category(client, token, "Cat 1", "#111111")
        cat2 = create_category(client, token, "Cat 2", "#222222")
        deliv = create_deliverable(client, token, cat1["id"])
        task = create_task(client, token, "T", category_id=cat1["id"], deliverable_id=deliv["id"])

        client.put(
            f"/api/deliverables/{deliv['id']}",
            json={"category_id": cat2["id"]},
            headers=auth(token),
        )

        resp = client.get("/api/tasks/", headers=auth(token))
        updated = next(t for t in resp.get_json()["data"] if t["id"] == task["id"])
        assert updated["category_id"] == cat2["id"]
