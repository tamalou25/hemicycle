// Proposition et vote des lois (Phase 1 : vote unique pondéré par les sièges de l'Assemblée).
import { planifierEffets } from './effects.js';

/** Score minimal pour qu'un groupe vote pour (≈ 55 points d'écart idéologique max). */
export const SEUIL_SOUTIEN = 0.72;

/**
 * Probabilité-score (0..1) qu'un parti soutienne une loi :
 * proximité entre sa position sur le thème et l'orientation de la loi.
 */
export function soutienParti(parti, loi) {
  const pos = parti.positions?.[loi.theme] ?? 0;
  return 1 - Math.abs(pos - loi.orientation) / 200;
}

/** Calcule le vote de l'Assemblée. Le parti du joueur vote toujours pour. */
export function calculerVote(etat, loi, partis) {
  // Bonus de négociation : jusqu'à +0.08 de soutien chez les autres partis.
  const bonus = (etat.joueur.competences.negociation / 100) * 0.08;
  let pour = 0, contre = 0;
  const detail = partis.map((p) => {
    const sieges = p.sieges_assemblee ?? 0;
    const score = p.id === etat.joueur.parti ? 1 : soutienParti(p, loi) + bonus;
    const vote = score >= SEUIL_SOUTIEN ? 'pour' : 'contre';
    if (vote === 'pour') pour += sieges; else contre += sieges;
    return { parti: p.id, sieges, vote, score: Math.round(score * 100) / 100 };
  });
  return { pour, contre, adoptee: pour > contre, detail };
}

/** Vérifie si le joueur peut proposer la loi ce mois-ci. Renvoie null ou un message d'erreur. */
export function raisonRefus(etat, loi) {
  if (etat.fin) return 'La partie est terminée.';
  if (etat.actionCeMois) return 'Vous avez déjà proposé une loi ce mois-ci.';
  if (etat.loisAdoptees.includes(loi.id)) return 'Cette loi est déjà adoptée.';
  if (etat.joueur.capital < loi.cout_politique) return 'Capital politique insuffisant.';
  return null;
}

/** Action : proposer une loi. Pur : renvoie un nouvel état. */
export function proposerLoi(etat, loiId, { lois, partis }) {
  const loi = lois.find((l) => l.id === loiId);
  if (!loi) throw new Error(`Loi inconnue : ${loiId}`);
  const refus = raisonRefus(etat, loi);
  if (refus) throw new Error(refus);

  const vote = calculerVote(etat, loi, partis);
  const base = {
    ...etat,
    actionCeMois: true,
    joueur: { ...etat.joueur, capital: etat.joueur.capital - loi.cout_politique },
    dernierVote: { loi: loi.id, ...vote },
  };
  if (!vote.adoptee) {
    return {
      ...base,
      loisRejetees: [...etat.loisRejetees, loi.id],
      journal: [...etat.journal, { tour: etat.tour, type: 'rejet', texte: `« ${loi.titre} » rejetée (${vote.pour} pour / ${vote.contre} contre).` }],
    };
  }
  return {
    ...base,
    loisAdoptees: [...etat.loisAdoptees, loi.id],
    effetsEnCours: [...etat.effetsEnCours, ...planifierEffets(loi.effets, etat.tour + 1, loi.id)],
    journal: [...etat.journal, { tour: etat.tour, type: 'adoption', texte: `« ${loi.titre} » adoptée (${vote.pour} pour / ${vote.contre} contre).` }],
  };
}
