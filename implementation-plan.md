# Plan d'implémentation — Intentionality App

## Contexte

Application web de gestion de tâches orientée comportement intentionnel. L'utilisateur veut rendre l'intentionnalité plus facile que la réactivité, via une hiérarchie Catégorie → Livrable → Tâche, un système de qualification (urgence/importance/horizon) et un score d'intentionnalité calculé en temps réel.

Spec complète : `intentionality-app-spec.md` | Principes UX : `principesUX.md`

---

## Stack technique retenue

| Couche | Technologie | Raison |
|---|---|---|
| **Backend** | Flask (Python) | Simple, natif PythonAnywhere |
| **Frontend** | React + Vite + TypeScript | Timer temps réel, badges, transitions fluides |
| **Base de données** | SQLite + SQLAlchemy | Zero config, parfait MVP, PythonAnywhere free |
| **Auth** | JWT (PyJWT) | Multi-utilisateurs, stateless |
| **CSS** | Tailwind CSS (via npm, pas CDN) | Build inclus dans Vite |
| **Déploiement** | PythonAnywhere (compte gratuit) | Contrainte projet |

**Décisions UX actées :**
- Bottom nav 5 onglets : l'onglet "Priorités" bascule entre mode Aujourd'hui (timer) et mode Demain (sélection J+1)
- Pas de cron minuit automatique → bouton "Préparer la journée de demain" déclenche le reset
- Notifications 17h : hors scope MVP

---

## Structure du projet

```
getshitdone/
├── backend/                      ← CE QUI VA SUR PYTHONANYWHERE
│   ├── app/
│   │   ├── __init__.py           ← Factory Flask (create_app)
│   │   ├── config.py             ← Config (dev/prod), constantes
│   │   ├── database.py           ← SQLAlchemy init + session
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── category.py
│   │   │   ├── deliverable.py
│   │   │   ├── task.py
│   │   │   └── work_session.py
│   │   ├── routes/               ← Blueprints Flask
│   │   │   ├── auth.py
│   │   │   ├── categories.py
│   │   │   ├── deliverables.py
│   │   │   ├── tasks.py
│   │   │   ├── sessions.py
│   │   │   └── scores.py
│   │   ├── services/             ← Logique métier pure (testable)
│   │   │   ├── auth_service.py
│   │   │   ├── task_service.py
│   │   │   └── score_service.py
│   │   └── utils/
│   │       ├── auth_decorator.py ← @require_auth
│   │       └── response.py       ← helpers JSON response
│   ├── static/                   ← React builté (généré, pas modifié à la main)
│   ├── migrations/               ← Alembic
│   ├── tests/
│   ├── requirements.txt
│   └── wsgi.py                   ← Entry point PythonAnywhere (NON versionné, contient les vars d'env)
│
├── frontend/                     ← CODE SOURCE REACT (local uniquement)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── CaptureScreen.tsx
│   │   │   ├── OrganizeScreen.tsx
│   │   │   ├── QualifyScreen.tsx
│   │   │   ├── PrioritiesScreen.tsx  ← mode today / mode tomorrow
│   │   │   └── ScoreScreen.tsx
│   │   ├── components/
│   │   │   ├── TaskCard.tsx
│   │   │   ├── QualifyForm.tsx       ← composant partagé (mode A + mode B)
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Timer.tsx
│   │   │   └── ScoreRing.tsx
│   │   ├── api/                      ← Appels HTTP vers Flask
│   │   │   ├── tasks.ts
│   │   │   ├── categories.ts
│   │   │   ├── sessions.ts
│   │   │   ├── scores.ts
│   │   │   └── auth.ts
│   │   ├── store/                    ← Zustand (état global)
│   │   │   ├── authStore.ts
│   │   │   └── taskStore.ts
│   │   ├── types/
│   │   │   └── index.ts              ← Tous les types TypeScript
│   │   ├── constants/
│   │   │   └── index.ts              ← Statuts, enums, couleurs
│   │   ├── App.tsx                   ← Router principal
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts                ← outDir → ../backend/static
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── .gitignore                        ← node_modules/, *.db, backend/static/, backend/wsgi.py
├── implementation-plan.md
├── intentionality-app-spec.md
├── principesUX.md
└── CLAUDE.md
```

**Note déploiement :** `frontend/node_modules/` n'est jamais déployé. `npm run build` génère `backend/static/`. Seul `backend/` va sur PythonAnywhere. Le fichier `wsgi.py` est créé manuellement sur PythonAnywhere — il n'est jamais committé car il contient les secrets.

---

## Modèles de données SQLAlchemy

### User
| Champ | Type |
|---|---|
| id | UUID (PK) |
| email | String (unique) |
| password_hash | String |
| created_at | DateTime |

### Category
| Champ | Type |
|---|---|
| id | UUID (PK) |
| user_id | UUID (FK) |
| name | String |
| color | String (hex) |
| weekly_target_minutes | Integer |

### Deliverable
| Champ | Type |
|---|---|
| id | UUID (PK) |
| name | String |
| category_id | UUID (FK) |
| created_at | DateTime |

### Task
| Champ | Type |
|---|---|
| id | UUID (PK) |
| user_id | UUID (FK) |
| title | String |
| category_id | UUID\|null (FK) |
| deliverable_id | UUID\|null (FK) |
| status | Enum : unorganized / backlog / today / in_progress / done / cancelled |
| urgency | Enum\|null : urgent / non_urgent |
| importance | Enum\|null : important / non_important |
| horizon | Enum\|null : day / week / month |
| delegation | Enum\|null : delegable / non_delegable / delegated |
| estimated_minutes | Integer\|null |
| priority_date | Date\|null |
| is_qualified | Boolean (calculé) |
| created_at | DateTime |
| done_at | DateTime\|null |
| missed_dates | JSON (liste de dates) |

### WorkSession
| Champ | Type |
|---|---|
| id | UUID (PK) |
| task_id | UUID (FK) |
| started_at | DateTime |
| stopped_at | DateTime\|null |
| duration_minutes | Integer\|null |
| efficient | Boolean\|null |

---

## API Flask — Endpoints

```
POST  /api/auth/register
POST  /api/auth/login
POST  /api/auth/refresh

GET   /api/categories/
POST  /api/categories/
PUT   /api/categories/<id>
DELETE /api/categories/<id>

GET   /api/deliverables/?category_id=xxx
POST  /api/deliverables/
PUT   /api/deliverables/<id>
DELETE /api/deliverables/<id>

GET   /api/tasks/?status=xxx&category_id=xxx&qualified=false
POST  /api/tasks/
PUT   /api/tasks/<id>
DELETE /api/tasks/<id>
POST  /api/tasks/<id>/qualify
POST  /api/tasks/<id>/prioritize         ← marque comme priorité J+1
POST  /api/tasks/<id>/start
POST  /api/tasks/<id>/pause
POST  /api/tasks/<id>/done
POST  /api/tasks/<id>/cancel
POST  /api/tasks/prepare-tomorrow        ← reset today → backlog + missed_dates

GET   /api/sessions/?task_id=xxx
GET   /api/sessions/?date=2024-01-15

GET   /api/scores/today
GET   /api/scores/weekly
GET   /api/scores/history?weeks=4
```

---

## Règles métier critiques (implémentées dans `services/`)

1. **Max 3 today par priority_date** — validé côté serveur avant tout POST /prioritize
2. **Max 1 session active par utilisateur** — validé avant POST /start
3. **is_qualified** — recalculé à chaque PUT/qualify sur une tâche (urgency + importance + horizon tous renseignés)
4. **efficient** — calculé à la clôture de session : tâche done dans les 5 min après stopped_at
5. **prepare_tomorrow()** — tâches `today` non `done` → `backlog` + `missed_dates` += date du jour
6. **Transitions de statut** — validées dans `task_service.py` selon le tableau de transitions de la spec

---

## Phases d'implémentation

### Phase 1 — Foundation backend
- Initialiser le projet backend Flask avec factory pattern
- SQLAlchemy + Alembic (migrations)
- Créer tous les modèles
- Auth JWT : register, login, refresh
- Decorator `@require_auth`
- Flask sert `static/index.html` pour toutes les routes non-API (SPA routing)

### Phase 2 — API Core
- Blueprint categories (CRUD)
- Blueprint deliverables (CRUD)
- Blueprint tasks (CRUD + toutes les actions métier)
- Blueprint sessions (GET)
- Règles métier dans `task_service.py`

### Phase 3 — Scores
- `score_service.py` : calcul des 3 sous-scores
- Blueprint scores (today, weekly, history)

### Phase 4 — Foundation frontend
- Setup React + Vite + TypeScript + Tailwind
- vite.config.ts : outDir → ../backend/static
- Design system : thème dark (fond #080808, accent #E8C93E, DM Sans + DM Mono)
- Types TypeScript centralisés
- Constantes (statuts, enums)
- Store Zustand (auth + tasks)
- Routing React Router (5 routes)
- BottomNav avec badges

### Phase 5 — Écrans React
- **CaptureScreen** : champ focus auto, dropdown catégorie/livrable, liste session
- **OrganizeScreen** : groupement catégorie→livrable→tâche, filtres, actions inline
- **QualifyForm** (composant partagé) : mode A (individuel) + mode B (session)
- **QualifyScreen** : session de qualification, barre progression
- **PrioritiesScreen** : mode Aujourd'hui (timer) + mode Demain (sélection J+1, compteur ○○○)
- **ScoreScreen** : anneau animé, 3 jauges, courbe 4 semaines, détail par catégorie

### Phase 6 — Déploiement PythonAnywhere
- `npm run build` → génère backend/static/
- Créer `wsgi.py` manuellement sur PythonAnywhere (jamais committé — contient les secrets injectés directement)
- Structure wsgi.py : `os.environ['SECRET_KEY'] = '...'` puis `from app import create_app; application = create_app()`
- Test de bout en bout en production

---

## Design system

- **Fond** : #080808 (app) → #0f0f0f (surface) → #141414 (carte)
- **Accent** : #E8C93E (jaune-or, boutons primaires, score)
- **Bordures** : #1e1e1e / #2a2a2a
- **Texte** : blanc / gris atténué
- **Typographie** : DM Sans (UI) + DM Mono (timer, scores, compteurs)
- **Labels section** : uppercase + letter-spacing 0.08em
- **Tâches** : bordure gauche colorée = couleur catégorie
- **Badges** : point vert = qualifiée, point orange = non qualifiée

---

## Vérification & Tests

- **Backend** : tests unitaires des services (`tests/`) avec pytest
- **Auth** : test register → login → accès route protégée
- **Règles métier** : test max 3 today, test transitions interdites, test is_qualified
- **Scores** : test calcul sous-scores avec fixtures connues
- **Frontend** : test manuel des 5 écrans + timer
- **Déploiement** : smoke test après deploy (register, créer une tâche, lancer une session)
