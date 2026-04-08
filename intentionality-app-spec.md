# Intentionality App — Spécification Fonctionnelle MVP
_Version 2 — mise à jour UX : hiérarchie catégorie/livrable/tâche, qualification, flux écrans_

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
| `color` | Hex | Couleur d'identification visuelle |
| `weekly_target_minutes` | Int | Temps hebdomadaire cible en minutes |

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
| `status` | Enum | `unorganized`, `backlog`, `today`, `in_progress`, `done`, `cancelled` |
| `urgency` | Enum\|null | `urgent`, `non_urgent` — **obligatoire pour qualification** |
| `importance` | Enum\|null | `important`, `non_important` — **obligatoire pour qualification** |
| `horizon` | Enum\|null | `day`, `week`, `month` — **obligatoire pour qualification** |
| `delegation` | Enum\|null | `delegable`, `non_delegable`, `delegated` — optionnel |
| `estimated_minutes` | Int\|null | Durée estimée (optionnel) |
| `priority_date` | Date\|null | Date pour laquelle elle est prioritaire |
| `is_qualified` | Bool | True si urgency + importance + horizon tous renseignés |
| `created_at` | DateTime | |
| `done_at` | DateTime\|null | Timestamp de clôture |
| `missed_dates` | Date[] | Dates où la tâche était today mais non faite |

**Règle de qualification** : `is_qualified = true` si et seulement si `urgency`, `importance` et `horizon` sont tous les trois renseignés.

### 3.5 Session de travail

| Attribut | Type | Description |
|---|---|---|
| `id` | UUID | Identifiant unique |
| `task_id` | UUID | Tâche associée |
| `started_at` | DateTime | Début de session |
| `stopped_at` | DateTime\|null | Fin de session (null si en cours) |
| `duration_minutes` | Int | Calculé à la clôture |
| `efficient` | Bool | True si tâche closée dans les 5 min après cette session |

---

## 4. Cycle de vie d'une tâche

```
UNORGANIZED → BACKLOG → TODAY → IN_PROGRESS → DONE
                  ↑         ↑         ↓
              (retour)  (veille)  (pause → TODAY)

              BACKLOG → CANCELLED
              TODAY   → CANCELLED
```

**Transitions autorisées :**

| De | Vers | Déclencheur |
|---|---|---|
| `unorganized` | `backlog` | Tâche affectée à une catégorie |
| `backlog` | `today` | Sélection comme priorité (veille) |
| `today` | `in_progress` | Clic "Démarrer" |
| `in_progress` | `today` | Clic "Pause" |
| `in_progress` | `done` | Clic "Terminer" |
| `today` | `backlog` | Minuit automatique si non faite |
| `backlog` | `cancelled` | Action utilisateur depuis écran 2 |
| `today` | `cancelled` | Action utilisateur depuis écran 2 |

**Règle des 3 priorités** : Maximum 3 tâches en statut `today` pour une même `priority_date`. Limite stricte, non contournable dans l'UI.

---

## 5. Architecture des écrans

### Navigation principale (bottom nav)

```
[ Capture ]  [ Organiser ]  [ Qualifier 🔴N ]  [ Priorités ]  [ Score ]
```

- Badge rouge sur "Qualifier" = nombre de tâches non qualifiées
- Badge sur "Priorités" = ✓ si priorités du lendemain définies, sinon vide

---

### 5.1 Écran 1 — Capture _(écran par défaut à l'ouverture)_

**Objectif** : saisie rapide, friction minimale.

**Comportement :**
- Champ texte en focus automatique à l'ouverture
- Menu déroulant catégorie optionnel (défaut : "Sans catégorie")
- Si catégorie sélectionnée : second menu déroulant livrable ("Sans livrable" + "Créer un livrable...")
- Validation Entrée ou bouton → tâche créée, champ vidé, prêt pour la suivante
- Tâche sans catégorie → statut `unorganized`
- Tâche avec catégorie → statut `backlog`
- Liste des tâches saisies dans la session affichée en dessous (confirmation visuelle)

**Hors scope de cet écran :** qualification, estimation de durée, date.

---

### 5.2 Écran 2 — Organiser

**Objectif** : vue globale, organisation, gestion du cycle de vie.

**Structure :**
- Section "Non organisées" en haut (tâches `unorganized`)
- Puis groupement : Catégorie → Livrable → Tâches
- Filtres : statut (backlog / done / cancelled), catégorie
- Tâches `delegated` affichées en italique

**Actions sur chaque tâche :**

| Action | Effet |
|---|---|
| Modifier catégorie | Menu déroulant inline |
| Modifier livrable | Menu déroulant inline, création à la volée |
| Qualifier | Ouvre écran qualification (mode retour écran 2) |
| Marquer terminée | Statut → `done` |
| Annuler | Statut → `cancelled` |

**Indicateurs de qualification par tâche :**
- Point vert = qualifiée
- Point orange = non qualifiée (critères obligatoires manquants)

---

### 5.3 Écran de Qualification _(composant partagé, deux modes)_

**Mode A — Individuel** (appelé depuis écran 2) : validation → retour écran 2.

**Mode B — Session** (appelé depuis écran 3) : validation → tâche suivante non qualifiée, ou fin de session.

**Interface :**

```
[Titre de la tâche — non modifiable ici]

1. URGENCE *
   ● Urgent    ○ Non urgent

2. IMPORTANCE *
   ○ Important    ○ Non important

3. HORIZON *
   ○ 1 jour    ○ 1 semaine    ○ 1 mois

4. DÉLÉGATION
   ○ Non délégable    ○ Délégable    ○ Délégué

[Passer]          [Valider ›]   ← actif si 1+2+3 renseignés
```

En mode session : barre de progression "Tâche X / N" en haut.

---

### 5.4 Écran 3 — Qualifier _(session de qualification)_

**Objectif** : traiter en séquence toutes les tâches non qualifiées.

**Comportement :**
- Affiche "X tâches à qualifier"
- Bouton "Démarrer la session" → enchaîne les écrans de qualification
- Bouton "Passer" disponible (tâche reste non qualifiée)
- Fin de session → résumé ("X tâches qualifiées sur N")

**Lien depuis écran 4 :** si tâches non qualifiées détectées à l'ouverture de l'écran 4 → bandeau d'avertissement avec CTA "Qualifier maintenant" → redirect écran 3.

---

### 5.5 Écran 4 — Priorités du lendemain

**Disponible :** à tout moment. Notification proposée à 17h.

**Garde souple :** si des tâches du backlog ne sont pas qualifiées → bandeau d'avertissement non bloquant + lien écran 3.

**Structure :**
- Compteur visuel : ○ ○ ○ → ● ○ ○ → ● ● ○ → ● ● ●
- Liste des tâches qualifiées du backlog, triées par horizon puis urgence
- Maximum 3 sélectionnables
- Informations affichées par tâche : titre, catégorie (couleur), livrable, badge horizon, badge urgence, italique si déléguée
- Bouton "Confirmer" → tâches → `today` avec `priority_date` = J+1

---

### 5.6 Écran — Aujourd'hui

- Les 3 tâches prioritaires du jour avec catégorie (couleur)
- Bouton "Démarrer" sur chaque tâche non démarrée
- Timer visible sur la tâche en cours
- Bouton "Pause" / "Terminer" sur la tâche en cours
- Accès au backlog bloqué si tâche en cours

---

### 5.7 Écran — Score & Stats

- Score global (anneau animé)
- 3 sous-scores avec jauge et explication
- Courbe d'évolution 4 semaines
- Détail par catégorie : temps prévu vs réel cette semaine

---

## 6. Calcul du score d'intentionnalité

### Score global
Moyenne pondérée des 3 sous-scores. Exprimé en % (0–100).

### Sous-score 1 — Respect des priorités (40%)
```
score_priorités = (tâches_prioritaires_done / tâches_prioritaires_définies) × 100
```
- 7 jours glissants
- Bonus +10% si priorités définies avant 20h la veille
- Score = 0 pour un jour sans priorités définies

### Sous-score 2 — Respect des allocations temporelles (40%)
```
Pour chaque catégorie avec cible > 0 :
  ratio = temps_réel_semaine / temps_cible_semaine
  score_catégorie = min(ratio, 1) × 100

score_allocations = moyenne(score_catégorie)
```
- Semaine en cours (lundi → dimanche)

### Sous-score 3 — Qualité de clôture (20%)
```
score_clôture = (sessions_efficient / sessions_avec_clôture_done) × 100
```
- `efficient` = tâche closée dans les 5 min après fin de session
- 7 jours glissants

---

## 7. Architecture technique

### Stack
- **Frontend** : React (web, responsive mobile-first)
- **Backend** : Python / FastAPI
- **Base de données** : PostgreSQL
- **Auth** : JWT (email + password, OAuth Google optionnel)

### API — Endpoints principaux

```
# Catégories
GET    /categories
POST   /categories
PUT    /categories/{id}
DELETE /categories/{id}

# Livrables
GET    /deliverables?category_id=xxx
POST   /deliverables
PUT    /deliverables/{id}
DELETE /deliverables/{id}

# Tâches
GET    /tasks?status=backlog&category_id=xxx
GET    /tasks?qualified=false
POST   /tasks
PUT    /tasks/{id}
DELETE /tasks/{id}
POST   /tasks/{id}/qualify       # Soumet les critères de qualification
POST   /tasks/{id}/prioritize    # Marque comme priorité J+1
POST   /tasks/{id}/start
POST   /tasks/{id}/stop
POST   /tasks/{id}/done
POST   /tasks/{id}/cancel

# Sessions
GET    /sessions?task_id=xxx
GET    /sessions?date=2024-01-15

# Scores
GET    /scores/today
GET    /scores/weekly
GET    /scores/history?weeks=4
```

### Règles métier backend critiques
1. Une seule session `stopped_at = null` autorisée par utilisateur à la fois
2. Maximum 3 tâches `today` pour une même `priority_date`
3. Job cron minuit : tâches `today` non `done` → `backlog` + ajout date dans `missed_dates`
4. `is_qualified` recalculé à chaque PUT sur une tâche
5. Scores : calcul à la demande + cache 5 min

---

## 8. Hors scope MVP

- Intégration agenda externe
- Collaboration / tâches partagées
- Application mobile native
- Notifications push (web notifications uniquement)
- Import depuis Notion, Todoist, etc.
- Priorisation automatique basée sur les critères de qualification

---

## 9. Métriques de succès produit

- % d'utilisateurs définissant leurs priorités la veille (cible : >60%)
- % de tâches du backlog qualifiées (cible : >80%)
- Score d'intentionnalité moyen des utilisateurs actifs (cible : >65%)
- Rétention J7 (cible : >40%)
- Sessions de travail trackées par utilisateur actif par jour (cible : >3)
