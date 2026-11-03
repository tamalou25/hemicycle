// Passage au mois suivant.
import { appliquerEffets } from './effects.js';
import { bruit } from './rng.js';
import { borner, EQUILIBRE, CAPITAL_MENSUEL, CAPITAL_MAX, DUREE_MANDAT, SEUIL_DEFAITE } from './constants.js';
import { populariteCible, intentionsDeVote } from './polls.js';

/**
 * Ordre d'un tour :
 * 1. effets différés des lois  2. dynamique économique + bruit
 * 3. popularité  4. sondage  5. capital politique  6. conditions de fin
 */
export function tourSuivant(etat, { partis }) {
  if (etat.fin) return etat;
  const tour = etat.tour + 1;
  let g = etat.graine;
  let n;

  // 1. Effets des lois
  const { indicateurs: apresLois, file } = appliquerEffets(etat.indicateurs, etat.effetsEnCours, tour);
  const ind = { ...apresLois };

  // 2. Dynamique : retour lent vers l'équilibre + petits chocs aléatoires
  [n, g] = bruit(g, 0.15); ind.croissance = borner('croissance', ind.croissance + (EQUILIBRE.croissance - ind.croissance) * 0.03 + n);
  [n, g] = bruit(g, 0.08); ind.inflation = borner('inflation', ind.inflation + (EQUILIBRE.inflation - ind.inflation) * 0.05 + n);
  // Loi d'Okun simplifiée : croissance faible → chômage qui monte
  [n, g] = bruit(g, 0.04); ind.chomage = borner('chomage', ind.chomage - (ind.croissance - 1.2) * 0.03 + n);
  [n, g] = bruit(g, 0.05); ind.deficit = borner('deficit', ind.deficit - (ind.croissance - 1) * 0.02 + n);
  ind.dette = borner('dette', ind.dette + ind.deficit / 12 - ind.croissance / 12);
  [n, g] = bruit(g, 1.5); ind.tensions = borner('tensions', ind.tensions + (EQUILIBRE.tensions - ind.tensions) * 0.05 + n);

  // 3. Popularité : converge à 15 %/mois vers la cible
  const cible = populariteCible(ind, etat.joueur.competences);
  [n, g] = bruit(g, 1);
  ind.popularite = borner('popularite', ind.popularite + (cible - ind.popularite) * 0.15 + n);

  // 4. Sondage
  const sondage = { tour, popularite: ind.popularite, intentions: intentionsDeVote(partis, etat.joueur.parti, ind.popularite) };

  // 6. Fin de partie
  let fin = null;
  if (ind.popularite < SEUIL_DEFAITE) fin = { type: 'defaite', texte: 'Votre popularité s’est effondrée : votre parti vous retire son investiture.' };
  else if (tour >= DUREE_MANDAT) fin = { type: 'mandat', texte: 'Cinq ans se sont écoulés : fin de la législature.' };

  return {
    ...etat,
    tour,
    graine: g,
    indicateurs: ind,
    effetsEnCours: file,
    actionCeMois: false,
    dernierVote: null,
    joueur: { ...etat.joueur, capital: Math.min(CAPITAL_MAX, etat.joueur.capital + CAPITAL_MENSUEL) },
    sondage,
    historique: [...etat.historique, { tour, ...ind }],
    journal: fin ? [...etat.journal, { tour, type: 'fin', texte: fin.texte }] : etat.journal,
    fin,
  };
}
