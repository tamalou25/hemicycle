// Objectifs de mandat : le joueur en choisit 3 au départ ; suivis en cours de partie, évalués à la fin.
// La progression est un indicateur d'affichage ; seul le résultat en fin de partie compte dans le bilan.
import { satisfactionNationale } from './territoires.js';
import { confianceRegionaleMoyenne } from './confianceRegions.js';
import { INDICES } from './territoires.js';

export const POINTS_PAR_OBJECTIF = 8; // bonus au score de bilan par objectif atteint

/** Valeur actuelle mesurée pour un objectif (null si non mesurable dans cette partie). */
export function valeurObjectif(o, etat, { regions } = {}) {
  switch (o.mesure) {
    case 'indicateur': return etat.indicateurs[o.indicateur] ?? null;
    case 'satisfaction_territoriale': return etat.territoires && regions ? satisfactionNationale(etat.territoires, regions.regions) : null;
    case 'indice_minimal': return etat.territoires ? Math.min(...Object.values(etat.territoires).flatMap((t) => INDICES.map((i) => t[i]))) : null;
    case 'lois_adoptees': return etat.loisAdoptees.length;
    case 'programmes_en_oeuvre': return (etat.politiques ?? []).filter((p) => p.statut === 'en_oeuvre').length;
    case 'confiance_regionale': return etat.confianceRegions && regions ? confianceRegionaleMoyenne(etat.confianceRegions, regions.regions) : null;
    default: return null;
  }
}

/** Valide et normalise un choix d'objectifs (exactement N ids connus, sans doublon ; sinon le choix par défaut). */
export const objectifPossible = (o, role) => !o.role || o.role === role;

export function normaliserObjectifs(choix, catalogue, role) {
  if (!catalogue) return [];
  // Seuls les objectifs atteignables dans le rôle du joueur (ex. programmes nationaux : Premier ministre)
  const ids = new Set(catalogue.objectifs.filter((o) => objectifPossible(o, role)).map((o) => o.id));
  const uniques = [...new Set((choix ?? []).filter((id) => ids.has(id)))];
  return uniques.length === catalogue.nombre_a_choisir ? uniques : [...catalogue.defaut];
}

/** Bilan de chaque objectif : { id, titre, valeur, cible, atteint, progression (0-1) }. */
export function evaluerObjectifs(etat, donnees) {
  const cat = donnees?.objectifs;
  if (!cat || !etat.objectifs?.length) return [];
  return etat.objectifs.map((id) => {
    const o = cat.objectifs.find((x) => x.id === id);
    if (!o) return null;
    const valeur = valeurObjectif(o, etat, donnees);
    if (valeur == null) return { id, titre: o.titre, description: o.description, valeur: null, cible: o.cible, atteint: false, progression: 0 };
    const atteint = o.sens === 'max' ? valeur <= o.cible : valeur >= o.cible;
    // Progression indicative : rapport à la cible (bornée 0-1)
    const progression = atteint ? 1 : Math.max(0, Math.min(1, o.sens === 'max' ? o.cible / valeur : valeur / o.cible));
    return { id, titre: o.titre, description: o.description, valeur: Math.round(valeur * 100) / 100, cible: o.cible, sens: o.sens, atteint, progression: Math.round(progression * 100) / 100 };
  }).filter(Boolean);
}
