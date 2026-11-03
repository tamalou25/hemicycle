// Politique reliée (E5) : relation (0-100) entre chaque parti et le joueur.
// Elle évolue selon les décisions (lois promulguées, programmes engagés, budgets adoptés),
// comparées aux positions publiques du parti, et revient lentement vers 50.
// Elle pèse sur les votes, la tolérance des accords et la censure. Traitement identique pour tous les partis.

export const RELATION_NEUTRE = 50;
const borne = (v) => Math.round(Math.min(100, Math.max(0, v)) * 100) / 100;

export const relationsInitiales = (partis) => (partis ? Object.fromEntries(partis.map((p) => [p.id, RELATION_NEUTRE])) : null);

/** Variation de relation d'un parti face à une décision (theme, orientation) : de +4 (aligné) à −4 (opposé). */
// Neutre à 60 points d'écart : en deçà le parti approuve, au-delà il désapprouve (borné à ±4).
export const reactionParti = (parti, theme, orientation) => {
  const d = Math.abs((parti.positions?.[theme] ?? 0) - orientation);
  return Math.round(Math.max(-4, Math.min(4, (1 - d / 60) * 4)) * 100) / 100;
};

/**
 * Applique la réaction de tous les partis à une décision. Renvoie { relations, entrees } ;
 * les entrées (registre des causes) indiquent qui approuve ou désapprouve.
 */
export function reagir(etat, partis, { theme, orientation, source, libelle }, tour = etat.tour) {
  if (!etat.relations || !partis) return { relations: etat.relations, entrees: [] };
  const relations = { ...etat.relations };
  const entrees = [];
  for (const p of partis) {
    if (p.id === etat.joueur.parti) continue;
    const d = reactionParti(p, theme, orientation);
    const avant = relations[p.id] ?? RELATION_NEUTRE;
    relations[p.id] = borne(avant + d);
    if (relations[p.id] !== avant) entrees.push({ tour, parti: p.id, indicateur: `relation:${p.id}`, delta: Math.round((relations[p.id] - avant) * 100) / 100, source, type: 'relation', nature: 'observe', libelle });
  }
  return { relations, entrees };
}

/** Retour mensuel vers la neutralité (la mémoire politique s'estompe). */
export const estomperRelations = (relations) =>
  relations && Object.fromEntries(Object.entries(relations).map(([k, v]) => [k, borne(v + (RELATION_NEUTRE - v) * 0.05)]));

/** Effets de la relation (bornés) : bonus de vote, tolérance d'accord, comportement face à la censure. */
export const bonusVote = (etat, partiId) => ((etat.relations?.[partiId] ?? RELATION_NEUTRE) - RELATION_NEUTRE) / 400; // ±0,125
export const bonusTolerance = (etat, partiId) => ((etat.relations?.[partiId] ?? RELATION_NEUTRE) - RELATION_NEUTRE) / 2; // ±25
export function attitudeCensure(etat, partiId) {
  const r = etat.relations?.[partiId] ?? RELATION_NEUTRE;
  if (r >= 75) return 'protege';  // ne votera pas la censure
  if (r <= 25) return 'hostile';  // la votera même si l'écart idéologique est modéré
  return 'neutre';
}
