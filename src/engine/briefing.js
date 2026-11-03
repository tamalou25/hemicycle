// Briefing du mois : au plus 3 points prioritaires, du plus urgent au moins urgent.
import { INDICES } from './territoires.js';

const NOMS = { emploi: 'Emploi en difficulté', sante: 'Accès aux soins critique', transports: 'Transports insuffisants' };
export const SEUIL_CRITIQUE = 40;

export function briefing(etat, { regions, projets, evenements } = {}) {
  const points = [];
  if (etat.evenement) {
    const ev = evenements?.find((e) => e.id === etat.evenement);
    points.push({ priorite: 0, type: 'evenement', titre: ev?.titre ?? 'Événement', texte: 'Une décision est attendue ce mois-ci.' });
  }
  if (etat.territoires && regions) {
    // Pire situation par indice, sous le seuil critique
    for (const i of INDICES) {
      const pire = regions.regions.map((r) => ({ r, v: etat.territoires[r.id]?.[i] ?? 100 })).sort((a, b) => a.v - b.v)[0];
      if (pire && pire.v < SEUIL_CRITIQUE) points.push({ priorite: 1 + pire.v / 100, type: 'territoire', region: pire.r.id, indice: i, titre: `${NOMS[i]} : ${pire.r.nom}`, texte: `Indice ${Math.round(pire.v)}/100.` });
    }
  }
  for (const p of etat.projets ?? []) {
    const reste = p.service - etat.tour;
    if (p.statut === 'chantier' && reste >= 0 && reste <= 2) {
      const def = projets?.projets?.find((x) => x.id === p.projetId);
      const nom = regions?.regions?.find((r) => r.id === p.region)?.nom ?? p.region;
      points.push({ priorite: 2, type: 'projet', region: p.region, titre: `${def?.titre ?? 'Projet'} (${nom})`, texte: reste === 0 ? 'Mise en service à la fin du mois.' : `Mise en service dans ${reste} mois.` });
    }
  }
  if (etat.finances) points.push({ priorite: 3, type: 'budget', titre: 'Enveloppe d’investissement', texte: `${etat.finances.enveloppe.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Md€ disponibles cette année.` });
  return points.sort((a, b) => a.priorite - b.priorite).slice(0, 3);
}
