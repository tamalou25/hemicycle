// Finances publiques (E2) : budget des administrations publiques en Md€, projet de loi de finances (PLF)
// annuel voté au Parlement, charge de la dette. Montants initiaux = données observées (src/data/finances.json) ;
// sensibilités par Md€ = PARAMÈTRES D'ÉQUILIBRAGE (SENSIBILITES ci-dessous).
import { planifierEffets } from './effects.js';
import { groupesAssemblee, voterChambre, voterCensure, ecartIdeologique, accordActif } from './parliament.js';
import { SEUIL_OPPOSITION } from './constants.js';

export const SECTEURS = ['protection_sociale', 'sante', 'education', 'defense_securite', 'infrastructures_environnement', 'recherche', 'administration_autres'];
export const RECETTES = ['impots_menages', 'impots_entreprises', 'tva_consommation', 'cotisations_sociales'];
export const VARIATION_MAX = 5;          // ± 5 % par poste et par an
export const MOIS_PLF = [9, 10, 11, 12]; // dépôt possible de septembre à décembre

/** Effets nationaux par Md€ de variation annuelle (équilibrage). delai/duree en mois. */
export const SENSIBILITES = {
  protection_sociale: [{ indicateur: 'tensions', parMd: -0.12, delaiMois: 1, duree: 6 }, { indicateur: 'popularite', parMd: 0.06, delaiMois: 0, duree: 3 }],
  sante: [{ indicateur: 'popularite', parMd: 0.05, delaiMois: 2, duree: 6 }],
  education: [{ indicateur: 'croissance', parMd: 0.008, delaiMois: 24, duree: 24 }, { indicateur: 'tensions', parMd: -0.05, delaiMois: 1, duree: 6 }],
  defense_securite: [{ indicateur: 'tensions', parMd: -0.06, delaiMois: 3, duree: 6 }],
  infrastructures_environnement: [{ indicateur: 'croissance', parMd: 0.006, delaiMois: 6, duree: 12 }],
  recherche: [{ indicateur: 'croissance', parMd: 0.015, delaiMois: 36, duree: 24 }],
  administration_autres: [{ indicateur: 'popularite', parMd: -0.01, delaiMois: 0, duree: 3 }],
  impots_menages: [{ indicateur: 'popularite', parMd: -0.08, delaiMois: 0, duree: 3 }, { indicateur: 'croissance', parMd: -0.004, delaiMois: 3, duree: 6 }],
  impots_entreprises: [{ indicateur: 'croissance', parMd: -0.008, delaiMois: 3, duree: 9 }, { indicateur: 'chomage', parMd: 0.004, delaiMois: 6, duree: 9 }],
  tva_consommation: [{ indicateur: 'inflation', parMd: 0.015, delaiMois: 1, duree: 3 }, { indicateur: 'popularite', parMd: -0.05, delaiMois: 0, duree: 3 }],
  cotisations_sociales: [{ indicateur: 'chomage', parMd: 0.005, delaiMois: 6, duree: 9 }, { indicateur: 'croissance', parMd: -0.004, delaiMois: 3, duree: 6 }],
};
/** Effet mensuel sur les indices régionaux par Md€ de variation annuelle (équilibrage). */
export const SENSIBILITES_REGIONALES = { sante: { indice: 'sante', parMd: 0.012 }, infrastructures_environnement: { indice: 'transports', parMd: 0.008 } };

const r2 = (v) => Math.round(v * 100) / 100;
const somme = (o) => Object.values(o ?? {}).reduce((s, v) => s + v, 0);

/** État budgétaire initial à partir de finances.json. */
export function budgetInitial(f) {
  if (!f) return null;
  return {
    pib: f.pib_md, recettes: { ...f.recettes_md }, depenses: { ...f.depenses_md },
    taux: f.charge_interets_md && f.dette_md ? f.charge_interets_md / f.dette_md : 0.02,
    ecarts: {},   // écarts cumulés (Md€) par rapport à la situation de départ, pour les effets régionaux
    annee: 0,
  };
}

export const solde = (b) => r2(somme(b.recettes) - somme(b.depenses));

export function raisonRefusPLF(etat) {
  if (etat.fin) return 'La partie est terminée.';
  if (!etat.budget) return 'Données budgétaires indisponibles.';
  if (etat.joueur.role !== 'premier_ministre') return 'Le projet de loi de finances est déposé par le gouvernement.';
  if (etat.plf) return 'Un projet de loi de finances est déjà en discussion.';
  if (etat.dernierPLF != null && etat.tour - etat.dernierPLF < 10) return 'Un budget a déjà été voté cette année.';
  const mois = ((etat.dateDepart.mois - 1 + etat.tour) % 12) + 1;
  if (!MOIS_PLF.includes(mois)) return 'Le projet de loi de finances se dépose à l’automne (septembre à décembre).';
  return null;
}

/** Normalise les variations demandées (%, bornées). */
export function normaliserPLF(choix = {}) {
  const lim = (v) => Math.max(-VARIATION_MAX, Math.min(VARIATION_MAX, Math.round((Number(v) || 0) * 2) / 2));
  return {
    depenses: Object.fromEntries(SECTEURS.map((s) => [s, lim(choix.depenses?.[s])])),
    recettes: Object.fromEntries(RECETTES.map((r) => [r, lim(choix.recettes?.[r])])),
  };
}

/** Variations en Md€ et effet sur le solde d'un PLF (aperçu, avant vote). */
export function chiffrerPLF(budget, plf) {
  const dD = Object.fromEntries(SECTEURS.map((s) => [s, r2((budget.depenses[s] ?? 0) * plf.depenses[s] / 100)]));
  const dR = Object.fromEntries(RECETTES.map((r) => [r, r2((budget.recettes[r] ?? 0) * plf.recettes[r] / 100)]));
  const deltaSolde = r2(somme(dR) - somme(dD));
  return { dD, dR, deltaSolde, deltaDeficitPts: r2((-deltaSolde / budget.pib) * 100) };
}

/**
 * Orientation politique du PLF sur l'axe « fiscalité » (+100 = baisse d'impôts) :
 * baisses d'impôts → droite ; hausses de dépenses sociales → gauche.
 */
export function orientationPLF(plf) {
  const moy = (o) => Object.values(o).reduce((s, v) => s + v, 0) / Object.values(o).length;
  const social = (plf.depenses.protection_sociale + plf.depenses.sante + plf.depenses.education) / 3;
  return Math.max(-100, Math.min(100, Math.round(-moy(plf.recettes) * 25 - social * 12)));
}

export function deposerPLF(etat, choix) {
  const refus = raisonRefusPLF(etat);
  if (refus) throw new Error(refus);
  const plf = normaliserPLF(choix);
  const c = chiffrerPLF(etat.budget, plf);
  return {
    ...etat,
    plf: { ...plf, depot: etat.tour, recours493: false },
    journal: [...etat.journal, { tour: etat.tour, type: 'budget', texte: `Projet de loi de finances déposé : solde ${c.deltaSolde >= 0 ? '+' : ''}${c.deltaSolde} Md€ (${c.deltaDeficitPts >= 0 ? '+' : ''}${c.deltaDeficitPts} pt de déficit). Vote à la fin du mois.` }],
  };
}

/** 49.3 sur le budget : pas de délai (usage illimité pour les lois de finances). */
export function recourir493PLF(etat) {
  if (!etat.plf) throw new Error('Aucun projet de loi de finances en discussion.');
  if (etat.plf.recours493) throw new Error('49.3 déjà engagé sur le budget.');
  return { ...etat, plf: { ...etat.plf, recours493: true }, chocs: { ...(etat.chocs ?? {}), '49.3': -3 }, journal: [...etat.journal, { tour: etat.tour, type: '493', texte: 'Le gouvernement engage sa responsabilité (49.3) sur le budget.' }] };
}

/** Applique un PLF adopté : nouveaux montants, effets différés (déficit, secteurs, recettes). */
function appliquerPLF(etat, plf) {
  const b = etat.budget;
  const c = chiffrerPLF(b, plf);
  const depenses = { ...b.depenses }, recettes = { ...b.recettes }, ecarts = { ...b.ecarts };
  for (const s of SECTEURS) { depenses[s] = r2(depenses[s] + c.dD[s]); ecarts[s] = r2((ecarts[s] ?? 0) + c.dD[s]); }
  for (const r of RECETTES) recettes[r] = r2(recettes[r] + c.dR[r]);
  const effets = [{ indicateur: 'deficit', valeur: c.deltaDeficitPts, delaiMois: 1, duree: 12 }];
  for (const [poste, d] of [...Object.entries(c.dD), ...Object.entries(c.dR)]) {
    if (!d) continue;
    for (const s of SENSIBILITES[poste] ?? []) effets.push({ indicateur: s.indicateur, valeur: r2(s.parMd * d * 100) / 100, delaiMois: s.delaiMois, duree: s.duree });
  }
  return {
    ...etat,
    budget: { ...b, depenses, recettes, ecarts },
    effetsEnCours: [...etat.effetsEnCours, ...planifierEffets(effets.filter((e) => e.valeur), etat.tour + 1, 'budget')],
  };
}

/**
 * Vote d'un budget à l'Assemblée : comme un texte ordinaire, mais les groupes d'opposition
 * (écart idéologique > SEUIL_OPPOSITION, sans accord) votent contre par principe.
 */
export function voterBudgetAssemblee(etat, groupes, plf) {
  const v = voterChambre(etat, groupes, 'fiscalite', orientationPLF(plf));
  let pour = 0, contre = 0;
  const detail = v.detail.map((d) => {
    const g = groupes.find((x) => x.id === d.groupe);
    const opposition = g.parti !== etat.joueur.parti && !(g.parti && accordActif(etat, g.parti)) && ecartIdeologique(etat.joueur.ideologie, g.positions) > SEUIL_OPPOSITION;
    const vote = opposition ? 'contre' : d.vote;
    if (vote === 'pour') pour += d.sieges; else contre += d.sieges;
    return { ...d, vote, opposition };
  });
  return { pour, contre, adoptee: pour > contre, detail };
}

/** Vote du PLF en fin de mois (appelé par tourSuivant). Rejet → loi spéciale (budget reconduit). */
export function voterPLF(etat, { partis }) {
  if (!etat.plf) return etat;
  const plf = etat.plf;
  const journal = [...etat.journal];
  const AN = groupesAssemblee(partis, etat.sieges);
  let adopte;
  if (plf.recours493) {
    const c = voterCensure(etat, AN);
    if (c.adoptee) {
      journal.push({ tour: etat.tour, type: 'censure', texte: `Motion de censure adoptée sur le budget (${c.pour} voix). Le gouvernement est renversé.` });
      return { ...etat, plf: null, journal, dernierVote: { loi: 'budget', chambre: 'censure', ...c }, fin: { type: 'censure', texte: 'Votre gouvernement a été renversé sur le budget.' } };
    }
    journal.push({ tour: etat.tour, type: 'censure', texte: `Motion de censure rejetée (${c.pour} voix) : le budget est adopté.` });
    etat = { ...etat, dernierVote: { loi: 'budget', chambre: 'censure', ...c } };
    adopte = true;
  } else {
    const v = voterBudgetAssemblee(etat, AN, plf);
    adopte = v.adoptee;
    journal.push({ tour: etat.tour, type: 'vote', texte: `Assemblée : budget ${adopte ? 'adopté' : 'rejeté'} (${v.pour}–${v.contre}).` });
    etat = { ...etat, dernierVote: { loi: 'budget', chambre: 'assemblee', ...v } };
  }
  if (!adopte) {
    journal.push({ tour: etat.tour, type: 'budget', texte: 'Faute de budget, une loi spéciale reconduit les crédits de l’année précédente.' });
    return { ...etat, plf: null, dernierPLF: etat.tour, journal, chocs: { ...(etat.chocs ?? {}), 'loi-speciale': -1.5 }, indicateurs: { ...etat.indicateurs, popularite: Math.max(0, etat.indicateurs.popularite - 2) } };
  }
  journal.push({ tour: etat.tour, type: 'budget', texte: 'Loi de finances promulguée.' });
  return appliquerPLF({ ...etat, plf: null, dernierPLF: etat.tour, journal }, plf);
}

/**
 * Évolution mensuelle : PIB (croissance), dette en Md€ (cohérente avec l'indicateur en % du PIB),
 * et chaque janvier, révision de la charge d'intérêts → effet sur le déficit.
 */
export function evoluerBudget(etat, moisCalendaire) {
  const b = etat.budget;
  if (!b) return { etat, entrees: [] };
  // PIB nominal : croissance réelle + inflation (cohérent avec la dynamique de la dette en % du PIB)
  const pib = r2(b.pib * (1 + (etat.indicateurs.croissance + etat.indicateurs.inflation) / 1200));
  let budget = { ...b, pib };
  let effetsEnCours = etat.effetsEnCours;
  if (moisCalendaire === 1) {
    const detteMd = (etat.indicateurs.dette / 100) * pib;
    const interets = r2(detteMd * b.taux);
    const delta = r2(interets - b.depenses.interets);
    budget = { ...budget, depenses: { ...b.depenses, interets }, annee: (b.annee ?? 0) + 1 };
    if (delta) effetsEnCours = [...effetsEnCours, ...planifierEffets([{ indicateur: 'deficit', valeur: r2((delta / pib) * 100 * 100) / 100, delaiMois: 0, duree: 12 }], etat.tour + 2, 'interets')]; // etat.tour + 1 est le mois en cours, déjà appliqué
  }
  return { etat: { ...etat, budget, effetsEnCours } };
}

/** Effets mensuels des écarts de dépenses sectorielles sur les territoires. */
export function effetsBudgetTerritoires(territoires, budget, tour) {
  if (!budget || !territoires) return { territoires, entrees: [] };
  const entrees = [];
  const res = {};
  for (const [id, t0] of Object.entries(territoires)) {
    const t = { ...t0 };
    for (const [secteur, { indice, parMd }] of Object.entries(SENSIBILITES_REGIONALES)) {
      const d = (budget.ecarts?.[secteur] ?? 0) * parMd;
      if (!d) continue;
      const avant = t[indice]; t[indice] = Math.min(100, Math.max(0, r2(t[indice] + d)));
      if (t[indice] !== avant) entrees.push({ tour, region: id, indicateur: indice, delta: r2(t[indice] - avant), source: `budget:${secteur}`, type: 'budget', nature: 'observe' });
    }
    res[id] = t;
  }
  return { territoires: res, entrees };
}
