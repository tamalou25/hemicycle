# Refonte de la première expérience et de la boucle mensuelle

Base analysée : `main` au commit `0621beb` (vérifiée avant de commencer la branche `refonte-experience`).

## Diagnostic (court)
| Constat sur `0621beb` | Effet sur un débutant |
|---|---|
| L’accueil mène à un formulaire de 6 axes, 4 compétences et 10 objectifs avant le premier mois | Beaucoup de choix sans en connaître les conséquences |
| Le Bureau empile état du pays, alertes, objectifs, « Ce mois-ci », secteurs | On ne sait pas quoi faire en premier |
| Les décisions sont listées sans comparaison possible (coût, délai, effet) | Impossible de comparer deux réponses |
| Le passage du mois montre des variations nationales | Une amélioration locale (une région) se perd dans les moyennes |
| Les projets ont coûts, délais, montée en charge et effets attribués, mais ce n’est raconté nulle part | Le joueur ne relie pas sa décision à sa conséquence |

## Principe
Une seule simulation. La « mission d’initiation » est une **situation réelle de la partie** : elle s’appuie sur les
projets territoriaux, l’enveloppe d’investissement et le registre des causes existants. L’état ne stocke que son cadre ;
sa progression est **déduite de l’état du moteur** (projet lancé, mise en service, effet attribué), jamais d’un clic.

## Plan en lots
1. **Mission jouable de bout en bout, persistance comprise** : entrée « Découvrir en jouant », mission moteur, aperçu pur des
   projets, débrief, sauvegarde v13, défis, tests moteur et navigateur.
2. **Décisions et Bureau** : Bureau organisé en « Que se passe-t-il ? Que puis-je faire ? Qu’attends-je ? » ; fiche comparable
   des lois, programmes et projets (API pure `ficheDecision`).
3. **Bilan du mois et progression** : bilan compact relu à volonté (`bilanMois`, à partir du journal et du registre),
   engagements et prochaines échéances, valeur initiale / actuelle / cible des objectifs, en partie libre comme en initiation.
4. **Stabilisation** : accessibilité, hors ligne, compatibilité, documentation, captures.

## Règles ajoutées (lot 1)
- `mission.json` : indice `sante`, 6 mois, deux réponses (`recrutement-soignants`, voie courte ; `centres-sante`, investissement lent).
- Région : indice de jeu le plus bas ; en cas d’égalité, identifiant de région par ordre alphabétique.
- Étapes : comprendre (toujours), choisir (projet lancé ou décision différée), chantier (projet engagé), mise en service
  (statut ≠ chantier), effet (somme des entrées `projet:…` du registre sur la région et l’indice > 0), débrief.
- Résultat à l’échéance, ou plus tôt si la partie s’arrête : **réalisation** (effet observé > 0), **engagement** (projet lancé,
  effets attendus), **occasion manquée** (rien d’engagé).
- Aucun délai accéléré, aucune obligation de vote : les projets restent financés par l’enveloppe.
- La présidentielle d’avril 2027 (mois 5) peut faire redevenir député·e : les projets restent possibles, le débrief le signale.
- La mission n’ajoute pas de points au bilan : réussite de mission ≠ score de bilan ≠ conditions de fin.

## Contrat interface / moteur (nouveau)
- `creerPartie({ …, mission })` : `mission` = contenu de `mission.json` (ou `null`).
- `etat.mission` = `{ id, debut, echeance, region, indice, valeurInitiale, roleInitial, differe, statut, debrief }` ou `null`.
- API pure : `etapesMission`, `projetMission`, `effetObserve`, `debriefMission`, `apercuProjet`, `regionMission`.
- Action : `differerMission(etat)` (ne touche ni la graine ni les ressources).
- `tourSuivant` clôt la mission (`avancerMission`) à l’échéance ou à la fin de partie.
- Sauvegarde **v13** : migration v12 → v13 avec `mission: null` (pas d’activation rétroactive), assainissement strict.
- Défis : champ `m: 1` si la partie avait la mission ; le destinataire rejoue la même mission avec la même graine.

## Limites connues
- Les simulations automatiques utilisent quelques graines et partis ; la compréhension doit être vérifiée avec un vrai débutant.
- Mayotte a l’indice de santé de jeu le plus bas (0/100, densité de médecins sous le plancher de l’indice) : le jeu l’explique,
  sans en conclure qu’il n’y a aucun accès aux soins.

## Règles ajoutées (lots 2 et 3)
- `ficheDecision(etat, item, donnees)` (pure) : coûts immédiat et annuel, capital, premiers effets, effets théoriques avec leur sens,
  contrepartie, étape institutionnelle, risques (vote estimé à l’Assemblée, censure constitutionnelle, 49.3 et censure pour le PM),
  blocage (raison du catalogue), objectifs sélectionnés concernés, lien avec la mission.
- `bilanMois(etat, donnees)` (pure, rien de stocké) : décisions du mois précédent, résultats (votes, mises en service, élections…),
  effets de vos décisions et effets locaux (même minimes), événements et conjoncture, effets attendus, prochaine étape de mission.
- `engagements(etat, donnees)` : projets, programmes, texte en navette, budget, accords et mission, avec la prochaine échéance.
- Réponse automatique à un événement : journalisée `evenement-auto` (« réponse par défaut, faute de choix »), jamais comptée
  comme une décision du joueur.
- `etat.objectifsInitiaux` (v13) : valeurs de départ des objectifs, figées à la création. Le Bureau affiche
  « départ → actuel / cible » ; la jauge reste un **rapport à la cible**, pas un progrès accompli.

## Parcours avant / après
| | Avant (`0621beb`) | Après |
|---|---|---|
| Entrée | « Créer mon personnage » : 6 axes, 4 compétences, rôle, 3 objectifs sur 10 | « Découvrir en jouant » : 1 choix (famille politique) puis le Bureau |
| Premier écran | État du pays, alertes, objectifs, « Ce mois-ci » | Mission : situation, deux réponses comparées (coût, délai, effet d’ici 6 mois, risque) ou « différer » |
| Après un choix | Un toast | Étapes de la mission (chantier → mise en service → effet), engagement et échéance au Bureau |
| Mois suivant | Variations nationales | « Ce mois-ci » commence par vos décisions, leurs suites et leurs effets (effets locaux inclus) |
| Mois 6 | — | Débrief : réalisé, attendu, choix expliquant le résultat ; la partie continue |

## Parcours de test manuel (5 minutes)
1. Accueil → cocher l’avertissement → **Découvrir en jouant** → choisir un parti → **Commencer la découverte**.
2. Lire la mission : quelle région, quel indice, combien d’enveloppe ? Comparer les deux réponses.
3. Choisir la voie courte. Vérifier : enveloppe diminuée, étapes « Fait / En cours », engagement avec échéance.
4. **Mois suivant** ×3 : lire « Ce mois-ci » (vos décisions, leurs suites). Au 4ᵉ mois, l’effet local apparaît.
5. Mois 6 : lire le débrief. Continuer le mandat. Recommencer en différant : le résultat doit être différent.
6. Question au joueur débutant : « Quel est ton but ? Qu’as-tu fait ? Qu’en est-il sorti ? Que vas-tu faire ensuite ? »

## Simulations effectuées et limites
- Tests moteur : 5 partis (EPR, RN, LFI, PS, DR) × graines pour la voie courte ; 8 graines pour la cohérence aperçu / résultat ;
  investissement lent, différer, fin anticipée, changement de rôle, reprise, ancienne sauvegarde, défi.
- Tests navigateur : parcours complet (voie courte, différer + reprise, investissement lent, fin anticipée), bilan du mois,
  fiche au clavier, audit axe (WCAG AA) des nouveaux écrans, hors ligne (PWA), hauteur du Bureau mobile.
- Le changement de rôle par la présidentielle est testé en forçant le rôle (le tirage réel dépend de l’élection simulée).
- Les graines des tests navigateur sont fixées après la création de la partie : l’aléa de création (graine initiale) reste réel.
- Non vérifié : compréhension et intérêt par un vrai débutant ; lecteur d’écran réel ; appareil mobile physique.
