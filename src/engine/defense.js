// Défense stratégique (lot 4) : équipement (0-100, nourri par le budget et les programmes, usé par le temps), préparation
// (= secteur « Défense (préparation) » des programmes nationaux existants), disponibilité des forces (combinaison, moins les
// engagements en cours), engagement dans l'OTAN (0-100, suit l'effort budgétaire, les accords et les engagements), programmes à
// coût, délai et entretien, engagements temporaires. Niveau stratégique seulement : aucune opération détaillée.
// Moteur pur : (état, données, tour) → { etat, entrees }. Les crises (initiatives diplomatiques) lisent etat.defense.disponibilite.
import { planifierEffets } from './effects.js';
import { gouverne } from './presidence.js';

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;
const borne = (v) => r2(Math.max(0, Math.min(100, v)));
export const DUREE_ENTRETIEN_DEFENSE = 120;

export function defenseInitiale(d) {
  if (!d?.initial) return null;
  return { equipement: d.initial.equipement, engagementOtan: d.initial.engagementOtan, disponibilite: 0, programmes: [], engagements: [] };
}

/** Disponibilité des forces, avec ses facteurs explicables. */
export function disponibiliteForces(etat, d) {
  const df = etat.defense;
  if (!df || !d) return { valeur: 0, facteurs: [] };
  const prm = d.parametres;
  const preparation = etat.secteurs?.defense ?? 50;
  const facteurs = [
    { source: 'equipement', libelle: 'Équipement en état', valeur: r1(df.equipement * prm.poids_equipement) },
    { source: 'preparation', libelle: 'Préparation (secteur Défense)', valeur: r1(preparation * prm.poids_preparation) },
  ];
  for (const e of df.engagements ?? []) facteurs.push({ source: `engagement:${e.id}`, libelle: `Engagement en cours (${e.type === 'operation' ? 'opération' : 'mission'})`, valeur: r1(e.disponibilite ?? 0) });
  return { valeur: borne(facteurs.reduce((s, f) => s + f.valeur, 0)), facteurs };
}

export function raisonRefusProgrammeDefense(etat, prog, d) {
  if (etat.fin) return 'La partie est terminée.';
  if (!prog) return 'Programme inconnu.';
  if (!etat.defense || !d) return 'Défense indisponible.';
  if (!gouverne(etat)) return 'Les programmes de défense relèvent du gouvernement.';
  if ((etat.defense.programmes ?? []).some((x) => x.id === prog.id)) return 'Programme déjà lancé.';
  if (etat.joueur.capital < 1) return 'Capital politique insuffisant (1 requis).';
  return null;
}

export const coutAnnuelProgramme = (p) => r2(p.cout_total_md / Math.max(1, p.delai_mois / 12));

/** Lance un programme : 1 capital, coût du chantier puis entretien au déficit et au poste « défense et sécurité ». */
export function lancerProgrammeDefense(etat, id, { defense: d, finances }) {
  const prog = d?.programmes?.find((p) => p.id === id);
  const refus = raisonRefusProgrammeDefense(etat, prog, d);
  if (refus) throw new Error(refus);
  const pib = etat.budget?.pib ?? finances?.pib_md ?? 2900;
  const effets = [
    { indicateur: 'deficit', valeur: r3((prog.cout_total_md / pib) * 100), delaiMois: 0, duree: prog.delai_mois },
    { indicateur: 'deficit', valeur: r3(((prog.entretien_md ?? 0) * (DUREE_ENTRETIEN_DEFENSE / 12) / pib) * 100), delaiMois: prog.delai_mois, duree: DUREE_ENTRETIEN_DEFENSE },
  ].filter((e) => e.valeur);
  const budget = etat.budget ? { ...etat.budget, depenses: { ...etat.budget.depenses, defense_securite: r2((etat.budget.depenses.defense_securite ?? 0) + coutAnnuelProgramme(prog)) } } : etat.budget;
  return {
    ...etat, budget,
    joueur: { ...etat.joueur, capital: etat.joueur.capital - 1 },
    defense: { ...etat.defense, programmes: [...(etat.defense.programmes ?? []), { id, debut: etat.tour, enService: etat.tour + prog.delai_mois, statut: 'chantier' }] },
    effetsEnCours: [...etat.effetsEnCours, ...planifierEffets(effets, etat.tour + 1, `defense:${id}`)],
    journal: [...etat.journal, { tour: etat.tour, type: 'defense', texte: `Programme de défense lancé : ${prog.titre} (${prog.cout_total_md} Md€ sur ${prog.delai_mois} mois, puis ${prog.entretien_md ?? 0} Md€/an). Livraisons à partir du mois ${etat.tour + prog.delai_mois}.` }],
  };
}

export function raisonRefusEngagement(etat, eng, d) {
  if (etat.fin) return 'La partie est terminée.';
  if (!eng) return 'Engagement inconnu.';
  if (!etat.defense || !d) return 'Défense indisponible.';
  if ((etat.defense.engagements ?? []).some((x) => x.id === eng.id)) return 'Engagement déjà en cours.';
  if (etat.joueur.capital < 1) return 'Capital politique insuffisant (1 requis).';
  const dispo = disponibiliteForces(etat, d).valeur;
  if (dispo + (eng.disponibilite ?? 0) < d.parametres.seuil_disponibilite_critique) return `Disponibilité des forces insuffisante (${Math.round(dispo)} ; l’engagement la ferait passer sous ${d.parametres.seuil_disponibilite_critique}).`;
  return null;
}

/** Engage des forces (exercice, mission) : capital, coût au déficit, moyens immobilisés, alliés rassurés. */
export function engagerForces(etat, id, { defense: d, pays: p, finances }) {
  const eng = d?.engagements?.find((x) => x.id === id);
  const refus = raisonRefusEngagement(etat, eng, d);
  if (refus) throw new Error(refus);
  const pib = etat.budget?.pib ?? finances?.pib_md ?? 2900;
  const effets = eng.cout_annuel_md ? [{ indicateur: 'deficit', valeur: r3((eng.cout_annuel_md * (eng.duree_mois / 12) / pib) * 100), delaiMois: 0, duree: eng.duree_mois }] : [];
  let diplomatie = etat.diplomatie;
  if (diplomatie && p && eng.relation_allies) {
    const relations = { ...diplomatie.relations };
    for (const x of p.pays) if (x.otan || x.ue) relations[x.id] = borne((relations[x.id] ?? 50) + eng.relation_allies);
    diplomatie = { ...diplomatie, relations, ue: { ...diplomatie.ue, relation: borne(diplomatie.ue.relation + (eng.ue ?? 0)) } };
  }
  const defense = { ...etat.defense, engagementOtan: borne(etat.defense.engagementOtan + (eng.otan ?? 0)), engagements: [...(etat.defense.engagements ?? []), { id, type: eng.id === 'mission-europeenne' ? 'mission' : 'exercice', pays: null, debut: etat.tour, fin: etat.tour + eng.duree_mois, coutAnnuelMd: eng.cout_annuel_md ?? 0, disponibilite: eng.disponibilite ?? 0 }] };
  const e = { ...etat, diplomatie, defense: { ...defense, disponibilite: disponibiliteForces({ ...etat, defense }, d).valeur } };
  return {
    ...e,
    joueur: { ...etat.joueur, capital: etat.joueur.capital - 1 },
    effetsEnCours: [...etat.effetsEnCours, ...planifierEffets(effets, etat.tour + 1, `defense:${id}`)],
    journal: [...etat.journal, { tour: etat.tour, type: 'defense', texte: `${eng.titre} : ${eng.duree_mois} mois, ${eng.cout_annuel_md} Md€/an, disponibilité ${eng.disponibilite}. ${eng.contrepartie}` }],
  };
}

/**
 * Évolution mensuelle : usure, effet de l'écart budgétaire défense, programmes (livraisons), échéance des engagements,
 * engagement OTAN (effort budgétaire ≥ cible, accords de défense), disponibilité recalculée.
 */
export function evoluerDefense(etat, { defense: d, pays: p }, tour, usure = 1) {
  const df = etat.defense;
  if (!df || !d) return { etat, entrees: [] };
  const prm = d.parametres;
  const entrees = [];
  const journal = [...etat.journal];
  let equipement = df.equipement - prm.usure_equipement * usure;
  entrees.push({ tour, indicateur: 'defense:equipement', delta: -prm.usure_equipement * usure, source: 'usure', type: 'usure', nature: 'observe' });
  const ecart = etat.budget?.ecarts?.defense_securite ?? 0;
  if (ecart) { const dlt = r2(ecart * prm.equipement_par_md_ecart); equipement += dlt; entrees.push({ tour, indicateur: 'defense:equipement', delta: dlt, source: 'budget', type: 'budget', nature: 'observe' }); }
  let secteurs = etat.secteurs;
  let budget = etat.budget;
  const programmes = (df.programmes ?? []).map((x) => {
    const prog = d.programmes.find((y) => y.id === x.id);
    if (!prog || x.statut === 'service') return x;
    const mois = tour - x.enService + 1;
    if (mois < 1) return x;
    const montee = Math.max(1, prog.montee_mois ?? 1);
    if (mois <= montee) {
      const dq = r2((prog.gain_equipement ?? 0) / montee);
      if (dq) { equipement += dq; entrees.push({ tour, indicateur: 'defense:equipement', delta: dq, source: `defense:${prog.id}`, type: 'defense', nature: 'observe', depuis: mois, duree: montee }); }
      const dp = r2((prog.gain_preparation ?? 0) / montee);
      if (dp && secteurs?.defense != null) { secteurs = { ...secteurs, defense: Math.min(100, r2(secteurs.defense + dp)) }; entrees.push({ tour, secteur: 'defense', indicateur: 'secteur:defense', delta: dp, source: `defense:${prog.id}`, type: 'defense', nature: 'observe', depuis: mois, duree: montee }); }
      if (mois === 1) {
        journal.push({ tour, type: 'defense', texte: `${prog.titre} : premières livraisons, montée en charge sur ${montee} mois.` });
        if (budget) budget = { ...budget, depenses: { ...budget.depenses, defense_securite: r2((budget.depenses.defense_securite ?? 0) - coutAnnuelProgramme(prog) + (prog.entretien_md ?? 0)) } };
      }
    }
    return mois >= montee ? { ...x, statut: 'service' } : { ...x, statut: 'montee' };
  });
  const engagements = (df.engagements ?? []).filter((e) => { if (e.fin <= tour) { journal.push({ tour, type: 'defense', texte: `Engagement « ${e.id.split(':')[0].replaceAll('-', ' ')} » prend fin : les moyens redeviennent disponibles.` }); return false; } return true; });
  // Engagement OTAN : effort budgétaire (part du PIB du poste défense et sécurité au-dessus de la cible), accords de défense, programmes
  const pib = etat.budget?.pib ?? 2900;
  const part = ((etat.budget?.depenses?.defense_securite ?? 0) * prm.part_defense_du_poste / pib) * 100; // la part défense du poste « défense et sécurité »
  let otan = df.engagementOtan + (part >= prm.part_pib_cible || ecart > 0 ? prm.otan_derive_budget : prm.otan_derive_sans_budget); // effort reconnu : part atteinte, ou hausse budgétaire engagée
  otan += (etat.diplomatie?.accords ?? []).filter((a) => a.type === 'defense').length * prm.otan_par_accord_defense;
  for (const x of programmes) { const prog = d.programmes.find((y) => y.id === x.id); if (prog?.otan && x.statut !== 'chantier' && tour - x.enService < 1) otan += prog.otan; }
  const defense = { ...df, equipement: borne(equipement), engagementOtan: borne(otan), programmes, engagements };
  const base = { ...etat, secteurs, budget, defense };
  const dispo = disponibiliteForces(base, d).valeur;
  return { etat: { ...base, journal, defense: { ...defense, disponibilite: dispo } }, entrees: entrees.map((e) => ({ ...e, delta: r2(e.delta) })).filter((e) => e.delta) };
}

/** Bilan lisible : disponibilité expliquée, alerte, part du PIB, programmes et engagements avec dates. */
export function bilanDefense(etat, { defense: d }) {
  if (!etat.defense || !d) return null;
  const disponibilite = disponibiliteForces(etat, d);
  const pib = etat.budget?.pib ?? 2900;
  return {
    equipement: etat.defense.equipement, preparation: etat.secteurs?.defense ?? null, engagementOtan: etat.defense.engagementOtan,
    disponibilite, alerte: disponibilite.valeur < d.parametres.seuil_disponibilite_critique, seuil: d.parametres.seuil_disponibilite_critique,
    partPib: r2(((etat.budget?.depenses?.defense_securite ?? 0) * d.parametres.part_defense_du_poste / pib) * 100), cible: d.parametres.part_pib_cible,
    programmes: (etat.defense.programmes ?? []).map((x) => ({ ...x, titre: d.programmes.find((p) => p.id === x.id)?.titre ?? x.id })),
    engagements: etat.defense.engagements ?? [],
  };
}
