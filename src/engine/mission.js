// Mission d'initiation : une situation réelle de la partie (même moteur, mêmes ressources).
// L'état ne stocke que le cadre de la mission ; la progression se déduit de l'état réel
// (projets lancés, mises en service, explications) : ouvrir un écran ne fait rien progresser.
import { INDICES } from './territoires.js';
import { facteurTaille, raisonRefusProjet } from './projets.js';

export const RESULTATS_MISSION = {
  realisation: 'Réalisation obtenue',
  engagement: 'Engagement pris, effets encore attendus',
  manque: 'Objectif non atteint : aucune réponse engagée',
};

/** Région de la mission : indice le plus bas ; égalité départagée par l'identifiant (ordre alphabétique). */
export function regionMission(territoires, indice) {
  let min = null;
  for (const id of Object.keys(territoires ?? {}).sort()) {
    const v = territoires[id]?.[indice];
    if (Number.isFinite(v) && (min == null || v < min.v)) min = { id, v };
  }
  return min?.id ?? null;
}

/** Cadre initial de la mission (null sans territoires). */
export function creerMission(etat, def) {
  if (!def || !etat.territoires || !INDICES.includes(def.indice)) return null;
  const region = regionMission(etat.territoires, def.indice);
  if (!region) return null;
  return {
    id: def.id, debut: etat.tour, echeance: etat.tour + def.duree_mois, region, indice: def.indice,
    valeurInitiale: etat.territoires[region][def.indice], roleInitial: etat.joueur.role,
    differe: null, statut: 'en_cours', debrief: null,
  };
}

/** Tous les projets engagés pour la mission : agissant sur l'indice, dans la région, lancés pendant la mission (ordre de lancement). */
export function projetsMission(etat, donnees) {
  const m = etat.mission;
  if (!m) return [];
  const res = [];
  for (const p of etat.projets ?? []) {
    const def = donnees.projets?.projets.find((x) => x.id === p.projetId);
    if (def && p.region === m.region && def.effets?.[m.indice] && p.lance >= m.debut && p.lance < m.echeance) res.push({ ...p, def });
  }
  return res;
}

/** Premier projet engagé pour la mission (affichage) ; voir projetsMission pour la liste complète. */
export const projetMission = (etat, donnees) => projetsMission(etat, donnees)[0] ?? null;

/**
 * Effet observé (registre des causes) des projets de la mission sur l'indice de la région.
 * Accepte un projet ou une liste : un second projet lancé pendant la mission compte aussi.
 */
export function effetObserve(etat, projets) {
  const m = etat.mission;
  const liste = Array.isArray(projets) ? projets : projets ? [projets] : [];
  if (!m || !liste.length) return 0;
  const sources = new Set(liste.map((p) => `projet:${p.projetId}`));
  const s = (etat.explications ?? []).filter((e) => e.region === m.region && e.indicateur === m.indice && sources.has(e.source) && e.nature === 'observe' && e.tour > m.debut)
    .reduce((a, e) => a + e.delta, 0);
  return Math.round(s * 100) / 100;
}

/** Effet total théorique d'un projet de la mission (si la montée en charge va à son terme). */
const effetTheorique = (projet, indice) => Math.round(projet.def.effets[indice] * projet.efficacite * projet.facteur * 10) / 10;
const somme = (l) => Math.round(l.reduce((a, v) => a + v, 0) * 10) / 10;

/**
 * Étapes de la mission, chacune évaluée sur l'état réel.
 * etat : 'fait' | 'en_cours' | 'a_faire' | 'impossible'.
 */
export function etapesMission(etat, donnees) {
  const m = etat.mission;
  if (!m) return [];
  const ps = projetsMission(etat, donnees);
  const p = ps[0] ?? null;
  const effet = effetObserve(etat, ps);
  const enService = ps.filter((x) => x.statut !== 'chantier');
  const termine = m.statut === 'terminee';
  const e = (id, fait, detail, enCours = false) => ({ id, etat: fait ? 'fait' : enCours ? 'en_cours' : termine ? 'impossible' : 'a_faire', detail });
  const titres = ps.map((x) => x.def.titre).join(' et ');
  return [
    e('comprendre', true, `Indice de départ : ${m.valeurInitiale}/100.`),
    e('choisir', !!p || m.differe != null, p ? `${titres} lancé${ps.length > 1 ? 's' : ''} au mois ${p.lance}.` : m.differe != null ? `Décision différée au mois ${m.differe}.` : 'Comparez les réponses et choisissez.'),
    e('chantier', !!p, p ? `Mise en service prévue au mois ${p.service}${p.retard ? ` (retard de ${p.retard} mois)` : ''}${ps.length > 1 ? ` ; ${ps.length} projets engagés.` : '.'}` : 'Aucun chantier engagé.'),
    e('service', enService.length > 0, p ? (enService.length ? `Mise en service commencée (${enService.length}/${ps.length}).` : `En chantier jusqu’au mois ${p.service}.`) : '—', !!p && !enService.length),
    e('effet', effet > 0, effet > 0 ? `+${effet} pt observé(s) sur l’indice.` : p ? 'Effets attendus après la mise en service.' : '—', !!p && effet <= 0),
    e('debrief', termine, termine ? 'Débrief disponible.' : `Au mois ${m.echeance}, ou plus tôt si la partie s’arrête.`),
  ];
}

/** Débrief : réalisation, engagement ou occasion manquée, avec ce qui reste attendu. */
export function debriefMission(etat, donnees) {
  const m = etat.mission;
  const ps = projetsMission(etat, donnees);
  const p = ps[0] ?? null;
  const effet = effetObserve(etat, ps);
  const resultat = effet > 0 ? 'realisation' : p ? 'engagement' : 'manque';
  // Tous les projets de la mission comptent : effet théorique, reste attendu et coût sont cumulés
  const theorique = somme(ps.map((x) => effetTheorique(x, m.indice)));
  const dateFinMontee = ps.length ? Math.max(...ps.map((x) => x.service + x.def.montee_mois - 1)) : null;
  return {
    tour: etat.tour, resultat,
    projetId: p?.projetId ?? null, projets: ps.map((x) => x.projetId), lance: p?.lance ?? null, service: p?.service ?? null, alea: ps.map((x) => x.alea).filter(Boolean).join(' ; ') || null,
    effetObserve: effet, effetTheorique: theorique,
    restantAttendu: p ? Math.max(0, Math.round((theorique - effet) * 10) / 10) : 0,
    finMontee: dateFinMontee,
    valeurInitiale: m.valeurInitiale, valeurFinale: etat.territoires?.[m.region]?.[m.indice] ?? null,
    differe: m.differe, roleChange: etat.joueur.role !== m.roleInitial ? etat.joueur.role : null,
    fin: etat.fin?.type ?? null, coutEngage: Math.round(ps.reduce((a, x) => a + x.def.cout_md, 0) * 1000) / 1000,
  };
}

/** À appeler après chaque tour : clôt la mission à l'échéance ou en cas de fin de partie. */
export function avancerMission(etat, donnees) {
  const m = etat.mission;
  if (!m || m.statut !== 'en_cours') return etat;
  if (etat.tour < m.echeance && !etat.fin) return etat;
  const debrief = debriefMission(etat, donnees);
  return {
    ...etat,
    mission: { ...m, statut: 'terminee', debrief },
    journal: [...etat.journal, { tour: etat.tour, type: 'mission', texte: `Fin de la mission d’initiation : ${RESULTATS_MISSION[debrief.resultat].toLowerCase()}.` }],
  };
}

/** Différer : choix explicite de ne rien engager pour l'instant (la mission reste ouverte). */
export function differerMission(etat) {
  const m = etat.mission;
  if (!m || m.statut !== 'en_cours') throw new Error('Aucune mission en cours.');
  if (m.differe != null) return etat;
  return { ...etat, mission: { ...m, differe: etat.tour },
    journal: [...etat.journal, { tour: etat.tour, type: 'mission', texte: 'Vous différez la réponse : aucun moyen engagé ce mois-ci.' }] };
}

/** Aperçu pur d'un projet dans une région : aucun effet sur l'état, la graine ou les ressources. */
export function apercuProjet(etat, projetId, regionId, donnees) {
  const def = donnees.projets?.projets.find((x) => x.id === projetId);
  const region = donnees.regions?.regions.find((r) => r.id === regionId);
  if (!def || !region) return null;
  const facteur = facteurTaille(region.population);
  const debut = etat.tour + def.delai_mois; // premier mois où l'indice bouge (mise en service = 1er mois de montée en charge)
  return {
    id: def.id, titre: def.titre, description: def.description, beneficiaires: def.beneficiaires ?? null,
    region: region.id, regionNom: region.nom, secteur: def.secteur,
    coutMd: def.cout_md, coutAnnuelMd: def.cout_annuel_md, capital: 0, enveloppe: etat.finances?.enveloppe ?? 0,
    delaiMois: def.delai_mois, monteeMois: def.montee_mois, premiersEffetsTour: debut, finMonteeTour: debut + def.montee_mois - 1,
    // Effets théoriques si la montée en charge va à son terme, avant bornes et autres variations
    effets: Object.entries(def.effets).map(([indice, total]) => ({ indice, total: Math.round(total * facteur * 10) / 10, avant: etat.territoires?.[region.id]?.[indice] ?? null })),
    effetsDansMission: etat.mission?.statut === 'en_cours'
      ? Object.entries(def.effets).map(([indice, total]) => ({ indice, total: Math.round((total * facteur / def.montee_mois) * Math.min(def.montee_mois, Math.max(0, etat.mission.echeance - debut + 1)) * 10) / 10 }))
      : null,
    risque: def.risque ? { proba: def.risque.proba, texte: def.risque.texte, type: def.risque.type } : null,
    refus: raisonRefusProjet(etat, def, region),
  };
}

