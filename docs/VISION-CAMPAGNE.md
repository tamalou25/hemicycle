# Vision : la campagne présidentielle

Validée par le propriétaire le 04/11/2026. Remplace la cible de 10 à 20 minutes pour la campagne principale ; la partie courte
« Douze mois pour convaincre » (`docs/PARTIE-COURTE.md`) reste une porte d'entrée.

## Préférences confirmées
- La France seule est jouable au départ, réalisée avec soin ; d'autres pays plus tard.
- Le joueur incarne **le président**, limité par le gouvernement, le Parlement, les élections et les ressources du pays.
- Campagnes de **30 à 90 minutes**, sauvegardables.
- **Temps continu** avec pause et vitesses réglables.
- Prise en main facile ; niveaux de difficulté ultérieurs.
- Politique intérieure, économie et diplomatie au premier plan ; défense au niveau stratégique (moyens, préparation, alliances,
  engagements), jamais d'opérations détaillées.
- Inspirations : planification et interdépendances (Hearts of Iron IV), gestion politique et géopolitique (Power & Revolution).
  Hémicycle garde une identité propre : **expliquer les conséquences des décisions** (registre des causes, fiches, bilans).

## Expérience recherchée et boucle de jeu
Le joueur est président·e (personnage fictif) élu·e en mai 2027. Le calendrier avance seul ; il met en pause pour décider.
Boucle d'un mois simulé (30 s à ×1, 12 s à ×2, 5 s à ×3) :
1. **Lire** : Bureau (que se passe-t-il, priorités, engagements), événement éventuel (pause automatique).
2. **Décider en pause** : par le gouvernement (projet de loi, programme, budget, 49.3), par soi-même (nomination du gouvernement,
   dissolution, projets en région, accords), en réponse à une crise.
3. **Laisser le temps courir** : votes en fin de mois, chantiers, effets différés, élections au calendrier.
4. **Observer** : « Ce mois-ci » attribue chaque variation à sa cause ; les engagements montrent leur prochaine échéance.
Conclusion : fin du mandat (60 mois) avec le bilan et les objectifs ; fins anticipées (popularité < 8 %, simplification « démission »).

## Systèmes existants réutilisés
Moteur pur à graine (`tourSuivant`), navette et votes, accords, amendements, 49.3 et censure, PLF, programmes nationaux, projets
territoriaux et enveloppe, événements (dont régionaux), élections (législatives, européennes, dissolution), relations avec les partis,
opinion par groupes et régions, objectifs de mandat, registre des causes, fiches, bilan du mois, sauvegardes versionnées, défis.

## Changements apportés par ce chantier (lot 1 : présidence et temps)
| Sujet | Avant | Après |
|---|---|---|
| Rôles | `depute`, `premier_ministre` ; gagner la présidentielle **terminait** la partie (`fin.type = 'victoire'`) | Rôle `president` : on **commence** président·e (mai 2027, scrutin simulé hors jeu) et on gouverne cinq ans. La règle de victoire reste pour les autres rôles (anciennes parties). |
| Gouvernement | — | `etat.gouvernement = { parti, depuis, statut: 'en_place' \| 'renverse', renversements, nominations }` : Premier ministre fictif issu d'un parti. Le président agit **par** lui : `gouverne(etat)` conditionne projets de loi, programmes, PLF, 49.3 et les événements réservés au gouvernement. |
| Censure | fin de partie pour le PM | Président·e : le **gouvernement** tombe (texte et PLF en cours annulés, choc d'opinion −2), jamais la présidence ; il faut nommer un Premier ministre (`nommerGouvernement`, 2 capital, 1 action du mois). Le PM reste renversé comme avant. |
| Majorité | parti du joueur + accords | Le parti du gouvernement soutient les textes (+0,15, comme un accord) et ne vote pas la censure ; nommer un parti éloigné (cohabitation, écart > 60) coûte 3 points de popularité, 1 point entre 30 et 60. Sans censure, on ne change pas de gouvernement avant 12 mois. |
| Dissolution | demande au Président, acceptée selon la popularité | Décision du président (art. 12), jamais refusée ; les textes tombent, législatives dans deux mois. |
| Temps | un bouton « Mois suivant » | **Horloge pure** (`src/engine/horloge.js`) : pause / lecture, vitesses ×1 ×2 ×3, jour du mois affiché ; un mois au plus par pas, aucun rattrapage ; pause automatique (événement, gouvernement renversé, fin, conclusion de scénario) et en arrière-plan ; raccourcis Espace, +, − ; « Mois suivant » reste disponible en pause. L'horloge ne contient aucune règle : un pas = un appel de `tourSuivant`, identique à toutes les vitesses (test `tests/horloge.test.js`). |
| Sauvegarde | v14 | **v15** (`gouvernement`), migration v14 → v15 sans activation rétroactive ; l'horloge n'est pas sauvegardée : toute reprise commence en pause. |

Simplifications institutionnelles assumées : pas de nomination nominative (le PM est « issu d'un parti »), pas de motion de censure
contre le président (impossible en droit), pas de référendum ni d'article 16, pas de Conseil des ministres, présidentielle suivante hors
mandat (la campagne s'arrête en mai 2032, avant le scrutin). La défaite par popularité est une convention de jeu, étiquetée comme telle.

## Feuille de route par lots
| Lot | Contenu | État |
|---|---|---|
| 1. Présidence et temps | rôle président, gouvernement et censure, nomination, dissolution, horloge continue, écran de campagne, tests, docs | **fait** (PR #29 fusionnée) ; correctifs horloge et partage : PR #30 |
| 1 bis. Carte, écran principal | fond mondial Natural Earth + régions IGN projetés ensemble (Mercator), écran « Monde » zoomable cadré sur la France, cap et urgences, fiche région et projets, alertes territoriales → territoire, tableau accessible | **fait** (branche `carte-monde`, dépend de #30) |
| 2. Économie, production, commerce | secteurs productifs et chaînes d'interdépendance (énergie → industrie → emploi), commerce extérieur simplifié (partenaires, balance), prix et inflation reliés, planification pluriannuelle lisible (inspiration HoI IV : file d'investissements et délais) | prévu |
| 3. Diplomatie | pays étrangers autonomes (positions, relations, sanctions, accords), Union européenne comme contrainte et levier, crises internationales avec choix explicables (inspiration Power & Revolution) | prévu |
| 4. Défense stratégique | moyens, préparation et alliances comme indicateurs ; engagements (budget, OTAN/UE) ; aucune opération détaillée | prévu |
| 5. Équilibrage et difficulté | parties réelles chronométrées, niveaux de difficulté (ressources, opposition, aléas), pays supplémentaires | prévu |

Besoins documentés pour les lots suivants (sans commande factice dans le jeu) : modèle de pays étrangers (données publiques,
neutralité), balance commerciale sourcée (Insee/Douanes), indicateurs de défense (Sipri, LPM) étiquetés paramètres, et un registre des
causes étendu aux effets internationaux.

## Présent / ce chantier / futur
- **Déjà présent avant ce chantier** : tout ce qui est listé dans « Systèmes réutilisés », la partie courte, la mission d'initiation v13.
- **Ce chantier** : rôle président, gouvernement, horloge continue, écran de campagne, tests, cette vision, passation et attentes.
- **Futur** : lots 2 à 5 ; économie internationale, pays étrangers autonomes et opérations militaires n'existent pas encore et ne sont
  pas affichés.

## Parcours manuel court (campagne présidentielle)
1. Accueil → avertissement → **Campagne présidentielle** → famille politique → **Commencer le mandat**.
2. Bureau : lire « Votre gouvernement » (PM, censure estimée) et « Votre mandat ».
3. Décisions : proposer une loi (toast « Déposé »), engager un programme ; Carte : lancer un projet.
4. Lecture à ×2 ; le temps s'arrête à l'événement : répondre ; relancer. Vérifier « Ce mois-ci » après le vote de l'Assemblée.
5. Si le gouvernement est renversé : nommer un Premier ministre (Bureau ou Décisions), le temps reprend.
6. Recharger la page → Reprendre : même mois, horloge en pause. Poursuivre jusqu'au bilan (60 mois) ou s'arrêter.
Durée à mesurer par un joueur (cible 30 à 90 minutes) ; les délais des politiques restent réels.
