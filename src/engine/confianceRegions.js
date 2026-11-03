// Confiance par région (après E7) : jugement des habitants d'une région sur le gouvernement.
// Distincte de la satisfaction (situation vécue) : elle la suit avec retard, encaisse les chocs
// politiques nationaux (49.3, loi spéciale) et gagne quand un projet est mis en service localement.
// Utilisée par les législatives (vote par région).

export const CONFIANCE_INITIALE = 40;
export const BONUS_MISE_EN_SERVICE = 3;
const borne = (v) => Math.round(Math.min(100, Math.max(0, v)) * 100) / 100;

export const confianceRegionsInitiale = (territoires) =>
  territoires ? Object.fromEntries(Object.keys(territoires).map((id) => [id, CONFIANCE_INITIALE])) : null;

/**
 * Évolution mensuelle. `chocs` : chocs politiques nationaux du mois (appliqués à toutes les régions) ;
 * `misesEnService` : ids des régions où un projet vient d'être mis en service.
 * Renvoie { confianceRegions, entrees } (registre des causes, par région).
 */
export function evoluerConfianceRegions(confianceRegions, territoires, chocs = {}, misesEnService = [], tour) {
  if (!confianceRegions || !territoires) return { confianceRegions, entrees: [] };
  const entrees = [];
  const choc = Object.values(chocs).reduce((s, v) => s + v, 0);
  const res = {};
  for (const [id, avant] of Object.entries(confianceRegions)) {
    const sat = territoires[id]?.satisfaction ?? 50;
    let c = avant + (sat * 0.7 - avant) * 0.08;
    if (choc) { c += choc; entrees.push({ tour, region: id, indicateur: 'confiance', delta: choc, source: Object.keys(chocs).join('+'), type: 'choc', nature: 'observe' }); }
    const n = misesEnService.filter((r) => r === id).length;
    if (n) { c += BONUS_MISE_EN_SERVICE * n; entrees.push({ tour, region: id, indicateur: 'confiance', delta: BONUS_MISE_EN_SERVICE * n, source: 'mise-en-service', type: 'mise-en-service', nature: 'observe' }); }
    res[id] = borne(c);
  }
  return { confianceRegions: res, entrees };
}

/** Confiance moyenne pondérée par la population. */
export function confianceRegionaleMoyenne(confianceRegions, regions) {
  let s = 0, p = 0;
  for (const r of regions ?? []) { const c = confianceRegions?.[r.id]; if (c != null && r.population) { s += c * r.population; p += r.population; } }
  return p ? Math.round((s / p) * 10) / 10 : null;
}
