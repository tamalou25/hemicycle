// Événements mensuels : tirage pondéré selon les conditions, résolution par un choix du joueur.
import { aleatoire } from './rng.js';
import { planifierEffets } from './effects.js';

/** Probabilité qu'un événement survienne un mois donné. */
export const PROBA_EVENEMENT = 0.35;
/** Délai minimal avant qu'un même événement revienne. */
export const DELAI_REPETITION = 12;

/** L'événement est-il possible dans l'état courant ? */
export function eligible(ev, etat) {
  if (ev.role === 'premier_ministre' && etat.joueur.role !== 'premier_ministre') return false;
  const dernier = (etat.evenementsPasses ?? []).filter((e) => e.id === ev.id).at(-1);
  if (dernier && etat.tour - dernier.tour < DELAI_REPETITION) return false;
  return Object.entries(ev.conditions ?? {}).every(([ind, { min, max }]) => {
    const v = etat.indicateurs[ind];
    return (min == null || v >= min) && (max == null || v <= max);
  });
}

/** Tire (ou non) un événement pour le mois. Renvoie { evenementId|null, graine }. */
export function tirerEvenement(etat, evenements, graine) {
  let [r, g] = aleatoire(graine);
  if (r >= PROBA_EVENEMENT) return { evenementId: null, graine: g };
  const possibles = evenements.filter((ev) => eligible(ev, etat));
  const total = possibles.reduce((s, ev) => s + (ev.poids ?? 1), 0);
  if (!total) return { evenementId: null, graine: g };
  [r, g] = aleatoire(g);
  let seuil = r * total;
  for (const ev of possibles) { seuil -= ev.poids ?? 1; if (seuil < 0) return { evenementId: ev.id, graine: g }; }
  return { evenementId: possibles.at(-1).id, graine: g };
}

/** Le joueur répond à l'événement en cours. */
export function resoudreEvenement(etat, indexChoix, { evenements }) {
  if (!etat.evenement) throw new Error('Aucun événement en cours.');
  const ev = evenements.find((e) => e.id === etat.evenement);
  const choix = ev?.choix?.[indexChoix];
  if (!choix) throw new Error('Choix invalide.');
  if (etat.joueur.capital < (choix.cout_capital ?? 0)) throw new Error('Capital politique insuffisant.');
  return {
    ...etat,
    evenement: null,
    joueur: { ...etat.joueur, capital: etat.joueur.capital - (choix.cout_capital ?? 0) },
    // Les effets démarrent dès le mois prochain (delaiMois 0 → mois suivant)
    effetsEnCours: [...etat.effetsEnCours, ...planifierEffets(choix.effets, etat.tour + 1, `evenement:${ev.id}`)],
    evenementsPasses: [...(etat.evenementsPasses ?? []), { id: ev.id, tour: etat.tour, choix: indexChoix }],
    journal: [...etat.journal, { tour: etat.tour, type: 'evenement', texte: `${ev.titre} : ${choix.libelle}.` }],
  };
}
