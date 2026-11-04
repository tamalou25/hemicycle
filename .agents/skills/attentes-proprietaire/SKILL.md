---
name: attentes-proprietaire
description: Ce que veut le propriétaire d'Hémicycle (Gary) : vision du jeu, façon de travailler, format des réponses et des livrables, erreurs à ne pas refaire. À relire au début de chaque tâche, avec le skill « demarrage », et avant de rendre un résultat.
---

# Attentes du propriétaire d'Hémicycle

## Vision du jeu
- **Direction validée le 04/11/2026** (`docs/VISION-CAMPAGNE.md`) : la France seule au départ ; le joueur incarne **le président**, limité par le gouvernement, le Parlement, les élections et les ressources ; **campagnes de 30 à 90 minutes**, sauvegardables, en **temps continu** (pause, vitesses) ; politique intérieure, économie et diplomatie au premier plan, défense au niveau stratégique seulement ; inspirations HoI IV (planification, interdépendances) et Power & Revolution (gestion politique et géopolitique), avec une identité propre : expliquer les conséquences. La partie courte de 10 à 20 minutes reste une porte d'entrée, pas la campagne principale. Feuille de route : présidence et temps → économie/production/commerce → diplomatie → défense stratégique → équilibrage.
- Hémicycle est un **jeu**, pas un tableau de bord : le joueur doit toujours savoir **quel est son but**, **ce qu'il peut faire**, **ce que coûte une décision**, **quand elle agit** et **ce qu'elle a changé**.
- Retour joueur à garder en tête : « On ne comprend pas grand-chose, il faut un but. » Toute évolution doit rendre le jeu plus compréhensible et plus intéressant, pas seulement plus riche.
- Une seule simulation : pas de version factice pour un tutoriel, pas de délais accélérés, pas de réussite obtenue par un simple clic.
- Neutralité politique stricte : aucun parti favorisé, aucune présélection, aucune recommandation d'orientation politique.
- Objectif long terme : web (GitHub Pages) → PWA hors ligne → applications mobiles (Capacitor). Rien ne doit casser le hors ligne ni la construction mobile.

## Façon de travailler
- **Toujours en français** : code, commentaires, commits, PR, réponses.
- Commencer par **vérifier l'état réel** (Git, `main`, PR ouvertes, travail déjà livré) : ne pas refaire ce qui existe, ne rien écraser.
- Pour un gros chantier : **diagnostic court + plan** dans un fichier `docs/`, puis **implémenter** (pas seulement un document).
- Travailler par **lots vérifiables** (un commit testé par lot), une branche et une **PR en brouillon** par sujet.
- **Ne jamais fusionner** sans demande explicite. Quand la fusion est demandée : vérifier `main`, fusionner, puis **vérifier le déploiement** (workflow vert, site en ligne à jour).
- Si la tâche est longue, avancer **sans s'arrêter** jusqu'au bout, en donnant de courts points d'étape.
- Les remarques de relecture (Codex, bots) sont **vérifiées** avant correction ; chaque correction a son test ; répondre sur la PR.
- Rester **dans le périmètre** demandé : pas de refonte non demandée, pas de nouvelle dépendance sans nécessité démontrée.

## Ce qu'il ne faut jamais faire
- `push --force`, `reset --hard`, `checkout -B` sur une branche existante, suppression de travail non commité.
- Affaiblir, supprimer ou relâcher un test (ex. limite de hauteur mobile) pour obtenir une CI verte : corriger la cause.
- Oublier `npm run build` avant de commiter (CSS et `sw.js` ; un test le vérifie).
- Inventer une citation, un fait, un scandale ou un résultat concernant une personne réelle ; présenter un indice de jeu comme une donnée réelle.
- Annoncer une action disponible, un effet garanti ou un total futur que le moteur ne calcule pas.
- Déclarer « terminé » sans avoir lancé les vérifications.

## Qualité attendue
- Mobile d'abord : cibles tactiles ≥ 44 px, contraste WCAG AA, clavier, focus restauré, aucun débordement horizontal, contenu non masqué par les barres fixes.
- Vérifier le rendu **à 412 px et sur ordinateur** (captures), pas seulement les tests.
- Tests **significatifs** : un test vérifie un comportement réel (état du moteur, sauvegarde inchangée, navigation), pas seulement la présence d'un texte. Scénarios déterministes (graine fixée).
- Compatibilité : anciennes sauvegardes jouables (migration, pas d'activation rétroactive), défis reproductibles.

## Format des réponses
- **Très courtes** par défaut, **structurées** (tableaux, listes, titres), sans introduction ni remplissage, sans répéter ce qui a déjà été dit.
- En fin de tâche, fournir :
  - comportement **avant / après** ;
  - fichiers modifiés ;
  - commandes lancées et **résultats exacts** (ex. « Vitest 185/185, Playwright 70/70 ») ;
  - captures utiles ;
  - limites restantes ;
  - ce qui est **en PR** et ce qui est **réellement déployé**.
- Toujours distinguer les **résultats automatisés** (tests verts) de la **compréhension réelle**, à confirmer avec un vrai débutant.

## Checklist avant de rendre la main
1. `npm run build` puis `npm test` puis `npm run test:e2e` (et `npm run build:mobile` si l'interface ou les données changent).
2. Fichiers générés (`assets/app.css`, `sw.js`) inclus.
3. `docs/PASSATION.md` mis à jour pour le sujet.
4. PR en brouillon à jour (description, nombre de tests exact), CI vérifiée.
5. Résumé court au format ci-dessus.

## Choix des modèles (ajouté le 04/11/2026)
- **Fable 5.1** (`claude-fable-5-1`) est le modèle principal souhaité pour piloter le travail.
- Fable pilote, mais **délègue activement** les tâches plus simples à des sous-agents (outil `Agent`, paramètre `model`) avec le modèle le moins coûteux dont le niveau suffit, afin d'économiser le quota :

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
- Limites : n'utiliser que les mécanismes réellement disponibles (`Agent` avec `model`, ou `subagent_type: "fork"`) ; ne jamais prétendre avoir changé de modèle si ce n'est pas possible ; le modèle de la session principale ne se change que par l'utilisateur (`/model`) ; si « Fable 5.1 » n'est pas reconnu, le signaler et conserver le modèle configuré ; n'activer aucune facturation API supplémentaire.
