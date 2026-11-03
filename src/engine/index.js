// Point d'entrée public du moteur.
export * from './constants.js';
export { creerPartie, dateDuTour, assurerTerritoires } from './state.js';
export {
  proposerLoi, amenderTexte, recourir493, negocierAccord,
  raisonRefus, raisonRefus493, raisonRefusAccord, toleranceAccord,
} from './laws.js';
export {
  groupesAssemblee, groupesSenat, voterChambre, voterCensure, scoreGroupe,
  ecartIdeologique, accordActif, SEUIL_SOUTIEN,
} from './parliament.js';
export { avancerNavette, censureSpontanee, risqueConstitutionnel } from './navette.js';
export { reactionsAuTexte, joueurDepuisPoliticien, attitude, positionsDe, ATTITUDES } from './reactions.js';
export {
  prochainesElections, enCampagne, actionCampagne, seDeclarerCandidat, proposerDissolution,
  raisonRefusCampagne, raisonRefusDissolution, repartirSieges, secondTour, siegesEffectifs, tourDeDate,
  ACTIONS_CAMPAGNE, MOIS_CAMPAGNE,
} from './elections.js';
export { tirerEvenement, resoudreEvenement, eligible, PROBA_EVENEMENT } from './events.js';
export { voterBudget, raisonRefusBudget, effetsBudget, LEVIERS } from './budget.js';
export { scoreBilan, evaluerFin } from './fins.js';
export { encoderDefi, decoderDefi, entreeClassement, ajouterAuClassement, TAILLE_CLASSEMENT } from './share.js';
export { registreDuMois, prevoir, principales, phraseExplication, nomCause } from './explications.js';
export { INDICES, initialiserTerritoires, satisfactionNationale, indiceEmploi, indiceSante } from './territoires.js';
export { lancerProjet, raisonRefusProjet, prevoirProjets, facteurTaille } from './projets.js';
export { briefing, SEUIL_CRITIQUE } from './briefing.js';
export {
  SECTEURS, RECETTES, VARIATION_MAX, solde, chiffrerPLF, orientationPLF, normaliserPLF,
  deposerPLF, recourir493PLF, raisonRefusPLF, budgetInitial, voterBudgetAssemblee,
} from './budgetEtat.js';
export { resultats, satisfactionGroupe, confianceMoyenne, voteJoueurParGroupe, siegesParRegion, RESULTATS } from './groupes.js';
export { engagerPolitique, raisonRefusPolitique, evoluerSecteurs, secteursInitiaux } from './secteurs.js';
export { catalogueDecisions, filtrerDecisions, compterDecisions, CATEGORIES, SECTEURS_DECISION } from './decisions.js';
export { relationsInitiales, reactionParti, reagir, bonusVote, bonusTolerance, attitudeCensure, RELATION_NEUTRE } from './relations.js';
export { tourSuivant } from './turn.js';
export { exporterPartie, importerPartie } from './save.js';
export { populariteCible, intentionsDeVote } from './polls.js';
