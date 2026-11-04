// Simulations scriptées de la partie courte (équilibrage) : node scripts/sim-partie-courte.mjs
// Résultats de simulation, pas une preuve d'intérêt de jeu.
import { readFileSync } from 'node:fs';
import { creerPartie, tourSuivant, lancerProjet, proposerLoi, engagerPolitique, negocierAccord, resoudreEvenement, catalogueDecisions, groupesAssemblee, voterChambre, evaluerEngagements } from '../src/engine/index.js';
const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const n = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events', 'objectifs', 'scenario'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements, objectifs, scenario] = n.map((x) => lire(`${x}.json`));
const d = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements, objectifs, scenario };
const situation = lire('situation.json');
const partie = (graine, parti) => creerPartie({ joueur: { nom: 'Sim', parti, role: 'premier_ministre', ideologie: { ...partis.find((p) => p.id === parti).positions } }, situation, graine, ...d });
const repondre = (e, i) => { if (!e.evenement) return e; for (const k of [i, 0, 1, 2]) { try { return resoudreEvenement(e, k, d); } catch { /* refusé */ } } return e; };
const loiAdoptable = (e) => { const AN = groupesAssemblee(partis, e.sieges); const dispo = catalogueDecisions(e, d).filter((x) => x.type === 'loi' && !x.raison).map((x) => lois.find((l) => `loi:${l.id}` === x.id)); return (dispo.find((l) => voterChambre(e, AN, l.theme, l.orientation).adoptee) ?? dispo[0])?.id; };
const loiDuCamp = (e) => { const p = partis.find((x) => x.id === e.joueur.parti); const dispo = catalogueDecisions(e, d).filter((x) => x.type === 'loi' && !x.raison).map((x) => lois.find((l) => `loi:${l.id}` === x.id)); return dispo.sort((a, b) => Math.abs(p.positions[a.theme] - a.orientation) - Math.abs(p.positions[b.theme] - b.orientation))[0]?.id; };

const STRATEGIES = {
  constructive: (e, m) => { if (m === 0) { e = lancerProjet(e, 'recrutement-soignants', e.scenario.region, d); e = proposerLoi(e, loiAdoptable(e), d); e = engagerPolitique(e, 'apprentissage', d); } return repondre(e, 0); },
  compromis: (e, m) => { if (m === 0) { e = lancerProjet(e, 'centres-sante', e.scenario.region, d); } if (m === 1) { try { e = negocierAccord(e, partis.find((p) => p.id !== e.joueur.parti && p.sieges_assemblee)?.id, d); } catch { /* */ } } if (m === 2 && !e.texte) { try { e = proposerLoi(e, loiDuCamp(e), d); } catch { /* */ } } if (m === 3 && e.joueur.role === 'premier_ministre') { try { e = engagerPolitique(e, 'police-proximite', d); } catch { /* */ } } return repondre(e, 1); },
  inaction: (e) => e,
  toutLancer: (e, m) => { for (const id of ['recrutement-soignants', 'centres-sante']) { try { e = lancerProjet(e, id, e.scenario.region, d); } catch { /* */ } } if (!e.texte) { try { e = proposerLoi(e, loiAdoptable(e), d); } catch { /* */ } } for (const p of politiques.politiques) { try { e = engagerPolitique(e, p.id, d); } catch { /* */ } } return repondre(e, 0); },
};
const GRAINES = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
const PARTIS = ['epr', 'rn', 'lfi', 'ps', 'dr'];
for (const [nom, strat] of Object.entries(STRATEGIES)) {
  const stats = { complet: 0, partiel: 0, echec: 0, fins: 0, role: 0, pop: 0, deficit: 0, n: 0 };
  for (const parti of PARTIS) for (const g of GRAINES) {
    let e = partie(g, parti);
    for (let m = 0; m < 12 && !e.fin; m++) { try { e = strat(e, m); } catch { /* action refusée */ } e = tourSuivant(e, d); }
    const b = e.scenario.bilan; stats[b.resultat]++; stats.n++; if (e.fin) stats.fins++; if (b.roleChange) stats.role++; stats.pop += b.popularite.fin; stats.deficit += b.deficit.fin;
  }
  console.log(`${nom.padEnd(12)} complet ${stats.complet}/${stats.n} partiel ${stats.partiel} échec ${stats.echec} · fins anticipées ${stats.fins} · rôle perdu ${stats.role} · popularité moy. ${(stats.pop / stats.n).toFixed(1)} · déficit moy. ${(stats.deficit / stats.n).toFixed(2)}`);
}
