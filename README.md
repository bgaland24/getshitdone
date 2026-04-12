# GetShitDone

Application web de gestion de tâches orientée comportement intentionnel.
Augmente le temps passé à faire ce que tu as décidé de faire

---

## Architecture

```
getshitdone/
├── backend/                      ← Déployé sur PythonAnywhere
│   ├── app/
│   │   ├── __init__.py           ← Factory Flask (create_app)
│   │   ├── config.py             ← Config dev / prod
│   │   ├── database.py           ← SQLAlchemy + session
│   │   ├── models/               ← User, Category, Deliverable, Task, WorkSession
│   │   ├── routes/               ← Blueprints Flask (auth, categories, tasks…)
│   │   ├── services/             ← Logique métier pure (TaskService, ScoreService)
│   │   └── utils/                ← @require_auth, helpers JSON
│   ├── static/                   ← Build React (généré, ne pas modifier à la main)
│   ├── migrations/               ← Alembic
│   ├── tests/
│   ├── requirements.txt
│   └── wsgi.py                   ← NON versionné — créé manuellement sur PythonAnywhere
│
├── frontend/                     ← Code source React (local uniquement)
│   ├── src/
│   │   ├── api/                  ← Appels Axios vers Flask (/api/*)
│   │   ├── components/           ← BottomNav, QualifyForm, Timer, ScoreRing
│   │   ├── constants/            ← ROUTES, enums, seuils métier
│   │   ├── screens/              ← 5 écrans + LoginScreen
│   │   ├── store/                ← Zustand (authStore, taskStore)
│   │   ├── types/                ← Types TypeScript centralisés
│   │   ├── App.tsx               ← Router + guard auth
│   │   └── main.tsx
│   ├── vite.config.ts            ← outDir → ../backend/static
│   └── package.json
│
├── implementation-plan.md
├── intentionality-app-spec.md
├── principesUX.md
└── CLAUDE.md
```

**Stack :** Flask · SQLAlchemy · SQLite · PyJWT · React 19 · Vite · TypeScript · Tailwind CSS · Zustand · React Router

**Hiérarchie des données :** Catégorie → Livrable (optionnel) → Tâche → WorkSession

---

## Lancer en développement

### Prérequis

- Python 3.10+
- Node.js 18+
- pip

### Démarrage rapide (tout en une commande)

```bash
./dev.sh
```

Lance le backend (port 5000) et le frontend (port 5173) en parallèle.
Ctrl+C arrête les deux. Ouvrir **http://localhost:5173**.

---

### Démarrage manuel

### 1. Backend Flask

```bash
cd backend

# Installer les dépendances
pip install -r requirements.txt

# Initialiser la base de données
flask db upgrade

# Lancer le serveur de développement (port 5000)
flask run
```

Variables d'environnement nécessaires (peut être mis dans un fichier `.env` à la racine de `backend/`) :

```env
FLASK_APP=app
FLASK_ENV=development
SECRET_KEY=une-cle-secrete-locale
DATABASE_URL=sqlite:///dev.db       # optionnel, valeur par défaut
```

### 2. Frontend React

Dans un second terminal :

```bash
cd frontend

npm install        # première fois uniquement
npm run dev        # Vite démarre sur http://localhost:5173
```

Le proxy Vite redirige automatiquement `/api/*` vers `http://localhost:5000`.
Ouvrir **http://localhost:5173** dans le navigateur.

### 3. Tests backend

```bash
cd backend
pytest tests/ -v
```

---

## Déployer sur PythonAnywhere

### Prérequis

- Compte PythonAnywhere (gratuit suffit pour le MVP)
- Git installé sur PythonAnywhere

### Étape 1 — Builder le frontend

En local, dans le dossier `frontend/` :

```bash
npm run build
```

Cela génère `backend/static/` (HTML + JS + CSS).
Committer et pousser `backend/static/` sur le dépôt.

> `backend/static/` est normalement dans `.gitignore` pour le dev local.
> Pour le déploiement, l'exclure du gitignore ou copier les fichiers manuellement via SSH/SFTP.

### Étape 2 — Cloner / mettre à jour sur PythonAnywhere

Via la console Bash de PythonAnywhere :

```bash
# Première fois
git clone <url-du-repo> ~/getshitdone

# Mises à jour suivantes
cd ~/getshitdone && git pull
```

### Étape 3 — Installer les dépendances Python

```bash
cd ~/getshitdone/backend
pip install -r requirements.txt
```

### Étape 4 — Créer `wsgi.py` manuellement

Ce fichier contient les secrets — il ne doit **jamais** être committé.

Créer `~/getshitdone/backend/wsgi.py` avec ce contenu (adapter les valeurs) :

```python
import sys
import os

# Chemin vers le projet
path = '/home/<ton-username>/getshitdone/backend'
if path not in sys.path:
    sys.path.insert(0, path)

# Variables d'environnement (secrets injectés en dur ici)
os.environ['FLASK_ENV'] = 'production'
os.environ['SECRET_KEY'] = 'REMPLACER_PAR_UNE_CLE_FORTE'       # python -c "import secrets; print(secrets.token_urlsafe(32))"
os.environ['JWT_SECRET_KEY'] = 'REMPLACER_PAR_UNE_CLE_FORTE'   # python -c "import secrets; print(secrets.token_urlsafe(32))"
os.environ['DATABASE_URL'] = 'sqlite:////home/<ton-username>/getshitdone/backend/prod.db'

from app import create_app
application = create_app('production')
```

### Étape 5 — Initialiser la base de données

La base est créée **automatiquement** au premier démarrage (via `db.create_all()` dans la factory Flask). Aucune commande manuelle nécessaire.

### Étape 6 — Configurer l'application web sur PythonAnywhere

Dans l'onglet **Web** de PythonAnywhere :

| Champ | Valeur |
|---|---|
| Source code | `/home/<ton-username>/getshitdone/backend` |
| Working directory | `/home/<ton-username>/getshitdone/backend` |
| WSGI configuration file | pointer vers `wsgi.py` (ou copier son contenu dans le fichier WSGI PythonAnywhere) |
| Virtualenv | laisser vide (install globale) |

Cliquer **Reload** pour redémarrer l'application.

### Étape 7 — Smoke test

```
POST /api/auth/register   → créer un compte
POST /api/auth/login      → se connecter
POST /api/tasks/          → créer une tâche
GET  /api/scores/today    → vérifier le score
```

### Mises à jour suivantes

```bash
# En local
npm run build              # regénère backend/static/
git add backend/static/
git commit -m "build frontend"
git push

# Sur PythonAnywhere
cd ~/getshitdone && git pull
pip install -r backend/requirements.txt   # si de nouvelles dépendances ont été ajoutées
# puis Reload depuis l'onglet Web
```

---

## Points importants

- `backend/wsgi.py` — ne jamais committer (contient les secrets)
- `frontend/node_modules/` — ne jamais déployer
- `backend/static/` — généré par `npm run build`, ne pas modifier à la main
- Max 3 tâches `today` par jour — validé côté serveur
- Max 1 session active par utilisateur
