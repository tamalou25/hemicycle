// Actions législatives du joueur : proposer, amender, 49.3, négocier.
// La navette elle-même (votes mois par mois) est dans navette.js.
import { CAPITAL_MAX, DELAI_493, DUREE_ACCORD, borner } from './constants.js';
import { ecartIdeologique, accordActif } from './parliament.js';

export { SEUIL_SOUTIEN } from './parliament.js';

const ajouterJournal = (etat, type, texte) => [...etat.journal, { tour: etat.tour, type, texte }];

/** Vérifie si le joueur peut proposer la loi ce mois-ci. Renvoie null ou un message d'erreur. */
export function raisonRefus(etat, loi) {
  if (etat.fin) return 'La partie est terminée.';
  if (etat.texte) return 'Un texte est déjà en cours d’examen.';
  if (etat.actionCeMois) return 'Vous avez déjà agi au Parlement ce mois-ci.';
  if (etat.loisAdoptees.includes(loi.id)) return 'Cette loi est déjà adoptée.';
  if (etat.joueur.capital < loi.cout_politique) return 'Capital politique insuffisant.';
  return null;
}

/** Dépose une loi : elle entre en navette, premier vote à l'Assemblée à la fin du mois. */
export function proposerLoi(etat, loiId, { lois }) {
  const loi = lois.find((l) => l.id === loiId);
  if (!loi) throw new Error(`Loi inconnue : ${loiId}`);
  const refus = raisonRefus(etat, loi);
  if (refus) throw new Error(refus);
  const nature = etat.joueur.role === 'premier_ministre' ? 'Projet de loi' : 'Proposition de loi';
  return {
    ...etat,
    actionCeMois: true,
    joueur: { ...etat.joueur, capital: etat.joueur.capital - loi.cout_politique },
    texte: { loiId, etape: 'assemblee', orientation: loi.orientation, facteur: 1, recours493: false, amendements: 0, depot: etat.tour },
    journal: ajouterJournal(etat, 'depot', `${nature} « ${loi.titre} » déposé(e) à l’Assemblée.`),
  };
}

/** Amendement de compromis : texte plus modéré (orientation ×0,7) mais effets réduits (×0,8). */
export function amenderTexte(etat, { lois }) {
  if (!etat.texte || etat.texte.etape === 'conseil') throw new Error('Aucun texte amendable.');
  if (etat.actionCeMois) throw new Error('Vous avez déjà agi au Parlement ce mois-ci.');
  if (etat.joueur.capital < 1) throw new Error('Capital politique insuffisant.');
  if (etat.texte.amendements >= 2) throw new Error('Le texte a déjà été amendé deux fois.');
  const loi = lois.find((l) => l.id === etat.texte.loiId);
  const t = etat.texte;
  return {
    ...etat,
    actionCeMois: true,
    joueur: { ...etat.joueur, capital: etat.joueur.capital - 1 },
    texte: { ...t, orientation: Math.round(t.orientation * 0.7), facteur: Math.round(t.facteur * 0.8 * 100) / 100, amendements: t.amendements + 1 },
    journal: ajouterJournal(etat, 'amendement', `Amendement de compromis sur « ${loi?.titre} ».`),
  };
}

/** 49.3 : réservé au Premier ministre, en lecture à l'Assemblée. Déclenche une motion de censure. */
export function raisonRefus493(etat) {
  if (etat.joueur.role !== 'premier_ministre') return 'Seul le Premier ministre peut engager la responsabilité du gouvernement.';
  if (!etat.texte || !['assemblee', 'lecture_definitive'].includes(etat.texte.etape)) return 'Le 49.3 ne s’utilise que lors d’une lecture à l’Assemblée.';
  if (etat.texte.recours493) return '49.3 déjà engagé sur ce texte.';
  if (etat.actionCeMois) return 'Vous avez déjà agi au Parlement ce mois-ci.';
  if (etat.dernier493 != null && etat.tour - etat.dernier493 < DELAI_493) return `49.3 possible dans ${DELAI_493 - (etat.tour - etat.dernier493)} mois.`;
  return null;
}

export function recourir493(etat, { lois }) {
  const refus = raisonRefus493(etat);
  if (refus) throw new Error(refus);
  const loi = lois.find((l) => l.id === etat.texte.loiId);
  const ind = etat.indicateurs;
  return {
    ...etat,
    actionCeMois: true,
    dernier493: etat.tour,
    texte: { ...etat.texte, recours493: true },
    // Coût d'image immédiat : passage en force
    indicateurs: { ...ind, popularite: borner('popularite', ind.popularite - 3), tensions: borner('tensions', ind.tensions + 6) },
    journal: ajouterJournal(etat, '493', `Le gouvernement engage sa responsabilité (49.3) sur « ${loi?.titre} ».`),
  };
}

/** Probabilité-seuil d'accord : écart idéologique toléré selon la négociation. */
export const toleranceAccord = (etat) => 45 + etat.joueur.competences.negociation / 4;

export function raisonRefusAccord(etat, partiId) {
  if (etat.fin) return 'La partie est terminée.';
  if (etat.negoCeMois) return 'Une seule négociation par mois.';
  if (partiId === etat.joueur.parti) return 'C’est votre propre parti.';
  if (accordActif(etat, partiId)) return 'Accord déjà en vigueur.';
  if (etat.joueur.capital < 2) return 'Capital politique insuffisant (2 requis).';
  return null;
}

/** Négocie un accord de soutien de 6 mois avec un groupe. Échoue si l'écart idéologique est trop grand. */
export function negocierAccord(etat, partiId, { partis }) {
  const parti = partis.find((p) => p.id === partiId);
  if (!parti) throw new Error(`Parti inconnu : ${partiId}`);
  const refus = raisonRefusAccord(etat, partiId);
  if (refus) throw new Error(refus);
  const ecart = ecartIdeologique(etat.joueur.ideologie, parti.positions);
  const reussi = ecart <= toleranceAccord(etat);
  return {
    ...etat,
    negoCeMois: true,
    joueur: { ...etat.joueur, capital: Math.min(CAPITAL_MAX, etat.joueur.capital - (reussi ? 2 : 1)) },
    accords: reussi ? [...(etat.accords ?? []), { parti: partiId, debut: etat.tour, jusqua: etat.tour + DUREE_ACCORD }] : (etat.accords ?? []),
    journal: ajouterJournal(etat, 'accord', reussi
      ? `Accord de soutien conclu avec ${parti.sigle} pour ${DUREE_ACCORD} mois.`
      : `${parti.sigle} refuse l’accord : positions trop éloignées.`),
  };
}
