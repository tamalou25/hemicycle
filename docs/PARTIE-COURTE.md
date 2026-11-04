# Partie courte : « Douze mois pour convaincre »

Base analysée : branche `refonte-experience` (PR #25, relue au commit `e15cc0b`), consolidée dans la branche `partie-courte`.

## Diagnostic (fondé sur le code)
| Constat | Où | Effet sur un débutant |
|---|---|---|
| La mission d'initiation ne porte qu'une dimension (un projet territorial, 6 mois) ; le mandat de 60 mois n'a pas de fin lisible avant longtemps | `mission.js`, `constants.js` (`DUREE_MANDAT = 60`) | Pas de « partie » que l'on finit en 15 minutes ; pas de verdict |
| Les crises sont tirées au hasard (35 %/mois, `PROBA_EVENEMENT`) : une partie courte peut n'en rencontrer aucune de pertinente | `events.js` | La dimension « crise » n'est pas garantie |
| La politique (lois, accords, amendements, 49.3, budget) existe mais rien ne pousse à s'en servir ; une loi met au moins 3 mois (Assemblée → Sénat → Conseil) | `navette.js`, `laws.js`, `budgetEtat.js` | Le débutant ne négocie jamais |
| Simulation sur 11 partis : pour chacun, au moins 6 lois sont adoptables à l'Assemblée sans accord (la majorité de sièges penche à droite : un PM de gauche ne fait passer que des textes éloignés de son camp) ; accords possibles : de 2 (RN) à 6 partis | script `scripts/sim-partie-courte.mjs` | Il existe toujours un chemin ; il n'est jamais garanti et il coûte (compromis, relations) |
| La présidentielle d'avril 2027 tombe au mois 5 ; le PM est remplacé si le vainqueur est à plus de 60 d'écart | `elections.js` | Un enjeu électoral réel pendant la partie courte |
| Le PLF se dépose de septembre à décembre : le départ (novembre 2026) ouvre une fenêtre immédiate (mois 0-1) puis une seconde (mois 10-12) | `budgetEtat.js` | Deux moments budgétaires dans 12 mois |
| Contraintes existantes : capital 4 au départ, +3/mois pour le PM, plafond 10 ; enveloppe 1,5 Md€ puis 4 − fonctionnement en janvier ; 1 action parlementaire + 1 négociation par mois ; coût annuel des programmes → déficit ; réactions des partis | `constants.js`, `finances.js`, `secteurs.js`, `relations.js` | « Tout lancer » est freiné par le capital, l'enveloppe et les relations : aucune ressource nouvelle n'est nécessaire |
| Relecture de la refonte : premier projet seul compté, résultats répétés deux mois, premier écran mobile de 3,3 écrans (bouton principal sous la barre fixe à 412 px), coût absent affiché « aucun » | `mission.js`, `bilan.js`, `mission.js` (UI), `fiche.js` | Corrigés au lot 1 (tests `tests/mission.test.js`, `e2e/mission.spec.js`) ; l'écran mobile est traité par le nouveau bloc du scénario |

## Scénario retenu
**« Douze mois pour convaincre »** : vous êtes Premier ministre (personnage fictif) d'une famille politique choisie. Nommé·e en novembre 2026,
vous avez **12 mois** (jusqu'en novembre 2027) pour tenir trois engagements publics. Choisi parce qu'il relie les trois dimensions avec les
mécanismes existants, sans délai accéléré :
1. **Soins** (transformer le pays, résultat observable) : l'accès aux soins de la région où il est le plus faible dans le jeu doit progresser
   grâce à vos projets d'au moins **8 points** attribués (registre des causes). Voie courte (3 mois de chantier) ou investissement lent
   (8 mois) ; les deux cumulent (lot 1).
2. **Parlement** (faire de la politique) : **une loi de votre choix promulguée** avant l'échéance. Il faut une majorité à l'Assemblée (accords,
   amendement de compromis, ou 49.3 et sa censure), le Sénat, le Conseil constitutionnel : au moins 3 mois.
3. **Avenir** (décision à contrepartie) : **un programme national engagé et dont les premiers effets ont commencé** (statut ≠ préparation) à
   l'échéance. Contrepartie : coût annuel inscrit au déficit, réaction des partis, capital.

Crises programmées (en plus des événements aléatoires, sans en ajouter chaque mois) :
- mois 3 : « Menace de fermeture d'une maternité » **dans la région du scénario** (réexamine l'engagement 1 : payer 0,15 Md€ + 1 capital, ou
  accepter −2 / −5 points locaux) ; si vous laissez faire, une suite au mois 5 (« La maternité a fermé ») ;
- mois 7 : « Procédure pour déficit excessif » si le déficit ≥ 4,5 % et que vous êtes encore PM, sinon « Tensions commerciales ».
Les conséquences sont celles déjà calculées par le moteur (effets nationaux et locaux des choix, registre des causes).

## Règles de réussite et d'échec (calculées par `scenario.js`)
| Engagement | Atteint | Partiel | Manqué |
|---|---|---|---|
| Soins | effet attribué ≥ 8 pts | effet > 0, ou projet engagé sans effet encore (effets attendus) | aucun projet lancé dans la région |
| Parlement | une loi déposée pendant le scénario est promulguée | texte adopté à l'Assemblée au moins une fois, ou encore en navette | aucun texte adopté |
| Avenir | programme engagé pendant le scénario, statut `montee` ou `en_oeuvre` | programme engagé encore en préparation | aucun programme |

Résultat du scénario : **complet** = 3 atteints ; **partiel** = 1 ou 2 atteints, ou 3 partiels ; **échec** sinon. Il est distinct du **score de
bilan** (`fins.js`) et des **conditions de fin** (popularité < 8 %, censure, victoire présidentielle). Une fin anticipée clôt le scénario avec le
même bilan, daté du mois de la fin. Un changement de rôle (présidentielle) est signalé : les programmes et le 49.3 deviennent inaccessibles,
les projets et les propositions de loi restent possibles.

## Déroulement
| Mois | Ce que vit le joueur |
|---|---|
| 0 (nov. 2026) | Feuille de route : qui je suis, 3 engagements, échéance, conditions. Deux réponses pour les soins. Budget déposable. |
| 1-2 | Loi déposée → vote Assemblée fin de mois ; programme engagé ; janvier : enveloppe renouvelée. |
| 3 | Crise : maternité (région du scénario). |
| 4-5 | Mise en service, premiers effets locaux ; présidentielle (mois 5) : candidature possible, risque de perdre Matignon. |
| 6-9 | Promulgation possible ; programmes : premiers effets ; crise du mois 7. |
| 10-12 | Seconde fenêtre budgétaire ; échéance : conclusion, puis « rejouer » ou « poursuivre ». |

## Éléments réutilisés et modifications
- Réutilisés tels quels : projets, enveloppe, registre des causes, lois, navette, accords, amendements, 49.3, censure, PLF, programmes,
  élections, événements (dont `fermeture-maternite`, `procedure-deficit-excessif`, `tensions-commerciales`), fiches, bilan du mois, engagements.
- Nouveaux : `src/data/scenario.json` (cadre, cibles, crises), `src/engine/scenario.js` (création, évaluation, priorités, clôture),
  crise programmée dans `turn.js` (remplace le tirage aléatoire du mois concerné), événement `maternite-fermee` (déclenchement par scénario
  uniquement), sauvegarde **v14** (`scenario`), défi `s: 1`, aperçu pur de l'amendement (`apercuAmendement`), confirmation d'action (UI).
- Interface : écran « Découvrir en jouant » (qui, pouvoirs, problème, engagements, échéance, conditions), bloc « Feuille de route » au Bureau
  (≤ 3 priorités avec leur raison), conclusion à l'échéance, écran de fin, option « rejouer avec d'autres choix » (même graine).
- `mission.js` (v13) reste pour les anciennes parties ; une sauvegarde v13 ne reçoit pas le scénario.

## Plan d'implémentation
1. Lot 1 : consolidation (fait).
2. Lot 2 : `scenario.json`, `scenario.js`, crises programmées, v14, défi, découverte, feuille de route, conclusion, tests moteur et e2e.
3. Lot 3 : priorités, confirmations d'action, aperçu du compromis, chaîne maternité, rôle et élections dans la conclusion.
4. Lot 4 : simulations (parties constructive, autre compromis, inaction, deux projets, projet lent, refus, crise, rôle, reprise, défi),
   mobile 390/412/ordinateur, accessibilité, documentation, parcours de test humain.

## Règles réellement implémentées (lot 2 à 4)
- `creerPartie({ …, scenario })` : `etat.scenario = { id, debut, echeance, region, indice, valeurInitiale, roleInitial, loisInitiales,
  popularite, deficit, crises: [{ id, tour }], statut, bilan }`. Région : indice de santé de jeu le plus bas (égalité : identifiant).
- `evaluerEngagements` : voir le tableau ci-dessus ; `resultatScenario(engagements, gardeFou)` ; **garde-fou** : réussite complète seulement
  si le déficit à l'échéance ≤ déficit de départ + 1 point de PIB (`scenario.json`, `garde_fou`). Ajouté après simulation : sans lui,
  « tout lancer » obtenait 50/50 réussites complètes ; avec lui, 16/50 (déficit moyen 6,25 contre 5,65 pour la stratégie constructive).
- `criseDue` : au mois 3, `fermeture-maternite` dans la région du scénario (ou rien si inéligible) ; si le choix est passif (index 1 ou 2),
  `maternite-fermee` deux mois plus tard ; au mois 7, `procedure-deficit-excessif` si éligible (déficit ≥ 4,5, PM), sinon
  `tensions-commerciales`. La crise remplace le tirage aléatoire du mois ; ses effets sont ceux de `resoudreEvenement` (registre des causes).
- `priorites` : événement en attente (urgence) → engagements non commencés (raison : délai et mois restants) → texte en navette (amender ou
  49.3) → budget déposable → conclusion proche. Au plus 3.
- `apercuAmendement` : vote estimé avant / après (orientation × 0,7, effets × 0,8) sans toucher à l'état.
- `avancerScenario` : à l'échéance ou à la fin de partie, `bilan` figé (`bilanScenario`) et entrée de journal. Rejouer = même graine,
  même nom, même parti ; poursuivre = la partie continue (mandat de 60 mois, objectifs par défaut).
- Sauvegarde v14, assainissement strict du bilan ; défi `s: 1` ; sauvegarde v13 avec mission : inchangée, pas de scénario ajouté.

## Parcours de test humain (chronométré, 10 à 20 minutes visées)
Noter l'heure de départ. Accueil → avertissement → **Découvrir en jouant** → une famille politique → **Commencer la découverte**.
1. (mois 0, 2 min) Lire la feuille de route. Question : « Quel est mon but ? » Choisir une réponse pour les soins ; lire la confirmation.
   Ouvrir « À faire maintenant » → Décisions : déposer une loi (lire la fiche : vote estimé), engager un programme (lire la contrepartie).
2. (mois 1-2, 2 min) « Mois suivant ». Lire « Ce mois-ci » : vote de l'Assemblée, suites. En cas de rejet : Parlement → aperçu de
   l'amendement, ou Décisions → accord.
3. (mois 3, 2 min) Crise de la maternité : comparer les trois réponses (coût, effets locaux). Choisir.
4. (mois 4-6, 3 min) Mise en service, premiers effets locaux ; présidentielle (mois 5) : lire le journal, vérifier le rôle.
5. (mois 7-11, 4 min) Crise du mois 7 ; seconde fenêtre budgétaire (septembre) : déposer un budget ou non.
6. (mois 12, 3 min) Conclusion. Noter l'heure. Questions au joueur : « Quel était mon but ? Pourquoi ai-je choisi cela ?
   Qu'est-ce que cela a changé ? Que tenterais-je autrement ? » Puis « Rejouer avec d'autres choix ».
Points à faire tester par le propriétaire : durée réelle, lisibilité des priorités, compréhension d'un refus (loi rejetée, accord refusé),
clarté du garde-fou, mobile physique et lecteur d'écran.
