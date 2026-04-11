# Description fonctionnelle des tests
_État au 11/04/2026 — 132 tests backend + 53 tests E2E_

---

## 1. Tests backend unitaires / intégration

### 1.1 Authentification (`backend/tests/test_auth.py`)

| Test | Ce qu'il vérifie |
|---|---|
| `test_register_success` | Inscription réussie → tokens JWT + user retournés |
| `test_register_duplicate_email` | Inscription refusée si l'email est déjà utilisé |
| `test_login_success` | Connexion réussie → access token retourné |
| `test_login_wrong_password` | Connexion refusée avec mauvais mot de passe → 401 |
| `test_refresh_token` | Refresh token valide → nouvel access token |

---

### 1.2 Cycle de vie des tâches (`backend/tests/test_tasks.py`)

#### Création

| Test | Ce qu'il vérifie |
|---|---|
| `test_statut_initial_est_new` | Une tâche créée a le statut `new` |
| `test_non_qualifie_par_defaut` | `is_qualified = false` à la création |
| `test_champs_epinglage_nuls_par_defaut` | `priority_firstset_date` et `priority_current_date` sont null à la création |
| `test_plusieurs_taches_independantes` | Deux tâches ont des IDs distincts et un statut indépendant |

#### Qualification

| Test | Ce qu'il vérifie |
|---|---|
| `test_qualification_complete_rend_qualifie` | Qualification avec urgency + importance + horizon → `is_qualified = true` |
| `test_horizon_invalide_leve_valueerror` | Horizon non ISO → ValueError |
| `test_urgence_invalide_leve_valueerror` | Urgency hors enum → ValueError |
| `test_importance_invalide_leve_valueerror` | Importance hors enum → ValueError |
| `test_qualification_sans_horizon_non_qualifie` | Urgency + importance sans horizon → `is_qualified = false` |
| `test_qualification_avec_champs_optionnels` | delegation + estimated_minutes stockés correctement |
| `test_requalification_met_a_jour_les_champs` | Re-qualifier écrase les anciens critères |

#### Épinglage

| Test | Ce qu'il vérifie |
|---|---|
| `test_epinglage_passe_en_prioritized` | `pin_task` → statut `prioritized` |
| `test_epinglage_set_priority_current_date` | `priority_current_date` = date demandée |
| `test_premier_epinglage_set_firstset_date` | `priority_firstset_date` = date du 1er épinglage |
| `test_reepinglage_ne_change_pas_firstset_date` | Désépingler + réépingler → `firstset_date` reste la première |
| `test_maximum_3_epingles_par_date` | La 4ème tâche épinglée sur la même date lève ValueError |
| `test_limite_par_date_pas_globale` | 3 épinglées aujourd'hui + 3 demain est autorisé |
| `test_depinglage_sans_session_repasse_new` | Désépingler sans session → statut `new`, `priority_current_date = null` |
| `test_depinglage_avec_session_repasse_in_progress` | Désépingler après start+pause → statut `in_progress` |
| `test_depinglage_conserve_firstset_date` | Désépingler conserve `priority_firstset_date` |

#### Timer (sessions de travail)

| Test | Ce qu'il vérifie |
|---|---|
| `test_start_passe_en_in_progress` | `start_task` → statut `in_progress` |
| `test_start_cree_une_session` | `start_task` crée une WorkSession avec `stopped_at = null` |
| `test_deux_starts_simultanes_leve_valueerror` | Démarrer 2 tâches en même temps → ValueError |
| `test_pause_cloture_la_session` | `pause_task` → `stopped_at` renseigné, `duration_minutes` calculé |
| `test_pause_sur_tache_epinglee_repasse_prioritized` | Pause sur tâche épinglée → statut `prioritized` |
| `test_pause_sans_session_active_leve_valueerror` | Pause sans session → ValueError |
| `test_plusieurs_sessions_successives` | 3 cycles start/pause → 3 sessions créées |

#### Clôture

| Test | Ce qu'il vérifie |
|---|---|
| `test_done_depuis_new` | `complete_task` depuis `new` → statut `done`, `done_at` renseigné |
| `test_done_depuis_in_progress_ferme_session` | `complete_task` depuis `in_progress` → session fermée |
| `test_done_depuis_prioritized` | `complete_task` depuis `prioritized` → statut `done` |

#### Annulation

| Test | Ce qu'il vérifie |
|---|---|
| `test_cancel_depuis_new` | `cancel_task` depuis `new` → statut `cancelled` |
| `test_cancel_depuis_prioritized` | `cancel_task` depuis `prioritized` → statut `cancelled` |
| `test_cancel_depuis_in_progress` | `cancel_task` depuis `in_progress` → statut `cancelled` |
| `test_cancel_depuis_done_leve_valueerror` | `cancel_task` depuis `done` → ValueError |

#### Scénarios complets

| Test | Ce qu'il vérifie |
|---|---|
| `test_scenario_nominal` | Flux complet : new → qualifiée → épinglée → démarrée → pausée → terminée |
| `test_scenario_tache_delegable` | Tâche délégable qualifiée, épinglée, terminée sans timer |
| `test_scenario_replanification` | Tâche épinglée, désépinglée, réépinglée → `firstset_date` immuable |
| `test_scenario_trois_taches_paralleles` | 3 épinglées ok, la 4ème refusée, les 3 premières non affectées |

#### Préférences utilisateur

| Test | Ce qu'il vérifie |
|---|---|
| `test_valeurs_par_defaut` | Axes de tri par défaut : `[horizon, delegation, urgency, importance]` |
| `test_set_axes_valide` | Réordonner les 4 axes → persisté correctement |
| `test_set_axes_invalide_leve_valueerror` | Axe inconnu → ValueError |
| `test_set_axes_incomplet_leve_valueerror` | Axes incomplets (< 4) → ValueError |

---

### 1.3 Écran Organiser — API (`backend/tests/test_organize.py`)

#### Listing et filtres

| Test | Ce qu'il vérifie |
|---|---|
| `test_liste_vide_au_depart` | Utilisateur sans tâches → liste vide |
| `test_liste_toutes_taches` | Toutes les tâches retournées sans filtre |
| `test_filtre_par_status` | `?status=done` retourne uniquement les tâches done |
| `test_filtre_par_category` | `?category_id=` retourne les tâches de cette catégorie |
| `test_filtre_par_qualified` | `?qualified=true` retourne uniquement les tâches qualifiées |
| `test_isolation_entre_utilisateurs` | Un utilisateur ne voit pas les tâches d'un autre |

#### Déplacement

| Test | Ce qu'il vérifie |
|---|---|
| `test_assigner_categorie` | Tâche sans catégorie → assignée à une catégorie |
| `test_deplacer_vers_autre_categorie` | Déplacement d'une catégorie à une autre (livrable nullifié) |
| `test_assigner_livrable` | Tâche assignée à un livrable |
| `test_retirer_categorie_et_livrable` | Tâche renvoyée vers "Non organisée" (category_id = null) |
| `test_deplacement_tache_autre_utilisateur_interdit` | PUT sur la tâche d'un autre → 404 |

#### Qualification depuis le modal

| Test | Ce qu'il vérifie |
|---|---|
| `test_qualifier_tache` | POST /qualify avec tous les champs → `is_qualified = true` |
| `test_qualifier_avec_categorie` | Qualification + assignation catégorie/livrable simultanée |
| `test_qualify_champs_manquants` | Qualification sans importance ou horizon → 400 |
| `test_qualify_horizon_invalide` | Horizon non-ISO → 400 |

#### Suppression

| Test | Ce qu'il vérifie |
|---|---|
| `test_supprimer_tache` | DELETE → tâche disparaît du listing |
| `test_supprimer_tache_autre_utilisateur_interdit` | DELETE sur la tâche d'un autre → 404 |
| `test_supprimer_tache_inexistante` | DELETE id inconnu → 404 |

#### Catégories

| Test | Ce qu'il vérifie |
|---|---|
| `test_creer_categorie` | Création avec nom et couleur → 201 |
| `test_couleur_invalide` | Couleur non-hex → 400 |
| `test_lister_categories` | Toutes les catégories de l'utilisateur retournées |
| `test_modifier_categorie` | PUT → nom et couleur mis à jour |
| `test_supprimer_categorie_nullifie_taches` | DELETE catégorie → `category_id` et `deliverable_id` null sur les tâches |
| `test_isolation_categories_entre_utilisateurs` | Catégories non visibles par un autre utilisateur |

#### Livrables

| Test | Ce qu'il vérifie |
|---|---|
| `test_creer_livrable` | Création dans une catégorie existante → 201 |
| `test_creer_livrable_categorie_autre_user_interdit` | Livrable dans la catégorie d'un autre → 404 |
| `test_lister_livrables` | Livrables d'une catégorie retournés |
| `test_modifier_livrable` | PUT → nom mis à jour |
| `test_supprimer_livrable_nullifie_taches` | DELETE livrable → `deliverable_id` null, `category_id` conservé |
| `test_deplacer_livrable_vers_autre_categorie` | Déplacement livrable → tâches suivent la nouvelle catégorie |

---

### 1.4 Actions tâches — routes HTTP (`backend/tests/test_routes.py`)

#### Auth — cas limites

| Test | Ce qu'il vérifie |
|---|---|
| `test_register_sans_email_retourne_400` | Register sans email → 400 |
| `test_register_sans_password_retourne_400` | Register sans mot de passe → 400 |
| `test_route_protegee_sans_token_retourne_401` | Route protégée sans token → 401 |
| `test_route_protegee_token_invalide_retourne_401` | Token invalide → 401 |
| `test_refresh_token_invalide_retourne_401` | Refresh token invalide → 401 |

#### Création tâche — mode détaillé

| Test | Ce qu'il vérifie |
|---|---|
| `test_creation_avec_qualification_immediate` | POST avec urgency + importance + horizon → `is_qualified = true` directement |
| `test_creation_titre_vide_retourne_400` | Titre vide → 400 |
| `test_creation_sans_titre_retourne_400` | Payload sans titre → 400 |

#### Épinglage / Désépinglage

| Test | Ce qu'il vérifie |
|---|---|
| `test_pin_passe_en_prioritized` | POST /pin → 200 + statut `prioritized` + `priority_current_date` |
| `test_pin_sans_pin_date_retourne_400` | POST /pin sans `pin_date` → 400 |
| `test_pin_date_invalide_retourne_400` | `pin_date` non-ISO → 400 |
| `test_quatrieme_pin_meme_date_retourne_422` | 4ème épinglage même date → 422 |
| `test_unpin_repasse_new` | POST /unpin → 200 + statut `new` + `priority_current_date = null` |
| `test_unpin_tache_non_epinglee_retourne_400` | Désépingler une tâche non épinglée → 400 |

#### Timer

| Test | Ce qu'il vérifie |
|---|---|
| `test_start_retourne_task_et_session` | POST /start → 200 + `task.status = in_progress` + session ouverte |
| `test_start_deux_fois_retourne_422` | Deux tâches démarrées simultanément → 422 sur la seconde |
| `test_start_tache_done_retourne_400` | Démarrer une tâche done → 400 |
| `test_pause_retourne_task_et_session_cloturee` | POST /pause → 200 + `session.stopped_at` + `duration_minutes` |
| `test_pause_sans_session_active_retourne_422` | Pause sans session active → 422 |

#### Clôture / Annulation

| Test | Ce qu'il vérifie |
|---|---|
| `test_done_retourne_statut_done` | POST /done → 200 + statut `done` |
| `test_done_deux_fois_retourne_400` | Double done → 400 |
| `test_undone_remet_en_new` | POST /undone → 200 + statut `new` |
| `test_undone_depuis_new_retourne_422` | Undone depuis new → 422 |
| `test_cancel_retourne_statut_cancelled` | POST /cancel → 200 + statut `cancelled` |
| `test_cancel_depuis_done_retourne_422` | Cancel depuis done → 422 |

#### Préférences — routes HTTP

| Test | Ce qu'il vérifie |
|---|---|
| `test_get_preferences_cree_si_absentes` | Premier GET → prefs créées avec valeurs par défaut |
| `test_get_preferences_deux_fois_stable` | Double GET → même données, idempotent |
| `test_put_preferences_axes_valides` | PUT axes valides → 200 + persisté |
| `test_put_preferences_axes_invalides_retourne_400` | Axe inconnu → 400 |
| `test_put_preferences_axes_incomplets_retourne_400` | Moins de 4 axes → 400 |
| `test_put_preferences_sans_sort_axes_retourne_400` | Payload sans `sort_axes` → 400 |
| `test_preferences_sans_token_retourne_401` | GET sans token → 401 |

---

### 1.5 Scores (`backend/tests/test_scores.py`)

#### Score à zéro sans données

| Test | Ce qu'il vérifie |
|---|---|
| `test_score_global_zero_sans_donnees` | Sans données : global = priorities = allocations = closure = 0 |
| `test_historique_retourne_n_semaines` | `compute_history(weeks=3)` retourne 3 entrées avec `week_start` et `global` |

#### Sous-score priorités

| Test | Ce qu'il vérifie |
|---|---|
| `test_toutes_done_score_100` | 2 épinglées, 2 done → priorities = 100 |
| `test_aucune_done_score_zero` | 2 épinglées, 0 done → priorities = 0 |
| `test_moitie_done_score_50` | 1 done / 2 épinglées → priorities = 50 |

#### Sous-score allocations

| Test | Ce qu'il vérifie |
|---|---|
| `test_categorie_sans_cible_ignoree` | Catégorie avec `weekly_target = 0` → allocations = 0 (ignorée) |
| `test_cible_atteinte_score_100` | 60 min travaillés / cible 60 min → allocations = 100 |
| `test_moitie_cible_score_50` | 30 min travaillés / cible 60 min → allocations = 50 |
| `test_depassement_cible_plafonne_a_100` | 120 min / cible 30 min → allocations plafonné à 100 |

#### Sous-score clôture

| Test | Ce qu'il vérifie |
|---|---|
| `test_toutes_efficient_score_100` | 2 sessions efficient=True → closure = 100 |
| `test_aucune_efficient_score_zero` | 2 sessions efficient=False → closure = 0 |
| `test_moitie_efficient_score_50` | 1 efficient / 2 sessions → closure = 50 |

#### Score global

| Test | Ce qu'il vérifie |
|---|---|
| `test_calcul_pondere_priorites_et_cloture` | priorities=100 + allocations=0 + closure=100 → global = 60 (40%×100 + 40%×0 + 20%×100) |
| `test_weekly_contient_categories` | `compute_weekly_scores` inclut la clé `categories` |

#### Routes HTTP scores

| Test | Ce qu'il vérifie |
|---|---|
| `test_today_retourne_les_4_cles` | GET /scores/today → 200 + clés global/priorities/allocations/closure |
| `test_weekly_retourne_categories` | GET /scores/weekly → 200 + clé categories |
| `test_history_defaut_4_semaines` | GET /scores/history → 4 entrées par défaut |
| `test_history_parametre_weeks` | GET /scores/history?weeks=2 → 2 entrées |
| `test_history_weeks_zero_invalide` | ?weeks=0 → 400 |
| `test_history_weeks_trop_grand` | ?weeks=53 → 400 |
| `test_today_sans_token_retourne_401` | GET /scores/today sans token → 401 |
| `test_weekly_sans_token_retourne_401` | GET /scores/weekly sans token → 401 |
| `test_history_sans_token_retourne_401` | GET /scores/history sans token → 401 |

---

## 2. Tests E2E Playwright

### 2.1 Écran Organiser (`frontend/e2e/organize.spec.ts`)

#### Affichage initial

| Test | Ce qu'il vérifie |
|---|---|
| Compte seedé — catégories et livrables visibles | Catégories Travail/Perso, livrables Sprint1/Sprint2, section "Non organisées" |
| Tâches terminées et annulées masquées par défaut | done/cancelled invisibles sans filtre |
| Compte vide — message "Aucune tâche" | Message d'état vide affiché |
| Tâche non organisée dans la colonne dédiée | Tâche sans catégorie dans "Non organisées" |

#### Filtres

| Test | Ce qu'il vérifie |
|---|---|
| Filtre "Terminée" | Tâches done visibles après sélection |
| Filtre "Annulée" | Tâches cancelled visibles après sélection |
| Filtre par catégorie | Masque les tâches des autres catégories |
| Filtre par livrable | Restreint aux tâches du livrable sélectionné |
| Changement catégorie remet livrable à "Tous" | Reset du filtre livrable quand catégorie change |
| Livrables vides disparaissent avec filtre actif | Livrables sans tâche masqués si filtre catégorie actif |

#### Menu d'actions

| Test | Ce qu'il vérifie |
|---|---|
| Menu affiche 4 options | Terminée, Déplacer, Qualifier, Supprimer présents |
| "Terminée" masque la tâche | Tâche disparaît de la vue par défaut après done |
| "Terminée" visible au filtre done | Tâche retrouvable avec filtre done |
| "Supprimer" suppression définitive | Tâche absente même avec filtre done |

#### Déplacer une tâche

| Test | Ce qu'il vérifie |
|---|---|
| Déplacer vers une autre catégorie via MoveSheet | MoveSheet affichée, déplacement confirmé |
| Déplacer vers "Non organisées" | `category_id` retiré, tâche dans section Non organisées |

#### Qualifier depuis le modal

| Test | Ce qu'il vérifie |
|---|---|
| Ouvrir le modal — titre visible | Modal QUALIFIER affiché avec le titre de la tâche |
| Qualifier — modal se ferme après soumission | Après submit, modal fermé, tâche toujours visible |
| Fermer sans soumettre — tâche inchangée | Fermeture via ×, modal disparu, tâche non modifiée |

#### Flux complet

| Test | Ce qu'il vérifie |
|---|---|
| Capturer → Organiser → Déplacer → Qualifier | Flux bout en bout sur 4 écrans |

---

### 2.2 Stabilité des écrans (`frontend/e2e/console-errors.spec.ts`)

| Test | Ce qu'il vérifie |
|---|---|
| Capture — sans erreur console | Aucune erreur/warning JS sur `/capture` après login |
| Organiser — sans erreur console | Aucune erreur/warning JS sur `/organize` |
| Priorités — sans erreur console | Aucune erreur/warning JS sur `/priorities` |
| Qualifier — sans erreur console | Aucune erreur/warning JS sur `/qualify` |
| Score — sans erreur console | Aucune erreur/warning JS sur `/score` |
| Gérer — sans erreur console | Aucune erreur/warning JS sur `/manage` |
| (× 6 routes) sans erreur réseau | Aucune requête réseau échouée (≥ 500) sur chaque écran |

---

### 2.3 Écran Capture (`frontend/e2e/capture.spec.ts`)

#### Saisie rapide

| Test | Ce qu'il vérifie |
|---|---|
| Saisir + Entrée → apparaît dans "Ajoutées cette session" | Tâche créée visible dans la liste de la session |
| Champ vidé après soumission | Input vide après submission |
| Saisie avec catégorie — assignée directement | Catégorie sélectionnée → tâche créée avec cette catégorie |
| Saisie multiple avec ";" — plusieurs tâches créées | "Tâche Alpha; Tâche Beta; Tâche Gamma" → 3 tâches dans la liste |
| Captures successives apparaissent dans la liste | 2 saisies → les 2 tâches visibles |

#### Badge navigation

| Test | Ce qu'il vérifie |
|---|---|
| Compte seedé — badge Capture visible | Badge dans la nav Capture affiché |

---

### 2.4 Écran Qualifier (`frontend/e2e/qualify.spec.ts`)

#### Affichage initial

| Test | Ce qu'il vérifie |
|---|---|
| Sans tâche non qualifiée — message "Rien à qualifier" | Après qualification de toutes les tâches de démo, message vide affiché |
| Avec tâche non qualifiée — titre visible | Titre de la tâche affiché dans le formulaire flash-card |
| Barre de progression affiche X/N | Compteur `1/2` visible dans l'en-tête du formulaire |

#### Session de qualification

| Test | Ce qu'il vérifie |
|---|---|
| Qualifier une tâche — elle disparaît de la session | Après submit, la tâche n'est plus dans le formulaire |
| Bouton "Passer" — avance dans la session | Compteur passe de `1/2` à `2/2` |
| Qualifier toutes → message de fin | Après qualification de la dernière, "Session terminée !" affiché |
| Passer toutes → message de fin | Après avoir passé la dernière, "Session terminée !" ou "Rien à qualifier" affiché |

---

### 2.5 Écran Priorités (`frontend/e2e/priorities.spec.ts`)

#### Affichage

| Test | Ce qu'il vérifie |
|---|---|
| Tâche qualifiée non épinglée → section "À faire" | Tâche qualifiée visible sous le header "À FAIRE" |
| Tâche non qualifiée invisible | Tâche sans is_qualified absente de l'écran |
| Compte sans qualifiées — message vide | "Aucune tâche qualifiée disponible" affiché |

#### Épinglage

| Test | Ce qu'il vérifie |
|---|---|
| Épingler → section "Épinglées" | Après clic sur le bouton épingle, section ÉPINGLÉES apparaît |
| Désépingler → retour dans "À faire" | Après désépinglage, bouton "Désépingler" disparaît |
| Limite 3 épinglées — bouton désactivé | 4ème tâche avec bouton `title="Maximum atteint"` visible |

#### Toggle Aujourd'hui / Demain

| Test | Ce qu'il vérifie |
|---|---|
| Toggle "Demain" → tâches épinglées demain visibles | Tâche épinglée pour demain visible après clic sur "Demain" |
| Toggle "Aujourd'hui" → épinglées demain masquées | Tâche épinglée pour demain : bouton "Désépingler" absent sur l'onglet "Aujourd'hui" |

---

## 3. Manques résiduels identifiés

### 3.1 E2E — non encore couverts

**Écran Score**
- Anneau et jauges rendus (pas d'erreur de rendu) ← partiellement couvert par console-errors.spec.ts

**Écran Gérer**
- Création d'une catégorie → visible dans la liste
- Modification d'une catégorie (nom, couleur, objectif)
- Suppression d'une catégorie → disparaît

**Timer (Priorités)**
- Démarrer un timer sur une tâche épinglée → chrono visible
- Pauser le timer → durée accumulée affichée
