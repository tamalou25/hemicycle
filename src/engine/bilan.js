// Bilan du mois écoulé et engagements en cours : API PURE, tirée du journal, du registre des causes et du suivi.
// Rien n'est stocké en plus : le bilan se relit à volonté à partir de l'état.
import { prevoir } from './explications.js';
import { etapesMission } from './mission.js';

const ETAPES_NAVETTE = { assemblee: 'vote à l’Assemblée', senat: 'vote au Sénat', cmp: 'commission mixte paritaire', lecture_definitive: 'lecture définitive', conseil: 'décision du Conseil constitutionnel' };
const TYPES_DECISION = new Set(['depot', 'amendement', '493', 'accord', 'evenement', 'mission', 'campagne', 'dissolution']);
const DECISIONS_JOUEUR = new Set(['loi', 'projet', 'politique', 'budget']);

const estDecision = (j) => TYPES_DECISION.has(j.type)
  || (j.type === 'projet' && j.texte.startsWith('Lancement'))
  || (j.type === 'politique' && j.texte.startsWith('Programme engagé'))
  || (j.type === 'budget' && /déposé|dépose/.test(j.texte));

/** Engagements en cours, triés par prochaine échéance : { type, titre, detail, echeance (mois de jeu) }. */
export function engagements(etat, donnees) {
  const res = [];
  const nomRegion = (id) => donnees.regions?.regions.find((r) => r.id === id)?.nom ?? id;
  for (const p of etat.projets ?? []) {
    const def = donnees.projets?.projets.find((x) => x.id === p.projetId);
    if (!def || p.statut === 'service') continue;
    if (p.statut === 'chantier') res.push({ type: 'projet', titre: `${def.titre} (${nomRegion(p.region)})`, detail: `Mise en service${p.retard ? ` (retard de ${p.retard} mois)` : ''}`, echeance: p.service });
    else res.push({ type: 'projet', titre: `${def.titre} (${nomRegion(p.region)})`, detail: 'Fin de la montée en charge', echeance: p.service + def.montee_mois - 1 });
  }
  for (const x of etat.politiques ?? []) {
    const def = donnees.politiques?.politiques.find((p) => p.id === x.id);
    if (!def || x.statut === 'en_oeuvre') continue;
    res.push(x.statut === 'preparation'
      ? { type: 'programme', titre: def.titre, detail: 'Premiers effets', echeance: x.enService }
      : { type: 'programme', titre: def.titre, detail: 'Pleine mise en œuvre', echeance: x.enService + def.montee_mois - 1 });
  }
  if (etat.texte) {
    const loi = donnees.lois?.find((l) => l.id === etat.texte.loiId);
    res.push({ type: 'loi', titre: loi?.titre ?? 'Texte en navette', detail: `Prochaine étape : ${ETAPES_NAVETTE[etat.texte.etape] ?? etat.texte.etape}`, echeance: etat.tour });
  }
  if (etat.plf) res.push({ type: 'budget', titre: 'Projet de loi de finances', detail: etat.plf.recours493 ? 'Adopté sauf censure' : 'Vote', echeance: etat.tour });
  for (const a of etat.accords ?? []) if (a.jusqua >= etat.tour) res.push({ type: 'accord', titre: `Accord avec ${donnees.partis?.find((p) => p.id === a.parti)?.sigle ?? a.parti}`, detail: 'Fin de l’accord', echeance: a.jusqua });
  if (etat.mission?.statut === 'en_cours') res.push({ type: 'mission', titre: 'Mission d’initiation', detail: 'Débrief', echeance: etat.mission.echeance });
  return res.sort((a, b) => a.echeance - b.echeance);
}

/**
 * Bilan du dernier mois joué (etat.tour) :
 * decisions (prises au mois précédent), resultats (votes, mises en service, élections…),
 * vosEffets / evenements / conjoncture (registre des causes), locaux (effets régionaux, même minimes),
 * attendus (prévisions), engagements, mission (prochaine étape).
 */
export function bilanMois(etat, donnees) {
  const t = etat.tour;
  if (t === 0) return null;
  const journal = (etat.journal ?? []).filter((j) => j.tour === t - 1 || j.tour === t);
  const decisions = journal.filter((j) => j.tour === t - 1 && estDecision(j)).map((j) => j.texte);
  const resultats = journal.filter((j) => !estDecision(j) && j.type !== 'debut').map((j) => j.texte);
  const registre = (etat.explications ?? []).filter((e) => e.tour === t && e.nature === 'observe' && e.delta);
  const nationaux = registre.filter((e) => !e.region && !e.groupe && !e.parti);
  const vosEffets = nationaux.filter((e) => DECISIONS_JOUEUR.has(e.type));
  const evenements = nationaux.filter((e) => e.type === 'evenement');
  const conjoncture = nationaux.filter((e) => !DECISIONS_JOUEUR.has(e.type) && e.type !== 'evenement');
  // Effets locaux de vos projets et des événements : affichés même s'ils pèsent peu dans la moyenne nationale
  const locaux = registre.filter((e) => e.region && ['projet', 'evenement'].includes(e.type));
  const mission = etat.mission ? etapesMission(etat, donnees).find((s) => s.etat === 'a_faire' || s.etat === 'en_cours') ?? null : null;
  return {
    tour: t, decisions, resultats, vosEffets, evenements, conjoncture, locaux,
    attendus: prevoir(etat, 6).filter((e) => Math.abs(e.delta) >= 0.05),
    engagements: engagements(etat, donnees).slice(0, 5),
    mission,
  };
}
