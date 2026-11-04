// Événements mensuels : tirage pondéré selon les conditions, résolution par un choix du joueur.
import { aleatoire } from './rng.js';
import { planifierEffets } from './effects.js';
import { gouverne } from './presidence.js';

/** Probabilité qu'un événement survienne un mois donné. */
export const PROBA_EVENEMENT = 0.35;
/** Délai minimal avant qu'un même événement revienne. */
export const DELAI_REPETITION = 12;

/** L'événement est-il possible dans l'état courant ? */
export function eligible(ev, etat, { scenario = false } = {}) {
  // Un événement réservé au scénario (crise programmée ou sa suite) n'est jamais tiré au hasard
  if (ev.declenchement === 'scenario' && !scenario) return false;
  // Un événement régional n'a de sens que si la partie a des territoires
  if (ev.region_cible && !etat.territoires) return false;
  if (ev.role === 'premier_ministre' && !gouverne(etat)) return false;
  const dernier = (etat.evenementsPasses ?? []).filter((e) => e.id === ev.id).at(-1);
  if (dernier && etat.tour - dernier.tour < DELAI_REPETITION && !scenario) return false;
  return Object.entries(ev.conditions ?? {}).every(([ind, { min, max }]) => {
    const v = etat.indicateurs[ind];
    return (min == null || v >= min) && (max == null || v <= max);
  });
}

/** Tire (ou non) un événement pour le mois. Renvoie { evenementId|null, graine }. */
export function tirerEvenement(etat, evenements, graine, facteur = 1) {
  let [r, g] = aleatoire(graine);
  if (r >= PROBA_EVENEMENT * facteur) return { evenementId: null, graine: g };
  const possibles = evenements.filter((ev) => eligible(ev, etat));
  const total = possibles.reduce((s, ev) => s + (ev.poids ?? 1), 0);
  if (!total) return { evenementId: null, graine: g };
  [r, g] = aleatoire(g);
  let seuil = r * total;
  let choisi = possibles.at(-1);
  for (const ev of possibles) { seuil -= ev.poids ?? 1; if (seuil < 0) { choisi = ev; break; } }
  if (!choisi.region_cible) return { evenementId: choisi.id, graine: g };
  // Événement régional : une des 3 régions les plus fragiles sur l'indice concerné
  const fragiles = Object.entries(etat.territoires).sort((a, b) => a[1][choisi.region_cible.indice] - b[1][choisi.region_cible.indice]).slice(0, 3);
  [r, g] = aleatoire(g);
  return { evenementId: choisi.id, region: fragiles[Math.floor(r * fragiles.length)][0], graine: g };
}

/** Raison de refus d'un choix (capital ou enveloppe d'investissement insuffisants), ou null. */
export function raisonRefusChoix(etat, choix) {
  if (etat.joueur.capital < (choix.cout_capital ?? 0)) return 'Capital politique insuffisant.';
  if (choix.cout_md && (etat.finances?.enveloppe ?? 0) + 1e-9 < choix.cout_md) return `Enveloppe d’investissement insuffisante (${choix.cout_md} Md€).`;
  return null;
}

/** Le joueur répond à l'événement en cours. */
export function resoudreEvenement(etat, indexChoix, { evenements, regions }) {
  if (!etat.evenement) throw new Error('Aucun événement en cours.');
  const ev = evenements.find((e) => e.id === etat.evenement);
  const choix = ev?.choix?.[indexChoix];
  if (!choix) throw new Error('Choix invalide.');
  const refus = raisonRefusChoix(etat, choix);
  if (refus) throw new Error(refus);
  // Effets locaux immédiats (événement régional) : indices de la région et confiance de ses habitants
  const region = etat.evenementRegion;
  let territoires = etat.territoires, confianceRegions = etat.confianceRegions;
  const entrees = [];
  if (region && choix.effets_region?.length && territoires?.[region]) {
    territoires = { ...territoires, [region]: { ...territoires[region] } };
    confianceRegions = confianceRegions ? { ...confianceRegions } : confianceRegions;
    for (const { indice, valeur } of choix.effets_region) {
      const cible = indice === 'confiance' ? confianceRegions : territoires[region];
      if (!cible || cible[indice === 'confiance' ? region : indice] == null) continue;
      const cle = indice === 'confiance' ? region : indice;
      const avant = cible[cle];
      cible[cle] = Math.round(Math.min(100, Math.max(0, avant + valeur)) * 100) / 100;
      entrees.push({ tour: etat.tour, region, indicateur: indice, delta: Math.round((cible[cle] - avant) * 100) / 100, source: `evenement:${ev.id}`, type: 'evenement', nature: 'observe' });
    }
  }
  const finances = choix.cout_md && etat.finances ? { ...etat.finances, enveloppe: Math.round((etat.finances.enveloppe - choix.cout_md) * 1000) / 1000 } : etat.finances;
  return {
    ...etat,
    evenement: null,
    evenementRegion: null,
    territoires, confianceRegions, finances,
    explications: [...(etat.explications ?? []), ...entrees],
    joueur: { ...etat.joueur, capital: etat.joueur.capital - (choix.cout_capital ?? 0) },
    // Les effets démarrent dès le mois prochain (delaiMois 0 → mois suivant)
    effetsEnCours: [...etat.effetsEnCours, ...planifierEffets(choix.effets, etat.tour + 1, `evenement:${ev.id}`)],
    evenementsPasses: [...(etat.evenementsPasses ?? []), { id: ev.id, tour: etat.tour, choix: indexChoix }],
    journal: [...etat.journal, { tour: etat.tour, type: 'evenement', texte: `${ev.titre}${region ? ` (${regions?.regions?.find((r) => r.id === region)?.nom ?? region})` : ''} : ${choix.libelle}.` }],
  };
}
