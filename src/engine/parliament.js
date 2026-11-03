// Institutions : groupes, votes des chambres, accords, censure.
import { AXES, BONUS_ACCORD, MAJORITE_CENSURE, SEUIL_OPPOSITION } from './constants.js';

/** Seuil de score pour qu'un groupe vote pour un texte. */
export const SEUIL_SOUTIEN = 0.72;

const NEUTRE = Object.fromEntries(AXES.map((a) => [a, 0]));

/** Groupes de l'Assemblée : un parti = un groupe (Phase 2). */
export const groupesAssemblee = (partis) =>
  partis.filter((p) => p.sieges_assemblee).map((p) => ({ id: p.id, sigle: p.sigle, sieges: p.sieges_assemblee, parti: p.id, positions: p.positions }));

/** Groupes du Sénat : positions reprises du premier parti rattaché (neutres sinon). */
export function groupesSenat(senat, partis) {
  return (senat?.groupes ?? []).map((g) => {
    const p = partis.find((x) => x.id === g.partis?.[0]);
    return { id: g.id, sigle: g.sigle, sieges: g.sieges, parti: p?.id ?? null, positions: p?.positions ?? NEUTRE };
  });
}

/** Écart idéologique moyen (0..200) entre le joueur et un groupe. */
export function ecartIdeologique(ideologie, positions) {
  return AXES.reduce((s, a) => s + Math.abs((ideologie[a] ?? 0) - (positions[a] ?? 0)), 0) / AXES.length;
}

export const accordActif = (etat, partiId) =>
  (etat.accords ?? []).some((a) => a.parti === partiId && a.jusqua >= etat.tour);

/** Score de soutien d'un groupe pour un texte (orientation sur un thème). */
export function scoreGroupe(etat, groupe, theme, orientation) {
  if (groupe.parti && groupe.parti === etat.joueur.parti) return 1;
  const proximite = 1 - Math.abs((groupe.positions[theme] ?? 0) - orientation) / 200;
  const nego = (etat.joueur.competences.negociation / 100) * 0.08;
  return proximite + nego + (groupe.parti && accordActif(etat, groupe.parti) ? BONUS_ACCORD : 0);
}

/** Vote d'une chambre. */
export function voterChambre(etat, groupes, theme, orientation) {
  let pour = 0, contre = 0;
  const detail = groupes.map((g) => {
    const score = scoreGroupe(etat, g, theme, orientation);
    const vote = score >= SEUIL_SOUTIEN ? 'pour' : 'contre';
    if (vote === 'pour') pour += g.sieges; else contre += g.sieges;
    return { groupe: g.id, sigle: g.sigle, sieges: g.sieges, vote, score: Math.round(score * 100) / 100 };
  });
  return { pour, contre, adoptee: pour > contre, detail };
}

/**
 * Motion de censure : votent pour les groupes idéologiquement éloignés du joueur,
 * sauf son parti et ses alliés. Seuls les « pour » comptent (art. 49 C).
 */
export function voterCensure(etat, groupes) {
  let pour = 0;
  const detail = groupes.map((g) => {
    const allie = g.parti === etat.joueur.parti || (g.parti && accordActif(etat, g.parti));
    const ecart = ecartIdeologique(etat.joueur.ideologie, g.positions);
    const vote = !allie && ecart > SEUIL_OPPOSITION ? 'pour' : 'contre';
    if (vote === 'pour') pour += g.sieges;
    return { groupe: g.id, sigle: g.sigle, sieges: g.sieges, vote, ecart: Math.round(ecart) };
  });
  return { pour, requis: MAJORITE_CENSURE, adoptee: pour >= MAJORITE_CENSURE, detail };
}
