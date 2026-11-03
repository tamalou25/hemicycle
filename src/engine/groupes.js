// Population (E3) : groupes sociaux agrégés. Trois notions DISTINCTES :
//  - satisfaction : comment le groupe juge sa situation (résultats concrets, selon ses priorités) ;
//  - confiance : son jugement sur le gouvernement (suit la satisfaction avec retard, + chocs politiques) ;
//  - vote : intention de voter pour le parti du joueur (dépend de la confiance, pas de la satisfaction).
// Aucune orientation politique n'est attribuée aux groupes (neutralité).
import { indiceEmploi, satisfactionNationale } from './territoires.js';

export const RESULTATS = ['emploi', 'pouvoir_achat', 'sante', 'transports', 'securite', 'avenir'];
const borne = (v) => Math.round(Math.min(100, Math.max(0, v)) * 100) / 100;

/** Moyenne pondérée par la population d'un indice régional (50 si pas de territoires). */
function indiceNational(territoires, regions, indice) {
  if (!territoires || !regions) return 50;
  let s = 0, p = 0;
  for (const r of regions) { const t = territoires[r.id]; if (t) { s += t[indice] * r.population; p += r.population; } }
  return p ? s / p : 50;
}

/** Écart (%) des recettes actuelles par rapport à la situation de départ. */
function variationRecettes(etat, finances) {
  const res = {};
  for (const [k, v0] of Object.entries(finances?.recettes_md ?? {})) {
    const v = etat.budget?.recettes?.[k];
    res[k] = v0 && v != null ? ((v - v0) / v0) * 100 : 0;
  }
  return res;
}

/** Résultats concrets observés (0-100), communs à tous les groupes. */
export function resultats(etat, { regions, finances } = {}) {
  const i = etat.indicateurs, rg = regions?.regions;
  const e = etat.budget?.ecarts ?? {};
  return {
    emploi: indiceEmploi(i.chomage),
    pouvoir_achat: borne(60 - (i.inflation - 2) * 8),
    sante: indiceNational(etat.territoires, rg, 'sante'),
    transports: indiceNational(etat.territoires, rg, 'transports'),
    securite: borne(100 - i.tensions),
    avenir: borne(50 + (i.croissance - 1) * 10 + ((e.education ?? 0) + (e.recherche ?? 0)) * 0.4),
  };
}

/** Satisfaction d'un groupe : résultats pondérés par ses priorités, moins sa pression fiscale ajoutée. */
export function satisfactionGroupe(id, res, equilibrage, varRecettes = {}) {
  const prio = equilibrage.priorites[id];
  const base = RESULTATS.reduce((s, k) => s + (prio[k] ?? 0) * res[k], 0);
  const fiscal = Object.entries(varRecettes).reduce((s, [poste, pct]) => s + pct * (equilibrage.fiscalite[poste]?.[id] ?? 0), 0);
  return borne(base - fiscal * 1.5);
}

/** Population initiale des groupes. */
export function initialiserGroupes(etat, donnees) {
  const { groupes, groupesEquilibrage: eq } = donnees;
  if (!groupes || !eq) return null;
  const res = resultats(etat, donnees);
  return Object.fromEntries(groupes.groupes.map((g) => {
    const s = satisfactionGroupe(g.id, res, eq);
    return [g.id, { satisfaction: s, confiance: 40, confianceInitiale: 40 }];
  }));
}

/**
 * Évolution mensuelle. La satisfaction suit les résultats (30 %/mois), la confiance suit
 * la satisfaction avec retard (8 %/mois) et encaisse les chocs du mois (49.3, loi spéciale…).
 */
export function evoluerGroupes(etat, donnees, chocs = {}, tour) {
  const { groupes: G, groupesEquilibrage: eq } = donnees;
  if (!etat.groupes || !G || !eq) return { groupes: etat.groupes, entrees: [] };
  const res = resultats(etat, donnees);
  const varR = variationRecettes(etat, donnees.finances);
  const entrees = [];
  const out = {};
  for (const g of G.groupes) {
    const avant = etat.groupes[g.id] ?? { satisfaction: 50, confiance: 40, confianceInitiale: 40 };
    const cible = satisfactionGroupe(g.id, res, eq, varR);
    const satisfaction = borne(avant.satisfaction + (cible - avant.satisfaction) * 0.3);
    const choc = Object.values(chocs).reduce((s, v) => s + v, 0);
    // La confiance tend vers une fraction de la satisfaction (un groupe satisfait n'adhère pas forcément)
    const confiance = borne(avant.confiance + (satisfaction * 0.7 - avant.confiance) * 0.08 + choc);
    for (const [cause, v] of Object.entries(chocs)) if (v) entrees.push({ tour, groupe: g.id, indicateur: 'confiance', delta: v, source: cause, type: 'choc', nature: 'observe' });
    out[g.id] = { ...avant, satisfaction, confiance };
  }
  return { groupes: out, entrees };
}

/** Confiance moyenne pondérée par les parts de population. */
export function confianceMoyenne(groupesEtat, groupes) {
  if (!groupesEtat || !groupes) return null;
  let s = 0, p = 0;
  for (const g of groupes.groupes) { const x = groupesEtat[g.id]; if (x) { s += x.confiance * g.part; p += g.part; } }
  return p ? Math.round((s / p) * 10) / 10 : null;
}

/**
 * Intention de vote pour le parti du joueur, par groupe : la base nationale du parti,
 * modulée par l'évolution de la confiance du groupe depuis le début.
 */
export function voteJoueurParGroupe(groupesEtat, groupes, baseParti) {
  return Object.fromEntries(groupes.groupes.map((g) => {
    const x = groupesEtat[g.id];
    const f = x ? Math.max(0.2, 1 + (x.confiance - x.confianceInitiale) / 40) : 1;
    return [g.id, Math.round(baseParti * f * 10) / 10];
  }));
}

/** Part nationale du parti du joueur, agrégée sur les groupes (pondération par les parts de population). */
export function voteJoueurNational(groupesEtat, groupes, baseParti) {
  const par = voteJoueurParGroupe(groupesEtat, groupes, baseParti);
  let s = 0, p = 0;
  for (const g of groupes.groupes) { s += par[g.id] * g.part; p += g.part; }
  return p ? s / p : baseParti;
}

/**
 * Législatives par région : sièges proportionnels à la population, le score du parti du joueur
 * étant modulé par la satisfaction de la région ; prime majoritaire appliquée dans chaque région.
 */
export function siegesParRegion(scores, partiJoueur, territoires, regions, repartir, total = 577, confianceRegions = null) {
  const popTot = regions.reduce((s, r) => s + r.population, 0);
  const satNat = satisfactionNationale(territoires, regions) || 50;
  const confMoy = confianceRegions ? (Object.values(confianceRegions).reduce((a, b) => a + b, 0) / (Object.keys(confianceRegions).length || 1)) : null;
  const sieges = Object.fromEntries(Object.keys(scores).map((k) => [k, 0]));
  const parRegion = {};
  let attribues = 0;
  const quotas = regions.map((r) => ({ r, q: Math.max(1, Math.round((r.population / popTot) * total)) }));
  // Ajuste pour tomber exactement sur `total`
  let diff = total - quotas.reduce((s, x) => s + x.q, 0);
  quotas.sort((a, b) => b.r.population - a.r.population);
  for (let i = 0; diff !== 0; i = (i + 1) % quotas.length) { if (diff > 0) { quotas[i].q++; diff--; } else if (quotas[i].q > 1) { quotas[i].q--; diff++; } }
  for (const { r, q } of quotas) {
    // Le vote dépend de la confiance locale envers le gouvernement (à défaut, de la satisfaction)
    const ratio = confianceRegions
      ? (confianceRegions[r.id] ?? confMoy) / (confMoy || 1)
      : (territoires?.[r.id]?.satisfaction ?? satNat) / satNat;
    const local = { ...scores, [partiJoueur]: (scores[partiJoueur] ?? 0) * Math.max(0.3, Math.min(2, ratio)) };
    const s = repartir(local, q);
    parRegion[r.id] = s;
    for (const [k, v] of Object.entries(s)) { sieges[k] = (sieges[k] ?? 0) + v; attribues += v; }
  }
  return { sieges, parRegion, total: attribues };
}
