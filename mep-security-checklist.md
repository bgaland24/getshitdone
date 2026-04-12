# Checklist sécurité — Mise en production

## 1. Secrets à configurer dans `wsgi.py`

Ces variables doivent être définies **avant** l'appel à `create_app()` dans `wsgi.py` sur PythonAnywhere.
Les valeurs par défaut du code sont des placeholders de développement — elles ne doivent **jamais** être utilisées en production.

- [ ] `SECRET_KEY` — clé Flask, doit être une chaîne aléatoire longue (≥ 32 chars)
- [ ] `JWT_SECRET_KEY` — clé de signature JWT, différente de `SECRET_KEY`, aléatoire (≥ 32 chars)
- [ ] `GMAIL_USER` — adresse Gmail utilisée pour l'envoi des emails de réinitialisation
- [ ] `GMAIL_APP_PASSWORD` — App Password Google (16 chars), **pas** le mot de passe Gmail normal
- [ ] `FRONTEND_BASE_URL` — URL publique du frontend (ex: `https://monapp.pythonanywhere.com`)

Pour générer des clés aléatoires solides :
```python
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 2. Configuration Flask

- [ ] `FLASK_ENV=production` (ou `config_name="production"` dans `create_app`)
- [ ] `DEBUG=False` — vérifier que la config `ProductionConfig` est bien chargée (pas `DevelopmentConfig`)
- [ ] Aucun message d'erreur détaillé ne doit être exposé dans les réponses API en production

---

## 3. Base de données

- [ ] Le fichier `.db` SQLite est dans un répertoire non accessible publiquement (hors `static/`)
- [ ] La migration `password_reset_tokens` s'applique correctement sur la BDD existante :
  lancer l'app une première fois et vérifier dans les logs que `"table password_reset_tokens créée"` apparaît (ou qu'elle existait déjà)

---

## 4. Fonctionnalité mot de passe oublié

- [ ] Tester l'envoi d'email depuis la prod : déclencher un reset, vérifier la réception
- [ ] Vérifier que le lien dans l'email pointe bien sur l'URL de prod (pas `localhost:5173`)
- [ ] Vérifier que le lien expire après 15 minutes
- [ ] Vérifier qu'un lien déjà utilisé retourne bien une erreur

---

## 5. Frontend statique

- [ ] Rebuilder le frontend (`npm run build`) pour inclure les nouvelles pages (`/forgot-password`, `/reset-password/:token`) et le nouveau titre d'onglet (`Intent`)
- [ ] Déployer les fichiers `static/` mis à jour sur PythonAnywhere
- [ ] Vérifier que `/forgot-password` et `/reset-password/xxx` sont accessibles sans être connecté

---

## 6. Vérifications finales

- [ ] Tester le flow complet en prod : demande de reset → email reçu → nouveau mot de passe → connexion OK
- [ ] Tester la connexion / déconnexion (bouton QUITTER dans le header)
- [ ] Vérifier l'onglet navigateur affiche bien `Intent`
