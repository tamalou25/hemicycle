// Réactions SIMULÉES des personnalités réelles.
// Règle de contenu : le moteur ne produit JAMAIS de texte attribué à une personne réelle.
// Il renvoie une attitude probable, calculée à partir des positions publiques de son parti ;
// l'UI l'affiche sans guillemets, avec un badge SIMULATION.

export const ATTITUDES = ['soutien', 'reserve', 'opposition'];

/** Positions d'une personnalité : celles de son parti (neutralité, pas d'évaluation individuelle). */
export function positionsDe(politicien, partis) {
  return partis.find((p) => p.id === politicien.parti)?.positions ?? null;
}

/** Attitude probable face à une orientation sur un thème. */
export function attitude(positions, theme, orientation) {
  const ecart = Math.abs((positions?.[theme] ?? 0) - orientation);
  if (ecart <= 50) return 'soutien';
  if (ecart <= 100) return 'reserve';
  return 'opposition';
}

/**
 * Réactions simulées à un texte.
 * @returns {Array<{ id, nom, parti, attitude, simulation: true }>}
 */
export function reactionsAuTexte({ theme, orientation }, politiciens, partis, exclureId = null) {
  return politiciens
    .filter((p) => p.id !== exclureId)
    .map((p) => ({ id: p.id, nom: p.nom, parti: p.parti, attitude: attitude(positionsDe(p, partis), theme, orientation), simulation: true }));
}

/**
 * Prépare le joueur pour le mode « jouer un élu ».
 * Idéologie = positions du parti ; compétences identiques pour tous (neutralité).
 */
export function joueurDepuisPoliticien(politicien, partis, role = 'depute') {
  const positions = positionsDe(politicien, partis);
  if (!positions) throw new Error(`Parti inconnu pour ${politicien.nom}.`);
  return {
    nom: politicien.nom,
    parti: politicien.parti,
    role,
    politicienId: politicien.id,
    ideologie: { ...positions },
    competences: { charisme: 60, negociation: 60, economie: 60, communication: 60 },
  };
}
