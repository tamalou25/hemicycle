// Diplomatie (lot 3) : partenaires étrangers simulés (relation 0-100, intérêts, appartenances), accords avec contreparties
// et durée, sanctions, initiatives étrangères déterministes (propositions, tensions, demandes, crises), Union européenne.
// Les comportements sont des PARAMÈTRES DE SIMULATION (pays.json), jamais des affirmations sur des intentions réelles.
// Moteur pur : (état, données, tour, graine) → { etat, entrees, graine }. La diplomatie écrit la disponibilité des importations
// et les débouchés des exportations par partenaire (etat.economie.disponibilite / debouches), lus par l'économie au mois suivant.
import { aleatoire } from './rng.js';
import { planifierEffets } from './effects.js';
import { ecartIdeologique } from './parliament.js';
import { echangesAvec } from './economie.js';

const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000;
const borne = (v) => r1(Math.max(0, Math.min(100, v)));
export const DELAI_LEVEE_SANCTIONS = 6;

export function diplomatieInitiale(p) {
  if (!p?.pays) return null;
  return {
    relations: Object.fromEntries(p.pays.map((x) => [x.id, x.relation_initiale])),
    ue: { relation: p.ue?.relation_initiale ?? 60 },
    accords: [], sanctions: [], mesures: [], initiative: null, initiativesPassees: [], dernieresInitiatives: {},
  };
}

const paysDe = (p, id) => p?.pays?.find((x) => x.id === id);
export const accordActifAvec = (etat, id, type) => (etat.diplomatie?.accords ?? []).find((a) => a.pays === id && (!type || a.type === type));
export const sousSanctions = (etat, id) => (etat.diplomatie?.sanctions ?? []).some((s) => s.pays === id);

/** Cible vers laquelle la relation converge, avec ses facteurs explicables (présentation : fiche pays). */
export function relationCible(etat, id, { pays: p }) {
  const prm = p.parametres;
  if (id === 'ue') {
    const facteurs = [{ source: 'base', libelle: 'Relation de départ', valeur: p.ue?.relation_initiale ?? 60 }];
    const axe = (etat.joueur.ideologie?.europe ?? 0) / 100 * prm.ue_poids_axe_europe;
    if (axe) facteurs.push({ source: 'proximite', libelle: 'Votre position sur l’Europe', valeur: r1(axe) });
    const exces = (etat.indicateurs?.deficit ?? 0) - prm.ue_deficit_seuil;
    if (exces > 0) facteurs.push({ source: 'deficit', libelle: `Déficit au-dessus de ${prm.ue_deficit_seuil} % du PIB`, valeur: r1(-exces * prm.ue_deficit_par_point) });
    const n = (etat.diplomatie?.accords ?? []).filter((a) => paysDe(p, a.pays)?.ue).length;
    if (n) facteurs.push({ source: 'accords', libelle: 'Accords avec des États membres', valeur: n * 2 });
    const s = (etat.diplomatie?.sanctions ?? []).filter((x) => paysDe(p, x.pays)?.ue).length;
    if (s) facteurs.push({ source: 'sanctions', libelle: 'Sanctions contre des États membres', valeur: -s * 10 });
    return { valeur: borne(facteurs.reduce((t, f) => t + f.valeur, 0)), facteurs };
  }
  const x = paysDe(p, id);
  if (!x) return { valeur: 50, facteurs: [] };
  const facteurs = [{ source: 'base', libelle: 'Relation de départ', valeur: x.relation_initiale }];
  // Proximité : écart idéologique sur les axes que le partenaire suit (0 = identique, 200 = opposés)
  const axes = Object.keys(x.positions ?? {});
  if (axes.length) {
    const ecart = axes.reduce((s, a) => s + Math.abs((etat.joueur.ideologie?.[a] ?? 0) - x.positions[a]), 0) / axes.length;
    facteurs.push({ source: 'proximite', libelle: 'Proximité de vos positions', valeur: r1((50 - ecart) / 50 * 10) });
  }
  const acc = (etat.diplomatie?.accords ?? []).filter((a) => a.pays === id);
  if (acc.length) facteurs.push({ source: 'accords', libelle: `${acc.length} accord${acc.length > 1 ? 's' : ''} en vigueur`, valeur: acc.length * p.parametres.bonus_accord });
  if (sousSanctions(etat, id)) facteurs.push({ source: 'sanctions', libelle: 'Vos sanctions', valeur: -prm.malus_sanction });
  const subies = (etat.diplomatie?.mesures ?? []).filter((m) => m.pays === id && m.type === 'tension').length;
  if (subies) facteurs.push({ source: 'tension', libelle: 'Différend en cours', valeur: -5 });
  if (x.otan && etat.defense?.engagementOtan != null) facteurs.push({ source: 'otan', libelle: 'Vos engagements dans l’OTAN', valeur: r1((etat.defense.engagementOtan - 50) / 10) });
  return { valeur: borne(facteurs.reduce((t, f) => t + f.valeur, 0)), facteurs };
}

// ---------- Actions du joueur ----------
export function raisonRefusAccordPays(etat, id, type, { pays: p }) {
  if (etat.fin) return 'La partie est terminée.';
  if (!etat.diplomatie) return 'Diplomatie indisponible.';
  const x = paysDe(p, id), acc = p.accords.find((a) => a.id === type);
  if (!x || !acc) return 'Partenaire ou accord inconnu.';
  if (acc.otan_ou_ue && !x.otan && !x.ue) return 'Réservé aux partenaires de l’OTAN ou de l’Union européenne.';
  if (sousSanctions(etat, id)) return 'Levez d’abord vos sanctions contre ce pays.';
  if (accordActifAvec(etat, id, type)) return 'Accord déjà en vigueur avec ce pays.';
  if (etat.diploCeMois) return 'Vous avez déjà mené une action diplomatique ce mois-ci.';
  if (etat.joueur.capital < acc.cout_capital) return `Capital politique insuffisant (${acc.cout_capital} requis).`;
  const rel = etat.diplomatie.relations[id] ?? 50;
  if (rel < acc.relation_min) return `La relation (${Math.round(rel)}) est insuffisante : ${acc.relation_min} requis. Un refus coûterait ${Math.abs(p.parametres.relation_refus)} points.`;
  return null;
}

function creerAccord(etat, id, type, { pays: p, finances }, { tour = etat.tour } = {}) {
  const x = paysDe(p, id), acc = p.accords.find((a) => a.id === type);
  const pib = etat.budget?.pib ?? finances?.pib_md ?? 2900;
  const effets = [...(acc.effets ?? [])];
  if (acc.cout_annuel_md) effets.push({ indicateur: 'deficit', valeur: r3((acc.cout_annuel_md * (acc.duree_mois / 12) / pib) * 100), delaiMois: 0, duree: acc.duree_mois });
  return {
    ...etat,
    diplomatie: { ...etat.diplomatie, relations: { ...etat.diplomatie.relations, [id]: borne((etat.diplomatie.relations[id] ?? 50) + acc.relation) }, accords: [...etat.diplomatie.accords, { pays: id, type, debut: tour, fin: tour + acc.duree_mois }] },
    effetsEnCours: [...etat.effetsEnCours, ...planifierEffets(effets, tour + 1, `diplomatie:${type}:${id}`)],
    journal: [...etat.journal, { tour, type: 'diplomatie', texte: `${acc.titre} conclu avec ${x.nom} (${acc.duree_mois} mois${acc.cout_annuel_md ? `, ${String(acc.cout_annuel_md).replace('.', ',')} Md€/an` : ''}).` }],
  };
}

/** Propose un accord : accepté si la relation suffit (sinon refusé avec explication, et la relation en pâtit). */
export function proposerAccord(etat, id, type, donnees) {
  const refus = raisonRefusAccordPays(etat, id, type, donnees);
  if (refus) throw new Error(refus);
  const acc = donnees.pays.accords.find((a) => a.id === type);
  return { ...creerAccord(etat, id, type, donnees), diploCeMois: true, joueur: { ...etat.joueur, capital: etat.joueur.capital - acc.cout_capital } };
}

export function raisonRefusSanction(etat, id, { pays: p }) {
  if (etat.fin) return 'La partie est terminée.';
  if (!etat.diplomatie || !paysDe(p, id)) return 'Partenaire inconnu.';
  if (sousSanctions(etat, id)) return 'Sanctions déjà en vigueur.';
  if (etat.diploCeMois) return 'Vous avez déjà mené une action diplomatique ce mois-ci.';
  if (etat.joueur.capital < 1) return 'Capital politique insuffisant (1 requis).';
  return null;
}

/** Sanctions : relation en chute, échanges réduits (les deux sens) ; les accords avec ce pays tombent. */
export function sanctionner(etat, id, donnees) {
  const refus = raisonRefusSanction(etat, id, donnees);
  if (refus) throw new Error(refus);
  const x = paysDe(donnees.pays, id);
  const d = etat.diplomatie;
  return {
    ...etat, diploCeMois: true,
    joueur: { ...etat.joueur, capital: etat.joueur.capital - 1 },
    diplomatie: { ...d, relations: { ...d.relations, [id]: borne((d.relations[id] ?? 50) - donnees.pays.parametres.malus_sanction_subie) }, sanctions: [...d.sanctions, { pays: id, debut: etat.tour }], accords: d.accords.filter((a) => a.pays !== id) },
    journal: [...etat.journal, { tour: etat.tour, type: 'diplomatie', texte: `Sanctions contre ${x.nom} : échanges réduits de moitié dès le mois prochain, accords annulés (levée après ${DELAI_LEVEE_SANCTIONS} mois).` }],
  };
}

export function raisonRefusLevee(etat, id, { pays: p }) {
  const s = (etat.diplomatie?.sanctions ?? []).find((x) => x.pays === id);
  if (!s) return 'Aucune sanction en vigueur.';
  if (etat.tour - s.debut < DELAI_LEVEE_SANCTIONS) return `Levée possible après ${DELAI_LEVEE_SANCTIONS} mois (dans ${DELAI_LEVEE_SANCTIONS - (etat.tour - s.debut)} mois).`;
  if (etat.diploCeMois) return 'Vous avez déjà mené une action diplomatique ce mois-ci.';
  if (!paysDe(p, id)) return 'Partenaire inconnu.';
  return null;
}

export function leverSanctions(etat, id, donnees) {
  const refus = raisonRefusLevee(etat, id, donnees);
  if (refus) throw new Error(refus);
  const x = paysDe(donnees.pays, id);
  return { ...etat, diploCeMois: true, diplomatie: { ...etat.diplomatie, sanctions: etat.diplomatie.sanctions.filter((s) => s.pays !== id) }, journal: [...etat.journal, { tour: etat.tour, type: 'diplomatie', texte: `Sanctions contre ${x.nom} levées : les échanges reprennent le mois prochain.` }] };
}

// ---------- Initiatives étrangères ----------
const libelle = (txt, nom) => txt.replaceAll('{pays}', nom);

/** Initiative en cours, mise en forme (titre, texte, choix avec raison de refus), ou null. */
export function initiativeEnCours(etat, donnees) {
  const i = etat.diplomatie?.initiative;
  if (!i) return null;
  const def = donnees.pays.initiatives.find((x) => x.id === i.id);
  const x = i.pays === 'ue' ? { nom: donnees.pays.ue?.nom ?? 'Union européenne' } : paysDe(donnees.pays, i.pays);
  if (!def) return null;
  const choix = choixInitiative(def, donnees);
  return { id: i.id, pays: i.pays, type: def.type, nomPays: x?.nom ?? i.pays, titre: libelle(def.titre, x?.nom ?? i.pays), texte: libelle(def.texte, x?.nom ?? i.pays), defense: !!def.defense,
    choix: choix.map((c, k) => ({ ...c, raison: raisonRefusReponseInitiative(etat, k, donnees) })) };
}

function choixInitiative(def, { pays: p }) {
  if (def.type === 'proposition') {
    const acc = p.accords.find((a) => a.id === def.accord);
    return [{ libelle: `Accepter (${acc.titre}, ${acc.duree_mois} mois)`, cout_capital: 0, relation: acc.relation, accepter: true, effets: [] }, { libelle: 'Refuser poliment', cout_capital: 0, relation: p.parametres.relation_refus * 2, effets: [] }];
  }
  return def.choix ?? [];
}

export function raisonRefusReponseInitiative(etat, k, donnees) {
  const i = etat.diplomatie?.initiative;
  if (!i) return 'Aucune initiative en cours.';
  const def = donnees.pays.initiatives.find((x) => x.id === i.id);
  const c = def && choixInitiative(def, donnees)[k];
  if (!c) return 'Choix invalide.';
  if (etat.joueur.capital < (c.cout_capital ?? 0)) return `Capital politique insuffisant (${c.cout_capital} requis).`;
  if (c.cout_md && (etat.finances?.enveloppe ?? 0) + 1e-9 < c.cout_md) return `Enveloppe d’investissement insuffisante (${c.cout_md} Md€).`;
  if (c.disponibilite_min != null && (etat.defense?.disponibilite ?? 0) < c.disponibilite_min) return `Disponibilité des forces insuffisante (${Math.round(etat.defense?.disponibilite ?? 0)} ; ${c.disponibilite_min} requis).`;
  return null;
}

/** Réponse du joueur (ou réponse par défaut au passage du mois : dernier choix). */
export function repondreInitiative(etat, k, donnees, { parDefaut = false } = {}) {
  const refus = raisonRefusReponseInitiative(etat, k, donnees);
  if (refus) throw new Error(refus);
  const { pays: p } = donnees;
  const i = etat.diplomatie.initiative;
  const def = p.initiatives.find((x) => x.id === i.id);
  const c = choixInitiative(def, donnees)[k];
  const x = i.pays === 'ue' ? null : paysDe(p, i.pays);
  const nom = x?.nom ?? p.ue?.nom ?? 'Union européenne';
  let d = { ...etat.diplomatie, initiative: null, initiativesPassees: [...(etat.diplomatie.initiativesPassees ?? []), { id: i.id, pays: i.pays, tour: etat.tour, choix: k, parDefaut }] };
  let e = { ...etat, diplomatie: d, joueur: { ...etat.joueur, capital: etat.joueur.capital - (c.cout_capital ?? 0) } };
  if (c.cout_md && e.finances) e = { ...e, finances: { ...e.finances, enveloppe: r3(e.finances.enveloppe - c.cout_md) } };
  const relations = { ...d.relations };
  if (x && c.relation) relations[i.pays] = borne((relations[i.pays] ?? 50) + c.relation);
  if (c.autres) for (const y of p.pays) if (y.id !== i.pays) relations[y.id] = borne(relations[y.id] + c.autres);
  if (c.allies) for (const y of p.pays) if (y.id !== i.pays && (y.otan || y.ue)) relations[y.id] = borne(relations[y.id] + c.allies);
  d = { ...d, relations, ue: { ...d.ue, relation: borne(d.ue.relation + (c.ue ?? 0)) } };
  // Tension : la mesure s'applique sauf si le choix l'annule ; « saisir l'UE » la raccourcit
  if (def.type === 'tension' && !c.annule) {
    const duree = c.duree_mois ?? def.duree_mois ?? 12;
    d = { ...d, mesures: [...(d.mesures ?? []), { id: def.id, pays: i.pays, type: 'tension', debut: etat.tour, fin: etat.tour + duree, debouches: def.debouches ?? 0, disponibilite: r3((def.disponibilite ?? 0) * (c.amortir ? 1 - c.amortir : 1) + (c.disponibilite ?? 0)) }] };
  }
  e = { ...e, diplomatie: d };
  if (c.accepter) e = creerAccord(e, i.pays, def.accord, donnees);
  if (c.engagement && e.defense) e = { ...e, defense: { ...e.defense, engagements: [...(e.defense.engagements ?? []), { id: `${def.id}:${i.pays}`, type: c.engagement.type, pays: i.pays, debut: etat.tour, fin: etat.tour + c.engagement.duree_mois, coutAnnuelMd: c.engagement.cout_annuel_md, disponibilite: c.engagement.disponibilite }] } };
  const effets = [...(c.effets ?? [])];
  if (c.engagement?.cout_annuel_md) effets.push({ indicateur: 'deficit', valeur: r3((c.engagement.cout_annuel_md * (c.engagement.duree_mois / 12) / (etat.budget?.pib ?? 2900)) * 100), delaiMois: 0, duree: c.engagement.duree_mois });
  return {
    ...e,
    effetsEnCours: [...e.effetsEnCours, ...planifierEffets(effets, etat.tour + 1, `diplomatie:${def.id}:${i.pays}`)],
    journal: [...e.journal, { tour: etat.tour, type: 'diplomatie', texte: `${libelle(def.titre, nom)} : ${c.libelle}${parDefaut ? ' (réponse par défaut, faute de choix)' : ''}.` }],
  };
}

function eligibleInitiative(def, x, etat, { pays: p }) {
  const c = def.conditions ?? {};
  const rel = x ? etat.diplomatie.relations[x.id] : etat.diplomatie.ue.relation;
  if (c.relation_min != null && rel < c.relation_min) return false;
  if (c.relation_max != null && rel > c.relation_max) return false;
  if (c.interet && x && !(x.interets ?? []).includes(c.interet)) return false;
  if (c.sans_accord && x && accordActifAvec(etat, x.id, c.sans_accord)) return false;
  if (c.otan_ou_ue && x && !x.otan && !x.ue) return false;
  if (c.deficit_min != null && (etat.indicateurs.deficit ?? 0) < c.deficit_min) return false;
  if (x && sousSanctions(etat, x.id) && def.type !== 'tension') return false;
  const derniere = etat.diplomatie.dernieresInitiatives?.[x?.id ?? 'ue'];
  if (derniere != null && etat.tour - derniere < p.parametres.delai_initiative_pays) return false;
  const deja = (etat.diplomatie.initiativesPassees ?? []).filter((i) => i.id === def.id && i.pays === (x?.id ?? 'ue')).at(-1);
  if (deja && etat.tour - deja.tour < 18) return false;
  return true;
}

/** Tirage d'une initiative étrangère pour le mois (ou aucune). */
function tirerInitiative(etat, donnees, graine, facteur = 1) {
  const { pays: p } = donnees;
  let [r, g] = aleatoire(graine);
  if (r >= p.parametres.proba_initiative * facteur) return { initiative: null, graine: g };
  const candidats = [];
  for (const x of p.pays) for (const def of p.initiatives) if (def.type !== 'ue' && eligibleInitiative(def, x, etat, donnees)) candidats.push({ def, pays: x.id, poids: (def.poids ?? 1) * (x.poids ?? 1) });
  for (const def of p.initiatives) if (def.type === 'ue' && eligibleInitiative(def, null, etat, donnees)) candidats.push({ def, pays: 'ue', poids: (def.poids ?? 1) * 2 });
  const total = candidats.reduce((s, c) => s + c.poids, 0);
  if (!total) return { initiative: null, graine: g };
  [r, g] = aleatoire(g);
  let seuil = r * total, choisi = candidats.at(-1);
  for (const c of candidats) { seuil -= c.poids; if (seuil < 0) { choisi = c; break; } }
  return { initiative: { id: choisi.def.id, pays: choisi.pays, tour: etat.tour }, graine: g };
}

// ---------- Évolution mensuelle ----------
/**
 * 1. Initiative ignorée → réponse par défaut. 2. Échéances (accords, mesures). 3. Convergence des relations.
 * 4. Modificateurs commerciaux écrits dans l'économie. 5. Nouvelle initiative éventuelle (tirage à la graine).
 */
export function evoluerDiplomatie(etatInitial, donnees, tour, graine, facteurInitiatives = 1) {
  const { pays: p } = donnees;
  if (!etatInitial.diplomatie || !p) return { etat: etatInitial, entrees: [], graine };
  let etat = etatInitial;
  const enAttente = !!etat.diplomatie.initiative; // pas deux initiatives coup sur coup : celle qui vient d'être tranchée laisse un mois de répit
  if (etat.diplomatie.initiative) {
    const def = p.initiatives.find((x) => x.id === etat.diplomatie.initiative.id);
    const n = def ? choixInitiative(def, donnees).length : 0;
    etat = n ? repondreInitiative(etat, n - 1, donnees, { parDefaut: true }) : { ...etat, diplomatie: { ...etat.diplomatie, initiative: null } };
  }
  const entrees = [];
  const journal = [...etat.journal];
  let d = { ...etat.diplomatie };
  // Échéances
  const accords = [];
  for (const a of d.accords) {
    if (a.fin <= tour) { const acc = p.accords.find((z) => z.id === a.type); journal.push({ tour, type: 'diplomatie', texte: `${acc?.titre ?? a.type} avec ${paysDe(p, a.pays)?.nom ?? a.pays} arrive à son terme.` }); }
    else accords.push(a);
  }
  const mesures = (d.mesures ?? []).filter((m) => { if (m.fin <= tour) { journal.push({ tour, type: 'diplomatie', texte: `Le différend avec ${paysDe(p, m.pays)?.nom ?? m.pays} prend fin : les échanges reprennent.` }); return false; } return true; });
  d = { ...d, accords, mesures };
  // Convergence des relations vers leur cible (explicable)
  const relations = {};
  const base = { ...etat, diplomatie: d };
  for (const x of p.pays) {
    const avant = d.relations[x.id] ?? x.relation_initiale;
    const cible = relationCible(base, x.id, donnees).valeur;
    relations[x.id] = borne(avant + (cible - avant) * p.parametres.convergence_mensuelle);
    const delta = r1(relations[x.id] - avant);
    if (Math.abs(delta) >= 0.3) entrees.push({ tour, indicateur: `pays:${x.id}`, pays: x.id, delta, source: 'convergence', type: 'diplomatie', nature: 'observe' });
  }
  const cibleUe = relationCible(base, 'ue', donnees).valeur;
  const ue = { relation: borne(d.ue.relation + (cibleUe - d.ue.relation) * p.parametres.convergence_mensuelle) };
  d = { ...d, relations, ue };
  // Modificateurs commerciaux pour l'économie (lus au mois suivant par evoluerEconomie)
  let economie = etat.economie;
  if (economie) {
    const disponibilite = {}, debouches = {};
    const ajouter = (o, id, v) => { o[id] = r3((o[id] ?? 1) + v); };
    for (const a of d.accords) { const acc = p.accords.find((z) => z.id === a.type); if (!acc) continue; if (acc.disponibilite) ajouter(disponibilite, a.pays, acc.disponibilite); if (acc.debouches) ajouter(debouches, a.pays, acc.debouches); }
    for (const s of d.sanctions) { ajouter(disponibilite, s.pays, -p.parametres.effet_sanction_echanges); ajouter(debouches, s.pays, -p.parametres.effet_sanction_echanges); }
    for (const m of d.mesures) { if (m.disponibilite) ajouter(disponibilite, m.pays, m.disponibilite); if (m.debouches) ajouter(debouches, m.pays, m.debouches); }
    for (const o of [disponibilite, debouches]) for (const k of Object.keys(o)) o[k] = r3(Math.max(0, Math.min(1.5, o[k])));
    economie = { ...economie, disponibilite, debouches };
  }
  // Nouvelle initiative (au plus une en attente)
  const t = enAttente ? { initiative: null, graine } : tirerInitiative({ ...etat, tour, diplomatie: d }, donnees, graine, facteurInitiatives);
  if (t.initiative) d = { ...d, initiative: t.initiative, dernieresInitiatives: { ...(d.dernieresInitiatives ?? {}), [t.initiative.pays]: tour } };
  return { etat: { ...etat, diplomatie: d, economie, journal }, entrees, graine: t.graine };
}

/** Fiche d'un partenaire : relation, cible expliquée, appartenances, échanges, accords, mesures, actions possibles. */
export function fichePays(etat, id, donnees) {
  const { pays: p } = donnees;
  const x = paysDe(p, id);
  if (!x || !etat.diplomatie) return null;
  const actions = p.accords.map((a) => ({ id: `accord:${a.id}`, titre: a.titre, description: a.description, cout: { capital: a.cout_capital, mdAn: a.cout_annuel_md }, duree: a.duree_mois, relationMin: a.relation_min, contrepartie: a.contrepartie, raison: raisonRefusAccordPays(etat, id, a.id, donnees), action: { type: 'accord', pays: id, accord: a.id } }));
  if (sousSanctions(etat, id)) actions.push({ id: 'levee', titre: 'Lever les sanctions', description: 'Les échanges reprennent le mois suivant.', cout: {}, raison: raisonRefusLevee(etat, id, donnees), action: { type: 'lever-sanctions', pays: id } });
  else actions.push({ id: 'sanction', titre: 'Sanctions économiques', description: `Échanges réduits de ${Math.round(p.parametres.effet_sanction_echanges * 100)} % dans les deux sens, relation −${p.parametres.malus_sanction_subie} puis dégradée, accords annulés.`, cout: { capital: 1 }, raison: raisonRefusSanction(etat, id, donnees), action: { type: 'sanction', pays: id } });
  return {
    id, nom: x.nom, ue: !!x.ue, otan: !!x.otan, poids: x.poids, interets: x.interets ?? [],
    relation: etat.diplomatie.relations[id] ?? x.relation_initiale, cible: relationCible(etat, id, donnees),
    echanges: echangesAvec(etat, id, donnees),
    accords: (etat.diplomatie.accords ?? []).filter((a) => a.pays === id).map((a) => ({ ...a, titre: p.accords.find((z) => z.id === a.type)?.titre ?? a.type })),
    sanctions: sousSanctions(etat, id), mesures: (etat.diplomatie.mesures ?? []).filter((m) => m.pays === id),
    actions,
  };
}

/** Résumé des partenaires (carte, tableau) : relation et état. */
export function resumePartenaires(etat, { pays: p }) {
  if (!etat.diplomatie || !p) return [];
  return p.pays.map((x) => ({ id: x.id, nom: x.nom, relation: etat.diplomatie.relations[x.id] ?? x.relation_initiale, ue: !!x.ue, otan: !!x.otan, accords: (etat.diplomatie.accords ?? []).filter((a) => a.pays === x.id).length, sanctions: sousSanctions(etat, x.id), tension: (etat.diplomatie.mesures ?? []).some((m) => m.pays === x.id) }));
}
