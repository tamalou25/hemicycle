---
name: attentes-proprietaire
description: Attentes durables du propriétaire du projet (Gary) pour les sessions Claude Code. À lire en début de session.
---

# Attentes du propriétaire

## Choix des modèles

- **Fable 5.1** (`claude-fable-5-1`) est le modèle principal souhaité pour piloter le travail.
- Les tâches déléguées (outil `Agent`, paramètre `model`) peuvent utiliser un modèle moins puissant quand son niveau suffit, afin d'économiser le quota :

| Modèle | Usage |
|---|---|
| `haiku` | Tâches simples et délimitées (recherche ciblée, renommage, vérification mécanique) |
| `sonnet` | Développement courant, corrections, tests |
| `opus` | Analyses difficiles, problèmes complexes, relectures exigeantes |
| `fable` (fork) | Quand le contexte complet de la session est nécessaire |

- Choisir selon la difficulté réelle, les capacités disponibles et le coût d'usage. Ne pas supposer qu'un modèle est toujours moins coûteux.
- Ne pas demander l'accord du propriétaire pour chaque choix de modèle.
- Éviter les délégations inutiles, la duplication des recherches et les longs comptes rendus de sous-agents.
- Vérifier les résultats délégués avant de les intégrer : l'économie ne doit pas diminuer la qualité.

## Limites d'application

- Utiliser uniquement les mécanismes réellement disponibles (`Agent` avec `model`, ou `subagent_type: "fork"`). Ne jamais prétendre avoir changé de modèle si ce n'est pas possible.
- Le modèle de la session principale se change uniquement par l'utilisateur (`/model`) : Claude ne peut pas le basculer lui-même.
- Si « Fable 5.1 » n'est pas reconnu dans l'environnement, le signaler clairement et conserver le modèle configuré ; ne pas inventer d'identifiant.
- N'activer aucune facturation API supplémentaire.
