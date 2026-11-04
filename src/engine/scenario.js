// Partie courte « Douze mois pour convaincre » : un scénario joué dans la simulation réelle (même moteur, mêmes ressources).
// L'état ne stocke que le cadre du scénario et les crises déjà déclenchées ; la progression des engagements se déduit
// de l'état réel (projets, lois, programmes, registre des causes) : ouvrir un écran ne fait rien progresser.
import { INDICES } from './territoires.js';
import { regionMission } from './mission.js';
import { eligible } from './events.js';
import { raisonRefusPLF } from './budgetEtat.js';
import { groupesAssemblee, groupesSenat, voterChambre } from './parliament.js';

export const RESULTATS_SCENARIO = {
  complet: 'Réussite complète : les trois engagements sont tenus',
  partiel: 'Réussite partielle : une partie des engagements est tenue',
  echec: 'Échec : aucun engagement n’est tenu',
};
export const ETATS_ENGAGEMENT = { atteint: 'Tenu', partiel: 'En partie', manque: 'Non tenu' };

const r1 = (v) => Math.round(v * 10) / 10;
const somme = (l) => l.reduce((a, v) => a + v, 0);

/** Cadre initial du scénario (null sans territoires ou sans définition). */
export function creerScenario(etat, def) {
  if (!def || !etat.territoires || !INDICES.includes(def.indice)) return null;
  const region = regionMission(etat.territoires, def.indice);
  if (!region) return null;
  return {
    id: def.id, debut: etat.tour, echeance: etat.tour + def.duree_mois, region, indice: def.indice,
    valeurInitiale: etat.territoires[region][def.indice], roleInitial: etat.joueur.role,
    loisInitiales: etat.loisAdoptees.length, popularite: etat.indicateurs.popularite, deficit: etat.indicateurs.deficit,
    crises: [], statut: 'en_cours', bilan: null,
  };
}

/** Projets lancés pendant le scénario, dans la région, agissant sur l'indice (tous comptent). */
export function projetsScenario(etat, donnees) {
  const s = etat.scenario;
  if (!s) return [];
  const res = [];
  for (const p of etat.projets ?? []) {
    const def = donnees.projets?.projets.find((x) => x.id === p.projetId);
    if (def && p.region === s.region && def.effets?.[s.indice] && p.lance >= s.debut && p.lance < s.echeance) res.push({ ...p, def });
  }
  return res;
}

/** Effet observé (registre des causes) des projets du scénario sur l'indice de la région. */
export function effetSoins(etat, projets) {
  const s = etat.scenario;
  if (!s || !projets.length) return 0;
  const sources = new Set(projets.map((p) => `projet:${p.projetId}`));
  return Math.round(somme((etat.explications ?? []).filter((e) => e.region === s.region && e.indicateur === s.indice && sources.has(e.source) && e.nature === 'observe' && e.tour > s.debut).map((e) => e.delta)) * 100) / 100;
}

const theoriqueProjet = (p, indice) => r1(p.def.effets[indice] * p.efficacite * p.facteur);

/**
 * Évaluation des trois engagements sur l'état réel.
 * etat : 'atteint' | 'partiel' | 'manque'. `engage` (action prise), `mesure` (mesure adoptée / en service), `effet` (résultat obtenu).
 */
export function evaluerEngagements(etat, donnees) {
  const s = etat.scenario;
  const def = donnees.scenario;
  if (!s || !def) return [];
  return def.engagements.map((d) => {
    const base = { id: d.id, type: d.type, titre: d.titre, resume: d.resume, lever: d.lever };
    if (d.type === 'indice_region') {
      const ps = projetsScenario(etat, donnees);
      const effet = effetSoins(etat, ps);
      const theorique = r1(somme(ps.map((p) => theoriqueProjet(p, s.indice))));
      const enService = ps.filter((p) => p.statut !== 'chantier').length;
      const finMontee = ps.length ? Math.max(...ps.map((p) => p.service + p.def.montee_mois - 1)) : null;
      return {
        ...base, cible: d.cible, valeur: effet, etat: effet >= d.cible ? 'atteint' : ps.length ? 'partiel' : 'manque',
        engage: ps.length > 0, mesure: enService > 0, effet: effet > 0,
        projets: ps.map((p) => ({ projetId: p.projetId, titre: p.def.titre, lance: p.lance, service: p.service, statut: p.statut, alea: p.alea, cout: p.def.cout_md })),
        restantAttendu: ps.length ? Math.max(0, r1(theorique - effet)) : 0, finMontee,
        detail: !ps.length ? 'Aucun projet lancé dans la région.' : effet >= d.cible ? `+${r1(effet)} pts attribués à vos projets (cible ${d.cible}).`
          : effet > 0 ? `+${r1(effet)} pts attribués pour l’instant (cible ${d.cible}) ; encore attendu : environ +${Math.max(0, r1(theorique - effet))}.`
          : enService ? 'En service : premiers effets attendus le mois prochain.' : `Chantier en cours : mise en service au mois ${Math.min(...ps.map((p) => p.service))}.`,
      };
    }
    if (d.type === 'loi_promulguee') {
      const promulguees = etat.loisAdoptees.slice(s.loisInitiales ?? 0);
      const adoptionsAN = (etat.journal ?? []).filter((j) => j.type === 'vote' && j.tour > s.debut && /^Assemblée : «.*adoptée/.test(j.texte)).length;
      const rejets = (etat.journal ?? []).filter((j) => j.type === 'rejet' && j.tour > s.debut).length;
      const enNavette = !!etat.texte;
      const loi = enNavette ? donnees.lois?.find((l) => l.id === etat.texte.loiId) : null;
      return {
        ...base, valeur: promulguees.length, cible: 1, etat: promulguees.length ? 'atteint' : adoptionsAN || enNavette ? 'partiel' : 'manque',
        engage: adoptionsAN > 0 || enNavette || promulguees.length > 0 || rejets > 0, mesure: promulguees.length > 0, effet: promulguees.length > 0,
        lois: promulguees.map((id) => donnees.lois?.find((l) => l.id === id)?.titre ?? id), rejets, enNavette: loi?.titre ?? null, etape: etat.texte?.etape ?? null,
        detail: promulguees.length ? `Promulguée : ${promulguees.map((id) => donnees.lois?.find((l) => l.id === id)?.titre ?? id).join(', ')}.`
          : enNavette ? `« ${loi?.titre ?? 'Texte'} » en navette (étape : ${etat.texte.etape}).`
          : adoptionsAN ? `Adoptée à l’Assemblée mais pas promulguée${rejets ? ` ; ${rejets} rejet(s)` : ''}.`
          : rejets ? `${rejets} texte(s) rejeté(s), aucun promulgué.` : 'Aucune loi déposée.',
      };
    }
    if (d.type === 'programme_effets') {
      const ps = (etat.politiques ?? []).filter((x) => x.debut >= s.debut && x.debut < s.echeance).map((x) => ({ ...x, def: donnees.politiques?.politiques.find((p) => p.id === x.id) }));
      const actifs = ps.filter((x) => x.statut !== 'preparation');
      return {
        ...base, valeur: actifs.length, cible: 1, etat: actifs.length ? 'atteint' : ps.length ? 'partiel' : 'manque',
        engage: ps.length > 0, mesure: ps.length > 0, effet: actifs.length > 0,
        programmes: ps.map((x) => ({ id: x.id, titre: x.def?.titre ?? x.id, statut: x.statut, enService: x.enService, coutAnnuel: x.def?.cout_annuel_md ?? 0, contrepartie: x.def?.contrepartie ?? null })),
        detail: actifs.length ? `Premiers effets : ${actifs.map((x) => x.def?.titre ?? x.id).join(', ')}.`
          : ps.length ? `${ps.map((x) => x.def?.titre ?? x.id).join(', ')} : en préparation jusqu’au mois ${Math.min(...ps.map((x) => x.enService))}.` : 'Aucun programme engagé.',
      };
    }
    return { ...base, etat: 'manque', detail: 'Type inconnu.' };
  });
}

/** Garde-fou financier : « tout lancer » tient les engagements mais dégrade les finances ; la réussite complète l'exige respecté. */
export function gardeFou(etat, def) {
  const g = def?.garde_fou;
  const s = etat.scenario;
  if (!g || !s) return null;
  const debut = g.indicateur === 'deficit' ? s.deficit : s.popularite;
  const fin = etat.indicateurs[g.indicateur];
  return { indicateur: g.indicateur, hausseMax: g.hausse_max, debut, fin, hausse: Math.round((fin - debut) * 100) / 100, respecte: fin - debut <= g.hausse_max + 1e-9, texte: g.texte };
}

/** Résultat global d'après les engagements (et le garde-fou, s'il est défini). */
export function resultatScenario(engagements, garde = null) {
  const atteints = engagements.filter((e) => e.etat === 'atteint').length;
  const partiels = engagements.filter((e) => e.etat === 'partiel').length;
  if (engagements.length && atteints === engagements.length) return garde && !garde.respecte ? 'partiel' : 'complet';
  if (atteints > 0 || (engagements.length && partiels === engagements.length)) return 'partiel';
  return 'echec';
}

/**
 * Crise programmée due pour le mois `tour` (nouveau mois), ou suite d'une crise passée. Pure.
 * Renvoie { evenementId, region, crise } ou null. La région « scenario » est celle du scénario.
 */
export function criseDue(etat, donnees, tour) {
  const s = etat.scenario, def = donnees.scenario;
  if (!s || !def || s.statut !== 'en_cours' || !donnees.evenements) return null;
  const deja = new Set((s.crises ?? []).map((c) => c.id));
  const trouver = (id) => donnees.evenements.find((e) => e.id === id);
  for (const c of def.crises ?? []) {
    // Suite d'une crise déjà déclenchée : selon le choix fait et le délai
    if (c.suite && !deja.has(c.suite.evenement)) {
      const passe = (etat.evenementsPasses ?? []).find((p) => (c.candidats ?? []).includes(p.id) && deja.has(p.id));
      if (passe && c.suite.siChoix.includes(passe.choix) && tour === passe.tour + c.suite.delaiMois) {
        const ev = trouver(c.suite.evenement);
        if (ev && eligible(ev, { ...etat, tour }, { scenario: true })) return { evenementId: ev.id, region: ev.region_cible ? s.region : null, crise: c };
      }
    }
    if (tour !== s.debut + c.mois) continue;
    if ((c.candidats ?? []).some((id) => deja.has(id))) continue;
    for (const id of c.candidats ?? []) {
      const ev = trouver(id);
      if (ev && eligible(ev, { ...etat, tour }, { scenario: true })) return { evenementId: ev.id, region: c.region === 'scenario' || ev.region_cible ? s.region : null, crise: c };
    }
  }
  return null;
}

/** Bilan du scénario : engagements, crises rencontrées, compromis, conséquences politiques. Pur. */
export function bilanScenario(etat, donnees) {
  const s = etat.scenario;
  const engagements = evaluerEngagements(etat, donnees);
  const j = (etat.journal ?? []).filter((x) => x.tour >= s.debut);
  const crises = (s.crises ?? []).map((c) => {
    const ev = donnees.evenements?.find((e) => e.id === c.id);
    const passe = (etat.evenementsPasses ?? []).find((p) => p.id === c.id && p.tour >= c.tour - 1);
    return { id: c.id, tour: c.tour, titre: ev?.titre ?? c.id, choix: passe?.choix ?? null, libelle: passe ? ev?.choix?.[passe.choix]?.libelle ?? null : null, parDefaut: !!passe && j.some((x) => x.type === 'evenement-auto' && x.texte.startsWith(ev?.titre ?? '\u0000')) };
  });
  const garde = gardeFou(etat, donnees.scenario);
  return {
    tour: etat.tour, resultat: resultatScenario(engagements, garde), engagements, crises, gardeFou: garde,
    compromis: {
      accords: j.filter((x) => x.type === 'accord' && x.texte.startsWith('Accord de soutien conclu')).length,
      accordsRefuses: j.filter((x) => x.type === 'accord' && /refuse/.test(x.texte)).length,
      amendements: j.filter((x) => x.type === 'amendement').length,
      recours493: j.filter((x) => x.type === '493').length,
      censures: j.filter((x) => x.type === 'censure').length,
      budget: j.some((x) => x.type === 'budget' && x.texte.startsWith('Loi de finances promulguée')) ? 'adopte' : j.some((x) => x.type === 'budget' && /loi spéciale/.test(x.texte)) ? 'loi_speciale' : 'aucun',
    },
    roleChange: etat.joueur.role !== s.roleInitial ? etat.joueur.role : null,
    fin: etat.fin?.type ?? null,
    popularite: { debut: s.popularite, fin: etat.indicateurs.popularite }, deficit: { debut: s.deficit, fin: etat.indicateurs.deficit },
    indice: { debut: s.valeurInitiale, fin: etat.territoires?.[s.region]?.[s.indice] ?? null },
    elections: (etat.resultatsElections ?? []).filter((r) => r.tour >= s.debut && r.tour <= etat.tour).map((r) => ({ id: r.id, type: r.type, tour: r.tour, vainqueur: r.vainqueur ?? null })),
  };
}

/** À appeler après chaque tour : clôt le scénario à l'échéance ou en cas de fin de partie. */
export function avancerScenario(etat, donnees) {
  const s = etat.scenario;
  if (!s || s.statut !== 'en_cours') return etat;
  if (etat.tour < s.echeance && !etat.fin) return etat;
  const bilan = bilanScenario(etat, donnees);
  return {
    ...etat,
    scenario: { ...s, statut: 'termine', bilan },
    journal: [...etat.journal, { tour: etat.tour, type: 'scenario', texte: `Fin du scénario « Douze mois pour convaincre » : ${RESULTATS_SCENARIO[bilan.resultat].toLowerCase()}.` }],
  };
}

const ONGLET_ENGAGEMENT = {
  soins: { onglet: 'carte' }, parlement: { onglet: 'decisions', decisions: { categorie: 'nationale', type: 'loi' } }, avenir: { onglet: 'decisions', decisions: { categorie: 'nationale', type: 'programme' } },
};

/**
 * Au plus 3 priorités du mois, chacune avec sa raison concrète (urgence, engagement choisi, échéance, décision en cours).
 * Présentation seulement : rien n'est décidé à la place du joueur.
 */
export function priorites(etat, donnees) {
  const s = etat.scenario;
  if (!s) return [];
  const res = [];
  const restant = s.echeance - etat.tour;
  if (etat.evenement) {
    const ev = donnees.evenements?.find((e) => e.id === etat.evenement);
    res.push({ id: 'evenement', type: 'urgence', titre: ev?.titre ?? 'Événement', raison: 'Sans réponse ce mois-ci, l’option par défaut s’applique.', aller: { onglet: 'bureau', cible: 'evenement' } });
  }
  if (s.statut === 'en_cours') {
    const pm = etat.joueur.role === 'premier_ministre';
    for (const e of evaluerEngagements(etat, donnees)) {
      if (e.etat !== 'manque') continue;
      if (e.id === 'avenir' && !pm) continue; // plus accessible : la conclusion l'expliquera
      const delai = e.id === 'parlement' ? 'il faut au moins 3 mois' : e.id === 'avenir' ? 'les premiers effets demandent plusieurs mois' : 'un chantier dure 3 à 8 mois';
      res.push({ id: e.id, type: 'engagement', titre: e.titre, raison: `Engagement non commencé : ${delai}, ${restant} mois restant${restant > 1 ? 's' : ''}.`, aller: ONGLET_ENGAGEMENT[e.id] ?? { onglet: 'decisions' } });
    }
    if (etat.texte && pm && (etat.joueur.capital >= 1)) {
      const loi = donnees.lois?.find((l) => l.id === etat.texte.loiId);
      res.push({ id: 'navette', type: 'echeance', titre: `« ${loi?.titre ?? 'Texte'} » : ${etat.texte.etape === 'assemblee' || etat.texte.etape === 'lecture_definitive' ? 'vote à l’Assemblée' : etat.texte.etape === 'senat' ? 'vote au Sénat' : 'étape suivante'} en fin de mois`, raison: 'Vous pouvez encore amender (compromis) ou, à l’Assemblée, engager le 49.3.', aller: { onglet: 'parlement' } });
    }
    if (etat.budget && pm && !etat.plf && !raisonRefusPLF(etat)) {
      const mois = ((etat.dateDepart.mois - 1 + etat.tour) % 12) + 1;
      res.push({ id: 'budget', type: 'decision', titre: 'Budget de l’État à déposer', raison: `Fenêtre ouverte jusqu’en décembre (${13 - mois} mois) ; sans budget voté, une loi spéciale reconduit les crédits.`, aller: { onglet: 'budget' } });
    }
    if (restant <= 2) res.push({ id: 'echeance', type: 'echeance', titre: `Conclusion dans ${restant} mois`, raison: 'Les engagements seront jugés sur l’état réel à l’échéance.', aller: { onglet: 'bureau', cible: 'scenario' } });
  }
  return res.slice(0, 3);
}

/**
 * Aperçu PUR d'un amendement de compromis sur le texte en navette : vote estimé avant / après (chambre en cours),
 * orientation et facteur d'effets résultants. Rien n'est modifié.
 */
export function apercuAmendement(etat, { partis, senat, lois }) {
  const t = etat.texte;
  if (!t) return null;
  const loi = lois?.find((l) => l.id === t.loiId);
  if (!loi) return null;
  const chambre = t.etape === 'senat' ? 'senat' : ['assemblee', 'lecture_definitive'].includes(t.etape) ? 'assemblee' : null;
  const groupes = chambre === 'senat' ? groupesSenat(senat, partis) : chambre === 'assemblee' ? groupesAssemblee(partis, etat.sieges) : null;
  const apres = { orientation: Math.round(t.orientation * 0.7), facteur: Math.round(t.facteur * 0.8 * 100) / 100 };
  const vote = (o) => (groupes ? voterChambre(etat, groupes, loi.theme, o) : null);
  const possible = t.etape === 'conseil' ? 'Le texte est devant le Conseil constitutionnel : plus d’amendement possible.'
    : t.amendements >= 2 ? 'Le texte a déjà été amendé deux fois.' : etat.actionCeMois ? 'Vous avez déjà agi au Parlement ce mois-ci.' : etat.joueur.capital < 1 ? 'Capital politique insuffisant (1 requis).' : null;
  return { loi: loi.titre, chambre, avant: vote(t.orientation), apres: vote(apres.orientation), orientationAvant: t.orientation, ...apres, effetsRestants: Math.round(apres.facteur * 100), possible };
}
