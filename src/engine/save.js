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

function assainir(e) {
  const j = e.joueur;
  const texte = e.texte && typeof e.texte === 'object' && ETAPES.includes(e.texte.etape) ? {
    loiId: ch(e.texte.loiId, 100), etape: e.texte.etape, orientation: nb(e.texte.orientation),
    facteur: nb(e.texte.facteur, 1), recours493: bool(e.texte.recours493),
    amendements: nb(e.texte.amendements), depot: nb(e.texte.depot),
  } : null;
  const s = e.sondage && typeof e.sondage === 'object'
    ? { tour: nb(e.sondage.tour), popularite: nb(e.sondage.popularite), intentions: nombres(e.sondage.intentions) ?? {} }
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
    fin: e.fin && typeof e.fin === 'object' ? { type: ch(e.fin.type, 30), texte: ch(e.fin.texte, 300) } : null,
    sieges: nombres(e.sieges),
    resultatsElections: liste(e.resultatsElections, (x) => ({
      id: ch(x.id, 100), type: ch(x.type, 30), tour: nb(x.tour), simulation: true,
      scores: nombres(x.scores) ?? {},
      ...(Array.isArray(x.finalistes) ? { finalistes: chaines(x.finalistes).slice(0, 2) } : {}),
      ...(x.secondTour ? { secondTour: nombres(x.secondTour) ?? {} } : {}),
      ...(typeof x.vainqueur === 'string' ? { vainqueur: ch(x.vainqueur, 50) } : {}),
      ...(x.sieges ? { sieges: nombres(x.sieges) ?? {} } : {}),
    })),
    electionsAnticipees: liste(e.electionsAnticipees, (x) => ({ id: ch(x.id, 100), type: ch(x.type, 30), tour: nb(x.tour), titre: ch(x.titre, 100) })),
    derniereDissolution: nbOuNull(e.derniereDissolution),
    candidat: bool(e.candidat),
    elan: nb(e.elan),
    campagneCeMois: bool(e.campagneCeMois),
    evenement: chOuNull(e.evenement, 100),
    evenementsPasses: liste(e.evenementsPasses, (x) => ({ id: ch(x.id, 100), tour: nb(x.tour), choix: nb(x.choix) })),
    dernierBudget: nbOuNull(e.dernierBudget),
    explications: liste(e.explications, (x) => ({
      tour: nb(x.tour), indicateur: INDICATEURS.includes(x.indicateur) ? x.indicateur : 'popularite', delta: nb(x.delta),
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
