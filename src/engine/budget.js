// Budget annuel (Premier ministre) : deux leviers, de -2 à +2 points de PIB.
import { planifierEffets } from './effects.js';
import { gouverne } from './presidence.js';

export const LEVIERS = { depenses: [-2, 2], impots: [-2, 2] };

export function raisonRefusBudget(etat) {
  if (etat.fin) return 'La partie est terminée.';
  if (!gouverne(etat)) return 'Le budget est présenté par le gouvernement.';
  if (etat.dernierBudget != null && etat.tour - etat.dernierBudget < 12) return `Prochain budget dans ${12 - (etat.tour - etat.dernierBudget)} mois.`;
  return null;
}

/**
 * Effets d'un budget (multiplicateurs simplifiés) :
 * + dépenses → croissance ↑, chômage ↓, déficit ↑, tensions ↓
 * + impôts   → déficit ↓, croissance ↓, popularité ↓
 */
export function effetsBudget({ depenses = 0, impots = 0 }) {
  return [
    { indicateur: 'deficit', valeur: depenses * 0.9 - impots * 0.8, delaiMois: 1, duree: 12 },
    { indicateur: 'croissance', valeur: depenses * 0.25 - impots * 0.2, delaiMois: 2, duree: 6 },
    { indicateur: 'chomage', valeur: -depenses * 0.15 + impots * 0.1, delaiMois: 4, duree: 8 },
    { indicateur: 'popularite', valeur: depenses * 1 - impots * 2, delaiMois: 0, duree: 2 },
    { indicateur: 'tensions', valeur: -depenses * 2.5 + impots * 2, delaiMois: 0, duree: 3 },
  ].filter((e) => e.valeur !== 0);
}

export function voterBudget(etat, choix) {
  const refus = raisonRefusBudget(etat);
  if (refus) throw new Error(refus);
  const leviers = {};
  for (const [k, [min, max]] of Object.entries(LEVIERS)) {
    const v = Number(choix?.[k] ?? 0);
    if (!Number.isFinite(v) || v < min || v > max) throw new Error(`Levier ${k} hors bornes (${min} à ${max}).`);
    leviers[k] = Math.round(v * 2) / 2;
  }
  return {
    ...etat,
    dernierBudget: etat.tour,
    effetsEnCours: [...etat.effetsEnCours, ...planifierEffets(effetsBudget(leviers), etat.tour + 1, 'budget')],
    journal: [...etat.journal, { tour: etat.tour, type: 'budget', texte: `Budget adopté : dépenses ${leviers.depenses >= 0 ? '+' : ''}${leviers.depenses} pt, impôts ${leviers.impots >= 0 ? '+' : ''}${leviers.impots} pt de PIB.` }],
  };
}
