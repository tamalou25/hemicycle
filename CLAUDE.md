# Hémicycle — CLAUDE.md

Simulation politique de la France, tour par tour (1 tour = 1 mois), jouable dans le navigateur, déployée sur GitHub Pages.

## Stack
- HTML + JavaScript vanilla, modules ES, sans framework. Tailwind **compilé localement** : `npm run build:css` → `assets/app.css` (à commiter ; la CI vérifie). Aucun CDN (jeu jouable hors ligne).
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

## Institutions (Phase 2)
- Rôles : `depute`, ou `premier_ministre` (49.3 possible, +1 capital par mois, exposé à la censure)
- Navette (`navette.js`) : un seul texte à la fois, une étape par mois, traitée en fin de tour. Ordre : `assemblee` → `senat` → (`cmp` → `lecture_definitive`) → `conseil`
- Vote d'un groupe : `pour` si son score ≥ 0,72. Score = proximité sur le thème, + négociation, + 0,15 en cas d'accord.
- Censure : votent pour les groupes dont l'écart idéologique avec le joueur dépasse 60 (hors son parti et ses alliés). Adoptée à partir de 289 voix.
- Actions du mois : 1 action parlementaire (déposer, amender ou 49.3) et 1 négociation d'accord
- À chaque changement de structure de l'état : incrémenter `VERSION_SAUVEGARDE` et ajouter une migration dans `save.js`

## Roadmap v2 (validée le 03/11/2026)
E0 Fondations · E1 Carte et territoires · E2 Finances (Md€) · E3 Population · E4 Secteurs · E5 Politique reliée · E6 PWA · E7 Mobile.
Décisions et état : `docs/PASSATION.md`. Toute variation d'indicateur doit passer par le registre `explications.js`.

## Population (E3)
- `population.js` : profils agrégés par région, parts fictives identiques partout ; ne pas les présenter comme des données observées.
- Conditions de vie, confiance et vote sont distincts. Les variations par profil sont enregistrées avec `region` et `groupe`.
- Scrutins régionaux pondérés par population (approximation), sans circonscriptions ni abstention régionale ; sauvegarde v7.
- `npm run test:e2e` : Playwright, Chromium, serveur Python automatique ; parcours à 390 et 1440 px.
