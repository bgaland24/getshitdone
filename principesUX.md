Bonne question avant de passer au vrai code. Voici l'analyse complète.

---

## Style visuel

**Palette**

Fond quasi-noir (`#080808`) avec des surfaces légèrement éclairées (`#0f0f0f`, `#141414`). Le principe est une profondeur par couches : chaque niveau hiérarchique est légèrement plus clair que le précédent. Un seul accent chaud dominant — le jaune-or (`#E8C93E`) — réservé aux actions primaires et au score. Les catégories ont chacune leur couleur propre, utilisée avec parcimonie (bordure gauche, badge, texte) jamais en fond plein.

**Typographie**

Deux familles en duo : DM Sans pour l'interface (titres, labels, corps) et DM Mono pour tout ce qui est chiffre ou mesure (timer, score, compteurs). Les labels de section sont en uppercase avec letter-spacing élevé (`0.08em`), créant une hiérarchie visuelle forte sans recourir aux tailles. Les tailles vont de 9px (nav) à 38px (score global) avec des paliers intentionnels.

**Bordures et séparations**

Pas d'ombres. La profondeur est créée uniquement par les bordures (`#1e1e1e`, `#2a2a2a`) et les différences de fond. La bordure gauche colorée sur les cartes de tâches est le seul élément décoratif — elle encode la catégorie sans badge supplémentaire.

**Densité**

Interface dense mais aérée. Les paddings sont généreux (16-20px) mais pas excessifs. Les listes de tâches sont compactes pour maximiser ce qu'on voit sans scroller.

---

## Principes UX

**1. Hiérarchie d'information stricte**

Chaque carte de tâche suit toujours le même ordre : catégorie (couleur + label) → horizon → titre → actions. L'œil sait toujours où chercher quoi. Jamais de réorganisation selon le contexte.

**2. Actions contextuelles, pas de menus**

Les actions disponibles sur une tâche changent selon son état — Start si idle, Pause + Done si active, rien si terminée. Pas de menu dropdown avec toutes les options possibles : seul ce qui est pertinent à l'instant est visible.

**3. Friction volontaire comme mécanisme de design**

C'est le principe central. Le backlog n'est pas accessible si une tâche est en cours — l'utilisateur doit d'abord stopper. Le bouton Valider de la qualification est grisé tant que les 3 critères obligatoires ne sont pas remplis. Ces frictions ne sont pas des limitations techniques, ce sont des choix délibérés qui renforcent le comportement intentionnel.

**4. Feedback d'état immédiat**

Le point vert/orange de qualification, le badge rouge sur le tab Qualifier, le bandeau "session en cours" dans Aujourd'hui, le compteur X/3 dans Priorités — chaque état du système est visible en permanence sans qu'on aille le chercher.

**5. Le timer comme ancre d'attention**

Quand une tâche est en cours, le timer en monospace prend toute la place visuelle disponible sur la carte. Ce n'est pas une information secondaire — c'est l'élément principal. Ça crée une présence physique du temps qui passe.

**6. Confirmation visuelle à la capture**

La liste des tâches saisies dans la session s'affiche sous le champ de saisie. Ce feedback immédiat rassure l'utilisateur que sa tâche est bien enregistrée et l'encourage à continuer à vider sa tête sans aller vérifier ailleurs.

**7. Progressive disclosure**

La qualification se fait en plusieurs questions séquentielles, pas en un formulaire avec 4 champs simultanés. Dans Organiser, les tâches terminées sont dans un `<details>` fermé par défaut. L'information secondaire est disponible mais ne pollue pas la vue principale.

**8. Cohérence des patterns d'interaction**

Partout dans l'app : tap = sélectionner, bouton jaune = action primaire, bouton transparent avec bordure = action secondaire, croix grise = annuler/fermer. Un utilisateur qui apprend ces patterns sur un écran les retrouve identiques sur tous les autres.