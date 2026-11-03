// Création de l'état initial d'une partie.
import { AXES, COMPETENCES, VERSION_SAUVEGARDE } from './constants.js';

const borne = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));

/**
 * @param {object} p
 * @param {object} p.joueur     { nom, age, parti, ideologie{axe:-100..100}, competences{nom:0..100} }
 * @param {object} p.situation  situation.json (indicateurs réels de départ)
 * @param {number} p.graine
 */
export function creerPartie({ joueur, situation, graine = 1, dateDepart }) {
  if (!joueur?.nom?.trim()) throw new Error('Le personnage doit avoir un nom.');
  const ind = situation?.indicateurs ?? {};
  const ideologie = Object.fromEntries(AXES.map((a) => [a, borne(joueur.ideologie?.[a], -100, 100)]));
  const competences = Object.fromEntries(COMPETENCES.map((c) => [c, borne(joueur.competences?.[c] ?? 50, 0, 100)]));
  const d = dateDepart ?? situation?.date_collecte ?? '2026-11-01';
  const [annee, mois] = d.split('-').map(Number);

  return {
    version: VERSION_SAUVEGARDE,
    graine: graine >>> 0,
    tour: 0,
    dateDepart: { annee, mois },
    joueur: {
      nom: joueur.nom.trim(), age: borne(joueur.age ?? 40, 18, 99), parti: joueur.parti,
      ideologie, competences, capital: 4,
    },
    indicateurs: {
      chomage: ind.chomage ?? 7.5, croissance: ind.croissance ?? 0.8, deficit: ind.deficit ?? 5.4,
      dette: ind.dette ?? 115, inflation: ind.inflation ?? 1.2, popularite: 30, tensions: 40,
    },
    effetsEnCours: [],
    loisAdoptees: [],
    loisRejetees: [],
    actionCeMois: false,
    sondage: null,
    historique: [],
    journal: [{ tour: 0, type: 'debut', texte: `${joueur.nom.trim()} entre en politique.` }],
    fin: null,
  };
}

/** Date affichable du tour courant. */
export function dateDuTour(etat) {
  const total = etat.dateDepart.mois - 1 + etat.tour;
  return { annee: etat.dateDepart.annee + Math.floor(total / 12), mois: (total % 12) + 1 };
}
