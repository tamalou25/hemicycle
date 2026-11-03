// Passage au mois suivant.
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
import { dateDuTour } from './state.js';

/**
 * Ordre d'un tour :
 * 0. navette du texte en cours (votes du mois écoulé) + censure spontanée
 * 1. effets différés des lois  2. dynamique économique + bruit
 * 3. popularité  4. sondage  5. capital politique  6. conditions de fin
 */
export function tourSuivant(etatInitial, donnees) {
  if (etatInitial.fin) return etatInitial;
  const { partis } = donnees;
  let g = etatInitial.graine;
  let n;

  // 0. Institutions (au mois courant, avant de passer au suivant)
  let etat = { ...etatInitial, motion: null };
  // Événement ignoré : on applique automatiquement le dernier choix (option passive)
  if (etat.evenement && donnees.evenements) {
    const ev = donnees.evenements.find((e) => e.id === etat.evenement);
    etat = ev ? resoudreEvenement(etat, ev.choix.length - 1, donnees) : { ...etat, evenement: null };
  }
  ({ etat, graine: g } = avancerNavette(etat, donnees, g));
  ({ etat, graine: g } = censureSpontanee(etat, donnees, g));
  if (etat.fin) return { ...etat, graine: g };
  const tour = etat.tour + 1;

  // 1. Effets des lois
  const { indicateurs: apresLois, file, appliques } = appliquerEffets(etat.indicateurs, etat.effetsEnCours, tour);
  etat = { ...etat, effetsEnCours: file };
  const ind = { ...apresLois };

  // 2. Dynamique : retour lent vers l'équilibre + petits chocs aléatoires
  [n, g] = bruit(g, 0.15); ind.croissance = borner('croissance', ind.croissance + (EQUILIBRE.croissance - ind.croissance) * 0.03 + n);
  [n, g] = bruit(g, 0.08); ind.inflation = borner('inflation', ind.inflation + (EQUILIBRE.inflation - ind.inflation) * 0.05 + n);
  // Loi d'Okun simplifiée : croissance faible → chômage qui monte
  [n, g] = bruit(g, 0.04); ind.chomage = borner('chomage', ind.chomage - (ind.croissance - 1.2) * 0.03 + n);
  [n, g] = bruit(g, 0.05); ind.deficit = borner('deficit', ind.deficit - (ind.croissance - 1) * 0.02 + n);
  ind.dette = borner('dette', ind.dette + ind.deficit / 12 - ind.croissance / 12);
  [n, g] = bruit(g, 1.5); ind.tensions = borner('tensions', ind.tensions + (EQUILIBRE.tensions - ind.tensions) * 0.05 + n);

  // 2 bis. Territoires et projets (E1) : usure, emploi régional, chantiers, mises en service
  let entreesTerritoires = [];
  let bonusTerritoires = 0;
  if (etat.territoires && donnees.regions && donnees.projets) {
    const evo = evoluerTerritoires(etat.territoires, ind.chomage - etat.indicateurs.chomage, tour);
    const p = avancerProjets({ ...etat, territoires: evo.territoires }, donnees, tour);
    entreesTerritoires = [...evo.entrees, ...p.entrees];
    const { mois } = dateDuTour({ ...etat, tour });
    etat = { ...p.etat, finances: renouvelerEnveloppe(p.etat.finances, mois, donnees.projets.enveloppe_annuelle_md) };
    // La satisfaction des territoires (pondérée par la population) tire la popularité
    bonusTerritoires = (satisfactionNationale(etat.territoires, donnees.regions.regions) - (etat.satisfactionInitiale ?? 50)) / 2;
  }

  // 3. Popularité : converge à 15 %/mois vers la cible
  const cible = populariteCible(ind, etat.joueur.competences) + bonusTerritoires;
  [n, g] = bruit(g, 1);
  ind.popularite = borner('popularite', ind.popularite + (cible - ind.popularite) * 0.15 + n);

  // Registre des causes (explications du mois)
  const explications = archiver(etat.explications, [...registreDuMois(tour, appliques, apresLois, ind), ...entreesTerritoires], tour);

  // 4. Sondage
  const sondage = { tour, popularite: ind.popularite, intentions: intentionsDeVote(partis, etat.joueur.parti, ind.popularite) };

  // 6. Fin de partie
  let fin = null;
  if (ind.popularite < SEUIL_DEFAITE) fin = { type: 'defaite', texte: 'Votre popularité s’est effondrée : votre parti vous retire son investiture.' };
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
    campagneCeMois: false,
    accords: (etat.accords ?? []).filter((a) => a.jusqua >= tour),
    // Le Premier ministre dispose de l'appareil d'État : +1 capital/mois
    joueur: { ...etat.joueur, capital: Math.min(CAPITAL_MAX, etat.joueur.capital + CAPITAL_MENSUEL + (etat.joueur.role === 'premier_ministre' ? 1 : 0)) },
    sondage,
    historique: [...etat.historique, { tour, ...ind }],
    journal: fin ? [...etat.journal, { tour, type: 'fin', texte: fin.texte }] : etat.journal,
    fin,
  };;

  // 7. Élection prévue ce mois-ci (calendrier ou anticipée)
  if (fin) return apres;
  const r = tenirElections(apres, donnees, sondage.intentions, apres.graine);
  if (r.etat.fin || !donnees.evenements) return { ...r.etat, graine: r.graine };

  // 8. Événement du mois (auquel le joueur répondra pendant le mois)
  const t = tirerEvenement(r.etat, donnees.evenements, r.graine);
  return { ...r.etat, graine: t.graine, evenement: t.evenementId }
}
