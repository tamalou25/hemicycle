// Présidence (campagne présidentielle) : le joueur est président·e et agit PAR son gouvernement.
// Simplifications institutionnelles (documentées dans docs/VISION-CAMPAGNE.md) :
//  - le gouvernement est représenté par le parti de son Premier ministre (fictif) ; ses mesures, lois et budgets
//    suivent les procédures existantes (navette, votes, 49.3, PLF) tant qu'un gouvernement est en place ;
//  - une motion de censure renverse le gouvernement, jamais le président : il faut en nommer un autre ;
//  - le parti du gouvernement soutient ses textes (comme un accord) et ne vote pas la censure ;
//  - la dissolution est une décision du président (art. 12), sans demande à un tiers.
import { CAPITAL_MAX, DELAI_NOMINATION } from './constants.js';
import { ecartIdeologique } from './parliament.js';

/** Le joueur dispose-t-il d'un gouvernement pour agir (Premier ministre, ou président·e avec un gouvernement en place) ? */
export const gouverne = (etat) => etat.joueur.role === 'premier_ministre' || (etat.joueur.role === 'president' && etat.gouvernement?.statut === 'en_place');

/** Parti qui porte les textes du gouvernement (celui du joueur s'il est PM, celui du PM nommé s'il est président). */
export const partiGouvernement = (etat) => (etat.joueur.role === 'president' ? etat.gouvernement?.parti ?? null : etat.joueur.parti);

/** Gouvernement initial d'une campagne présidentielle : Premier ministre fictif issu du parti du joueur. */
export const gouvernementInitial = (joueur) => ({ parti: joueur.parti, depuis: 0, statut: 'en_place', renversements: 0, nominations: 0 });

/** Renverse le gouvernement du président (censure adoptée) : les textes en cours tombent, il faut nommer un gouvernement. */
export function renverserGouvernement(etat, texteJournal) {
  const g = etat.gouvernement ?? gouvernementInitial(etat.joueur);
  return {
    ...etat,
    gouvernement: { ...g, statut: 'renverse', renversements: (g.renversements ?? 0) + 1, renverseLe: etat.tour },
    texte: null, plf: null,
    chocs: { ...(etat.chocs ?? {}), censure: -2 },
    journal: [...etat.journal, { tour: etat.tour, type: 'censure', texte: texteJournal }, { tour: etat.tour, type: 'gouvernement', texte: 'Le gouvernement est renversé : nommez un nouveau Premier ministre (Décisions).' }],
  };
}

export function raisonRefusNommer(etat, partiId, partis) {
  if (etat.fin) return 'La partie est terminée.';
  if (etat.joueur.role !== 'president') return 'Seul·e le·la président·e nomme le Premier ministre.';
  const p = partis?.find((x) => x.id === partiId);
  if (!p) return 'Parti inconnu.';
  if (!(etat.sieges ? etat.sieges[partiId] : p.sieges_assemblee)) return 'Ce parti n’a aucun député.';
  const g = etat.gouvernement;
  if (g?.statut === 'en_place' && g.parti === partiId) return 'Ce parti dirige déjà le gouvernement.';
  if (g?.statut === 'en_place' && g.depuis != null && etat.tour - g.depuis < DELAI_NOMINATION) return `Changer de gouvernement sans censure : possible dans ${DELAI_NOMINATION - (etat.tour - g.depuis)} mois.`;
  if (etat.actionCeMois) return 'Vous avez déjà agi au Parlement ce mois-ci.';
  if (etat.joueur.capital < 2) return 'Capital politique insuffisant (2 requis).';
  return null;
}

/**
 * Nomme un gouvernement issu d'un parti : il soutiendra ses textes et ne votera pas la censure.
 * Un gouvernement éloigné du président coûte en popularité auprès de son camp (relation du parti du joueur non modélisée :
 * le malus passe par la popularité), mais apporte ses voix.
 */
export function nommerGouvernement(etat, partiId, { partis }) {
  const refus = raisonRefusNommer(etat, partiId, partis);
  if (refus) throw new Error(refus);
  const p = partis.find((x) => x.id === partiId);
  const ecart = ecartIdeologique(etat.joueur.ideologie, p.positions);
  const malus = ecart > 60 ? 3 : ecart > 30 ? 1 : 0; // cohabitation choisie : l'électorat du président le vit mal
  const g = etat.gouvernement ?? gouvernementInitial(etat.joueur);
  return {
    ...etat,
    actionCeMois: true,
    joueur: { ...etat.joueur, capital: Math.min(CAPITAL_MAX, etat.joueur.capital - 2) },
    indicateurs: { ...etat.indicateurs, popularite: Math.max(0, etat.indicateurs.popularite - malus) },
    gouvernement: { ...g, parti: partiId, depuis: etat.tour, statut: 'en_place', nominations: (g.nominations ?? 0) + 1 },
    journal: [...etat.journal, { tour: etat.tour, type: 'gouvernement', texte: `Nouveau gouvernement : Premier ministre issu de ${p.sigle}${malus ? ` (écart avec votre camp : popularité −${malus})` : ''}.` }],
  };
}

/** Résumé institutionnel du moment (présentation) : qui gouverne, depuis quand, combien de renversements. */
export function situationGouvernement(etat, partis) {
  if (etat.joueur.role !== 'president') return null;
  const g = etat.gouvernement;
  const p = partis?.find((x) => x.id === g?.parti);
  return { statut: g?.statut ?? 'renverse', parti: g?.parti ?? null, sigle: p?.sigle ?? g?.parti ?? null, depuis: g?.depuis ?? 0, renversements: g?.renversements ?? 0, cohabitation: !!g && g.parti !== etat.joueur.parti };
}
