// File des effets différés des lois.
import { borner } from './constants.js';

/**
 * Transforme les effets d'une loi en entrées de file datées.
 * Un effet { valeur, delaiMois, duree } est réparti uniformément sur `duree` mois,
 * à partir de `moisCourant + delaiMois`. `facteur` réduit les effets (amendements, censure partielle).
 */
export function planifierEffets(effets, moisCourant, source, facteur = 1) {
  return effets.map((e) => {
    const duree = Math.max(1, e.duree ?? 1);
    const debut = moisCourant + (e.delaiMois ?? 0);
    return { indicateur: e.indicateur, parMois: (e.valeur * facteur) / duree, debut, fin: debut + duree - 1, source };
  });
}

/** Applique les effets actifs au mois donné. Renvoie { indicateurs, file, appliques }. */
export function appliquerEffets(indicateurs, file, mois) {
  const nouveaux = { ...indicateurs };
  const appliques = [];
  for (const e of file) {
    if (mois >= e.debut && mois <= e.fin && e.indicateur in nouveaux) {
      nouveaux[e.indicateur] = borner(e.indicateur, nouveaux[e.indicateur] + e.parMois);
      appliques.push(e);
    }
  }
  return { indicateurs: nouveaux, file: file.filter((e) => e.fin > mois), appliques };
}
