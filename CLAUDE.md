# Hémicycle — CLAUDE.md

Simulation politique de la France, tour par tour (1 tour = 1 mois), jouable dans le navigateur, déployée sur GitHub Pages.

## Stack
- HTML + Tailwind (CDN) + JavaScript vanilla, modules ES, sans build ni framework
- Données JSON dans `src/data/`, séparées du moteur
- Sauvegarde : `localStorage`, plus export et import d'un fichier JSON
- Tests : Vitest (moteur uniquement)
- Déploiement : GitHub Actions vers GitHub Pages

## Commandes
- `npm install` : installe Vitest
- `npm test` : lance les tests
- `npx serve .` ou `python3 -m http.server` : serveur local (nécessaire pour les modules ES et `fetch`)

## Architecture
- `src/engine/` : **moteur pur**, aucun accès au DOM ni à `window`. Une action se joue ainsi : `(état, action) → nouvel état`, sans muter l'état d'entrée.
- Le hasard passe toujours par `rng.js`, avec une graine stockée dans l'état. `Math.random` est interdit dans le moteur.
- `src/ui/` : chaque écran est une fonction `render(racine, état, dispatch)`.
- `src/main.js` : store, routeur et sauvegarde automatique.
- Toute nouvelle donnée JSON doit avoir un test de schéma dans `tests/data.schema.test.js`.

## Conventions
- Code et commentaires en français, identifiants en camelCase (les clés JSON en français restent tolérées)
- Commits atomiques en français : `feat:`, `fix:`, `data:`, `docs:`, `test:`, `chore:`, `ci:`
- Une branche par phase (`phase-N-nom`), PR en brouillon via `gh`
- Mobile-first, contraste WCAG AA, tout est utilisable au clavier

## Règles de contenu (NON NÉGOCIABLES)
- **Citations réelles uniquement** : courtes (< 15 mots), exactes, vérifiées, avec `source`, `date` et `url`. Si la citation n'est pas vérifiable, on ne l'inclut pas.
- **Aucune citation inventée** attribuée à une personne réelle. Les réactions simulées s'affichent **sans guillemets**, avec un badge **SIMULATION** (« X s'opposerait probablement… »).
- **Aucun scandale, crime ou fait inventé** concernant une personne réelle. Les scandales concernent uniquement le joueur ou des personnages inventés.
- Pas de photos de personnes réelles : on utilise les initiales ou des avatars génériques.
- Neutralité : même traitement pour tous les partis, positions tirées de sources publiques (programmes, votes).
- Disclaimer visible au lancement et dans le footer : « Simulation fictive. Les événements simulés ne reflètent pas les actions ou propos réels des personnes citées. »
- Toutes les sources sont listées dans `docs/SOURCES.md`, avec leur date de collecte.

## Modèle de jeu (Phase 1)
- Indicateurs : `chomage`, `croissance`, `deficit`, `inflation`, `popularite`, `tensions` (plus `dette`, suivie mais non affichée en jauge)
- Effet de loi : `{ indicateur, valeur, delaiMois, duree }`. La valeur est répartie sur `duree` mois et commence après `delaiMois`.
- Positions sur 6 axes notés de −100 à +100 : retraites, immigration, fiscalite, europe, ecologie, securite

## Roadmap
1. MVP · 2. Institutions · 3. Politiciens réels · 4. Élections · 5. Profondeur · 6. Social / multijoueur
