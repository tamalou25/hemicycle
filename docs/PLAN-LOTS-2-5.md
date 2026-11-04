# Plan de réalisation : lots 2 à 5 (économie, diplomatie, défense, équilibrage)

Rédigé le 04/11/2026 (Claude), à partir de `main` = `6b372dd` (Vitest 224/224). Vision : `docs/VISION-CAMPAGNE.md`.
Analyse d'impact et décisions de modèle : `docs/adr/0003-economie-diplomatie-defense.md`. Avancement détaillé : `docs/PASSATION.md`.

## Principes communs
- Moteur pur et déterministe (`rng.js`), toute variation d'indicateur passe par `explications.js` (nouveaux types `economie`, `commerce`, `diplomatie`, `defense`).
- Un seul ordre de calcul mensuel, documenté dans `turn.js` ; aucun double compte entre budget, programmes, production et commerce (voir ADR 0003).
- Données réelles (ordres de grandeur sourcés, `docs/SOURCES.md`) séparées des paramètres d'équilibrage (`note` dans chaque JSON).
- Sauvegarde : **v16** (`economie`, `diplomatie`, `defense`, `difficulte`), migration v15 → v16 sans activation rétroactive, assainissement strict.
- Branches dépendantes : `lot2-economie` → `lot3-diplomatie` → `lot4-defense` → `lot5-equilibrage`, une PR en brouillon par lot.

## Lot 2 : économie, production et commerce
- **État actuel** : 6 secteurs 0-100 (programmes nationaux), budget en Md€, projets régionaux, aucune production ni échanges.
- **Critères d'acceptation** : 4 filières (énergie, agriculture, industrie, services) avec capacité, demande et dépendances ; importations, exportations et partenaires identifiés (`de`, `us`, `cn`…, mêmes identifiants que la carte) ; investissements avec coût, délai, entretien ; un manque identifiable (fiche « Économie »), une décision finançable, un effet différé et une explication dans « Ce mois-ci ».
- **Dépendances** : budget (coût des investissements), explications, catalogue des décisions, carte (lot 3 pour la vue partenaires).
- **Tests** : `tests/economie.test.js` (ordre des calculs, contrainte énergétique, investissement complet, commerce, explications, immutabilité), schéma `economie.json`, migration v16, e2e `economie.spec.js`.
- **Avancement** : voir passation.

## Lot 3 : diplomatie
- **État actuel** : fond de carte purement géographique, événements « crise internationale » sans acteur.
- **Critères** : 12 partenaires + Union européenne, relation 0-100, intérêts, initiatives étrangères déterministes (propositions avec réponse), négociations avec refus expliqués, accords avec contreparties/durée, sanctions, crises ; effets sur le commerce (disponibilité des importations, débouchés) et l'intérieur ; fiche pays sur la carte avec actions réelles.
- **Dépendances** : lot 2 (partenaires commerciaux), événements, registre des causes.
- **Tests** : `tests/diplomatie.test.js`, schéma `pays.json`, e2e `diplomatie.spec.js`.

## Lot 4 : défense stratégique
- **État actuel** : secteur `defense` (préparation) et programmes `entretien-equipements`, `recrutement-reserve`, poste budgétaire `defense_securite`.
- **Critères** : équipement et disponibilité dérivés du budget, des programmes et de l'entretien ; engagements (OTAN/UE, opérations extérieures) coûteux ; crises dont les options dépendent de la disponibilité et des alliances, avec coûts et conséquences lisibles.
- **Dépendances** : lot 3 (alliances), budget.
- **Tests** : `tests/defense.test.js`, e2e dans `diplomatie.spec.js`.

## Lot 5 : équilibrage et prise en main
- **Critères** : difficultés Facile / Normal / Difficile (paramètres explicites dans `difficulte.json`), conservées par la sauvegarde et les défis ; Facile proposée aux débutants ; initiation progressive (repères à la première apparition d'un système) ; bilan de fin enrichi ; simulations multi-graines et multi-stratégies (`scripts/sim-campagne.mjs`) sans spirale irréversible ni action abusivement répétable.
- **Tests** : `tests/difficulte.test.js`, `tests/equilibrage.test.js` étendu, e2e.
