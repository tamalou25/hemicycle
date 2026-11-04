// Niveaux de difficulté (lot 5) : des paramètres explicites (difficulte.json) qui modulent quelques règles du moteur.
// L'état ne garde que le niveau (`etat.difficulte`, null = normal pour les parties antérieures) : les paramètres viennent des données.
export const NIVEAUX = ['facile', 'normal', 'difficile'];
const NORMAL = { capital_bonus: 0, bruit: 1, evenements: 1, initiatives: 1, enveloppe: 1, usure: 1 };

/** Niveau valide, sinon null (= normal). */
export const normaliserDifficulte = (niveau) => (NIVEAUX.includes(niveau) ? niveau : null);

/** Paramètres du niveau de l'état (normal par défaut, même sans données). */
export function parametresDifficulte(etat, donnees) {
  const niveau = normaliserDifficulte(etat?.difficulte) ?? donnees?.difficulte?.defaut ?? 'normal';
  const p = donnees?.difficulte?.niveaux?.[niveau];
  return { niveau, ...NORMAL, ...(p ?? {}) };
}

/** Libellé lisible du niveau (parties antérieures : « Normal »). */
export const nomDifficulte = (etat, donnees) => donnees?.difficulte?.niveaux?.[normaliserDifficulte(etat?.difficulte) ?? 'normal']?.nom ?? 'Normal';

/** Tableau comparatif des niveaux (présentation) : [{ cle, libelle, valeurs: { facile, normal, difficile } }]. */
export function comparerNiveaux(donnees) {
  const d = donnees?.difficulte;
  if (!d) return [];
  return Object.entries(d.libelles ?? {}).map(([cle, libelle]) => ({ cle, libelle, valeurs: Object.fromEntries(NIVEAUX.map((n) => [n, d.niveaux[n]?.[cle] ?? NORMAL[cle]])) }));
}
