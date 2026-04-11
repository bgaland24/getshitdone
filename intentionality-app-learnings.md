# Intentionality App — Apprentissages & Décisions

_Ce document capture ce qu'on ferait différemment si on repartait de zéro, à la lumière de l'implémentation réelle. Il ne décrit pas l'état actuel de l'app (→ voir `intentionality-app-spec.md`), mais les leçons tirées du développement._

---

## 1. Divergences spec initial → implémentation réelle

Ces divergences sont toutes des **améliorations** par rapport au spec v2, pas des régressions. Elles auraient dû être dans le spec initial.

### Modèle de données

| Champ | Spec v2 | Réel | Pourquoi le changement était meilleur |
|---|---|---|---|
| `status` | 6 valeurs (`unorganized`, `backlog`, `today`, `in_progress`, `done`, `cancelled`) | 5 valeurs (`new`, `prioritized`, `in_progress`, `done`, `cancelled`) | `unorganized` et `backlog` ne sont que des vues différentes d'une même réalité. La distinction visuelle (tâche sans catégorie vs avec catégorie) n'a pas besoin d'un statut séparé. |
| `horizon` | Enum `day / week / month` | Date ISO YYYY-MM-DD | Une date réelle permet des tris chronologiques, des comparaisons "aujourd'hui - horizon", et des labels dynamiques ("10 avr.", "dans 3 jours"). L'enum contraint sans rien apporter. |
| `priority_date` | Une seule colonne | `priority_firstset_date` (immuable) + `priority_current_date` | La séparation s'est avérée nécessaire dès qu'on a voulu tracer la première intention (pour le scoring futur) tout en permettant la réassignation. Deux concepts distincts méritent deux colonnes. |
| `missed_dates` | Date[] à stocker | Non implémenté | La valeur métier est faible par rapport à la complexité (gestion d'un tableau en SQLite, agrégations). Le score d'intentionnalité répond déjà à la question "est-ce que tu fais ce que tu planifies ?". |
| `UserPreferences` | Absent | Ajouté | Le tri des priorités configurable est une feature évidente dès qu'on a plusieurs utilisateurs avec des modes de travail différents. Aurait dû être dans le spec initial. |

### Règles métier

| Règle | Spec v2 | Réel | Explication |
|---|---|---|---|
| Transition auto statut | `unorganized → backlog` quand catégorie assignée | Pas de transition auto | L'organisation (quelle catégorie ?) et la priorisation (épingler ?) sont deux gestes distincts dans la tête de l'utilisateur. Coupler les deux crée des transitions surprenantes. |
| Cron minuit | `today → backlog` si non done | Non implémenté | Complexité d'infra (cron job) non justifiée pour le MVP. L'impact sur le score suffit à mesurer l'échec. À remettre en V2 si les utilisateurs se plaignent de la vue "priorités" qui reste chargée le lendemain. |
| Bonus score 20h | +10% si priorités définies avant 20h | Non implémenté | Logique fine, mais non prioritaire. Introduire des bonus crée des effets de bord (score > 100%). À retravailler avec un modèle de pondération plus solide. |
| Cache scores | 5 min | Non implémenté | Prématuré au MVP. À ajouter si les calculs deviennent lents sur des données réelles en volume. |

### Écrans & Navigation

| Élément | Spec v2 | Réel | Explication |
|---|---|---|---|
| Navigation | 5 onglets (Capture / Organiser / Qualifier / Priorités / Score) | 4 onglets + Score en header | Score = consultation occasionnelle (hebdo). Le mettre dans la nav principale consomme de la place pour un usage peu fréquent. En header, il reste accessible sans polluer la navigation quotidienne. |
| Priorités | Écran "du lendemain" uniquement | Toggle Aujourd'hui / Demain | L'écran des priorités est autant un écran de **planification** (choisir demain) qu'un écran d'**exécution** (suivre aujourd'hui). L'utilisateur a besoin des deux dans la même vue. Séparer en deux écrans aurait doublé la navigation. |
| Capture | Mode rapide uniquement | Mode rapide + mode détaillé | Certains utilisateurs savent déjà qualifier une tâche au moment de la créer. Forcer un passage par l'écran Qualifier pour chaque tâche est une friction inutile. Le mode détaillé est optionnel, donc pas de régression pour le cas rapide. |
| Badge Capture | Non spécifié | Badge = nb tâches new sans catégorie | Rappel utile que des tâches attendent d'être organisées. Symétrique du badge Qualifier. |

---

## 2. Ce qu'on ferait différemment

### Modèle de données — à spécifier dès le départ ainsi

```
Task:
  status: new | prioritized | in_progress | done | cancelled
  horizon: Date ISO YYYY-MM-DD (pas enum)
  priority_firstset_date: Date (immuable, null avant 1er épinglage)
  priority_current_date: Date (modifiable, null si non épinglée)
  is_qualified: Bool (calculé, pas stocké comme état géré manuellement)
  [NO missed_dates]

UserPreferences:
  sort_axes: string[] (ordonnés)
```

### Cycle de vie — à simplifier dès le départ

Ne pas créer de statut pour chaque étape du cycle de vie si un drapeau ou une date suffit. `prioritized` est en réalité `new + priority_current_date IS NOT NULL`. Mais le statut explicite simplifie les requêtes et la lecture du code — ce compromis reste acceptable.

### Screens — à inclure dans le MVP initial

- **Priorités avec toggle Aujourd'hui/Demain** dès le départ
- **Mode détaillé dans Capture** dès le départ (même si désactivé par défaut)
- **Gérer (CRUD catégories/livrables)** dans le spec : c'était une évidence fonctionnelle non spécifiée

### Architecture technique

**Flask > FastAPI pour un projet solo**
FastAPI apporte surtout la validation automatique (Pydantic) et la doc auto (OpenAPI). Ces gains sont réels mais secondaires quand on est seul développeur sur un projet, qu'on écrit les validations à la main de toute façon, et qu'on ne partage pas l'API avec des tiers. Flask est plus simple à démarrer et à maintenir dans ce contexte.

**SQLite jusqu'au multi-utilisateur réel**
PostgreSQL est le bon choix pour la production multi-utilisateur. Mais pour un MVP solo ou une démo, SQLite élimine l'infra (pas de service à démarrer, fichier portable, tests isolés triviaux). La migration SQLite → PostgreSQL avec SQLAlchemy est straightforward quand le moment vient.

**Pas de cron au MVP**
Un cron job introduit un nouveau composant d'infra (scheduler, gestion des erreurs silencieuses, logs). Pour un MVP, mieux vaut gérer ça côté UI (afficher que des tâches épinglées J-1 non faites sont "en retard") plutôt que de modifier l'état en base en arrière-plan.

### Architecture frontend

**Stores Zustand non persistés = rechargement = refetch systématique**
Le `taskStore` est volatile (pas de persistence). Chaque navigation vers un écran déclenche un `useEffect` avec refetch. C'est simple et correct, mais ça génère beaucoup de requêtes. Une solution intermédiaire (persist en sessionStorage, invalidation ciblée) serait plus performante — à considérer si la latence devient perceptible.

**Inline styles vs CSS modulaire**
Le projet utilise massivement des styles inline dans les composants React. C'est rapide à écrire mais difficile à maintenir à l'échelle (pas de hover en inline, duplication, refactoring coûteux). Si c'était à refaire, adopter CSS Modules ou Tailwind de façon cohérente dès le début.

---

## 3. Ce qui a bien fonctionné et doit être conservé

- **Pattern réponses API uniforme** `{success, data}` / `{success, error}` — simple, prévisible, facile à consommer côté client
- **Isolation utilisateur stricte** — toutes les requêtes filtrées par `user_id`, aucun accès sans `@require_auth`
- **Séparation models / routes / services / utils** — claire, respectée, facilite les tests
- **Tests backend par classe de comportement** (TestCreation, TestQualification, TestEpinglage...) — structure lisible, chaque classe = une règle métier
- **Seed E2E dédié** (`seed.py` séparé de l'onboarding) — les tests Playwright ont leur propre état, pas de pollution croisée
- **Refresh token sérialisé côté client** — évite les race conditions quand plusieurs requêtes partent en parallèle avec un token expiré
