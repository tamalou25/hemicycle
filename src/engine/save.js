// Sérialisation / validation des sauvegardes (indépendant du stockage).
import { VERSION_SAUVEGARDE, INDICATEURS } from './constants.js';

export const exporterPartie = (etat) => JSON.stringify(etat);

/** Parse et valide une sauvegarde. Lève une erreur explicite si invalide. */
export function importerPartie(texte) {
  let etat;
  try { etat = JSON.parse(texte); } catch { throw new Error('Fichier illisible (JSON invalide).'); }
  if (!etat || typeof etat !== 'object') throw new Error('Sauvegarde vide.');
  if (etat.version === 1) etat = migrerV1(etat);
  if (etat.version === 2) etat = migrerV2(etat);
  if (etat.version === 3) etat = { ...etat, version: 4, evenement: null, evenementsPasses: [], dernierBudget: null };
  if (etat.version !== VERSION_SAUVEGARDE) throw new Error('Version de sauvegarde incompatible.');
  if (!etat.joueur?.nom || typeof etat.tour !== 'number') throw new Error('Sauvegarde incomplète.');
  for (const i of INDICATEURS) {
    if (typeof etat.indicateurs?.[i] !== 'number') throw new Error(`Indicateur manquant : ${i}.`);
  }
  return etat;
}

/** v1 (Phase 1) → v2 : ajoute les champs institutionnels. */
function migrerV1(e) {
  return {
    ...e, version: 2, texte: null, accords: [], dernier493: null, motion: null, negoCeMois: false,
    joueur: { ...e.joueur, role: e.joueur?.role ?? 'depute' },
  };
}

/** v2 → v3 : ajoute les champs électoraux. */
function migrerV2(e) {
  return {
    ...e, version: 3, sieges: null, resultatsElections: [], electionsAnticipees: [],
    derniereDissolution: null, candidat: false, elan: 0, campagneCeMois: false,
  };
}
