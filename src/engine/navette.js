// Navette parlementaire : une étape par mois, traitée en fin de tour.
// assemblee → senat → (cmp → lecture_definitive) → conseil → promulgation
import { aleatoire } from './rng.js';
import { planifierEffets } from './effects.js';
import { groupesAssemblee, groupesSenat, voterChambre, voterCensure } from './parliament.js';
import { gouverne, renverserGouvernement } from './presidence.js';

/** Risque de censure par le Conseil constitutionnel si la loi ne le précise pas. */
const RISQUE_DEFAUT = { immigration: 0.3, securite: 0.2, europe: 0.15 };
export const risqueConstitutionnel = (loi) => loi.risque_constitutionnel ?? RISQUE_DEFAUT[loi.theme] ?? 0.08;

/**
 * Fait avancer le texte en cours d'une étape.
 * @returns {{ etat, graine }} nouvel état (texte, journal, dernierVote, fin éventuelle)
 */
export function avancerNavette(etat, { partis, lois, senat }, graine) {
  const t = etat.texte;
  if (!t) return { etat, graine };
  const loi = lois.find((l) => l.id === t.loiId);
  const journal = [...etat.journal];
  const log = (type, texte) => journal.push({ tour: etat.tour, type, texte });
  let g = graine, r;
  let texte = { ...t };
  let dernierVote = null;
  let fin = etat.fin;
  let renverse = null; // président·e : censure adoptée → gouvernement renversé (pas de fin de partie)
  let loisAdoptees = etat.loisAdoptees, loisRejetees = etat.loisRejetees, effetsEnCours = etat.effetsEnCours;

  const rejeter = (raison) => { log('rejet', `« ${loi.titre} » ${raison}`); loisRejetees = [...loisRejetees, loi.id]; texte = null; };
  const AN = groupesAssemblee(partis, etat.sieges);

  // Lecture à l'Assemblée (1re lecture ou lecture définitive), avec ou sans 49.3
  const lectureAssemblee = (siAdoptee, siRejet) => {
    if (texte.recours493) {
      const c = voterCensure(etat, AN);
      dernierVote = { loi: loi.id, chambre: 'censure', ...c };
      if (c.adoptee) {
        if (etat.joueur.role === 'president') { renverse = `Motion de censure adoptée (${c.pour} voix, ${c.requis} requises). Le gouvernement est renversé.`; texte = null; return; }
        log('censure', `Motion de censure adoptée (${c.pour} voix, ${c.requis} requises). Le gouvernement est renversé.`);
        fin = { type: 'censure', texte: 'Votre gouvernement a été renversé par une motion de censure.' };
        texte = null;
      } else {
        log('censure', `Motion de censure rejetée (${c.pour} voix sur ${c.requis} requises) : texte considéré comme adopté.`);
        texte = { ...texte, recours493: false, etape: siAdoptee };
      }
      return;
    }
    const v = voterChambre(etat, AN, loi.theme, texte.orientation);
    dernierVote = { loi: loi.id, chambre: 'assemblee', ...v };
    if (v.adoptee) { log('vote', `Assemblée : « ${loi.titre} » adoptée (${v.pour}–${v.contre}).`); texte = { ...texte, etape: siAdoptee }; }
    else siRejet(v);
  };

  switch (t.etape) {
    case 'assemblee':
      lectureAssemblee('senat', (v) => rejeter(`rejetée à l’Assemblée (${v.pour}–${v.contre}).`));
      break;
    case 'senat': {
      const v = voterChambre(etat, groupesSenat(senat, partis), loi.theme, texte.orientation);
      dernierVote = { loi: loi.id, chambre: 'senat', ...v };
      if (v.adoptee) { log('vote', `Sénat : adoption conforme (${v.pour}–${v.contre}).`); texte.etape = 'conseil'; }
      else { log('vote', `Sénat : rejet (${v.pour}–${v.contre}). Réunion d’une commission mixte paritaire.`); texte.etape = 'cmp'; }
      break;
    }
    case 'cmp': {
      // Succès de la CMP : dépend de la négociation ; compromis plus modéré
      [r, g] = aleatoire(g);
      if (r < 0.35 + etat.joueur.competences.negociation / 250) {
        log('cmp', 'CMP conclusive : texte de compromis adopté par les deux chambres.');
        texte = { ...texte, orientation: Math.round(texte.orientation * 0.85), facteur: Math.round(texte.facteur * 0.9 * 100) / 100, etape: 'conseil' };
      } else {
        log('cmp', 'Échec de la CMP : l’Assemblée aura le dernier mot.');
        texte.etape = 'lecture_definitive';
      }
      break;
    }
    case 'lecture_definitive':
      lectureAssemblee('conseil', (v) => rejeter(`rejetée en lecture définitive (${v.pour}–${v.contre}).`));
      break;
    case 'conseil': {
      const risque = risqueConstitutionnel(loi);
      [r, g] = aleatoire(g);
      let facteur = texte.facteur;
      if (r < risque / 3) { rejeter('censurée en totalité par le Conseil constitutionnel.'); break; }
      if (r < risque) { facteur = Math.round(facteur * 0.5 * 100) / 100; log('conseil', 'Conseil constitutionnel : censure partielle, effets réduits de moitié.'); }
      else log('conseil', 'Conseil constitutionnel : loi déclarée conforme.');
      log('adoption', `« ${loi.titre} » promulguée.`);
      loisAdoptees = [...loisAdoptees, loi.id];
      effetsEnCours = [...effetsEnCours, ...planifierEffets(loi.effets, etat.tour + 1, loi.id, facteur)];
      texte = null;
      break;
    }
    default:
      texte = null;
  }

  const apres = { ...etat, texte, journal, dernierVote, fin, loisAdoptees, loisRejetees, effetsEnCours };
  return { etat: renverse ? renverserGouvernement(apres, renverse) : apres, graine: g };
}

/**
 * Motion de censure spontanée (Premier ministre uniquement), si le climat se dégrade.
 * Probabilité mensuelle croissante avec les tensions et l'impopularité.
 */
export function censureSpontanee(etat, { partis }, graine) {
  if (!gouverne(etat) || etat.fin) return { etat, graine };
  const { tensions, popularite } = etat.indicateurs;
  const p = Math.max(0, (tensions - 55) / 100) + Math.max(0, (22 - popularite) / 60);
  let [r, g] = aleatoire(graine);
  if (r >= p) return { etat, graine: g };
  const c = voterCensure(etat, groupesAssemblee(partis, etat.sieges));
  const journal = [...etat.journal, { tour: etat.tour, type: 'censure', texte: `L’opposition dépose une motion de censure : ${c.pour} voix (${c.requis} requises).` }];
  if (c.adoptee && etat.joueur.role === 'president') return { etat: renverserGouvernement({ ...etat, journal, motion: { tour: etat.tour, ...c } }, 'Motion de censure adoptée : le gouvernement est renversé.'), graine: g };
  const fin = c.adoptee ? { type: 'censure', texte: 'Votre gouvernement a été renversé par une motion de censure.' } : etat.fin;
  return { etat: { ...etat, journal, fin, texte: c.adoptee ? null : etat.texte, motion: { tour: etat.tour, ...c } }, graine: g };
}
