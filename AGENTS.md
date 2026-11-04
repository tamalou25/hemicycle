# AGENTS.md

Au début de chaque session, suivre les skills **`demarrage`** (`.agents/skills/demarrage/SKILL.md`) et **`attentes-proprietaire`** (`.agents/skills/attentes-proprietaire/SKILL.md`, ce que veut le propriétaire du projet).

Les instructions du projet sont dans **`CLAUDE.md`** (stack, architecture, règles de contenu non négociables) : elles s'appliquent à tous les agents.

**Avant tout travail**, lire `docs/PASSATION.md`, section « Travail en parallèle » :
- le **moteur**, l'équilibrage, les sauvegardes et `tests/` relèvent de **Codex** ;
- l'**interface** relève de **Claude** ;
- chacun travaille sur sa propre branche, partie de `main` à jour, sans écraser le travail de l'autre ;
- les besoins croisés passent par `docs/DEMANDES-MOTEUR.md`.

Avant de merger : `npm test`, `npm run test:e2e`, `npm run build`, et une CI verte.
