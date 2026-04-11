# CLAUDE.md — Directives du projet

## 1. Exploration avant action

Avant toute implémentation, poser un maximum de questions pour obtenir une vision complète de l'application :
- Aller au-delà du besoin immédiat : anticiper les V2/V3 pour éviter de devoir tout refactorer
- Ne jamais commencer à coder sans avoir validé l'architecture avec l'utilisateur

## 2. Architecture modulaire

- Un fichier = une responsabilité unique
- Une fonction = une responsabilité unique
- Structure de dossiers décidée en début de projet et tenue tout au long
- Convention de nommage cohérente et explicite (pas d'abréviations)

## 3. Séparation stricte des couches

- UI / logique métier / accès aux données sont dans des couches séparées
- Aucun couplage direct entre modules : utiliser l'injection de dépendances ou des interfaces pour permettre les mocks

## 4. Orienté objet

- Recourir systématiquement aux objets pour modéliser les entités et les services
- Éviter les fonctions isolées sans contexte quand un objet est plus adapté

## 5. Testabilité

- Tout code doit pouvoir être testé unitairement
- Les dépendances externes sont injectées, jamais instanciées en dur dans une fonction
- La gestion des erreurs est cohérente et prévisible à chaque couche

## 6. Commentaires

- Chaque fonction doit avoir un commentaire minimal expliquant son rôle
- Les blocs de logique non évidente doivent être expliqués

## 7. Constantes explicites

- Pas de magic numbers ni de magic strings
- Toute valeur constante a un nom expressif

## 8. Nommage expressif

- Les noms de variables, fonctions et classes se lisent comme de la prose
- Le code doit être compréhensible sans documentation externe

## 9. Checklist — modification du schéma BDD

Tout ajout ou modification de colonne/table déclenche obligatoirement ces 4 actions :

### 9.1 Migration dans `backend/app/migrations.py`
- Ajouter un bloc `if not _column_exists(...)` ou `if not _table_exists(...)` dans `run_migrations()`
- La migration doit être idempotente (vérification avant ALTER)
- Tester que la migration s'applique sur une BDD existante sans données perdues

### 9.2 Revue des tests backend (`backend/tests/`)
- Vérifier que les fixtures créent bien les nouvelles colonnes si elles sont obligatoires
- Mettre à jour les assertions qui vérifient la structure des objets retournés
- Ajouter un test couvrant le nouveau champ si son comportement a des règles métier

### 9.3 Revue de l'onboarding (`backend/app/services/onboarding_service.py`)
- Vérifier que les données de démonstration sont cohérentes avec le nouveau schéma
- Si la colonne a une valeur métier significative, l'inclure dans les tâches/catégories de démo

### 9.4 Revue du seed E2E (`backend/seed.py`)
- Vérifier que les données seedées pour Playwright incluent le nouveau champ si nécessaire
- Les tests E2E qui vérifient des données précises peuvent casser si le schéma change
