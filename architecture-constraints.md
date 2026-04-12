# Contraintes d'architecture — Intentionality App

_Leçons tirées de l'implémentation réelle. Ces contraintes s'appliquent à toute évolution du projet._

---

## 1. Aucun style inline dans les composants

Les `style={{ ... }}` inline sont rapides à écrire mais imposent un coût élevé dès qu'on veut changer une valeur visuelle globale — il faut toucher N fichiers pour un seul changement. Le hover est impossible sans JS. La duplication s'accumule silencieusement.

**Règle :** Tailwind pour la mise en page et les espacements, CSS Modules pour les états complexes (hover, focus, selected). Les tokens visuels vivent dans les variables CSS (`--color-border-medium`, etc.), pas dans les composants.

---

## 2. Les valeurs visuelles partagées sont des constantes nommées, jamais des literals

`rgba(255,255,255,0.3)` apparaît à 8 endroits différents dans le projet. `#E86B3E` est à la fois dans les composants et dans les constantes. Si la palette change, c'est une chasse au grep.

**Règle :** toute valeur visuelle utilisée plus d'une fois devient une variable CSS ou une constante TypeScript nommée. Pas de hex literals ni de rgba literals dans les composants.

---

## 3. Un composant ne fait pas de requête API directement

Les écrans font des `Promise.all` directement dans leurs `useEffect`. Ça rend les tests difficiles et les réutilisations impossibles.

**Règle :** les écrans orchestrent (appellent des actions du store ou des fonctions de l'API layer), les composants affichent. Aucun `fetch` ou appel Axios dans un composant ou un écran — uniquement dans les fonctions de `src/api/`.

---

## 4. Chaque refetch est explicitement justifié

Le refetch systématique à chaque navigation est correct mais non intentionnel dans l'état actuel. On ne sait plus si un `useEffect([])` est là parce que c'est voulu ou parce qu'on a copié-collé.

**Règle :** chaque `useEffect` qui déclenche un fetch doit avoir un commentaire expliquant pourquoi. Exemple :
```ts
// Reload on mount — store is volatile, no sessionStorage persistence
```
Ça force à se poser la question plutôt qu'à dupliquer le pattern.

---

## 5. Les tests backend suivent les couches, pas les fichiers

`test_tasks.py` = service layer uniquement (pas de HTTP). `test_routes.py` = routes HTTP uniquement (codes retour + structure réponse, pas de logique métier vérifiée en détail). Si un test de route vérifie une règle métier précise, c'est un signal qu'il est dans le mauvais fichier.

**Règle :** un test qui instancie `TaskService` directement ne doit pas aussi appeler `client.post(...)`. Un test qui appelle `client.post(...)` ne doit pas vérifier des invariants internes du service.

---

## 6. Toute évolution du schéma BDD passe par une migration idempotente

À partir du premier déploiement réel, modifier le schéma sans migration est interdit. Plusieurs colonnes ont été ajoutées pendant le développement sans migration propre parce que la BDD de dev était toujours recréée from scratch.

**Règle :** tout ajout ou modification de colonne/table déclenche obligatoirement un bloc dans `backend/app/migrations.py`. La définition de "terminé" inclut de tester la migration sur une BDD existante, pas recréée.

_(Voir aussi la checklist détaillée dans `CLAUDE.md` section 9.)_

---

## 7. Un écran dépasse 200 lignes → signal de découpage

`PrioritiesScreen` gère localement timer, épinglage, qualification, toggle, préférences — tout dans un seul fichier. Le composant est difficile à lire, à tester et à modifier sans effets de bord.

**Règle :** si un écran dépasse 200 lignes, découper. Un écran orchestre, les sections logiques deviennent des composants avec des props explicites. Test : "est-ce que je peux lire ce composant en 30 secondes ?"
