// Économie (lot 2) : quatre filières (énergie, agriculture, industrie, services) avec capacité, production et demande
// (indices, 100 = 2025), dépendances entre filières, importations et exportations en Md€/an par partenaire,
// investissements à coût, délai et entretien. Moteur pur : (état, données, tour) → nouvel état + explications.
// Ordre mensuel (ADR 0003) : usure → chantiers → demande → production filière par filière (énergie d'abord) → commerce → effets.
// Aucun double compte : le coût d'un investissement passe par le déficit (effet planifié) et le poste budgétaire ; la
// production agit sur la croissance et l'emploi ; le solde commercial est affiché, pas compté une seconde fois.
import { planifierEffets } from './effects.js';
import { gouverne } from './presidence.js';

const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;
export const ORDRE_FILIERES = ['energie', 'agriculture', 'industrie', 'services'];
export const DUREE_ENTRETIEN = 120;
export const MARGE_IMPORTATIONS = 0.08; // hausse maximale des importations disponibles en cas de manque (équilibrage)
export const SUBSTITUTION_MAX = 0.5;    // part des importations qu'une capacité domestique supplémentaire peut remplacer (équilibrage) // mois d'entretien planifiés après la mise en service (au-delà du mandat)

/** État économique initial d'après economie.json. */
export function economieInitiale(eco) {
  if (!eco?.filieres) return null;
  const filieres = Object.fromEntries(ORDRE_FILIERES.filter((f) => eco.filieres[f]).map((f) => [f, {
    capacite: eco.filieres[f].capacite_initiale, production: 100, demande: eco.filieres[f].demande_initiale ?? 100,
    dependances: { ...(eco.dependances?.[f] ?? {}) }, amortissement: 0,
  }]));
  const importations = Object.fromEntries(ORDRE_FILIERES.map((f) => [f, eco.commerce.filieres[f].importations_md]));
  const exportations = Object.fromEntries(ORDRE_FILIERES.map((f) => [f, eco.commerce.filieres[f].exportations_md]));
  return {
    mois: 0, filieres, investissements: [], disponibilite: {}, debouches: {},
    commerce: { importations, exportations, solde: r2(somme(exportations) - somme(importations)) },
    penuries: Object.fromEntries(ORDRE_FILIERES.map((f) => [f, 0])), couverture: Object.fromEntries(ORDRE_FILIERES.map((f) => [f, 1])),
  };
}

const somme = (o) => Object.values(o ?? {}).reduce((s, v) => s + v, 0);

/** Besoin intérieur de base (Md€/an) : production + importations − exportations. */
const besoinBase = (eco, f) => eco.filieres[f].production_md + eco.commerce.filieres[f].importations_md - eco.commerce.filieres[f].exportations_md;

/** Dépendance nette : part du besoin intérieur couverte par les importations non compensées par des exportations (0..1). */
export function dependanceFiliere(etat, f, eco) {
  const imp = etat.economie?.commerce?.importations?.[f] ?? eco.commerce.filieres[f].importations_md;
  const exp = etat.economie?.commerce?.exportations?.[f] ?? eco.commerce.filieres[f].exportations_md;
  const demande = (etat.economie?.filieres?.[f]?.demande ?? 100) / 100;
  return r3(Math.max(0, imp - exp) / (besoinBase(eco, f) * demande));
}

/** Facteur moyen d'accès (importations : disponibilité, exportations : débouchés) pondéré par les parts des partenaires ; le reste du monde vaut 1. */
function facteurPartenaires(eco, f, facteurs, cle) {
  let total = 0, couvert = 0;
  for (const p of eco.commerce.partenaires) {
    const part = p[cle]?.[f] ?? 0;
    if (!part) continue;
    couvert += part; total += part * Math.max(0, Math.min(1.5, facteurs?.[p.id] ?? 1));
  }
  return total + Math.max(0, 1 - couvert);
}

export function raisonRefusInvestissement(etat, inv, eco) {
  if (etat.fin) return 'La partie est terminée.';
  if (!inv) return 'Investissement inconnu.';
  if (!etat.economie || !eco) return 'Économie indisponible.';
  if (!gouverne(etat)) return 'Les investissements nationaux relèvent du gouvernement.';
  if ((etat.economie.investissements ?? []).some((x) => x.id === inv.id)) return 'Investissement déjà lancé.';
  if (etat.joueur.capital < 1) return 'Capital politique insuffisant (1 requis).';
  return null;
}

/** Coût annuel pendant le chantier (Md€/an). */
export const coutAnnuelChantier = (inv) => r2(inv.cout_total_md / Math.max(1, inv.delai_mois / 12));

/** Lance un investissement : 1 capital, coût du chantier puis entretien inscrits au déficit et au poste budgétaire. */
export function lancerInvestissement(etat, id, { economie: eco, finances }) {
  const inv = eco?.investissements?.find((x) => x.id === id);
  const refus = raisonRefusInvestissement(etat, inv, eco);
  if (refus) throw new Error(refus);
  const pib = etat.budget?.pib ?? finances?.pib_md ?? 2900;
  const poste = eco.filieres[inv.filiere]?.poste_budget ?? 'infrastructures_environnement';
  const annuel = coutAnnuelChantier(inv);
  const effets = [
    { indicateur: 'deficit', valeur: r3((inv.cout_total_md / pib) * 100), delaiMois: 0, duree: inv.delai_mois },
    { indicateur: 'deficit', valeur: r3(((inv.entretien_md ?? 0) * (DUREE_ENTRETIEN / 12) / pib) * 100), delaiMois: inv.delai_mois, duree: DUREE_ENTRETIEN },
  ].filter((e) => e.valeur);
  const budget = etat.budget ? { ...etat.budget, depenses: { ...etat.budget.depenses, [poste]: r2((etat.budget.depenses[poste] ?? 0) + annuel) } } : etat.budget;
  return {
    ...etat, budget,
    joueur: { ...etat.joueur, capital: etat.joueur.capital - 1 },
    economie: { ...etat.economie, investissements: [...(etat.economie.investissements ?? []), { id, debut: etat.tour, enService: etat.tour + inv.delai_mois, statut: 'chantier' }] },
    effetsEnCours: [...etat.effetsEnCours, ...planifierEffets(effets, etat.tour + 1, `investissement:${id}`)],
    journal: [...etat.journal, { tour: etat.tour, type: 'investissement', texte: `Investissement lancé : ${inv.titre} (${inv.cout_total_md} Md€ sur ${inv.delai_mois} mois, puis ${inv.entretien_md ?? 0} Md€/an d’entretien). Capacité ${eco.filieres[inv.filiere].nom} en hausse à partir du mois ${etat.tour + inv.delai_mois}.` }],
  };
}

/**
 * Évolution mensuelle. Renvoie { etat, entrees, deltas } ; `deltas` sont les variations à appliquer aux indicateurs
 * (croissance, chomage, inflation) par l'appelant (turn.js), déjà attribuées dans `entrees`.
 */
export function evoluerEconomie(etat, { economie: eco }, tour, usure = 1) {
  const e0 = etat.economie;
  if (!e0 || !eco) return { etat, entrees: [], deltas: { croissance: 0, chomage: 0, inflation: 0 } };
  const entrees = [];
  const journal = [...etat.journal];
  let budget = etat.budget;
  const filieres = Object.fromEntries(Object.entries(e0.filieres).map(([f, x]) => [f, { ...x, dependances: { ...x.dependances } }]));

  // 1. Usure des capacités
  for (const f of ORDRE_FILIERES) if (filieres[f]) filieres[f].capacite = r2(filieres[f].capacite - (eco.filieres[f].usure_mensuelle ?? 0) * usure);

  // 2. Chantiers : montée en charge après le délai, mise en service, entretien
  const investissements = (e0.investissements ?? []).map((x) => {
    const inv = eco.investissements.find((y) => y.id === x.id);
    if (!inv || x.statut === 'service') return x;
    const mois = tour - x.enService + 1; // 1 = premier mois de montée en charge
    if (mois < 1) return x;
    const fil = filieres[inv.filiere];
    const montee = Math.max(1, inv.montee_mois ?? 1);
    if (mois <= montee && fil) {
      const d = (inv.gain_capacite ?? 0) / montee;
      if (d) { fil.capacite = r2(fil.capacite + d); entrees.push({ tour, indicateur: `filiere:${inv.filiere}`, filiere: inv.filiere, delta: r2(d), source: `investissement:${inv.id}`, type: 'investissement', nature: 'observe', depuis: mois, duree: montee }); }
      if (mois === 1) {
        journal.push({ tour, type: 'investissement', texte: `${inv.titre} : mise en service, montée en charge sur ${montee} mois.` });
        if (inv.amortissement_penurie) fil.amortissement = Math.min(0.9, (fil.amortissement ?? 0) + inv.amortissement_penurie);
        for (const [g, red] of Object.entries(inv.reduction_dependance ?? {})) fil.dependances[g] = r2(Math.max(0, (fil.dependances[g] ?? 0) - red));
        for (const [g, sup] of Object.entries(inv.demande_supplementaire ?? {})) if (filieres[g]) filieres[g].demande = r2(filieres[g].demande + sup);
        // Le coût de chantier laisse place à l'entretien dans le budget affiché
        const poste = eco.filieres[inv.filiere]?.poste_budget ?? 'infrastructures_environnement';
        if (budget) budget = { ...budget, depenses: { ...budget.depenses, [poste]: r2((budget.depenses[poste] ?? 0) - coutAnnuelChantier(inv) + (inv.entretien_md ?? 0)) } };
      }
    }
    return mois >= montee ? { ...x, statut: 'service' } : { ...x, statut: 'montee' };
  });

  // 3. Demande intérieure : suit la croissance observée (indice), sans aléa (la conjoncture en a déjà)
  const croissance = etat.indicateurs.croissance ?? 0;
  for (const f of ORDRE_FILIERES) if (filieres[f]) filieres[f].demande = r3(filieres[f].demande * (1 + croissance / 1200));

  // 4. Production, filière par filière (une pénurie d'énergie réduit la capacité effective des filières qui en dépendent)
  const penuries = {}, couverture = {}, importations = {}, exportations = {};
  const deltas = { croissance: 0, chomage: 0, inflation: 0 };
  for (const f of ORDRE_FILIERES) {
    const fil = filieres[f]; if (!fil) continue;
    const base = eco.filieres[f], com = eco.commerce.filieres[f];
    const dem = fil.demande / 100;
    const besoin = besoinBase(eco, f) * dem;                                   // Md€/an demandés par l'intérieur
    const exp = com.exportations_md * facteurPartenaires(eco, f, e0.debouches, 'parts_exportations');
    const impNormales = com.importations_md * dem * facteurPartenaires(eco, f, e0.disponibilite, 'parts_importations');
    const impMax = impNormales * (1 + MARGE_IMPORTATIONS);                    // les partenaires restants peuvent livrer un peu plus
    let capaciteEffective = fil.capacite;
    for (const [g, c] of Object.entries(fil.dependances)) capaciteEffective *= 1 - c * (penuries[g] ?? 0);
    const offreMax = (capaciteEffective / 100) * base.production_md;
    const cible = besoin - impNormales + exp;                                  // production nécessaire aux importations normales
    // Avec de la capacité en plus, la production remplace une partie des importations (l'autre part est structurelle)
    const production = Math.min(offreMax, cible + com.importations_md * dem * SUBSTITUTION_MAX);
    const expEff = Math.min(exp, Math.max(0, production + impMax - besoin)); // priorité à l'intérieur
    const impEff = Math.max(0, Math.min(impMax, besoin + expEff - production));
    const couv = Math.min(1, (production - expEff + impEff) / besoin);
    const penurieBrute = Math.max(0, 1 - couv);
    penuries[f] = r3(penurieBrute * (1 - (fil.amortissement ?? 0)));
    couverture[f] = r3(couv);
    importations[f] = r2(impEff); exportations[f] = r2(expEff);
    const prodIndice = r2((production / base.production_md) * 100);
    const dProd = r2(prodIndice - fil.production);
    fil.production = prodIndice;
    // Effets : variation de production → croissance et chômage ; pénurie → inflation
    if (Math.abs(dProd) >= 0.01) {
      const dc = r3(dProd * base.part_pib * eco.parametres.croissance_par_point_production);
      const dch = r3(-dProd * base.part_emploi * eco.parametres.chomage_par_point_production);
      if (dc) { deltas.croissance += dc; entrees.push({ tour, indicateur: 'croissance', filiere: f, delta: dc, source: `economie:${f}`, type: 'economie', nature: 'observe' }); }
      if (dch) { deltas.chomage += dch; entrees.push({ tour, indicateur: 'chomage', filiere: f, delta: dch, source: `economie:${f}`, type: 'economie', nature: 'observe' }); }
      entrees.push({ tour, indicateur: `filiere:${f}`, filiere: f, delta: dProd, source: penuries[f] ? `penurie:${f}` : `demande:${f}`, type: 'economie', nature: 'observe' });
    }
    if (penuries[f] > 0) {
      const di = r3(penuries[f] * base.sensibilite_prix * eco.parametres.inflation_par_penurie);
      if (di) { deltas.inflation += di; entrees.push({ tour, indicateur: 'inflation', filiere: f, delta: di, source: `penurie:${f}`, type: 'economie', nature: 'observe' }); }
    }
    // Commerce : importations réduites par un partenaire indisponible, débouchés perdus
    const impBase = com.importations_md * dem;
    if (impNormales < impBase - 0.5) entrees.push({ tour, indicateur: `commerce:${f}`, filiere: f, delta: r2(impNormales - impBase), source: `disponibilite:${f}`, type: 'commerce', nature: 'observe' });
    if (exp < com.exportations_md - 0.5) entrees.push({ tour, indicateur: `commerce:${f}`, filiere: f, delta: r2(exp - com.exportations_md), source: `debouches:${f}`, type: 'commerce', nature: 'observe' });
  }
  for (const k of Object.keys(deltas)) deltas[k] = r3(deltas[k]);
  const commerce = { importations, exportations, solde: r2(somme(exportations) - somme(importations)) };
  return { etat: { ...etat, budget, journal, economie: { ...e0, mois: tour, filieres, investissements, penuries, couverture, commerce } }, entrees, deltas };
}

/** Alertes lisibles : pénurie en cours, dépendance élevée, partenaire indisponible. */
export function alertesEconomie(etat, { economie: eco }) {
  const e = etat.economie;
  if (!e || !eco) return [];
  const res = [];
  for (const f of ORDRE_FILIERES) {
    if (!e.filieres[f]) continue;
    const nom = eco.filieres[f].nom;
    const pen = e.penuries?.[f] ?? 0;
    if (pen >= eco.parametres.seuil_alerte_penurie) res.push({ filiere: f, type: 'penurie', valeur: pen, titre: `Pénurie : ${nom}`, texte: `${Math.round(pen * 100)} % du besoin non couvert : prix en hausse, production des filières dépendantes réduite.` });
    const dep = dependanceFiliere(etat, f, eco);
    const enCours = (e.investissements ?? []).some((x) => x.statut !== 'service' && eco.investissements.find((i) => i.id === x.id)?.filiere === f);
    if (dep >= eco.parametres.seuil_dependance && !enCours) res.push({ filiere: f, type: 'dependance', valeur: dep, titre: `Dépendance aux importations : ${nom}`, texte: `${Math.round(dep * 100)} % du besoin dépend d’importations nettes : une rupture d’approvisionnement se traduirait en pénurie.` });
  }
  return res.sort((a, b) => (a.type === b.type ? b.valeur - a.valeur : a.type === 'penurie' ? -1 : 1));
}

/** Bilan du commerce extérieur : par filière, importations, exportations, solde, dépendance et partenaires principaux. */
export function bilanCommerce(etat, { economie: eco }) {
  const e = etat.economie;
  if (!e || !eco) return null;
  const filieres = {};
  for (const f of ORDRE_FILIERES) {
    const imp = e.commerce.importations[f] ?? 0, exp = e.commerce.exportations[f] ?? 0;
    const partenaires = eco.commerce.partenaires.map((p) => ({ id: p.id, nom: p.nom, importations: r2(imp * (p.parts_importations?.[f] ?? 0)), exportations: r2(exp * (p.parts_exportations?.[f] ?? 0)), disponibilite: e.disponibilite?.[p.id] ?? 1, debouches: e.debouches?.[p.id] ?? 1 }))
      .filter((p) => p.importations + p.exportations > 0).sort((a, b) => (b.importations + b.exportations) - (a.importations + a.exportations)).slice(0, 5);
    filieres[f] = { nom: eco.filieres[f].nom, importations: imp, exportations: exp, solde: r2(exp - imp), dependance: dependanceFiliere(etat, f, eco), penurie: e.penuries?.[f] ?? 0, couverture: e.couverture?.[f] ?? 1, production: e.filieres[f].production, capacite: e.filieres[f].capacite, demande: e.filieres[f].demande, partenaires };
  }
  return { filieres, solde: e.commerce.solde, importations: r2(somme(e.commerce.importations)), exportations: r2(somme(e.commerce.exportations)) };
}

/** Échanges (Md€/an) avec un partenaire, toutes filières (pour la fiche pays). */
export function echangesAvec(etat, partenaireId, { economie: eco }) {
  const e = etat.economie;
  const p = eco?.commerce?.partenaires?.find((x) => x.id === partenaireId);
  if (!e || !p) return null;
  let importations = 0, exportations = 0;
  for (const f of ORDRE_FILIERES) { importations += (e.commerce.importations[f] ?? 0) * (p.parts_importations?.[f] ?? 0); exportations += (e.commerce.exportations[f] ?? 0) * (p.parts_exportations?.[f] ?? 0); }
  return { id: p.id, nom: p.nom, importations: r2(importations), exportations: r2(exportations), solde: r2(exportations - importations), disponibilite: e.disponibilite?.[p.id] ?? 1, debouches: e.debouches?.[p.id] ?? 1 };
}
