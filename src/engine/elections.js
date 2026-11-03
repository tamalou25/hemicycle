// Élections : calendrier, campagne, scrutins (présidentielle, législatives, européennes), dissolution.
// Les résultats sont SIMULÉS et exprimés par parti, jamais au nom d'une personne réelle.
import { aleatoire, bruit } from './rng.js';
import { AXES, borner } from './constants.js';
import { ecartIdeologique } from './parliament.js';

export const MOIS_CAMPAGNE = 3;          // campagne ouverte 3 mois avant un scrutin
export const DELAI_DISSOLUTION = 12;     // art. 12 : pas de nouvelle dissolution dans l'année
export const TOTAL_DEPUTES = 577;

/** Numéro de tour correspondant à une date « AAAA-MM ». */
export function tourDeDate(etat, date) {
  const [a, m] = date.split('-').map(Number);
  return (a - etat.dateDepart.annee) * 12 + (m - etat.dateDepart.mois);
}

/** Élections à venir (calendrier + anticipées), triées. */
export function prochainesElections(etat, calendrier) {
  const fixes = (calendrier?.elections ?? []).map((e) => ({ ...e, tour: tourDeDate(etat, e.date) }));
  const toutes = [...fixes, ...(etat.electionsAnticipees ?? [])];
  const faites = new Set((etat.resultatsElections ?? []).map((r) => r.id));
  return toutes.filter((e) => e.tour >= etat.tour && !faites.has(e.id)).sort((a, b) => a.tour - b.tour);
}

export const enCampagne = (etat, calendrier) =>
  prochainesElections(etat, calendrier).find((e) => e.tour - etat.tour <= MOIS_CAMPAGNE) ?? null;

/** Sièges effectifs : ceux issus d'une élection simulée, sinon les sièges réels. */
export function siegesEffectifs(etat, partis) {
  return etat.sieges ?? Object.fromEntries(partis.map((p) => [p.id, p.sieges_assemblee ?? 0]));
}

// ---------- Campagne ----------

const ACTIONS = {
  meeting: { cout: 1, competence: 'charisme', libelle: 'Meeting' },
  debat: { cout: 1, competence: 'communication', libelle: 'Débat télévisé' },
  programme: { cout: 2, competence: 'economie', libelle: 'Programme chiffré' },
};
export const ACTIONS_CAMPAGNE = Object.fromEntries(Object.entries(ACTIONS).map(([k, v]) => [k, { cout: v.cout, libelle: v.libelle }]));

export function raisonRefusCampagne(etat, calendrier, action) {
  if (etat.fin) return 'La partie est terminée.';
  if (!ACTIONS[action]) return 'Action inconnue.';
  if (!enCampagne(etat, calendrier)) return 'Aucune campagne en cours.';
  if (etat.campagneCeMois) return 'Une seule action de campagne par mois.';
  if (etat.joueur.capital < ACTIONS[action].cout) return 'Capital politique insuffisant.';
  return null;
}

/**
 * Action de campagne : gain d'élan (points d'intention de vote pour le parti du joueur),
 * aléatoire, d'autant plus fort que la compétence associée est élevée. Un débat peut mal tourner.
 */
export function actionCampagne(etat, action, { calendrier }) {
  const refus = raisonRefusCampagne(etat, calendrier, action);
  if (refus) throw new Error(refus);
  const a = ACTIONS[action];
  const niveau = etat.joueur.competences[a.competence] / 100; // 0..1
  let [r, g] = aleatoire(etat.graine);
  const gain = Math.round((niveau * 1.6 - 0.6 + r * 1.2) * 10) / 10; // ≈ -0.6 .. +2.2
  const ind = etat.indicateurs;
  return {
    ...etat,
    graine: g,
    campagneCeMois: true,
    elan: Math.round(((etat.elan ?? 0) + gain) * 10) / 10,
    joueur: { ...etat.joueur, capital: etat.joueur.capital - a.cout },
    indicateurs: { ...ind, popularite: borner('popularite', ind.popularite + gain / 2) },
    journal: [...etat.journal, { tour: etat.tour, type: 'campagne', texte: `${a.libelle} : ${gain >= 0 ? '+' : ''}${gain} pt d’élan.` }],
  };
}

/** Le joueur se déclare candidat à la présidentielle (popularité ≥ 15 %). */
export function seDeclarerCandidat(etat, { calendrier }) {
  const e = prochainesElections(etat, calendrier).find((x) => x.type === 'presidentielle');
  if (!e) throw new Error('Aucune présidentielle à venir.');
  if (etat.candidat) throw new Error('Déjà candidat.');
  if (etat.indicateurs.popularite < 15) throw new Error('Popularité insuffisante (15 % requis) pour obtenir les parrainages.');
  return { ...etat, candidat: true, journal: [...etat.journal, { tour: etat.tour, type: 'campagne', texte: 'Vous êtes candidat·e à l’élection présidentielle.' }] };
}

// ---------- Scrutins ----------

/** Scores du 1er tour (en %) : intentions de vote + élan du joueur + bruit. */
function scoresPremierTour(etat, partis, intentions, graine) {
  let g = graine, n;
  const bruts = partis.map((p) => {
    let v = intentions[p.id] ?? 1;
    if (p.id === etat.joueur.parti) v += etat.elan ?? 0;
    [n, g] = bruit(g, 2.5);
    return [p.id, Math.max(0.3, v + n)];
  });
  const total = bruts.reduce((s, [, v]) => s + v, 0);
  return { scores: Object.fromEntries(bruts.map(([id, v]) => [id, Math.round((v / total) * 1000) / 10])), graine: g };
}

/** Report des voix au 2nd tour : chaque électorat va vers le finaliste le plus proche (avec abstention partielle). */
export function secondTour(scores, finalistes, partis) {
  const pos = (id) => partis.find((p) => p.id === id).positions;
  const res = Object.fromEntries(finalistes.map((f) => [f, scores[f]]));
  for (const [id, s] of Object.entries(scores)) {
    if (finalistes.includes(id)) continue;
    const [e0, e1] = finalistes.map((f) => ecartIdeologique(pos(id), pos(f)));
    const part0 = e1 / ((e0 + e1) || 1); // plus proche → plus de voix
    const report = 0.7; // 30 % d'abstention / blancs
    res[finalistes[0]] += s * report * part0;
    res[finalistes[1]] += s * report * (1 - part0);
  }
  const total = res[finalistes[0]] + res[finalistes[1]];
  return Object.fromEntries(finalistes.map((f) => [f, Math.round((res[f] / total) * 1000) / 10]));
}

/** Législatives : prime majoritaire du scrutin à deux tours (part^1,6), en blocs. */
export function repartirSieges(scores) {
  const poids = Object.entries(scores).filter(([, s]) => s >= 5).map(([id, s]) => [id, s ** 1.6]);
  const total = poids.reduce((a, [, w]) => a + w, 0) || 1;
  const sieges = Object.fromEntries(Object.keys(scores).map((id) => [id, 0]));
  let attribues = 0;
  for (const [id, w] of poids) { sieges[id] = Math.floor((w / total) * TOTAL_DEPUTES); attribues += sieges[id]; }
  // Restes au plus fort
  const restes = poids.map(([id, w]) => [id, (w / total) * TOTAL_DEPUTES - sieges[id]]).sort((a, b) => b[1] - a[1]);
  for (let i = 0; attribues < TOTAL_DEPUTES; i++, attribues++) sieges[restes[i % restes.length][0]]++;
  return sieges;
}

/**
 * Organise l'élection prévue ce tour (s'il y en a une). Appelé par tourSuivant.
 * @returns {{ etat, graine }}
 */
export function tenirElections(etat, { partis, calendrier }, intentions, graine) {
  const e = prochainesElections(etat, calendrier).find((x) => x.tour === etat.tour);
  if (!e) return { etat, graine };
  let { scores, graine: g } = scoresPremierTour(etat, partis, intentions, graine);
  const j = etat.joueur.parti;
  const sigle = (id) => partis.find((p) => p.id === id)?.sigle ?? id;
  const journal = [...etat.journal];
  const resultat = { id: e.id, type: e.type, tour: etat.tour, scores, simulation: true };
  let suite = {};

  if (e.type === 'presidentielle') {
    const classement = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const finalistes = classement.slice(0, 2).map(([id]) => id);
    let t2 = secondTour(scores, finalistes, partis);
    // Aléa de campagne d'entre-deux-tours + popularité personnelle du joueur
    let n2;
    [n2, g] = bruit(g, 4);
    const ajust = n2 + (finalistes.includes(j) ? ((etat.indicateurs.popularite - 30) / 4) * (finalistes[0] === j ? 1 : -1) : 0);
    t2 = { [finalistes[0]]: Math.round((t2[finalistes[0]] + ajust) * 10) / 10, [finalistes[1]]: Math.round((t2[finalistes[1]] - ajust) * 10) / 10 };
    const vainqueur = t2[finalistes[0]] >= t2[finalistes[1]] ? finalistes[0] : finalistes[1];
    Object.assign(resultat, { finalistes, secondTour: t2, vainqueur });
    journal.push({ tour: etat.tour, type: 'election', texte: `Présidentielle (simulation) : 2nd tour ${sigle(finalistes[0])} ${t2[finalistes[0]]} % – ${sigle(finalistes[1])} ${t2[finalistes[1]]} %. Victoire du candidat ${sigle(vainqueur)}.` });
    if (etat.candidat && vainqueur === j) suite.fin = { type: 'victoire', texte: 'Vous êtes élu·e président·e de la République !' };
    else if (etat.candidat) suite.indicateurs = { ...etat.indicateurs, popularite: borner('popularite', etat.indicateurs.popularite - (finalistes.includes(j) ? 4 : 8)) };
    // Changement de majorité présidentielle hostile : un PM d'un autre bord est remplacé
    if (etat.joueur.role === 'premier_ministre' && vainqueur !== j && ecartIdeologique(etat.joueur.ideologie, partis.find((p) => p.id === vainqueur).positions) > 60) {
      suite.joueur = { ...etat.joueur, role: 'depute' };
      journal.push({ tour: etat.tour, type: 'election', texte: 'Le nouveau président nomme un autre Premier ministre : vous redevenez député·e.' });
    }
  } else if (e.type === 'legislatives') {
    const sieges = repartirSieges(scores);
    resultat.sieges = sieges;
    suite.sieges = sieges;
    journal.push({ tour: etat.tour, type: 'election', texte: `Législatives (simulation) : ${sigle(j)} obtient ${sieges[j] ?? 0} sièges sur ${TOTAL_DEPUTES}.` });
  } else if (e.type === 'europeennes') {
    const ecart = (scores[j] ?? 0) - (intentions[j] ?? 0);
    suite.indicateurs = { ...etat.indicateurs, popularite: borner('popularite', etat.indicateurs.popularite + ecart) };
    journal.push({ tour: etat.tour, type: 'election', texte: `Européennes (simulation) : ${sigle(j)} réalise ${scores[j] ?? 0} %.` });
  }

  return {
    etat: { ...etat, ...suite, journal, elan: 0, candidat: e.type === 'presidentielle' ? false : etat.candidat, resultatsElections: [...(etat.resultatsElections ?? []), resultat], fin: suite.fin ?? etat.fin },
    graine: g,
  };
}

// ---------- Dissolution ----------

export function raisonRefusDissolution(etat) {
  if (etat.fin) return 'La partie est terminée.';
  if (etat.joueur.role !== 'premier_ministre') return 'Seul le Premier ministre peut proposer une dissolution au Président.';
  if (etat.derniereDissolution != null && etat.tour - etat.derniereDissolution < DELAI_DISSOLUTION) return 'Pas de nouvelle dissolution dans l’année qui suit la précédente (art. 12).';
  if ((etat.electionsAnticipees ?? []).some((e) => e.tour >= etat.tour)) return 'Des législatives anticipées sont déjà prévues.';
  return null;
}

/** Proposition de dissolution : le Président l'accepte selon la popularité du PM. Législatives 2 mois plus tard. */
export function proposerDissolution(etat) {
  const refus = raisonRefusDissolution(etat);
  if (refus) throw new Error(refus);
  let [r, g] = aleatoire(etat.graine);
  const accepte = r < 0.3 + etat.indicateurs.popularite / 100;
  const journal = [...etat.journal];
  if (!accepte) {
    journal.push({ tour: etat.tour, type: 'dissolution', texte: 'Le Président refuse de dissoudre l’Assemblée.' });
    return { ...etat, graine: g, journal, joueur: { ...etat.joueur, capital: Math.max(0, etat.joueur.capital - 2) } };
  }
  journal.push({ tour: etat.tour, type: 'dissolution', texte: 'Le Président dissout l’Assemblée nationale : législatives anticipées dans deux mois.' });
  const anticipee = { id: `legislatives-anticipees-${etat.tour}`, type: 'legislatives', tour: etat.tour + 2, titre: 'Législatives anticipées' };
  return {
    ...etat, graine: g, journal, derniereDissolution: etat.tour,
    electionsAnticipees: [...(etat.electionsAnticipees ?? []), anticipee],
    texte: null, // les textes en cours tombent
  };
}

export { AXES };
