// Sondages : popularité cible du joueur et intentions de vote par parti.

/**
 * Popularité « méritée » selon la conjoncture et les compétences.
 * La popularité réelle converge vers cette cible chaque mois.
 */
export function populariteCible(ind, competences) {
  const talent = (competences.charisme + competences.communication - 100) / 10; // -10..+10
  return 32 + talent
    - (ind.chomage - 7.5) * 2.5
    - (ind.inflation - 2) * 1.5
    + (ind.croissance - 1) * 2
    - (ind.tensions - 30) / 6;
}

/**
 * Intentions de vote : base réelle de chaque parti, le parti du joueur
 * gagne ou perd selon sa popularité. Normalisé à 100.
 */
export function intentionsDeVote(partis, partiJoueur, popularite) {
  // Repli si aucun sondage sourcé : part des sièges à l'Assemblée.
  const totalSieges = partis.reduce((s, p) => s + (p.sieges_assemblee ?? 0), 0) || 1;
  const bruts = partis.map((p) => {
    let v = p.intentions_vote ?? (p.sieges_assemblee ? (p.sieges_assemblee / totalSieges) * 100 : 1);
    if (p.id === partiJoueur) v = Math.max(0.5, v + (popularite - 30) / 4);
    return [p.id, v];
  });
  const total = bruts.reduce((s, [, v]) => s + v, 0) || 1;
  return Object.fromEntries(bruts.map(([id, v]) => [id, Math.round((v / total) * 1000) / 10]));
}
