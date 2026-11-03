// Sérialisation / validation des sauvegardes (indépendant du stockage).
import { VERSION_SAUVEGARDE, INDICATEURS } from './constants.js';

export const exporterPartie = (etat) => JSON.stringify(etat);

/** Parse et valide une sauvegarde. Lève une erreur explicite si invalide. */
export function importerPartie(texte) {
  let etat;
  try { etat = JSON.parse(texte); } catch { throw new Error('Fichier illisible (JSON invalide).'); }
  if (!etat || typeof etat !== 'object') throw new Error('Sauvegarde vide.');
  if (etat.version !== VERSION_SAUVEGARDE) throw new Error('Version de sauvegarde incompatible.');
  if (!etat.joueur?.nom || typeof etat.tour !== 'number') throw new Error('Sauvegarde incomplète.');
  for (const i of INDICATEURS) {
    if (typeof etat.indicateurs?.[i] !== 'number') throw new Error(`Indicateur manquant : ${i}.`);
  }
  return etat;
}
