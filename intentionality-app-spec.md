# Intentionality App — Spécification Fonctionnelle
_Version 3 — mise à jour pour refléter l'implémentation réelle (avril 2026)_

## 1. Vision produit

**Problème adressé** : Les gens passent leur journée à réagir (dernier email, dernière notification) plutôt qu'à exécuter ce qu'ils ont décidé de faire. L'effort cognitif de rester intentionnel est trop élevé face à la facilité de la réactivité.

**Proposition de valeur** : Rendre le comportement intentionnel plus facile que le comportement réactif, en devenant la source de vérité unique pour les tâches et en mesurant objectivement l'intentionnalité dans le temps.

**Principe de design fondamental** : Chaque friction dans l'app doit être une friction volontaire qui pousse vers l'intentionnalité. Chaque facilité dans l'app doit récompenser un comportement intentionnel.

---

## 2. Utilisateur cible

Professionnel ou individu qui :
- A plusieurs catégories de vie à gérer (travail, famille, sport, projets personnels)
- Sait ce qu'il veut faire mais se retrouve souvent à ne pas le faire
- Est prêt à utiliser une app comme interface principale de gestion de tâches

**Hypothèse clé** : L'utilisateur accepte de faire de cette app sa source de vérité pour ses tâches, en échange d'un retour objectif sur son intentionnalité.

---

## 3. Concepts fondamentaux

### 3.1 Hiérarchie des données

```
Catégorie
  └── Livrable (optionnel)
        └── Tâche
```

**Catégorie** : sphère de vie (Travail, Sport, Famille, Projet perso...). Définie par l'utilisateur avec une couleur et un objectif de temps hebdomadaire.

**Livrable** : regroupement nommé de tâches au sein d'une catégorie. Représente un résultat concret à produire (ex : "Rapport Q1", "Refonte site"). Un livrable n'a pas de métadonnées autres que son nom et sa catégorie. Une tâche peut exister sans livrable (directement rattachée à une catégorie).

**Tâche** : unité de travail atomique. Toute intention d'action se traduit en tâche.

---

### 3.2 Modèle de données — Catégorie

| Attribut | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant unique |
| `name` | String | Ex: "Travail", "Sport", "Famille" |
| `color` | Hex | Couleur d'identification visuelle (#RRGGBB) |
| `weekly_target_minutes` | Int | Temps hebdomadaire cible en minutes (défaut 0) |

### 3.3 Modèle de données — Livrable

| Attribut | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant unique |
| `name` | String | Ex: "Rapport Q1", "Refonte site" |
| `category_id` | UUID | Catégorie parente |
| `created_at` | DateTime | |

### 3.4 Modèle de données — Tâche

| Attribut | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant unique |
| `title` | String | Description de la tâche |
| `category_id` | UUID\|null | Catégorie associée (null si non organisée) |
| `deliverable_id` | UUID\|null | Livrable associé (optionnel) |
| `status` | Enum | `new`, `prioritized`, `in_progress`, `done`, `cancelled` |
| `urgency` | Enum\|null | `urgent`, `non_urgent` — **obligatoire pour qualification** |
| `importance` | Enum\|null | `important`, `non_important` — **obligatoire pour qualification** |
| `horizon` | Date ISO\|null | Date cible YYYY-MM-DD — **obligatoire pour qualification** |
| `delegation` | Enum\|null | `delegable`, `non_delegable`, `delegated` — optionnel |
| `estimated_minutes` | Int\|null | Durée estimée (optionnel) |
| `priority_firstset_date` | Date\|null | Date du **premier** épinglage (immuable) |
| `priority_current_date` | Date\|null | Date d'épinglage actuelle (null si non épinglée) |
| `is_qualified` | Bool | True si urgency + importance + horizon tous renseignés |
| `created_at` | DateTime | |
| `done_at` | DateTime\|null | Timestamp de clôture |

**Règle de qualification** : `is_qualified = true` si et seulement si `urgency`, `importance` et `horizon` sont tous les trois renseignés. Recalculé automatiquement à chaque modification.

**Règle d'épinglage** : maximum 3 tâches épinglées par date par utilisateur. `priority_firstset_date` est immuable après le premier épinglage. `priority_current_date` peut être réassignée.

### 3.5 Session de travail

| Attribut | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant unique |
| `task_id` | UUID | Tâche associée |
| `started_at` | DateTime | Début de session |
| `stopped_at` | DateTime\|null | Fin de session (null si en cours) |
| `duration_minutes` | Int\|null | Calculé à la clôture |
| `efficient` | Bool\|null | True si tâche clôturée dans les 5 min après cette session |

**Règle** : 1 seule session avec `stopped_at = null` autorisée par utilisateur à la fois.

### 3.6 Préférences utilisateur

| Attribut | Type | Description |
|---|---|---|
| `user_id` | UUID | Clé étrangère utilisateur (1:1) |
| `sort_axes` | JSON array | Ordre des axes de tri pour l'écran Priorités |

**Valeurs `sort_axes`** : tableau ordonné des 4 axes `horizon`, `delegation`, `urgency`, `importance`. Défaut : `["horizon", "delegation", "urgency", "importance"]`.

---

## 4. Cycle de vie d'une tâche

```
new ──────────────────────────────────────────► done
 │                                               ▲
 │  (pin)          (start)         (done)        │
 └──► prioritized ──► in_progress ───────────────┘
          │                │
          │   (pause)      │
          │◄───────────────┘
          │
          ▼
       cancelled
```

**Transitions autorisées :**

| De | Vers | Déclencheur |
|---|---|---|
| `new` | `prioritized` | Épinglage sur une date (pin) |
| `new` | `done` | Action directe "Terminée" depuis Organiser |
| `new` | `cancelled` | Action "Annuler" depuis Organiser |
| `prioritized` | `in_progress` | Clic "Démarrer" depuis Priorités |
| `prioritized` | `new` | Désépinglage (unpin) si pas de sessions |
| `prioritized` | `cancelled` | Action "Annuler" depuis Organiser |
| `prioritized` | `done` | Action directe "Terminée" depuis Organiser ou Priorités |
| `in_progress` | `prioritized` | Clic "Pause" (tâche épinglée) |
| `in_progress` | `done` | Clic "Terminer" depuis Priorités |
| `in_progress` | `cancelled` | Action "Annuler" depuis Organiser |
| `done` | `new` | Action "Rouvrir" (correction d'erreur) |

**Règle des 3 épinglées** : Maximum 3 tâches épinglées sur une même date. Limite stricte, non contournable dans l'UI.

**Note** : l'organisation (assignation catégorie/livrable) et la priorisation (épinglage) sont deux gestes distincts. Affecter une catégorie à une tâche ne change pas son statut.

---

## 5. Architecture des écrans

### Navigation principale (bottom nav)

```
[ ✦ N Capture ]  [ ≡ Organiser ]  [ ◈ N Qualifier ]  [ ◎ Priorités ]
```

- Badge numérique sur **Capture** = nombre de tâches `new` sans catégorie
- Badge numérique sur **Qualifier** = nombre de tâches non qualifiées (`is_qualified = false`, statut actif)
- **Score** accessible via bouton PARAM dans le header

---

### 5.1 Écran 1 — Capture _(écran par défaut à l'ouverture)_

**Objectif** : saisie rapide, friction minimale.

**Mode rapide :**
- Champ texte en focus automatique à l'ouverture
- Séparation par `;` pour saisir plusieurs tâches d'un coup (bulk capture)
- Menu déroulant catégorie optionnel (défaut : "Sans catégorie")
- Si catégorie sélectionnée : second menu déroulant livrable ("Sans livrable" + livrables existants)
- Validation Entrée ou bouton → tâche(s) créée(s), champ vidé, prêt pour la suivante

**Mode détaillé :**
- Toggle vers formulaire complet (titre + catégorie + livrable + urgence + importance + horizon + délégation + durée)
- Capture et qualification simultanées en un seul geste
- Réinitialisation auto après soumission

**Affichage :**
- Liste "Ajoutées cette session" (5 dernières captures, confirmation visuelle)
- Liste "Nouvelles" (tâches status=new existantes sans catégorie, pour assignation rapide)

---

### 5.2 Écran 2 — Organiser

**Objectif** : vue globale, organisation, gestion du cycle de vie.

**Structure :**
- Section "Non organisées" en haut (tâches sans catégorie)
- Puis groupement : Catégorie → Livrable → Tâches
- Filtres : statut (Nouvelle / Épinglée / En cours / Terminée / Annulée), catégorie, livrable

**Affichage responsive :**
- **Desktop (≥ 768px)** : KanbanBoard avec drag-and-drop (dnd-kit)
- **Mobile (< 768px)** : Accordion par catégorie + MoveSheet (bottom sheet) pour déplacer

**Actions sur chaque tâche (menu contextuel "Actions") :**

| Action | Effet |
|---|---|
| Terminée | Statut → `done` |
| Déplacer | Ouvre la MoveSheet pour choisir catégorie/livrable destination |
| Qualifier | Ouvre le QualifyModal (overlay) |
| Supprimer | Suppression définitive |

**Indicateurs de qualification par tâche :**
- Point vert = qualifiée (`is_qualified = true`)
- Point orange = non qualifiée

---

### 5.3 Formulaire de qualification _(composant partagé, deux modes)_

**Mode session** (appelé depuis Qualifier) : validation → tâche suivante non qualifiée, ou fin de session. Barre de progression "Tâche X / N" en haut.

**Mode individuel** (appelé depuis Organiser ou Priorités) : validation → tâche mise à jour, modal fermé.

**Interface :**

```
[Titre de la tâche — non modifiable ici]

CATÉGORIE    [sélect]
LIVRABLE     [sélect, dépend de la catégorie]

URGENCE *
  ● Urgent    ○ Non urgent

IMPORTANCE *
  ○ Important    ○ Non important

HORIZON *              DURÉE (min)
  [1 jour] [1 sem] [1 mois]
  [date picker]         [spinbox]

DÉLÉGATION
  ○ Non délégable    ○ Délégable    ○ Délégué

[Passer]          [Mettre à jour ›]   ← actif si URGENCE + IMPORTANCE + HORIZON renseignés
```

---

### 5.4 Écran 3 — Qualifier _(session de qualification)_

**Objectif** : traiter en séquence toutes les tâches non qualifiées.

**Comportement :**
- Affiche "X tâches à qualifier"
- Enchaîne le formulaire de qualification sur chaque tâche non qualifiée
- Bouton "Passer" disponible (tâche reste non qualifiée, passe à la suivante)
- Message "Session terminée" quand toutes les tâches sont traitées

---

### 5.5 Écran 4 — Priorités

**Disponible** : à tout moment. Deux modes : Aujourd'hui / Demain (toggle).

**Structure :**
- Section **ÉPINGLÉES** (haut) : tâches dont `priority_current_date` = date affichée
  - Indicateur visuel 3 slots (barres) en bas de l'écran
  - Boutons : Démarrer / Pause / Terminer / Re-qualifier / Désépingler
  - Timer live sur la tâche en cours
- Section **À FAIRE** (bas) : tâches qualifiées, non épinglées sur today ET tomorrow, triées
  - Tri configurable selon les axes des préférences utilisateur
  - Boutons : Démarrer / Terminer / Re-qualifier / Épingler

**Règle** : maximum 3 tâches épinglées par date. Le bouton Épingler est désactivé si la limite est atteinte.

---

### 5.6 Écran 5 — Score & Stats

Accessible via le bouton PARAM dans le header (non visible dans la bottom nav).

- Score global (anneau SVG animé, 0–100)
- 3 jauges avec valeur et label :
  - Respect des priorités (40%)
  - Allocations temporelles (40%)
  - Qualité de clôture (20%)
- Histogramme 4 semaines (évolution du score global)
- Détail par catégorie : durée réelle vs objectif hebdomadaire (progress bar)

---

### 5.7 Écran 6 — Gérer

Accessible via le bouton PARAM dans le header.

**Catégories :**
- Liste des catégories (cartes)
- Création nouvelle catégorie (nom, couleur parmi 8 prédéfinies, objectif hebdo en minutes)
- Édition inline : couleur, nom, objectif hebdo
- Suppression avec confirmation (nullifie `category_id` et `deliverable_id` sur les tâches)

**Livrables (par catégorie) :**
- Ajout, renommage, déplacement vers une autre catégorie, suppression
- Suppression nullifie `deliverable_id` (catégorie conservée sur les tâches)

---

## 6. Calcul du score d'intentionnalité

### Score global
Moyenne pondérée des 3 sous-scores. Exprimé en % (0–100).

### Sous-score 1 — Respect des priorités (40%)
```
score_priorités = (tâches_épinglées_done / tâches_épinglées_définies) × 100
```
- Fenêtre 7 jours glissants
- Score = 0 pour un jour sans tâches épinglées

### Sous-score 2 — Respect des allocations temporelles (40%)
```
Pour chaque catégorie avec weekly_target_minutes > 0 :
  ratio = temps_réel_semaine / temps_cible_semaine
  score_catégorie = min(ratio, 1) × 100

score_allocations = moyenne(score_catégorie)
```
- Semaine en cours (lundi → dimanche)
- `temps_réel` = somme des `duration_minutes` des sessions clôturées

### Sous-score 3 — Qualité de clôture (20%)
```
score_clôture = (sessions_efficient / sessions_avec_clôture_done) × 100
```
- `efficient = true` si tâche clôturée dans les 5 min après fin de session
- Fenêtre 7 jours glissants

---

## 7. Architecture technique

### Stack

| Couche | Technologie |
|---|---|
| Frontend | React 18 + TypeScript, Vite, React Router v6 |
| State management | Zustand (authStore persisté localStorage, taskStore volatile) |
| HTTP client | Axios avec intercepteurs (inject Bearer token, refresh auto, désemballage réponses) |
| Drag-and-drop | @dnd-kit/core (desktop uniquement) |
| Backend | Python / Flask |
| ORM | SQLAlchemy + Flask-SQLAlchemy |
| Base de données | SQLite |
| Auth | JWT (access 24h / refresh 30j, bcrypt pour les mots de passe) |
| Tests E2E | Playwright |

### Pattern réponses API

Toutes les réponses suivent ce format :
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message d'erreur" }
```

### Gestion de l'authentification

- Access token injecté automatiquement dans chaque requête via intercepteur Axios
- En cas de 401 : refresh automatique sérialisé (une seule tentative de refresh à la fois)
- Si le refresh échoue : déconnexion automatique (`clearAuth`)
- Tokens stockés dans localStorage sous la clé `gsd-auth`

### API — Endpoints

```
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh

# Tâches
GET    /api/tasks/                    ?status=&category_id=&qualified=
POST   /api/tasks/
PUT    /api/tasks/<id>
DELETE /api/tasks/<id>
POST   /api/tasks/<id>/qualify
POST   /api/tasks/<id>/pin            body: { pin_date: "YYYY-MM-DD" }
POST   /api/tasks/<id>/unpin
POST   /api/tasks/<id>/start
POST   /api/tasks/<id>/pause
POST   /api/tasks/<id>/done
POST   /api/tasks/<id>/undone
POST   /api/tasks/<id>/cancel

# Catégories & Livrables
GET    /api/categories/
POST   /api/categories/
PUT    /api/categories/<id>
DELETE /api/categories/<id>
GET    /api/deliverables/             ?category_id=
POST   /api/deliverables/
PUT    /api/deliverables/<id>
DELETE /api/deliverables/<id>

# Sessions
GET    /api/sessions/                 ?task_id=&date=YYYY-MM-DD

# Scores
GET    /api/scores/today
GET    /api/scores/weekly
GET    /api/scores/history            ?weeks=4 (max 52)

# Préférences
GET    /api/preferences/
PUT    /api/preferences/              body: { sort_axes: [...] }
```

### Règles métier backend critiques

1. Une seule session `stopped_at = null` autorisée par utilisateur à la fois
2. Maximum 3 tâches épinglées (`priority_current_date` non null) pour une même date par utilisateur
3. `is_qualified` recalculé automatiquement à chaque modification des critères de qualification
4. `priority_firstset_date` immuable : défini au premier épinglage, jamais réécrit
5. Suppression catégorie → nullifie `category_id` ET `deliverable_id` sur toutes ses tâches
6. Suppression livrable → nullifie `deliverable_id` uniquement (catégorie conservée)
7. Données de démo créées automatiquement à l'inscription (désactivable avec `ONBOARDING_DISABLED=1`)

---

## 8. Hors scope MVP

- Cron minuit (retour automatique des tâches épinglées non faites vers backlog)
- Bonus score si priorités définies avant 20h
- Cache des scores
- Suivi des dates manquées (`missed_dates`)
- Intégration agenda externe
- Collaboration / tâches partagées
- Application mobile native
- Notifications push
- Import depuis Notion, Todoist, etc.
- Priorisation automatique basée sur les critères de qualification

---

## 9. Métriques de succès produit

- % d'utilisateurs définissant leurs priorités la veille (cible : >60%)
- % de tâches du backlog qualifiées (cible : >80%)
- Score d'intentionnalité moyen des utilisateurs actifs (cible : >65%)
- Rétention J7 (cible : >40%)
- Sessions de travail trackées par utilisateur actif par jour (cible : >3)
