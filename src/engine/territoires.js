// Territoires : 13 régions + 5 DROM, trois indices (0-100) et une satisfaction.
// Les indices de départ sont DÉRIVÉS de données observées (chômage, APL) par des formules
// d'équilibrage explicites ; l'indice transports est un paramètre d'équilibrage.

export const INDICES = ['emploi', 'sante', 'transports'];
export const POIDS_SATISFACTION = { emploi: 0.4, sante: 0.35, transports: 0.25 };
export const EROSION_MENSUELLE = { sante: 0.08, transports: 0.08 }; // usure sans entretien ni investissement

const borne = (v) => Math.round(Math.min(100, Math.max(0, v)) * 100) / 100;

/** Conversions données observées → indices de jeu (documentées dans docs/SOURCES.md). */
export const indiceEmploi = (chomage) => borne(100 - ((chomage ?? 8) - 4) * 7);
export const indiceSante = (apl) => borne(apl == null ? 50 : (apl / 4.5) * 100);
/** Variante à partir de la densité de médecins généralistes (tous modes d’exercice) pour 100 000 hab. (40 → 0, ≈ 207 → 100). */
export const indiceSanteDensite = (d) => borne(d == null ? 50 : (d - 40) * 0.6);

export const satisfactionCible = (t) => INDICES.reduce((s, i) => s + t[i] * POIDS_SATISFACTION[i], 0);

/** État initial des territoires. */
export function initialiserTerritoires(regions, transportsInitial = {}, parDefaut = {}) {
  return Object.fromEntries(regions.map((r) => {
    const sante = r.apl_medecins != null ? indiceSante(r.apl_medecins) : indiceSanteDensite(r.medecins_generalistes_100k);
    const t = { emploi: indiceEmploi(r.chomage), sante, transports: borne(transportsInitial[r.id] ?? 45), ...(parDefaut[r.id] ?? {}) };
    return [r.id, { ...t, satisfaction: borne(satisfactionCible(t)) }];
  }));
}

/** Satisfaction nationale : moyenne pondérée par la population. */
export function satisfactionNationale(territoires, regions) {
  let s = 0, p = 0;
  for (const r of regions) { const t = territoires?.[r.id]; if (t && r.population) { s += t.satisfaction * r.population; p += r.population; } }
  return p ? Math.round((s / p) * 10) / 10 : 50;
}

/**
 * Évolution mensuelle (hors projets) : usure des services, emploi qui suit le chômage national,
 * satisfaction qui converge vers sa cible. Renvoie { territoires, entrees } (entrées du registre).
 */
export function evoluerTerritoires(territoires, deltaChomageNational, tour) {
  const entrees = [];
  const res = {};
  for (const [id, t0] of Object.entries(territoires)) {
    const t = { ...t0 };
    for (const [i, e] of Object.entries(EROSION_MENSUELLE)) {
      const avant = t[i]; t[i] = borne(t[i] - e);
      if (t[i] !== avant) entrees.push({ tour, region: id, indicateur: i, delta: t[i] - avant, source: 'usure', type: 'usure', nature: 'observe' });
    }
    if (deltaChomageNational) {
      const avant = t.emploi; t.emploi = borne(t.emploi - deltaChomageNational * 5);
      if (t.emploi !== avant) entrees.push({ tour, region: id, indicateur: 'emploi', delta: t.emploi - avant, source: 'conjoncture', type: 'conjoncture', nature: 'observe' });
    }
    t.satisfaction = borne(t.satisfaction + (satisfactionCible(t) - t.satisfaction) * 0.2);
    res[id] = t;
  }
  return { territoires: res, entrees: entrees.map((e) => ({ ...e, delta: Math.round(e.delta * 100) / 100 })) };
}
