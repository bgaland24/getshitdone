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
