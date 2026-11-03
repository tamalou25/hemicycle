// Point d'entrée public du moteur.
export * from './constants.js';
export { creerPartie, dateDuTour } from './state.js';
export { proposerLoi, calculerVote, raisonRefus, soutienParti } from './laws.js';
export { tourSuivant } from './turn.js';
export { exporterPartie, importerPartie } from './save.js';
export { populariteCible, intentionsDeVote } from './polls.js';
