// Secteurs (E4) : six niveaux 0-100 et des programmes nationaux.
// Un programme a un coût annuel (Md€ → déficit), un délai, une montée en charge du niveau du secteur,
// d'éventuels effets nationaux différés, des prérequis et une contrepartie affichée.
// La défense ne couvre que les moyens et la préparation (aucune opération).
import { planifierEffets } from './effects.js';
import { reagir } from './relations.js';

const r2 = (v) => Math.round(v * 100) / 100;
const borne = (v) => r2(Math.min(100, Math.max(0, v)));
export const EROSION_SECTEURS = 0.05; // usure mensuelle d'un secteur non entretenu

export const secteursInitiaux = (pol) => (pol ? { ...pol.niveaux_initiaux } : null);

export function raisonRefusPolitique(etat, politique, pol) {
  if (etat.fin) return 'La partie est terminée.';
  if (!politique) return 'Programme inconnu.';
  if (!etat.secteurs) return 'Secteurs indisponibles.';
  if (etat.joueur.role !== 'premier_ministre') return 'Les programmes nationaux relèvent du gouvernement.';
  if ((etat.politiques ?? []).some((p) => p.id === politique.id)) return 'Programme déjà engagé.';
  for (const req of politique.prerequis ?? []) {
    const p = (etat.politiques ?? []).find((x) => x.id === req);
    const nom = pol.politiques.find((x) => x.id === req)?.titre ?? req;
    if (!p || p.statut !== 'en_oeuvre') return `Prérequis : « ${nom} » doit être en œuvre.`;
  }
  for (const [s, min] of Object.entries(politique.niveau_min ?? {})) {
    if ((etat.secteurs[s] ?? 0) < min) return `Prérequis : niveau ${pol.secteurs[s]?.nom ?? s} ≥ ${min} (actuel ${Math.round(etat.secteurs[s])}).`;
  }
  if (etat.joueur.capital < 1) return 'Capital politique insuffisant (1 requis).';
  return null;
}

/** Engage un programme : coût annuel ajouté au déficit, effets nationaux programmés, montée du niveau après le délai. */
export function engagerPolitique(etat, id, { politiques: pol, finances, partis }) {
  const p = pol.politiques.find((x) => x.id === id);
  const refus = raisonRefusPolitique(etat, p, pol);
  if (refus) throw new Error(refus);
  const pib = etat.budget?.pib ?? finances?.pib_md ?? 2900;
  const effets = [{ indicateur: 'deficit', valeur: r2((p.cout_annuel_md / pib) * 100 * 1000) / 1000, delaiMois: 0, duree: 1 }, ...p.effets];
  const poste = pol.secteurs[p.secteur]?.poste_budget;
  const budget = etat.budget && poste ? { ...etat.budget, depenses: { ...etat.budget.depenses, [poste]: r2((etat.budget.depenses[poste] ?? 0) + p.cout_annuel_md) } } : etat.budget;
  const rx = p.theme ? reagir(etat, partis, { theme: p.theme, orientation: p.orientation, source: `politique:${id}`, libelle: p.titre }) : { relations: etat.relations, entrees: [] };
  return {
    ...etat, budget, relations: rx.relations,
    explications: [...(etat.explications ?? []), ...rx.entrees],
    joueur: { ...etat.joueur, capital: etat.joueur.capital - 1 },
    politiques: [...(etat.politiques ?? []), { id, debut: etat.tour, enService: etat.tour + p.delai_mois, statut: 'preparation' }],
    effetsEnCours: [...etat.effetsEnCours, ...planifierEffets(effets, etat.tour + 1, `politique:${id}`)],
    journal: [...etat.journal, { tour: etat.tour, type: 'politique', texte: `Programme engagé : ${p.titre} (${p.cout_annuel_md} Md€/an). Premiers effets dans ${p.delai_mois} mois.` }],
  };
}

/** Évolution mensuelle des niveaux : usure, puis montée en charge des programmes en œuvre. */
export function evoluerSecteurs(etat, { politiques: pol }, tour) {
  if (!etat.secteurs || !pol) return { etat, entrees: [] };
  const niveaux = Object.fromEntries(Object.entries(etat.secteurs).map(([s, v]) => [s, borne(v - EROSION_SECTEURS)]));
  const entrees = Object.keys(niveaux).map((s) => ({ tour, secteur: s, indicateur: `secteur:${s}`, delta: r2(niveaux[s] - etat.secteurs[s]), source: 'usure', type: 'usure', nature: 'observe' })).filter((e) => e.delta);
  const journal = [...etat.journal];
  const liste = (etat.politiques ?? []).map((x) => {
    const p = pol.politiques.find((y) => y.id === x.id);
    if (!p) return x;
    const mois = tour - x.enService + 1;
    let statut = x.statut;
    if (mois === 1) { statut = 'montee'; journal.push({ tour, type: 'politique', texte: `${p.titre} : premiers effets.` }); }
    if (mois >= 1 && mois <= p.montee_mois) {
      const d = p.niveau / p.montee_mois;
      const avant = niveaux[p.secteur]; niveaux[p.secteur] = borne(avant + d);
      entrees.push({ tour, secteur: p.secteur, indicateur: `secteur:${p.secteur}`, delta: r2(niveaux[p.secteur] - avant), source: `politique:${p.id}`, type: 'politique', nature: 'observe', depuis: mois, duree: p.montee_mois });
      if (mois === p.montee_mois) statut = 'en_oeuvre';
    }
    return { ...x, statut };
  });
  return { etat: { ...etat, secteurs: niveaux, politiques: liste, journal }, entrees };
}
