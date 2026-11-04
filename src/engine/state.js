// Création de l'état initial d'une partie.
import { AXES, COMPETENCES, ROLES, VERSION_SAUVEGARDE } from './constants.js';
import { initialiserTerritoires, satisfactionNationale } from './territoires.js';
import { financesInitiales } from './finances.js';
import { budgetInitial } from './budgetEtat.js';
import { initialiserGroupes } from './groupes.js';
import { secteursInitiaux } from './secteurs.js';
import { relationsInitiales } from './relations.js';
import { confianceRegionsInitiale } from './confianceRegions.js';
import { normaliserObjectifs, evaluerObjectifs } from './objectifs.js';
import { creerMission } from './mission.js';
import { creerScenario } from './scenario.js';
import { gouvernementInitial } from './presidence.js';
import { economieInitiale } from './economie.js';
import { diplomatieInitiale } from './diplomatie.js';
import { defenseInitiale, disponibiliteForces } from './defense.js';
import { normaliserDifficulte } from './difficulte.js';

const borne = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));

/**
 * @param {object} p
 * @param {object} p.joueur     { nom, age, parti, role, ideologie{axe:-100..100}, competences{nom:0..100} }
 * @param {object} p.situation  situation.json (indicateurs réels de départ)
 * @param {number} p.graine
 */
export function creerPartie({ joueur, situation, graine = 1, dateDepart, regions, projets, finances, groupes, groupesEquilibrage, politiques, partis, objectifs, mission = null, scenario = null, economie = null, pays = null, defense = null, difficulte = null }) {
  if (!joueur?.nom?.trim()) throw new Error('Le personnage doit avoir un nom.');
  const ind = situation?.indicateurs ?? {};
  const ideologie = Object.fromEntries(AXES.map((a) => [a, borne(joueur.ideologie?.[a], -100, 100)]));
  const competences = Object.fromEntries(COMPETENCES.map((c) => [c, borne(joueur.competences?.[c] ?? 50, 0, 100)]));
  const d = dateDepart ?? situation?.date_collecte ?? '2026-11-01';
  const [annee, mois] = d.split('-').map(Number);

  const etat = {
    version: VERSION_SAUVEGARDE,
    graine: graine >>> 0,
    graineInitiale: graine >>> 0, // pour rejouer / partager la partie en défi
    tour: 0,
    dateDepart: { annee, mois },
    joueur: {
      nom: joueur.nom.trim(), age: borne(joueur.age ?? 40, 18, 99), parti: joueur.parti,
      ideologie, competences, capital: 4,
      role: ROLES.includes(joueur.role) ? joueur.role : 'depute',
      politicienId: joueur.politicienId ?? null, // mode « jouer un élu »
    },
    indicateurs: {
      chomage: ind.chomage ?? 7.5, croissance: ind.croissance ?? 0.8, deficit: ind.deficit ?? 5.4,
      dette: ind.dette ?? finances?.dette_pct_pib ?? 115, inflation: ind.inflation ?? 1.2, popularite: 30, tensions: 40,
    },
    effetsEnCours: [],
    loisAdoptees: [],
    loisRejetees: [],
    actionCeMois: false,
    negoCeMois: false,
    texte: null,          // texte en navette { loiId, etape, orientation, facteur, recours493, amendements }
    accords: [],          // [{ parti, debut, jusqua }]
    dernier493: null,
    dernierVote: null,
    motion: null,
    // Élections (Phase 4)
    sieges: null,             // { partiId: n } après des législatives simulées
    resultatsElections: [],
    electionsAnticipees: [],
    derniereDissolution: null,
    candidat: false,
    elan: 0,
    campagneCeMois: false,
    // Profondeur (Phase 5)
    evenement: null,          // id de l'événement en attente de réponse
    evenementRegion: null,    // région visée par un événement régional
    evenementsPasses: [],
    dernierBudget: null,
    explications: [],       // registre des causes (12 derniers mois)
    // Territoires (E1) — null si les données régionales ne sont pas fournies
    ...etatTerritorial(regions, projets),
    // Finances publiques (E2)
    budget: budgetInitial(finances), plf: null, dernierPLF: null,
    // Secteurs (E4)
    secteurs: secteursInitiaux(politiques), politiques: [],
    // Relations avec les partis (E5)
    relations: relationsInitiales(partis),
    // Objectifs de mandat (3 choisis par le joueur, sinon ceux par défaut)
    objectifs: normaliserObjectifs(joueur.objectifs, objectifs, ROLES.includes(joueur.role) ? joueur.role : 'depute'),
    sondage: null,
    historique: [],
    journal: [{ tour: 0, type: 'debut', texte: `${joueur.nom.trim()} entre en politique.` }],
    fin: null,
    mission: null, // mission d'initiation (ancien mode « Découvrir en jouant », v13), sinon null
    scenario: null, // partie courte « Douze mois pour convaincre » (v14), sinon null
    // Présidence (v15) : gouvernement du président (parti du Premier ministre fictif), null pour les autres rôles
    gouvernement: joueur.role === 'president' ? gouvernementInitial({ parti: joueur.parti }) : null,
    // Économie (lot 2) : filières, commerce extérieur, investissements ; null sans données
    economie: economieInitiale(economie),
    diplomatie: diplomatieInitiale(pays), diploCeMois: false, // lot 3 : partenaires simulés, null sans données
    defense: defenseInitiale(defense), // lot 4 : équipement, engagements, null sans données
    difficulte: normaliserDifficulte(joueur.difficulte ?? difficulte?.defaut), // lot 5 : niveau (null = normal, parties antérieures)
  };
  // Population (E3) : calculée sur l'état initial complet
  if (etat.defense) etat.defense = { ...etat.defense, disponibilite: disponibiliteForces(etat, defense).valeur };
  const avecGroupes = { ...etat, groupes: initialiserGroupes(etat, { regions, finances, groupes, groupesEquilibrage }), chocs: {} };
  // Valeurs de départ des objectifs (pour afficher départ, actuel et cible : la jauge n'est pas un progrès accompli)
  const complet = { ...avecGroupes, objectifsInitiaux: Object.fromEntries(evaluerObjectifs(avecGroupes, { objectifs, regions }).filter((o) => o.valeur != null).map((o) => [o.id, o.valeur])) };
  const avecMission = mission ? { ...complet, mission: creerMission(complet, mission) } : complet;
  return scenario ? { ...avecMission, scenario: creerScenario(avecMission, scenario) } : avecMission;
}

/** Date affichable du tour courant. */
export function dateDuTour(etat) {
  const total = etat.dateDepart.mois - 1 + etat.tour;
  return { annee: etat.dateDepart.annee + Math.floor(total / 12), mois: (total % 12) + 1 };
}

/** Partie territoriale de l'état (E1). Aussi utilisée pour compléter une ancienne sauvegarde. */
export function etatTerritorial(regions, projets) {
  if (!regions?.regions || !projets) return { territoires: null, projets: [], finances: null, satisfactionInitiale: null, confianceRegions: null };
  const territoires = initialiserTerritoires(regions.regions, projets.transports_initial, projets.indices_par_defaut);
  return { territoires, projets: [], finances: financesInitiales(projets), satisfactionInitiale: satisfactionNationale(territoires, regions.regions), confianceRegions: confianceRegionsInitiale(territoires) };
}

/** Complète une partie qui n'a pas encore de territoires (sauvegarde antérieure à E1). */
export function assurerTerritoires(etat, { regions, projets, finances, groupes, groupesEquilibrage, politiques, partis, economie, pays, defense }) {
  let e = etat.territoires ? etat : { ...etat, ...etatTerritorial(regions, projets) };
  if (!e.budget && finances) e = { ...e, budget: budgetInitial(finances), plf: null, dernierPLF: null };
  if (!e.confianceRegions && e.territoires) e = { ...e, confianceRegions: confianceRegionsInitiale(e.territoires) };
  if (!e.relations && partis) e = { ...e, relations: relationsInitiales(partis) };
  if (!e.secteurs && politiques) e = { ...e, secteurs: secteursInitiaux(politiques), politiques: [] };
  if (!e.groupes && groupes) e = { ...e, groupes: initialiserGroupes(e, { regions, finances, groupes, groupesEquilibrage }), chocs: {} };
  // Économie (lot 2) : une ancienne partie reçoit l'économie au niveau de départ (sans investissement rétroactif)
  if (!e.economie && economie) e = { ...e, economie: economieInitiale(economie) };
  if (!e.diplomatie && pays) e = { ...e, diplomatie: diplomatieInitiale(pays), diploCeMois: false };
  if (!e.defense && defense) { const df = defenseInitiale(defense); e = { ...e, defense: { ...df, disponibilite: disponibiliteForces({ ...e, defense: df }, defense).valeur } }; }
  return e;
}
