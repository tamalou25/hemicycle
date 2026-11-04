# Passation : Hémicycle

## État au 04/11/2026, soir : `main` = `7c33177`, déployé (Claude)
- **Fusionnées dans l'ordre** : #28 (passation), #29 (campagne présidentielle, temps continu, refonte visuelle), #30 (correctifs horloge et
  défi partagé), #31 (carte du monde, écran principal). `main` = `7c33177`.
- **Déploiement vérifié** : workflow « Tests et déploiement » du commit `7c33177` en succès (après une phase « waiting » de l'environnement
  Pages) ; https://tamalou25.github.io/hemicycle/ sert `carte-monde.json` et un `sw.js` qui l'embarque ; parcours joué sur le site public
  (Chromium) : Campagne présidentielle → carte du monde affichée → région Bretagne → projet « Recrutement de soignants » lancé, rôle
  `president`, 0 erreur JavaScript. Les premiers chargements juste après le déploiement ont été lents (délai de propagation).
- **Tests sur `7c33177`** : Vitest 224/224 (24 fichiers), Playwright 101 passed / 3 skipped / 0 failed (ordinateur et mobile), `npm run build`
  et `npm run build:mobile` OK. Sauvegarde v15.
- **Suite** : mesurer la durée réelle d'une campagne (30 à 90 min visées) et la lisibilité du premier mois avec un joueur ; lots 2 à 5 de
  `docs/VISION-CAMPAGNE.md` (économie/commerce, diplomatie, défense stratégique, équilibrage et difficulté).

## Correctifs et carte du monde (Claude, 04/11/2026)
- **Fusionnées** : #28 (passation) et #29 (campagne présidentielle, temps continu, refonte visuelle) → `main` = `63e45e9`. Déploiement : le
  workflow Pages de ce commit a d'abord été annulé par la concurrence des fusions successives, puis relancé (voir l'état en fin de section).
- **PR #30 `correctifs-horloge-partage`** (fusionnée) : horloge en fraction de mois (changer de vitesse garde le jour, « Mois
  suivant » manuel remet le mois à zéro, aucun double traitement) ; défi partagé avec date de départ (campagne en mai 2027 chez le
  destinataire, anciens liens lisibles). Tests : `tests/horloge.test.js` (6), `tests/presidence.test.js` (défi), `e2e/presidence.spec.js` (+2).
- **PR #31 `carte-monde`** (fusionnée) : `scripts/generer-carte-monde.mjs` → `src/data/carte-monde.json` (Natural Earth 110m, domaine
  public + régions IGN/france-geojson, Licence Ouverte, projetés ensemble en Mercator ; sources dans `docs/SOURCES.md`) ;
  `src/ui/components/carteMonde.js` : écran « Monde » (onglet principal, écran d'arrivée de la campagne présidentielle), zoom et
  déplacement (souris, tactile, clavier), recentrage France / Europe / Monde, encarts DROM, vues existantes, tableau accessible, « Votre
  cap » (urgences, objectifs), accès aux écrans, fiche région et lancement de projets réutilisés, alertes territoriales → carte.
  Tests : `e2e/monde.spec.js` (6) ; `e2e/presidence.spec.js` adapté (arrivée sur la carte, puis Bureau). Résultats sur `carte-monde` :
  Vitest 224/224 (24 fichiers), Playwright 101 passed / 3 skipped (sauts voulus par projet) / 0 failed, `npm run build` et `build:mobile` OK.
  Détails : `docs/DESIGN-UI.md`, `docs/VISION-CAMPAGNE.md`.
- **Non fait** : économie internationale, pays étrangers autonomes, défense (le fond mondial est purement géographique) ; durée réelle de la
  campagne non mesurée.

## Campagne présidentielle et temps continu (Claude, branche `campagne-presidence`, lot 1 de `docs/VISION-CAMPAGNE.md`)
- **Vision** validée le 04/11/2026 : `docs/VISION-CAMPAGNE.md` (préférences, boucle de jeu, réutilisations, changements, feuille de route
  en 5 lots, parcours manuel). Attentes du propriétaire mises à jour (`.agents/skills/attentes-proprietaire/SKILL.md`).
- **Moteur** : `presidence.js` (rôle `president`, gouvernement, `gouverne()`, censure → gouvernement renversé, nomination, cohabitation),
  `horloge.js` (horloge pure : pause, vitesses, un mois par pas, raisons de pause), contrôles de rôle passés par `gouverne()`, dissolution
  de plein droit pour le président, objectifs « programmes » accessibles au président. **Sauvegarde v15** (`gouvernement`), migration
  v14 → v15 sans activation rétroactive. Les règles du PM et du député sont inchangées (tests existants verts).
- **Interface** : écran « Campagne présidentielle », bloc gouvernement au Bureau (nomination si renversé), commandes du temps (ordinateur
  et mobile, clavier : Espace, +, −), pause automatique et en arrière-plan, « Mois suivant » conservé.
- **Refonte visuelle « Salle des cartes »** (même chantier) : nouvelle palette (fond gris-bleu, surfaces blanches, bleu d'action, ambre pour le
  temps et les alertes), bandeau d'état sombre, accueil en trois entrées, priorités en premier au premier mois, animations sobres respectant
  `prefers-reduced-motion`. Choix et captures avant / après : `docs/DESIGN-UI.md`, `docs/captures/avant-refonte/`, `docs/captures/apres-refonte/`.
- **Tests** : `tests/presidence.test.js` (9), `tests/horloge.test.js` (4, dont l'indépendance de la vitesse) ; `e2e/presidence.spec.js` (8).
  Vitest 220/220 ; Playwright 86 passed, 2 skipped (raccourcis clavier hors mobile, mise en page mobile hors ordinateur).
- **Limites** : durée réelle de 30 à 90 minutes non mesurée ; diplomatie, économie internationale, défense : lots suivants ; la
  présidentielle suivante n'est pas jouée ; la défaite par popularité est une convention étiquetée.

## État au 04/11/2026, après fusion et déploiement (Claude)
- **`main` = `acfe557`** (merge de la PR #27). Fusionnées ce jour, dans l'ordre : #25 (refonte de la première expérience), #26 (skills
  `demarrage` et `attentes-proprietaire` de Codex), #27 (partie courte « Douze mois pour convaincre », consolidation de la refonte).
- **Déployé et vérifié** : workflow « Tests et déploiement » vert sur `acfe557`, APK Android produit ; https://tamalou25.github.io/hemicycle/
  sert `scenario.json` et un `sw.js` à jour ; parcours « Découvrir en jouant » joué sur le site en ligne (Chromium) : feuille de route
  affichée, 3 engagements, 0 erreur JavaScript.
- **Tests sur `acfe557`** : Vitest 207/207 (21 fichiers), Playwright 72/72 (ordinateur et mobile).
- **Sauvegarde v14** ; les sauvegardes v13 (mission d'initiation) et antérieures restent jouables sans scénario ajouté.
- **Consignes** : `.agents/skills/demarrage/SKILL.md` puis `.agents/skills/attentes-proprietaire/SKILL.md` (version Codex + section
  « Choix des modèles »), référencés par `AGENTS.md` et `CLAUDE.md`.
- **Suite** : retours d'un vrai joueur sur la partie courte (durée réelle, compréhension d'un refus, garde-fou), parcours chronométré
  dans `docs/PARTIE-COURTE.md` ; puis niveaux de difficulté (non commencés) et équilibrage par parties jouées.

## État au 03/11/2026 (Claude)
- **Branche de référence** : `main`, au commit `687caa0` (merge de la PR #15). Toutes les étapes E0 à E7 et les correctifs de revue y sont intégrés.
- **En ligne** : https://tamalou25.github.io/hemicycle/ (PWA installable, jouable hors ligne). Un APK Android de test est produit par la CI (workflow « Application Android »).
- **Tests exécutés sur `687caa0`** : Vitest 130/130 (13 fichiers) ; Playwright 14/14 (ordinateur et mobile). La CI est verte sur les jobs `test`, `e2e` et `apk`.
- **Interface (Claude), chantier 1 : mergé** (PR #17, `main` = `41b77b6`). Navigation mobile en bas avec « Mois suivant » toujours visible ; Bureau réorganisé (État du pays, À traiter avec actions, Ce mois-ci). Hauteur mobile environ 1 600 à 1 700 px, contre 2 393 avant. Tests : Vitest 130/130, Playwright 22/22. Aucun changement du moteur, des données ni de `tests/`. La branche `ui-design` continue à partir de `main` pour le chantier 2.
- **Prochain chantier d'interface** : compacter la carte d'événement (environ 900 px) ; audit de contraste automatisé ; onglets Décisions, Carte et Budget sur mobile.
- **Branche Codex `phase-E3-population`** : jamais mergée, devenue obsolète (voir la section E3).

## État au 03/11/2026, fin des chantiers (Claude)
- **`main`** contient tout le travail ci-dessous (PR #19 à #23). Tests : Vitest 165/165, Playwright 36/36 (ordinateur et mobile), CI verte.
- **Fait depuis la passation précédente** :
  - **Confiance par région** (#19) : distincte de la satisfaction, chocs nationaux, +3 à la mise en service d'un projet ; utilisée par les législatives (pondérée par la population) ; vue « Confiance » sur la carte.
  - **Équilibrage** (#20) : tests de non-régression sur 20 graines. Correction : les options passives des événements condamnaient le joueur (85 % d'échecs → 50 % pour un joueur passif, 0 % pour un joueur réactif).
  - **Objectifs de mandat** (#21) : 3 au choix parmi 10, neutres, avec un bonus au bilan. Transmis dans les défis. L'objectif « programmes » est réservé au Premier ministre.
  - **Événements régionaux** (#22) : 4 événements ciblant une région fragile, effets locaux, coût sur l'enveloppe.
  - **Interface, chantier 2** (#23) : audit WCAG AA automatisé, Décisions, Budget et Bureau compactés sur mobile, carte d'événement compacte, garde-fou `sw.js`.
- **Sauvegarde** : v12, avec migrations depuis v1.
- **Règle apprise** : toujours lancer `npm run build` avant de commiter (CSS et `sw.js`). `npm test` le vérifie désormais.
- **Restant (hors code)** : tests sur un vrai téléphone (APK de la CI), build iOS sur Mac, publication sur les stores, recoupement des fonctions des élus, citations vérifiées (0 aujourd'hui), équilibrage par de vraies parties jouées.

## Partie courte « Douze mois pour convaincre » (Claude, PR #27, fusionnée dans `main` le 04/11/2026)
- **Dépendance** : la branche part de `refonte-experience` (PR #25, relue au commit `e15cc0b`) et contient aussi les skills de la PR #26
  (`.agents/skills/attentes-proprietaire/SKILL.md` = version Codex + section « Choix des modèles » ; `demarrage/SKILL.md` identique).
  Ordre de fusion conseillé : #25, puis #26, puis cette PR (conflit attendu sur `SKILL.md` : garder la version de cette branche, qui est un
  sur-ensemble). Aucune fusion automatique.
- **Lot 1 (consolidation de la refonte)** : `projetsMission` (tous les projets comptent), journal daté du mois affiché pour les résultats du
  passage (`bilanMois` sans répétition), coût absent « non chiffré » ≠ « aucun », premier écran mobile traité par le bloc du scénario
  (3,3 écrans → 2,6, bouton principal visible à l'arrivée). Tests dans `tests/mission.test.js` et `e2e/scenario.spec.js`.
- **Lot 2 à 4** : `src/data/scenario.json`, `src/engine/scenario.js` (engagements, crises programmées, bilan, priorités, aperçu de
  l'amendement, garde-fou), `turn.js` (crise programmée à la place du tirage), **sauvegarde v14** (`scenario`, migration v13 → v14 sans
  activation rétroactive), défi `s: 1`, événement `maternite-fermee` (déclenchement par scénario uniquement), interface
  (`src/ui/components/scenario.js`, `confirmations.js`, découverte, écran de fin, aperçu du compromis dans Parlement, toasts limités à deux).
- **Simulations** (`node scripts/sim-partie-courte.mjs`, 5 partis × 10 graines, résultats de simulation et non preuve d'intérêt) :
  constructive 39 complets / 11 partiels / 0 échec ; compromis 36 / 14 / 0 ; inaction 0 / 0 / 50 ; « tout lancer » 16 / 34 / 0 (garde-fou
  financier dépassé). Matignon perdu à la présidentielle dans environ la moitié des parties (règle existante : vainqueur à plus de 60 d'écart).
- **Tests** (commit `afc78a1`) : Vitest 207/207 (21 fichiers), Playwright 72/72 (ordinateur et mobile), `npm run build` et `npm run build:mobile` OK, CI verte.
  Défaut préexistant corrigé au passage : l'onglet Parlement ne s'affichait plus dès qu'un texte était en navette (`r493` indéfini).
- **À confirmer par le propriétaire** : durée réelle (10 à 20 minutes visées, non mesurée automatiquement), compréhension par un débutant
  (parcours chronométré dans `docs/PARTIE-COURTE.md`), lecteur d'écran réel, appareil physique.

## Refonte de la première expérience (Claude, PR #25, fusionnée dans `main` le 04/11/2026)
- **Fait** : « Découvrir en jouant » (mission d'initiation de 6 mois, même moteur), Bureau en trois questions, fiches comparables,
  bilan du mois, engagements, objectifs « départ → actuel / cible ». Détail : `docs/REFONTE-EXPERIENCE.md`.
- **Moteur** : nouveaux `mission.js`, `fiches.js`, `bilan.js` ; `tourSuivant` clôt la mission ; réponse automatique à un événement
  journalisée `evenement-auto`. **Sauvegarde v13** (`mission`, `objectifsInitiaux`), migration v12 → v13 sans activation rétroactive.
  Défis : champ `m`.
- **Données** : `src/data/mission.json` (test de schéma dans `tests/data.schema.test.js`).
- **Tests** : voir la PR (Vitest et Playwright, dont l'audit axe des nouveaux écrans).
- **À confirmer** : compréhension et intérêt avec un vrai débutant ; captures dans `docs/captures/refonte-*`.

## Cap du mandat (Claude, branche `ui-cap-du-mandat`)
- **Problème** : un joueur a dit « on ne comprend pas grand-chose, il faut un but ».
- **Fait (interface uniquement)** :
  - brief « Votre mandat » en tête du Bureau, qui remplace l'ancien bloc des objectifs. Il affiche les mois restants, le bonus de +8 points au bilan, et pour chaque objectif choisi : sa valeur, sa cible et son état « pour l'instant », issus de `evaluerObjectifs` ;
  - une piste par objectif avec un bouton vers Décisions (filtre adapté, ancien filtre levé), Carte (vue adaptée) ou Budget (Premier ministre). Le nombre de leviers disponibles vient du catalogue du moteur. Ces boutons ne font que naviguer ;
  - « Comment jouer un mois » est replié ; on y trouve les fins anticipées réelles (popularité < 8 %, censure pour le Premier ministre, présidentielle) ;
  - une section « Le but » à l'accueil ;
  - une ancienne partie sans objectifs affiche une explication et des repères. Rien n'est attribué ni modifié.
- **Moteur, données, migrations** : inchangés. Seul `main.js` change (l'action `onglet` accepte un filtre de Décisions).
- **Tests** : nouveau `e2e/cap-mandat.spec.js` ; `objectifs.spec.js` adapté. La hauteur mobile du Bureau reste sous la limite existante.
- **Relecture Codex (commit `6dec15b`), corrigée** :
  - « Investir dans l'avenir » ouvre Décisions filtré sur les programmes. Le filtre « Programmes uniquement » est visible et se retire. Le compteur ne compte que les programmes disponibles ; même logique pour « Réformer » avec les lois ;
  - « Aucun territoire abandonné » ouvre la région de l'indice minimal avec la vue correspondante. En cas d'égalité : ordre emploi, santé, transports, puis identifiant de région ;
  - accueil : « Choisissez vos actions du mois, puis passez au mois suivant ».
- **À confirmer** : la compréhension par un vrai débutant.

## Travail en parallèle (Claude + Codex)
> **Mise à jour du 03/11/2026 (décision de l'utilisateur)** : Claude reprend **tout**, interface et moteur, jusqu'à la fin des chantiers listés ci-dessous. Le partage décrit ici reste la référence si Codex reprend la main. Chaque sujet garde sa branche et sa PR, et on vérifie toujours `main` avant de merger, pour ne jamais écraser un éventuel commit de Codex.

| Domaine | Responsable | Fichiers |
|---|---|---|
| Interface, design, ergonomie, accessibilité | **Claude** | `index.html`, `src/ui/**`, `src/main.js` (partie affichage), `src/styles/**`, `assets/**`, `tailwind.config.js`, tests `e2e/**` de l'interface, captures |
| Moteur, équilibrage, sauvegardes, tests du moteur | **Codex** | `src/engine/**`, `src/data/*.json` (paramètres), `tests/**`, migrations dans `save.js` |
| Partagé, à toucher avec prudence | les deux | `package.json`, `.github/workflows/**`, `docs/**`, `CLAUDE.md` / `AGENTS.md` |

Règles :
1. **Une branche dédiée par sujet**, partie de `main` à jour (`git fetch origin main && git checkout -B <branche> origin/main`). Préfixes : `ui-…` pour Claude, `moteur-…` pour Codex.
2. **On ne modifie pas le domaine de l'autre.** Si l'interface a besoin d'un changement du moteur (nouvelle fonction, nouveau champ d'état, autre format), on l'écrit d'abord dans `docs/DEMANDES-MOTEUR.md`. L'interface n'utilise que l'API exportée par `src/engine/index.js`.
3. **Ne jamais écraser le travail de l'autre** : pas de `push --force` sur une branche partagée ni de merge qui résout un conflit en jetant l'autre côté. En cas de conflit, on garde les deux intentions ou on demande.
4. **Avant de merger** : `npm test`, `npm run test:e2e` et `npm run build` (CSS et service worker à jour). La CI doit être verte.
5. **Mettre à jour cette passation** à la fin de chaque sujet : branche, dernier commit, ce qui est fait, tests, problèmes, suite.

## Prochaines étapes
- **Claude (interface)** : branche `ui-design`.
  - Audit d'ergonomie et d'accessibilité de chaque onglet, en mobile d'abord.
  - Hiérarchie du Bureau (« Où en est le pays ? Quel problème ? Que faire ? »).
  - Bilan de fin de mois plus lisible ; chronologie illustrée.
  - États vides et chargement ; animations brèves et utiles.
  - Correctif : les compteurs des filtres de Décisions ne doivent pas dépendre du filtre de statut (côté interface).
- **Codex (moteur)** :
  - Confiance différenciée par région (idée de `phase-E3-population`, à reprendre sur le `main` actuel).
  - Équilibrage par vraies parties.
  - Objectifs de mandat variés ; événements régionaux.
  - Tests de non-régression de l'équilibrage.

## Problèmes connus
- **Application mobile** : export et partage natifs vérifiés seulement par la compilation de l'APK, pas sur un appareil. iOS non compilé (Mac nécessaire). Publication sur les stores non faite (comptes, signature, icônes natives).
- **Données** : 0 citation vérifiée. Fonctions des élus tirées de Wikipédia, à recouper. Dépenses par fonction estimées (COFOG 2025 non publiée). Indice transports et sensibilités : paramètres d'équilibrage.
- **Équilibrage** : réglé par simulations scriptées, pas par des parties jouées.
- **Interface** : les compteurs des filtres de Décisions dépendent du filtre de statut. Le Bureau reste dense sur mobile.

## Historique détaillé

## Terminé
### v1 (sur `main`)
- Moteur pur avec hasard à graine
- Navette, 49.3 et censure
- Élections
- Événements et budget à 2 leviers
- Mode élu réel (réactions marquées SIMULATION, 0 citation)
- Défis par lien et classement local
- Sauvegardes v4, nettoyées à l'import

### E0 Fondations (cette branche)
- **CSS** : Tailwind compilé localement (`npm run build:css` produit `assets/app.css`, à commiter). Plus aucun CDN.
- **Police** : Source Serif 4 auto-hébergée (licence OFL).
- **Couleurs « bureau »** : bordeaux et laiton ajoutés, ainsi que des variables CSS réutilisables.
- **Registre des causes** (`src/engine/explications.js`) : chaque variation d'un indicateur est attribuée à une cause (loi, budget, événement, conjoncture ou opinion). Il distingue l'observé des prévisions, garde 12 mois et survit à l'export.
- **Encart « Ce qui a changé ce mois-ci »** en haut du tableau de bord.
- **CI** : vérifie que `assets/app.css` est à jour, et le déploiement copie le dossier `assets/`.

### E1 Carte et territoires
- Données régionales sourcées :
  - population (Insee au 1er janvier 2026) ;
  - chômage (Insee, T2 2026 ; Mayotte hors champ) ;
  - densité de médecins généralistes (Insee/DREES, 2025) ;
  - fond de carte IGN Admin Express 2018 (Licence Ouverte), avec les DROM en encarts.
- Moteur :
  - `territoires.js` : indices emploi, santé et transports (0 à 100), satisfaction pondérée par la population, usure de 0,08 par mois ;
  - `projets.js` : 6 projets (chantier → montée en charge → en service), risque tiré à la graine, effet plus fort dans les petites régions ;
  - `finances.js` : enveloppe de 4 Md€ par an, d'où sont prélevés les coûts de fonctionnement ;
  - `briefing.js`.
- Sauvegarde v5 : les anciennes parties sont complétées par `assurerTerritoires`.
- Interface : onglets Bureau, Carte, Budget, Parlement, Chronologie. Carte SVG avec 4 vues, une légende, un tableau équivalent, la fiche région et le lancement des projets.
- **Équilibrage** (20 parties de 24 mois) :

  | Stratégie | Satisfaction finale |
  |---|---|
  | Passive | 61,1 |
  | Investir d'abord dans les régions où le besoin est le plus fort | 61,7 |
  | Investir d'abord dans les grandes régions | 65,6 |

  C'est voulu : investir là où vivent beaucoup d'habitants rapporte en popularité, investir là où le besoin est le plus grave aide localement mais pèse peu dans la moyenne nationale. L'effet national reste modeste et devra être renforcé en E3 (groupes et vote par région).

## Décisions validées (cadrage v2)
1. Le joueur est **Premier ministre** par défaut. Le Président est une IA, et le mode député est gelé.
2. La carte couvre **13 régions et 5 départements et régions d'outre-mer**. Les autres collectivités d'outre-mer sont exclues pour l'instant.
3. CSS : **Tailwind compilé localement** (fait en E0).
4. Budget en **Md€, en ordres de grandeur sourcés**. Les paramètres d'équilibrage sont étiquetés comme tels.
5. Les fonctionnalités v1 sont conservées et passent au second plan (onglet Parlement). Le capital politique est réservé aux actions politiques.
- Ordre de livraison : web, puis PWA, puis Capacitor (à évaluer en E7, rien d'installé). Multijoueur, comptes et opérations militaires sont hors périmètre.

## Tests exécutés (sur cette branche)
- **E6** : 128 tests Vitest, 14 tests Playwright (dont le hors ligne).
- **Vitest, E5** : 128 tests passent. Playwright : 10 tests passent (dont `politique.spec.js`).
- **Vitest, E4** : 120 tests passaient. Playwright : 6 tests passent (dont `decisions.spec.js`).
- **Vitest, E3** : 111 tests passaient. Playwright : 4 tests passent (ordinateur et mobile).
- **Vitest, E2** : 98 tests passaient. Playwright E2 : PLF déposé, aperçu cohérent avec le vote réel (rejet 271–292, loi spéciale), aucune erreur console.
- **Vitest, E1** : 87 tests passaient (E1 : territoires, projets, briefing, migration v5, schémas des régions, de la carte et des projets).
- **Playwright, E1** : sélection de Mayotte au clavier, projet lancé puis mis en service, effet expliqué dans la fiche. Aucune erreur console et pas de scroll horizontal à 390 px.
- **Vitest, E0** : 71 tests passaient, dont 5 sur le registre. Par exemple : la somme des causes égale la variation réelle de chaque indicateur.
- **Playwright** :
  - Les 152 classes CSS utilisées pendant une partie ont toutes une règle dans la feuille compilée.
  - Aucune ressource externe n'est chargée.
  - Le rendu est identique à la version CDN, à la police près.
  - L'encart du bilan s'affiche sans erreur console.
- **Lighthouse** (accueil uniquement, en local) : accessibilité 100, bonnes pratiques 100, performance 93.

## Problèmes connus et points ouverts
- **Pas encore fait dans E0** : `docs/VISION.md` (la vision complète est dans le prompt de cadrage). La CI de cette branche n'a pas encore tourné.
- **Lighthouse** n'a audité que l'accueil, pas le tableau de bord.
- **Le tableau de bord reste une longue page** (environ 7 000 px sur mobile). La refonte en onglets est prévue en E1.
- **Données de départ** : les indicateurs viennent de la presse et de l'OFCE, pas de l'Insee. La dette n'est pas sourcée (valeur par défaut). Les fonctions des élus viennent de Wikipédia et sont à recouper.
- **Régions** absentes, **0 citation** vérifiée.
- **Polices** : seul le sous-ensemble latin est embarqué. Les caractères hors latin utiliseront la police de secours (Georgia).

### E2 Finances réelles
- Données Insee 2025 dans `finances.json` :
  - PIB 2 991 Md€, dette 3 460 Md€ (115,7 %), déficit 5,1 %, intérêts 64,7 Md€ ;
  - recettes ventilées en 5 postes ;
  - dépenses en 8 postes, **estimées** à partir de la structure COFOG 2024, car la COFOG 2025 n'est pas encore publiée.
- Moteur `budgetEtat.js` : projet de loi de finances déposé de septembre à décembre par le PM (variation de ±5 % par poste), chiffré en Md€ et en points de déficit.
- Vote du budget :
  - Assemblée : l'opposition idéologiquement éloignée vote contre par principe, un accord peut la retourner ;
  - 49.3 possible sans délai, avec motion de censure ;
  - en cas de rejet, une **loi spéciale** reconduit les crédits.
- Effets :
  - effets différés des sensibilités par Md€ (paramètres d'équilibrage), avec les crédits santé et infrastructures qui agissent sur les indices régionaux ;
  - PIB qui évolue chaque mois ;
  - charge d'intérêts révisée en janvier ;
  - dynamique de la dette corrigée (croissance nominale).
- Sauvegarde v6.
- Interface : onglet Budget avec le tableau des finances, le PLF à curseurs et un aperçu en direct (solde, orientation, vote probable « estimation »), bannière dans Bureau. Les anciens leviers ±2 pt sont retirés.
- **Équilibrage** : la dette progresse d'environ 2 points par an sans action. Un budget neutre d'un PM EPR est rejeté 271–292 sans accord : il faut négocier ou utiliser le 49.3.

### E3 Population (mergé, PR #10)
- **Fait et testé (moteur)** :
  - `groupes.json` : 6 groupes avec leurs parts (Insee RP 2023) ;
  - `groupes-equilibrage.json` : des priorités seulement, **aucune orientation politique attribuée aux groupes** ;
  - `groupes.js` : satisfaction, confiance et vote distincts ; chocs de confiance (49.3 −3, loi spéciale −1,5) ; sondage avec `parGroupe` ;
  - législatives par région (`siegesParRegion`) ;
  - sauvegarde v7.
- **Corrigé** (4 remarques de revue sur E2) : PIB nominal, précision de `borner` portée à 4 décimales, mois de départ de la révision des intérêts, vote de censure enregistré.
- **Playwright** : en place (`e2e/`, configurations ordinateur et mobile, job `e2e` dans la CI). Voir le README.
- **Interface E3** : onglet Opinion et vue « Législatives » de la carte (motifs, légende, badge SIMULATION), vérifiés visuellement. Reste à ajouter un test e2e pour l'onglet Opinion.
- **Branche `phase-E3-population` (Codex) : ne pas merger.** Elle a été faite en parallèle à partir de `main` avant E3. Elle réimplémente la population différemment (4 profils fictifs par région) et supprime les correctifs E2 ainsi que la config Vitest. Idée à reprendre plus tard : une confiance différenciée par région (`population.js`, `intentionsRegionales`).
- **Avant de merger** : `npm test`, `npm run test:e2e`, `npm run build:css` (la CI vérifie que le CSS compilé est commité), mise à jour du README.

### E4 Secteurs et onglet Décisions
- `politiques.json` (paramètres d'équilibrage) : 6 secteurs et 12 programmes nationaux, chacun avec un coût en Md€ par an (déficit et poste budgétaire), un délai, une montée en charge du niveau et une contrepartie affichée. Prérequis en recherche. Défense limitée aux moyens et à la préparation.
- `secteurs.js` : usure de 0,05 par mois, montée en charge expliquée dans le registre. Sauvegarde v8.
- **`decisions.js` : catalogue unifié** de toutes les actions en 4 catégories (nationales, territoriales, exceptionnelles, négociations), avec secteur, coût, délai et statut (disponible, en cours, bloquée avec sa raison, faite, urgente).
- Interface : **onglet Décisions** (filtres par catégorie, statut et secteur ; cartes compactes avec un seul bouton). Les doublons ont été retirés de l'onglet Parlement. Le Bureau affiche le nombre de décisions et un panneau Secteurs.
- À corriger : les compteurs de catégorie dépendent du filtre de statut.

### E5 Politique reliée
- `relations.js` : une relation de 0 à 100 par parti, à 50 au départ pour tous.
- Réaction aux lois promulguées, aux programmes engagés et aux budgets adoptés, selon les **positions publiques** du parti sur le thème. Neutre à 60 points d'écart, entre −4 et +4. La relation revient de 5 % par mois vers 50.
- Effets : bonus de vote de ±0,125, tolérance d'accord de ±25, censure (« Soutien » ≥ 75 : jamais ; « Hostile » ≤ 25 : censure facilitée).
- Registre : entrées « X approuve / désapprouve … (simulation) », exclues du bilan national. Sauvegarde v9.
- Interface : relations et réactions du mois dans Parlement, réaction probable sur les cartes de Décisions. Le mode élu réel a été vérifié (e2e).
- Corrigé : `partis` n'était pas passé à `creerPartie` lors d'une nouvelle partie.

- E5, corrigé après coup : défilement horizontal sur l'écran de choix de l'élu en CI mobile (fieldset et grille rétrécissables, garde-fou `overflow-x: clip`, vérification dans l'e2e). Plus les 3 remarques de revue sur E4.

### E6 PWA
- `manifest.webmanifest` (installable, `standalone`, couleurs du bureau) et icônes générées dans `assets/icones/`.
- `sw.js` est **généré** par `scripts/generer-sw.js` (`npm run build`) : il met en cache la liste exacte des 77 fichiers du jeu. La version du cache est dérivée du contenu, et les anciennes versions sont purgées.
- Enregistrement dans `main.js`. Un échec d'enregistrement n'empêche jamais de jouer.
- CI : vérifie que `sw.js` est à jour ; le déploiement copie `sw.js` et le manifeste.
- e2e `pwa.spec.js` : manifeste et icônes accessibles, **partie rechargée et jouée hors ligne**.

### E7 Mobile
- Capacitor 8.6.0 : `capacitor.config.json` (appId `io.github.tamalou25.hemicycle`), projets `android/` et `ios/` générés, `www/` construit par `npm run build:mobile` (ignoré par git).
- Zones sûres (encoche) gérées en CSS ; scripts `cap:sync`, `cap:android` et `cap:ios`.
- Workflow `android.yml` : APK de débogage téléchargeable depuis la CI.
- ADR 0002 : choix et limites. Restent à faire **par toi** : comptes développeur, signature, icônes natives, build iOS sur Mac, tests sur appareil, publication.

## Pistes après la roadmap v2
- Confiance différenciée par région (idée de la branche Codex `phase-E3-population`, à reprendre proprement).
- Compteurs des filtres de Décisions indépendants du filtre de statut.
- Régions détaillées (événements locaux), objectifs de mandat variés, diplomatie/UE.

## Étapes suivantes (non commencées)
- **Méthode** : une branche et une PR par étape, toute variation d'indicateur passe par `explications.js`, chaque nouveau champ d'état est ajouté à `save.js` (nettoyage strict) avec une migration de version.

## (Archive) Plan E1 initial
1. Sourcer les données régionales :
   - populations et chômage par région (Insee) ;
   - accès aux soins, indicateur APL (DREES) ;
   - fond de carte IGN Admin Express (licence ouverte à confirmer), simplifié une fois avec mapshaper et commité.
2. Moteur :
   - `territoires.js` : les régions et leurs indicateurs ;
   - `projets.js` : 6 projets (étude → chantier → en service), avec coût de départ, coût annuel et délai ;
   - `finances.js` : enveloppe d'investissement en Md€ ;
   - sauvegarde v5 avec migration depuis v4.
3. Interface :
   - onglets Bureau, Carte, Budget, Parlement, Chronologie ;
   - carte en SVG avec 3 vues et une légende, plus un tableau équivalent ;
   - fiche région ;
   - briefing de 3 alertes.
4. Critère d'acceptation : le parcours « problème → projet → mois → effet expliqué » fonctionne à 390 px et au clavier, et les 71 tests restent verts.

## 2026-11-04 — Événements insolites et règles de contenu allégées (branche `claude/epic-hamilton-4neew9`)
- `CLAUDE.md` : humour autorisé ; personnages inventés libres (sans badge ni source) ; parodies de personnalités réelles avec nom déformé et trait absurde inoffensif uniquement (jamais crime, scandale, santé, famille, fausse citation). Règle sur les personnes réelles toujours stricte.
- `events.json` : +10 événements `insolite` (poids 1, dernière option passive coûteuse pour garder l'équilibrage). Thème « Insolite » dans `evenement.js`.
- Tests : graines des 2 scénarios changées (4 et 10) car le tirage seedé dépend de la taille du pool. Vitest 224/224, Playwright 101 passés (3 ignorés).
- Skills ECC copiés dans `.agents/skills/` (voir `ECC.md`).
