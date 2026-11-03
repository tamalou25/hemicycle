// E3 : profils agrégés de jeu, PAS une enquête démographique ou électorale.
import { intentionsDeVote } from './polls.js';

export const GROUPES_SOCIAUX = [
  { id: 'jeunes', nom: 'Jeunes en formation', part: 0.2, priorite: 'Formation, emploi et mobilité', poids: { emploi: 0.5, sante: 0.15, transports: 0.35 }, inflation: 2, social: 0.04, education: 0.2 },
  { id: 'salaries', nom: 'Salariés et demandeurs d’emploi', part: 0.45, priorite: 'Emploi, pouvoir d’achat et services', poids: { emploi: 0.55, sante: 0.25, transports: 0.2 }, inflation: 1.5, social: 0.06, education: 0.04 },
  { id: 'retraites', nom: 'Retraités', part: 0.25, priorite: 'Accès aux soins et protection sociale', poids: { emploi: 0.1, sante: 0.75, transports: 0.15 }, inflation: 1.8, social: 0.12, education: 0 },
  { id: 'independants', nom: 'Indépendants', part: 0.1, priorite: 'Activité, mobilité et fiscalité', poids: { emploi: 0.65, sante: 0.15, transports: 0.2 }, inflation: 1, social: 0.02, education: 0.02 },
];
export const bornerOpinion = (v) => Math.round(Math.max(0, Math.min(100, v)) * 100) / 100;

/** Conditions de vie : services locaux, inflation et écarts budgétaires (sensibilités de jeu). */
export function cibleSatisfaction(t, ind, budget, groupe) {
  const ecarts = budget?.ecarts ?? {};
  const fiscalite = groupe.id === 'independants' ? 'impots_entreprises' : 'impots_menages';
  return bornerOpinion(Object.entries(groupe.poids).reduce((s, [i, p]) => s + t[i] * p, 0)
    - Math.max(0, ind.inflation - 2) * groupe.inflation
    + (ecarts.protection_sociale ?? 0) * groupe.social
    + (ecarts.education ?? 0) * groupe.education
    - (ecarts[fiscalite] ?? 0) * 0.08);
}

export function initialiserPopulation(etat) {
  if (!etat.territoires) return null;
  return Object.fromEntries(Object.entries(etat.territoires).map(([id, t]) => [id,
    Object.fromEntries(GROUPES_SOCIAUX.map((g) => {
      const satisfaction = cibleSatisfaction(t, etat.indicateurs, etat.budget, g);
      return [g.id, { satisfaction, reference: satisfaction, confiance: bornerOpinion(etat.indicateurs.popularite) }];
    })),
  ]));
}

/** La confiance réagit plus lentement aux conditions de vie ; elle ne vaut pas intention de vote. */
export function evoluerPopulation(etat, tour) {
  const avant = etat.population ?? initialiserPopulation(etat);
  if (!avant) return { population: null, entrees: [] };
  const entrees = [];
  const population = Object.fromEntries(Object.entries(etat.territoires).map(([id, t]) => [id,
    Object.fromEntries(GROUPES_SOCIAUX.map((g) => {
      const p = avant[id][g.id];
      const satisfaction = bornerOpinion(p.satisfaction + (cibleSatisfaction(t, etat.indicateurs, etat.budget, g) - p.satisfaction) * 0.25);
      const cible = bornerOpinion(30 + (satisfaction - p.reference) * 0.8
        + (etat.indicateurs.popularite - 30) * 0.2 - (etat.indicateurs.tensions - 40) * 0.15);
      const confiance = bornerOpinion(p.confiance + (cible - p.confiance) * 0.12);
      for (const [indicateur, valeur] of Object.entries({ satisfaction, confiance })) {
        const delta = Math.round((valeur - p[indicateur]) * 100) / 100;
        if (delta) entrees.push({ tour, region: id, groupe: g.id, indicateur, delta, type: 'population', source: indicateur === 'satisfaction' ? 'conditions-vie' : 'confiance', nature: 'observe' });
      }
      return [g.id, { ...p, satisfaction, confiance }];
    })),
  ]));
  return { population, entrees };
}

export function resumeRegion(population) {
  if (!population) return null;
  return Object.fromEntries(['satisfaction', 'confiance'].map((i) => [i,
    bornerOpinion(GROUPES_SOCIAUX.reduce((s, g) => s + population[g.id][i] * g.part, 0)),
  ]));
}

/** Vote : base partisane nationale ajustée par la confiance de chaque groupe, sans stéréotype idéologique. */
export function intentionsRegionales(etat, partis) {
  return Object.fromEntries(Object.entries(etat.population ?? {}).map(([id, groupes]) => {
    const scores = Object.fromEntries(partis.map((p) => [p.id, 0]));
    for (const g of GROUPES_SOCIAUX) {
      const intentions = intentionsDeVote(partis, etat.joueur.parti, groupes[g.id].confiance);
      for (const p of partis) scores[p.id] += intentions[p.id] * g.part;
    }
    return [id, normaliserScores(scores)];
  }));
}

/** Normalisation exacte (sans arrondi interne : l'UI arrondit uniquement à l'affichage). */
export function normaliserScores(scores) {
  const total = Object.values(scores).reduce((s, v) => s + Math.max(0, v), 0);
  return Object.fromEntries(Object.entries(scores).map(([id, v]) => [id, total ? Math.max(0, v) * 100 / total : 0]));
}

/** Population comme approximation du poids électoral : pas de fichier d'inscrits ni d'abstention par région. */
export function agregerRegions(scores, regions) {
  const total = {};
  for (const r of regions ?? []) {
    if (!scores[r.id] || !(r.population > 0)) continue;
    for (const [id, v] of Object.entries(scores[r.id])) total[id] = (total[id] ?? 0) + v * r.population;
  }
  return normaliserScores(total);
}

export function resumePopulation(etat, regions) {
  const resumes = Object.fromEntries(Object.entries(etat.population ?? {}).map(([id, p]) => [id, resumeRegion(p)]));
  let total = 0, satisfaction = 0, confiance = 0;
  for (const r of regions ?? []) {
    if (!resumes[r.id] || !(r.population > 0)) continue;
    total += r.population;
    satisfaction += resumes[r.id].satisfaction * r.population;
    confiance += resumes[r.id].confiance * r.population;
  }
  return total ? { satisfaction: bornerOpinion(satisfaction / total), confiance: bornerOpinion(confiance / total) } : null;
}
