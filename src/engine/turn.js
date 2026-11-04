// Passage au mois suivant.
import { avancerMission } from './mission.js';
import { avancerScenario, criseDue } from './scenario.js';
import { appliquerEffets } from './effects.js';
import { bruit } from './rng.js';
import { borner, EQUILIBRE, CAPITAL_MENSUEL, CAPITAL_MAX, DUREE_MANDAT, SEUIL_DEFAITE } from './constants.js';
import { populariteCible, intentionsDeVote } from './polls.js';
import { avancerNavette, censureSpontanee } from './navette.js';
import { tenirElections } from './elections.js';
import { tirerEvenement, resoudreEvenement } from './events.js';
import { registreDuMois, archiver } from './explications.js';
import { evoluerTerritoires, satisfactionNationale } from './territoires.js';
import { avancerProjets } from './projets.js';
import { renouvelerEnveloppe } from './finances.js';
import { voterPLF, evoluerBudget, effetsBudgetTerritoires } from './budgetEtat.js';
import { evoluerSecteurs } from './secteurs.js';
import { reagir, estomperRelations } from './relations.js';
import { evoluerConfianceRegions } from './confianceRegions.js';
import { evoluerGroupes, confianceMoyenne, voteJoueurNational, voteJoueurParGroupe } from './groupes.js';
import { dateDuTour } from './state.js';
import { evoluerEconomie } from './economie.js';
import { evoluerDiplomatie } from './diplomatie.js';
import { evoluerDefense } from './defense.js';
import { parametresDifficulte } from './difficulte.js';

/**
 * Ordre d'un tour :
 * 0. navette du texte en cours (votes du mois écoulé) + censure spontanée
 * 1. effets différés des lois  2. dynamique économique + bruit  2 a. économie réelle (filières, commerce)
 * 3. popularité  4. sondage  5. capital politique  6. conditions de fin
 */
export function tourSuivant(etatInitial, donnees) {
  // Mission d'initiation (v13) et scénario « Douze mois » : clôturés à l'échéance ou en cas de fin de partie (même moteur)
  return avancerScenario(avancerMission(tourDeBase(etatInitial, donnees), donnees), donnees);
}

function tourDeBase(etatInitial, donnees) {
  if (etatInitial.fin) return etatInitial;
  const apres = passage(etatInitial, donnees);
  // Journal : tout ce qui survient pendant le passage (votes, mises en service, élections, réponse par défaut)
  // est daté du mois qui s'affiche. Le bilan du mois ne répète ainsi jamais un résultat sur deux mois.
  const n = etatInitial.journal.length;
  if (apres.journal.length === n) return apres;
  return { ...apres, journal: apres.journal.map((j, i) => (i >= n ? { ...j, tour: apres.tour } : j)) };
}

function passage(etatInitial, donnees) {
  const { partis } = donnees;
  let g = etatInitial.graine;
  let n;

  // 0. Institutions (au mois courant, avant de passer au suivant)
  const dif = parametresDifficulte(etatInitial, donnees);
  let etat = { ...etatInitial, motion: null };
  // Événement ignoré : on applique automatiquement le dernier choix (option passive)
  if (etat.evenement && donnees.evenements) {
    const ev = donnees.evenements.find((e) => e.id === etat.evenement);
    const n = (etat.explications ?? []).length;
    etat = ev ? resoudreEvenement(etat, ev.choix.length - 1, donnees) : { ...etat, evenement: null };
    // Réponse automatique au passage du mois : ses effets locaux sont datés du mois qui s'affiche
    etat = { ...etat, explications: (etat.explications ?? []).map((x, i) => (i >= n ? { ...x, tour: etat.tour + 1 } : x)) };
    // Journal : la réponse n'a pas été choisie par le joueur (le bilan du mois ne la compte pas comme une décision)
    const dernier = etat.journal[etat.journal.length - 1];
    if (ev && dernier?.type === 'evenement') etat = { ...etat, journal: [...etat.journal.slice(0, -1), { ...dernier, type: 'evenement-auto', texte: `${dernier.texte.replace(/\.$/, '')} (réponse par défaut, faute de choix).` }] };
  }
  const loisAvant = etat.loisAdoptees.length;
  const texteAvant = etat.texte; // orientation finale (après amendements / CMP), effacée par la navette à la promulgation
  ({ etat, graine: g } = avancerNavette(etat, donnees, g));
  // E5 : réaction des partis aux lois promulguées ce mois-ci
  for (const id of etat.loisAdoptees.slice(loisAvant)) {
    const loi = donnees.lois?.find((l) => l.id === id);
    if (loi && etat.relations) {
      const orientation = texteAvant?.loiId === id ? texteAvant.orientation : loi.orientation;
      const rx = reagir(etat, partis, { theme: loi.theme, orientation, source: id, libelle: loi.titre });
      etat = { ...etat, relations: rx.relations, explications: [...(etat.explications ?? []), ...rx.entrees] };
    }
  }
  ({ etat, graine: g } = censureSpontanee(etat, donnees, g));
  etat = voterPLF(etat, donnees); // projet de loi de finances en discussion ce mois-ci
  if (etat.fin) return { ...etat, graine: g };
  const tour = etat.tour + 1;

  // 1. Effets des lois
  const { indicateurs: apresLois, file, appliques } = appliquerEffets(etat.indicateurs, etat.effetsEnCours, tour);
  etat = { ...etat, effetsEnCours: file };
  const ind = { ...apresLois };

  // 2. Dynamique : retour lent vers l'équilibre + petits chocs aléatoires
  [n, g] = bruit(g, 0.15 * dif.bruit); ind.croissance = borner('croissance', ind.croissance + (EQUILIBRE.croissance - ind.croissance) * 0.03 + n);
  [n, g] = bruit(g, 0.08 * dif.bruit); ind.inflation = borner('inflation', ind.inflation + (EQUILIBRE.inflation - ind.inflation) * 0.05 + n);
  // Loi d'Okun simplifiée : croissance faible → chômage qui monte
  [n, g] = bruit(g, 0.04 * dif.bruit); ind.chomage = borner('chomage', ind.chomage - (ind.croissance - 1.2) * 0.03 + n);
  [n, g] = bruit(g, 0.05 * dif.bruit); ind.deficit = borner('deficit', ind.deficit - (ind.croissance - 1) * 0.02 + n);
  // Dette en % du PIB : + déficit, − effet de la croissance nominale (réelle + inflation) sur le ratio
  ind.dette = borner('dette', ind.dette + ind.deficit / 12 - ((ind.croissance + ind.inflation) / 1200) * ind.dette);
  [n, g] = bruit(g, 1.5 * dif.bruit); ind.tensions = borner('tensions', ind.tensions + (EQUILIBRE.tensions - ind.tensions) * 0.05 + n);

  // 2 a. Économie réelle (lot 2, ADR 0003) : production par filière, commerce, pénuries → croissance, chômage, inflation
  let entreesEconomie = [];
  if (etat.economie && donnees.economie) {
    const ec = evoluerEconomie({ ...etat, indicateurs: ind }, donnees, tour, dif.usure);
    etat = ec.etat; entreesEconomie = ec.entrees;
    for (const k of ['croissance', 'chomage', 'inflation']) if (ec.deltas[k]) ind[k] = borner(k, ind[k] + ec.deltas[k]);
  }

  // 2 bis. Territoires et projets (E1) : usure, emploi régional, chantiers, mises en service
  let entreesTerritoires = [];
  let misesEnService = [];
  let bonusTerritoires = 0;
  if (etat.territoires && donnees.regions && donnees.projets) {
    const evo = evoluerTerritoires(etat.territoires, ind.chomage - etat.indicateurs.chomage, tour);
    const bt = effetsBudgetTerritoires(evo.territoires, etat.budget, tour);
    const p = avancerProjets({ ...etat, territoires: bt.territoires }, donnees, tour);
    // Régions où un projet vient d'être mis en service (chantier → montée en charge)
    misesEnService = (p.etat.projets ?? []).filter((x) => x.statut !== 'chantier' && (etat.projets ?? []).find((y) => y.uid === x.uid)?.statut === 'chantier').map((x) => x.region);
    entreesTerritoires = [...evo.entrees, ...bt.entrees, ...p.entrees];
    const { mois } = dateDuTour({ ...etat, tour });
    etat = { ...p.etat, finances: renouvelerEnveloppe(p.etat.finances, mois, donnees.projets.enveloppe_annuelle_md * dif.enveloppe) };
    // La satisfaction des territoires (pondérée par la population) tire la popularité
    bonusTerritoires = satisfactionNationale(etat.territoires, donnees.regions.regions) - (etat.satisfactionInitiale ?? 50);
  }

  // 2 ter. Finances publiques : PIB, dette, charge d'intérêts (révisée en janvier)
  if (etat.budget) etat = evoluerBudget({ ...etat, indicateurs: ind }, dateDuTour({ ...etat, tour }).mois).etat;

  // 2 ter bis. Secteurs (E4) : usure et montée en charge des programmes nationaux
  let entreesSecteurs = [];
  if (etat.secteurs && donnees.politiques) {
    const sc = evoluerSecteurs(etat, donnees, tour, dif.usure);
    etat = sc.etat; entreesSecteurs = sc.entrees;
  }

  // 2 quater. Population (E3) : satisfaction et confiance des groupes sociaux
  let entreesGroupes = [];
  let bonusConfiance = 0;
  if (etat.groupes && donnees.groupes) {
    const gr = evoluerGroupes({ ...etat, indicateurs: ind }, donnees, etat.chocs ?? {}, tour);
    etat = { ...etat, groupes: gr.groupes };
    entreesGroupes = gr.entrees;
    bonusConfiance = ((confianceMoyenne(etat.groupes, donnees.groupes) ?? 40) - 40) * 0.5;
  }
  // Confiance par région : chocs nationaux du mois et projets mis en service localement
  let entreesConfiance = [];
  if (etat.confianceRegions) {
    const cr = evoluerConfianceRegions(etat.confianceRegions, etat.territoires, etat.chocs ?? {}, misesEnService, tour);
    etat = { ...etat, confianceRegions: cr.confianceRegions };
    entreesConfiance = cr.entrees;
  }
  // 2 quater bis. Défense stratégique (lot 4) : usure, budget, programmes, engagements, OTAN, disponibilité (après les secteurs : la préparation est à jour)
  let entreesDefense = [];
  if (etat.defense && donnees.defense) {
    const dd = evoluerDefense(etat, donnees, tour, dif.usure);
    etat = dd.etat; entreesDefense = dd.entrees;
  }
  // 2 quinquies. Diplomatie (lot 3) : initiative ignorée, échéances, convergence des relations, modificateurs commerciaux, nouvelle initiative
  let entreesDiplomatie = [];
  if (etat.diplomatie && donnees.pays) {
    const dp = evoluerDiplomatie({ ...etat, indicateurs: ind }, donnees, tour, g, dif.initiatives);
    etat = dp.etat; entreesDiplomatie = dp.entrees; g = dp.graine;
  }
  etat = { ...etat, chocs: {}, relations: estomperRelations(etat.relations) };

  // 3. Popularité : converge à 15 %/mois vers la cible
  const cible = populariteCible(ind, etat.joueur.competences) + bonusTerritoires + bonusConfiance;
  [n, g] = bruit(g, 1);
  ind.popularite = borner('popularite', ind.popularite + (cible - ind.popularite) * 0.15 + n);

  // Registre des causes (explications du mois)
  const explications = archiver(etat.explications, [...registreDuMois(tour, appliques, apresLois, ind), ...entreesEconomie, ...entreesTerritoires, ...entreesGroupes, ...entreesSecteurs, ...entreesConfiance, ...entreesDefense, ...entreesDiplomatie], tour);

  // 4. Sondage
  const sondage = { tour, popularite: ind.popularite, intentions: intentionsDeVote(partis, etat.joueur.parti, ind.popularite) };
  // E3 : la part du parti du joueur dépend de la confiance des groupes sociaux
  if (etat.groupes && donnees.groupes) {
    const base = sondage.intentions[etat.joueur.parti] ?? 0;
    const part = voteJoueurNational(etat.groupes, donnees.groupes, base);
    const autres = 100 - base;
    for (const k of Object.keys(sondage.intentions)) if (k !== etat.joueur.parti) sondage.intentions[k] = Math.round((sondage.intentions[k] * (100 - part) / (autres || 1)) * 10) / 10;
    sondage.intentions[etat.joueur.parti] = Math.round(part * 10) / 10;
    sondage.parGroupe = voteJoueurParGroupe(etat.groupes, donnees.groupes, base);
  }

  // 6. Fin de partie
  let fin = null;
  if (ind.popularite < SEUIL_DEFAITE) fin = { type: 'defaite', texte: etat.joueur.role === 'president' ? 'Votre popularité s’est effondrée : vous démissionnez (simplification du jeu).' : 'Votre popularité s’est effondrée : votre parti vous retire son investiture.' };
  else if (tour >= DUREE_MANDAT) fin = { type: 'mandat', texte: 'Cinq ans se sont écoulés : fin de la législature.' };

  const apres = {
    ...etat,
    tour,
    graine: g,
    indicateurs: ind,
    effetsEnCours: etat.effetsEnCours,
    explications,
    actionCeMois: false,
    negoCeMois: false,
    diploCeMois: false,
    campagneCeMois: false,
    accords: (etat.accords ?? []).filter((a) => a.jusqua >= tour),
    // Le Premier ministre dispose de l'appareil d'État : +1 capital/mois
    joueur: { ...etat.joueur, capital: Math.max(0, Math.min(CAPITAL_MAX, etat.joueur.capital + CAPITAL_MENSUEL + dif.capital_bonus + (['premier_ministre', 'president'].includes(etat.joueur.role) ? 1 : 0))) },
    sondage,
    historique: [...etat.historique, { tour, ...ind }],
    journal: fin ? [...etat.journal, { tour, type: 'fin', texte: fin.texte }] : etat.journal,
    fin,
  };;

  // 7. Élection prévue ce mois-ci (calendrier ou anticipée)
  if (fin) return apres;
  const r = tenirElections(apres, donnees, sondage.intentions, apres.graine);
  if (r.etat.fin || !donnees.evenements) return { ...r.etat, graine: r.graine };

  // 8. Crise programmée du scénario (remplace le tirage du mois), sinon événement du mois tiré au hasard
  const crise = criseDue(r.etat, donnees, tour);
  if (crise) return { ...r.etat, graine: r.graine, evenement: crise.evenementId, evenementRegion: crise.region ?? null, scenario: { ...r.etat.scenario, crises: [...(r.etat.scenario.crises ?? []), { id: crise.evenementId, tour }] } };
  const t = tirerEvenement(r.etat, donnees.evenements, r.graine, dif.evenements);
  return { ...r.etat, graine: t.graine, evenement: t.evenementId, evenementRegion: t.region ?? null }
}
