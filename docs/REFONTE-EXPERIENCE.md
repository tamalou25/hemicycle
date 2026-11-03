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
