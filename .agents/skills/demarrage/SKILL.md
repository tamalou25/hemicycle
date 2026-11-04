---
name: demarrage
description: Démarrer une session de travail sur Hémicycle (jeu de simulation politique, JS vanilla). À utiliser au début de chaque tâche, avant toute modification, pour lire les consignes, vérifier Git, créer la bonne branche et connaître les commandes et règles du dépôt.
---

# Démarrage d'une session Hémicycle

## 1. Lire les consignes (dans cet ordre)
1. `CLAUDE.md` : stack, architecture, **règles de contenu non négociables** (valables pour tous les agents).
2. `AGENTS.md`, puis `docs/PASSATION.md` : état actuel, section « Travail en parallèle » (qui fait quoi).
3. Selon la tâche : `docs/DESIGN-UI.md` (interface), `docs/REFONTE-EXPERIENCE.md` (mission, Bureau, bilans), `docs/DEMANDES-MOTEUR.md` (besoins croisés).
Les sections datées les plus récentes priment sur l'historique.

## 2. Vérifier Git sans rien écraser
```bash
git status -sb
git log --oneline -5
git fetch origin
git branch -a
```
- Des modifications locales inconnues : ne pas les jeter, demander.
- Interdits : `reset --hard`, `checkout -B` sur une branche existante, `push --force`, `clean -fd`.
- Nouvelle branche depuis `main` à jour : `git switch -c <prefixe>-<sujet> origin/main`
  (préfixes : `moteur-…` pour le moteur, `ui-…` pour l'interface ; une branche et une PR par sujet).
- Vérifier les PR ouvertes avant de commencer (`gh pr list`) pour ne pas refaire un travail en cours.

## 3. Installer et lancer
```bash
npm install
npx serve .            # ou : python3 -m http.server 8000
```

## 4. Règles de code
- JavaScript vanilla, modules ES, aucun framework, aucun CDN (jeu hors ligne). Code et commentaires en français, camelCase.
- `src/engine/` est **pur** : `(état, action) → nouvel état`, sans DOM ni `window`, sans muter l'entrée.
- Hasard uniquement via `rng.js` (graine dans l'état) ; `Math.random` interdit dans le moteur.
- Toute variation d'indicateur passe par le registre `explications.js`.
- L'interface n'utilise que les exports de `src/engine/index.js`.
- Changement de structure de l'état : incrémenter `VERSION_SAUVEGARDE`, ajouter la migration et l'assainissement dans `save.js`, tester une ancienne sauvegarde.
- Nouveau fichier de `src/data/` : test de schéma dans `tests/data.schema.test.js`.

## 5. Règles de contenu (non négociables)
- Aucune citation inventée ; citations réelles < 15 mots, exactes, avec `source`, `date`, `url`, listées dans `docs/SOURCES.md`.
- Réactions simulées : sans guillemets, badge **SIMULATION**.
- Aucun fait, scandale ou crime inventé sur une personne réelle ; pas de photo de personne réelle.
- Neutralité entre partis ; avertissement « Simulation fictive… » conservé à l'accueil et dans le pied de page.

## 6. Avant de commiter
```bash
npm run build      # CSS et sw.js (un test échoue si sw.js n'est pas à jour)
npm test           # Vitest
npm run test:e2e   # Playwright (ordinateur et mobile)
```
- Inclure `assets/app.css` et `sw.js` régénérés.
- Ne jamais affaiblir ou supprimer un test pour le faire passer.
- Commits atomiques en français : `feat:`, `fix:`, `data:`, `docs:`, `test:`, `chore:`, `ci:`.
- PR en **brouillon** ; ne pas fusionner sans demande explicite.

## 7. Fin de tâche
- Mettre à jour `docs/PASSATION.md` pour le sujet traité (branche, dernier commit, fait, tests, limites).
- Résumer : comportement avant/après, fichiers modifiés, commandes lancées et résultats exacts, limites.
