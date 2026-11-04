// Sérialisation / validation des sauvegardes (indépendant du stockage).
import { VERSION_SAUVEGARDE, INDICATEURS, AXES, COMPETENCES, ROLES, ETAPES } from './constants.js';

export const exporterPartie = (etat) => JSON.stringify(etat);

/** Parse et valide une sauvegarde. Lève une erreur explicite si invalide. */
export function importerPartie(texte) {
  let etat;
  try { etat = JSON.parse(texte); } catch { throw new Error('Fichier illisible (JSON invalide).'); }
  if (!etat || typeof etat !== 'object' || Array.isArray(etat)) throw new Error('Sauvegarde vide.');
  if (etat.version === 1) etat = migrerV1(etat);
  if (etat.version === 2) etat = migrerV2(etat);
  if (etat.version === 3) etat = { ...etat, version: 4, evenement: null, evenementsPasses: [], dernierBudget: null };
  if (etat.version === 4) etat = { ...etat, version: 5, territoires: null, projets: [], finances: null, satisfactionInitiale: null };
  if (etat.version === 5) etat = { ...etat, version: 6, budget: null, plf: null, dernierPLF: null };
  if (etat.version === 6) etat = { ...etat, version: 7, groupes: null, chocs: {} };
  if (etat.version === 7) etat = { ...etat, version: 8, secteurs: null, politiques: [] };
  if (etat.version === 8) etat = { ...etat, version: 9, relations: null };
  if (etat.version === 9) etat = { ...etat, version: 10, confianceRegions: null };
  if (etat.version === 10) etat = { ...etat, version: 11, objectifs: [] };
  if (etat.version === 11) etat = { ...etat, version: 12, evenementRegion: null };
  // v13 : mission d'initiation ; les anciennes parties n'en ont pas (aucune activation rétroactive)
  if (etat.version === 12) etat = { ...etat, version: 13, mission: null, objectifsInitiaux: {} };
  // v14 : scénario « Douze mois pour convaincre » ; les anciennes parties n'en ont pas (aucune activation rétroactive)
  if (etat.version === 13) etat = { ...etat, version: 14, scenario: null };
  // v15 : présidence (gouvernement du président) ; les anciennes parties gardent leur rôle et leurs règles
  if (etat.version === 14) etat = { ...etat, version: 15, gouvernement: null };
  // v16 : économie, diplomatie, défense, difficulté (lots 2 à 5) ; complétés à la reprise par assurerTerritoires, sans activation rétroactive des décisions
  if (etat.version === 15) etat = { ...etat, version: 16, economie: null, diplomatie: null, defense: null, difficulte: null };
  if (etat.version !== VERSION_SAUVEGARDE) throw new Error('Version de sauvegarde incompatible.');
  if (typeof etat.joueur?.nom !== 'string' || !etat.joueur.nom.trim()) throw new Error('Sauvegarde incomplète.');
  for (const i of INDICATEURS) {
    if (!Number.isFinite(etat.indicateurs?.[i])) throw new Error(`Indicateur manquant : ${i}.`);
  }
  return assainir(etat);
}

// ---------- Assainissement (sécurité) ----------
// Une sauvegarde importée est une donnée NON FIABLE : on reconstruit l'état champ par champ
// (liste blanche, types stricts). Tout nombre est fini, toute chaîne est une chaîne bornée.

const nb = (v, defaut = 0) => (Number.isFinite(v) ? v : defaut);
const nbOuNull = (v) => (Number.isFinite(v) ? v : null);
const ch = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
const chOuNull = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : null);
const bool = (v) => v === true;
const liste = (v, f) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object').map(f) : []);
const chaines = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.slice(0, 100)) : []);
/** Objet { clé: nombre } (scores, sièges, intentions…). */
const nombres = (o) => (o && typeof o === 'object' && !Array.isArray(o)
  ? Object.fromEntries(Object.entries(o).filter(([, v]) => Number.isFinite(v)).map(([k, v]) => [k.slice(0, 50), v]))
  : null);

const RESULTATS_MISSION = ['realisation', 'engagement', 'manque'];
/** Mission d'initiation (v13) : cadre + débrief éventuel ; null si absente ou invalide. */
function assainirMission(m) {
  if (!m || typeof m !== 'object' || typeof m.region !== 'string' || !['en_cours', 'terminee'].includes(m.statut)) return null;
  const d = m.debrief && typeof m.debrief === 'object' ? m.debrief : null;
  return {
    id: ch(m.id, 40), debut: nb(m.debut), echeance: nb(m.echeance), region: ch(m.region, 60),
    indice: ['emploi', 'sante', 'transports'].includes(m.indice) ? m.indice : 'sante',
    valeurInitiale: nb(m.valeurInitiale), roleInitial: ROLES.includes(m.roleInitial) ? m.roleInitial : 'depute',
    differe: nbOuNull(m.differe), statut: m.statut,
    debrief: d && m.statut === 'terminee' ? {
      tour: nb(d.tour), resultat: RESULTATS_MISSION.includes(d.resultat) ? d.resultat : 'manque',
      projetId: chOuNull(d.projetId, 80), projets: chaines(d.projets), lance: nbOuNull(d.lance), service: nbOuNull(d.service), alea: chOuNull(d.alea, 200),
      effetObserve: nb(d.effetObserve), effetTheorique: nb(d.effetTheorique), restantAttendu: nb(d.restantAttendu),
      finMontee: nbOuNull(d.finMontee), valeurInitiale: nb(d.valeurInitiale), valeurFinale: nbOuNull(d.valeurFinale),
      differe: nbOuNull(d.differe), roleChange: ROLES.includes(d.roleChange) ? d.roleChange : null,
      fin: chOuNull(d.fin, 30), coutEngage: nb(d.coutEngage),
    } : null,
  };
}

const RESULTATS_SCENARIO = ['complet', 'partiel', 'echec'];
const ETATS_ENGAGEMENT = ['atteint', 'partiel', 'manque'];
/** Scénario « Douze mois » (v14) : cadre, crises déclenchées et bilan éventuel ; null si absent ou invalide. */
function assainirScenario(s) {
  if (!s || typeof s !== 'object' || typeof s.region !== 'string' || !['en_cours', 'termine'].includes(s.statut)) return null;
  const b = s.bilan && typeof s.bilan === 'object' && s.statut === 'termine' ? s.bilan : null;
  const objet = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
  return {
    id: ch(s.id, 40), debut: nb(s.debut), echeance: nb(s.echeance), region: ch(s.region, 60),
    indice: ['emploi', 'sante', 'transports'].includes(s.indice) ? s.indice : 'sante',
    valeurInitiale: nb(s.valeurInitiale), roleInitial: ROLES.includes(s.roleInitial) ? s.roleInitial : 'premier_ministre',
    loisInitiales: nb(s.loisInitiales), popularite: nb(s.popularite, 30), deficit: nb(s.deficit, 5),
    crises: liste(s.crises, (c) => ({ id: ch(c.id, 80), tour: nb(c.tour) })), statut: s.statut,
    bilan: b ? {
      tour: nb(b.tour), resultat: RESULTATS_SCENARIO.includes(b.resultat) ? b.resultat : 'echec',
      engagements: liste(b.engagements, (x) => ({
        id: ch(x.id, 40), type: ch(x.type, 40), titre: ch(x.titre, 160), resume: ch(x.resume, 400), lever: ch(x.lever, 400),
        etat: ETATS_ENGAGEMENT.includes(x.etat) ? x.etat : 'manque', valeur: nb(x.valeur), cible: nb(x.cible, 1), detail: ch(x.detail, 400),
        engage: bool(x.engage), mesure: bool(x.mesure), effet: bool(x.effet), restantAttendu: nb(x.restantAttendu), finMontee: nbOuNull(x.finMontee),
        projets: liste(x.projets, (p) => ({ projetId: ch(p.projetId, 60), titre: ch(p.titre, 120), lance: nb(p.lance), service: nb(p.service), statut: ch(p.statut, 20), alea: chOuNull(p.alea, 200), cout: nb(p.cout) })),
        lois: chaines(x.lois), rejets: nb(x.rejets), enNavette: chOuNull(x.enNavette, 120), etape: chOuNull(x.etape, 30),
        programmes: liste(x.programmes, (p) => ({ id: ch(p.id, 80), titre: ch(p.titre, 120), statut: ch(p.statut, 20), enService: nb(p.enService), coutAnnuel: nb(p.coutAnnuel), contrepartie: chOuNull(p.contrepartie, 300) })),
      })),
      crises: liste(b.crises, (c) => ({ id: ch(c.id, 80), tour: nb(c.tour), titre: ch(c.titre, 120), choix: nbOuNull(c.choix), libelle: chOuNull(c.libelle, 200), parDefaut: bool(c.parDefaut) })),
      compromis: { accords: nb(objet(b.compromis).accords), accordsRefuses: nb(objet(b.compromis).accordsRefuses), amendements: nb(objet(b.compromis).amendements), recours493: nb(objet(b.compromis).recours493), censures: nb(objet(b.compromis).censures), budget: ['adopte', 'loi_speciale', 'aucun'].includes(objet(b.compromis).budget) ? b.compromis.budget : 'aucun' },
      roleChange: ROLES.includes(b.roleChange) ? b.roleChange : null, fin: chOuNull(b.fin, 30),
      gardeFou: b.gardeFou && typeof b.gardeFou === 'object' ? { indicateur: ch(b.gardeFou.indicateur, 20), hausseMax: nb(b.gardeFou.hausseMax, 1), debut: nb(b.gardeFou.debut), fin: nb(b.gardeFou.fin), hausse: nb(b.gardeFou.hausse), respecte: bool(b.gardeFou.respecte), texte: ch(b.gardeFou.texte, 300) } : null,
      popularite: { debut: nb(objet(b.popularite).debut), fin: nb(objet(b.popularite).fin) }, deficit: { debut: nb(objet(b.deficit).debut), fin: nb(objet(b.deficit).fin) },
      indice: { debut: nb(objet(b.indice).debut), fin: nbOuNull(objet(b.indice).fin) },
      elections: liste(b.elections, (x) => ({ id: ch(x.id, 100), type: ch(x.type, 30), tour: nb(x.tour), vainqueur: chOuNull(x.vainqueur, 50) })),
    } : null,
  };
}

/** Économie (v16) : filières, investissements, disponibilités ; null si absente ou invalide. */
function assainirEconomie(ec) {
  if (!ec || typeof ec !== 'object' || !ec.filieres || typeof ec.filieres !== 'object') return null;
  const fil = (x) => ({ capacite: nb(x?.capacite, 100), production: nb(x?.production, 100), demande: nb(x?.demande, 100), dependances: nombres(x?.dependances) ?? {}, amortissement: nb(x?.amortissement) });
  const c = ec.commerce && typeof ec.commerce === 'object' ? ec.commerce : {};
  return {
    mois: nb(ec.mois),
    filieres: Object.fromEntries(Object.entries(ec.filieres).slice(0, 8).map(([k, v]) => [k.slice(0, 30), fil(v)])),
    investissements: liste(ec.investissements, (x) => ({ id: ch(x.id, 60), debut: nb(x.debut), enService: nb(x.enService), statut: ['chantier', 'montee', 'service'].includes(x.statut) ? x.statut : 'service' })),
    disponibilite: nombres(ec.disponibilite) ?? {}, debouches: nombres(ec.debouches) ?? {},
    commerce: { importations: nombres(c.importations) ?? {}, exportations: nombres(c.exportations) ?? {}, solde: nb(c.solde) },
    penuries: nombres(ec.penuries) ?? {}, couverture: nombres(ec.couverture) ?? {},
  };
}

/** Diplomatie (v16) : relations, accords, sanctions, mesures, initiative ; null si absente ou invalide. */
function assainirDiplomatie(d) {
  if (!d || typeof d !== 'object' || !d.relations || typeof d.relations !== 'object') return null;
  return {
    relations: nombres(d.relations) ?? {},
    ue: { relation: nb(d.ue?.relation, 60) },
    accords: liste(d.accords, (a) => ({ pays: ch(a.pays, 10), type: ch(a.type, 30), debut: nb(a.debut), fin: nb(a.fin) })),
    sanctions: liste(d.sanctions, (s) => ({ pays: ch(s.pays, 10), debut: nb(s.debut) })),
    mesures: liste(d.mesures, (m) => ({ id: ch(m.id, 60), pays: ch(m.pays, 10), type: ch(m.type, 20), debut: nb(m.debut), fin: nb(m.fin), debouches: nb(m.debouches), disponibilite: nb(m.disponibilite) })),
    initiative: d.initiative && typeof d.initiative === 'object' && typeof d.initiative.id === 'string' ? { id: ch(d.initiative.id, 60), pays: ch(d.initiative.pays, 10), tour: nb(d.initiative.tour) } : null,
    initiativesPassees: liste(d.initiativesPassees, (i) => ({ id: ch(i.id, 60), pays: ch(i.pays, 10), tour: nb(i.tour), choix: nb(i.choix), parDefaut: bool(i.parDefaut) })),
    dernieresInitiatives: nombres(d.dernieresInitiatives) ?? {},
  };
}

/** Défense (v16) : équipement, OTAN, programmes, engagements ; null si absente ou invalide. */
function assainirDefense(d) {
  if (!d || typeof d !== 'object') return null;
  return {
    equipement: nb(d.equipement, 50), engagementOtan: nb(d.engagementOtan, 50), disponibilite: nb(d.disponibilite, 50),
    programmes: liste(d.programmes, (x) => ({ id: ch(x.id, 60), debut: nb(x.debut), enService: nb(x.enService), statut: ['chantier', 'montee', 'service'].includes(x.statut) ? x.statut : 'service' })),
    engagements: liste(d.engagements, (x) => ({ id: ch(x.id, 60), type: ch(x.type, 20), pays: chOuNull(x.pays, 10), debut: nb(x.debut), fin: nb(x.fin), coutAnnuelMd: nb(x.coutAnnuelMd), disponibilite: nb(x.disponibilite) })),
  };
}

function assainir(e) {
  const j = e.joueur;
  const texte = e.texte && typeof e.texte === 'object' && ETAPES.includes(e.texte.etape) ? {
    loiId: ch(e.texte.loiId, 100), etape: e.texte.etape, orientation: nb(e.texte.orientation),
    facteur: nb(e.texte.facteur, 1), recours493: bool(e.texte.recours493),
    amendements: nb(e.texte.amendements), depot: nb(e.texte.depot),
  } : null;
  const s = e.sondage && typeof e.sondage === 'object'
    ? { tour: nb(e.sondage.tour), popularite: nb(e.sondage.popularite), intentions: nombres(e.sondage.intentions) ?? {}, ...(e.sondage.parGroupe ? { parGroupe: nombres(e.sondage.parGroupe) ?? {} } : {}) }
    : null;
  return {
    version: VERSION_SAUVEGARDE,
    graine: nb(e.graine, 1) >>> 0,
    graineInitiale: nbOuNull(e.graineInitiale),
    tour: Math.max(0, Math.floor(nb(e.tour))),
    dateDepart: { annee: nb(e.dateDepart?.annee, 2026), mois: Math.min(12, Math.max(1, Math.floor(nb(e.dateDepart?.mois, 11)))) },
    joueur: {
      nom: ch(j.nom, 60), age: nb(j.age, 40), parti: ch(j.parti, 50), capital: nb(j.capital),
      role: ROLES.includes(j.role) ? j.role : 'depute', politicienId: chOuNull(j.politicienId, 100),
      ideologie: Object.fromEntries(AXES.map((a) => [a, nb(j.ideologie?.[a])])),
      competences: Object.fromEntries(COMPETENCES.map((c) => [c, nb(j.competences?.[c], 50)])),
    },
    indicateurs: Object.fromEntries(INDICATEURS.map((i) => [i, e.indicateurs[i]])),
    effetsEnCours: liste(e.effetsEnCours, (x) => ({ indicateur: INDICATEURS.includes(x.indicateur) ? x.indicateur : 'popularite', parMois: nb(x.parMois), debut: nb(x.debut), fin: nb(x.fin), source: ch(x.source, 100) })),
    loisAdoptees: chaines(e.loisAdoptees),
    loisRejetees: chaines(e.loisRejetees),
    actionCeMois: bool(e.actionCeMois),
    negoCeMois: bool(e.negoCeMois),
    texte,
    accords: liste(e.accords, (x) => ({ parti: ch(x.parti, 50), debut: nb(x.debut), jusqua: nb(x.jusqua) })),
    dernier493: nbOuNull(e.dernier493),
    dernierVote: null,
    motion: null,
    sondage: s,
    historique: liste(e.historique, (x) => ({ tour: nb(x.tour), ...Object.fromEntries(INDICATEURS.map((i) => [i, nb(x[i])])) })),
    journal: liste(e.journal, (x) => ({ tour: nb(x.tour), type: ch(x.type, 30), texte: ch(x.texte, 300) })),
    mission: assainirMission(e.mission),
    scenario: assainirScenario(e.scenario),
    gouvernement: e.gouvernement && typeof e.gouvernement === 'object' && j.role === 'president'
      ? { parti: ch(e.gouvernement.parti, 50), depuis: nb(e.gouvernement.depuis), statut: e.gouvernement.statut === 'renverse' ? 'renverse' : 'en_place', renversements: nb(e.gouvernement.renversements), nominations: nb(e.gouvernement.nominations), ...(Number.isFinite(e.gouvernement.renverseLe) ? { renverseLe: e.gouvernement.renverseLe } : {}) }
      : null,
    objectifsInitiaux: nombres(e.objectifsInitiaux) ?? {},
    economie: assainirEconomie(e.economie),
    diplomatie: assainirDiplomatie(e.diplomatie), diploCeMois: bool(e.diploCeMois),
    defense: assainirDefense(e.defense), difficulte: null,
    fin: e.fin && typeof e.fin === 'object' ? { type: ch(e.fin.type, 30), texte: ch(e.fin.texte, 300) } : null,
    sieges: nombres(e.sieges),
    resultatsElections: liste(e.resultatsElections, (x) => ({
      id: ch(x.id, 100), type: ch(x.type, 30), tour: nb(x.tour), simulation: true,
      scores: nombres(x.scores) ?? {},
      ...(Array.isArray(x.finalistes) ? { finalistes: chaines(x.finalistes).slice(0, 2) } : {}),
      ...(x.secondTour ? { secondTour: nombres(x.secondTour) ?? {} } : {}),
      ...(typeof x.vainqueur === 'string' ? { vainqueur: ch(x.vainqueur, 50) } : {}),
      ...(x.sieges ? { sieges: nombres(x.sieges) ?? {} } : {}),
      ...(x.parRegion && typeof x.parRegion === 'object' && !Array.isArray(x.parRegion) ? { parRegion: Object.fromEntries(Object.entries(x.parRegion).slice(0, 30).map(([k, v]) => [k.slice(0, 50), nombres(v) ?? {}])) } : {}),
    })),
    electionsAnticipees: liste(e.electionsAnticipees, (x) => ({ id: ch(x.id, 100), type: ch(x.type, 30), tour: nb(x.tour), titre: ch(x.titre, 100) })),
    derniereDissolution: nbOuNull(e.derniereDissolution),
    candidat: bool(e.candidat),
    elan: nb(e.elan),
    campagneCeMois: bool(e.campagneCeMois),
    evenement: chOuNull(e.evenement, 100),
    evenementRegion: chOuNull(e.evenementRegion, 60),
    evenementsPasses: liste(e.evenementsPasses, (x) => ({ id: ch(x.id, 100), tour: nb(x.tour), choix: nb(x.choix) })),
    dernierBudget: nbOuNull(e.dernierBudget),
    territoires: e.territoires && typeof e.territoires === 'object' && !Array.isArray(e.territoires)
      ? Object.fromEntries(Object.entries(e.territoires).slice(0, 40).map(([id, t]) => [id.slice(0, 50), {
        emploi: nb(t?.emploi, 50), sante: nb(t?.sante, 50), transports: nb(t?.transports, 50), satisfaction: nb(t?.satisfaction, 50) }]))
      : null,
    projets: liste(e.projets, (x) => ({
      uid: ch(x.uid, 150), projetId: ch(x.projetId, 60), region: ch(x.region, 60), lance: nb(x.lance),
      statut: ['chantier', 'montee', 'service'].includes(x.statut) ? x.statut : 'service', service: nb(x.service),
      retard: nb(x.retard), efficacite: nb(x.efficacite, 1), facteur: nb(x.facteur, 1), alea: chOuNull(x.alea, 200),
    })),
    finances: e.finances && typeof e.finances === 'object' ? { enveloppe: nb(e.finances.enveloppe), recurrent: nb(e.finances.recurrent), annee: nb(e.finances.annee) } : null,
    satisfactionInitiale: nbOuNull(e.satisfactionInitiale),
    budget: e.budget && typeof e.budget === 'object' ? {
      pib: nb(e.budget.pib, 2900), taux: nb(e.budget.taux, 0.02), annee: nb(e.budget.annee),
      recettes: nombres(e.budget.recettes) ?? {}, depenses: nombres(e.budget.depenses) ?? {}, ecarts: nombres(e.budget.ecarts) ?? {},
    } : null,
    plf: e.plf && typeof e.plf === 'object' ? {
      depenses: nombres(e.plf.depenses) ?? {}, recettes: nombres(e.plf.recettes) ?? {}, depot: nb(e.plf.depot), recours493: bool(e.plf.recours493),
    } : null,
    dernierPLF: nbOuNull(e.dernierPLF),
    groupes: e.groupes && typeof e.groupes === 'object' && !Array.isArray(e.groupes)
      ? Object.fromEntries(Object.entries(e.groupes).slice(0, 20).map(([id, g]) => [id.slice(0, 50), {
        satisfaction: nb(g?.satisfaction, 50), confiance: nb(g?.confiance, 40), confianceInitiale: nb(g?.confianceInitiale, 40) }]))
      : null,
    chocs: nombres(e.chocs) ?? {},
    secteurs: nombres(e.secteurs),
    relations: nombres(e.relations),
    confianceRegions: nombres(e.confianceRegions),
    objectifs: chaines(e.objectifs).slice(0, 5),
    politiques: liste(e.politiques, (x) => ({
      id: ch(x.id, 80), debut: nb(x.debut), enService: nb(x.enService),
      statut: ['preparation', 'montee', 'en_oeuvre'].includes(x.statut) ? x.statut : 'en_oeuvre',
    })),
    explications: liste(e.explications, (x) => ({
      ...(typeof x.groupe === 'string' ? { groupe: x.groupe.slice(0, 60) } : {}),
      ...(typeof x.secteur === 'string' ? { secteur: x.secteur.slice(0, 40) } : {}),
      ...(typeof x.parti === 'string' ? { parti: x.parti.slice(0, 40) } : {}),
      ...(typeof x.libelle === 'string' ? { libelle: x.libelle.slice(0, 120) } : {}),
      ...(typeof x.region === 'string' ? { region: x.region.slice(0, 60) } : {}),
      ...(typeof x.filiere === 'string' ? { filiere: x.filiere.slice(0, 40) } : {}),
      ...(typeof x.pays === 'string' ? { pays: x.pays.slice(0, 10) } : {}),
      tour: nb(x.tour), indicateur: [...INDICATEURS, 'emploi', 'sante', 'transports', 'confiance'].includes(x.indicateur) || /^(secteur|relation|filiere|commerce|pays|defense):[a-z_-]{1,30}$/.test(x.indicateur ?? '') ? x.indicateur : 'popularite', delta: nb(x.delta),
      source: ch(x.source, 100), type: ch(x.type, 20), nature: x.nature === 'prevision' ? 'prevision' : 'observe',
      ...(Number.isFinite(x.depuis) ? { depuis: x.depuis } : {}), ...(Number.isFinite(x.duree) ? { duree: x.duree } : {}),
    })),
  };
}

/** v1 (Phase 1) → v2 : ajoute les champs institutionnels. */
function migrerV1(e) {
  return {
    ...e, version: 2, texte: null, accords: [], dernier493: null, motion: null, negoCeMois: false,
    joueur: { ...e.joueur, role: e.joueur?.role ?? 'depute' },
  };
}

/** v2 → v3 : ajoute les champs électoraux. */
function migrerV2(e) {
  return {
    ...e, version: 3, sieges: null, resultatsElections: [], electionsAnticipees: [],
    derniereDissolution: null, candidat: false, elan: 0, campagneCeMois: false,
  };
}
