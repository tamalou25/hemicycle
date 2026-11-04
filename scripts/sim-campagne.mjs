// Simulations scriptées de la campagne présidentielle (équilibrage, lot 5) : node scripts/sim-campagne.mjs [graines]
// Plusieurs stratégies × trois niveaux × graines. Résultats de simulation, pas une preuve d'intérêt de jeu.
import { readFileSync } from 'node:fs';
import { creerPartie, tourSuivant, resoudreEvenement, lancerInvestissement, raisonRefusInvestissement, proposerAccord, raisonRefusAccordPays, repondreInitiative, raisonRefusReponseInitiative, lancerProgrammeDefense, raisonRefusProgrammeDefense, engagerPolitique, raisonRefusPolitique, lancerProjet, raisonRefusProjet, deposerPLF, raisonRefusPLF, evaluerFin, INDICATEURS } from '../src/engine/index.js';
const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const n = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events', 'economie', 'pays', 'defense', 'difficulte', 'objectifs'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements, economie, pays, defense, difficulte, objectifs] = n.map((x) => lire(`${x}.json`));
const d = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements, economie, pays, defense, difficulte, objectifs };
const situation = lire('situation.json');
const NB = Number(process.argv[2] ?? 10);
const GRAINES = Array.from({ length: NB }, (_, i) => i * 7 + 1);
const partie = (graine, niveau, parti = 'epr') => creerPartie({ joueur: { nom: 'Sim', parti, role: 'president', ideologie: { ...partis.find((p) => p.id === parti).positions }, difficulte: niveau }, situation, graine, dateDepart: '2027-05-01', ...d });
const essayer = (f) => { try { return f(); } catch { return null; } };
const repondre = (e, i = 0) => { if (e.evenement) { const ev = evenements.find((x) => x.id === e.evenement); for (const k of [i, 0, 1, ev.choix.length - 1]) { const r = essayer(() => resoudreEvenement(e, k, d)); if (r) { e = r; break; } } } if (e.diplomatie?.initiative) { for (const k of [i, 0, 1, 2, 3]) { if (raisonRefusReponseInitiative(e, k, d)) continue; const r = essayer(() => repondreInitiative(e, k, d)); if (r) { e = r; break; } } } return e; };
const STRATEGIES = {
  passif: (e) => e,
  reactif: (e) => repondre(e, 0),
  investisseur: (e) => { e = repondre(e, 0); for (const inv of economie.investissements) if (!raisonRefusInvestissement(e, inv, economie)) { e = lancerInvestissement(e, inv.id, d); break; } for (const p of defense.programmes) if (!raisonRefusProgrammeDefense(e, p, defense)) { e = lancerProgrammeDefense(e, p.id, d); break; } return e; },
  negociateur: (e) => { e = repondre(e, 0); for (const x of pays.pays) for (const a of ['energie', 'commerce', 'recherche', 'defense']) if (!raisonRefusAccordPays(e, x.id, a, d)) return proposerAccord(e, x.id, a, d); return e; },
  toutAzimut: (e) => { e = repondre(e, 0); for (const p of politiques.politiques) if (!raisonRefusPolitique(e, p, politiques)) { e = engagerPolitique(e, p.id, d); break; } for (const r of regions.regions) for (const p of projets.projets) if (!raisonRefusProjet(e, p, r)) { e = essayer(() => lancerProjet(e, p.id, r.id, d)) ?? e; break; } for (const inv of economie.investissements) if (!raisonRefusInvestissement(e, inv, economie)) { e = lancerInvestissement(e, inv.id, d); break; } if (!raisonRefusPLF(e)) e = deposerPLF(e, { depenses: { defense_securite: 3, infrastructures_environnement: 2 }, recettes: { impots_entreprises: 1 } }); return e; },
};
const moy = (t) => (t.reduce((a, b) => a + b, 0) / t.length).toFixed(1);
console.log('stratégie    niveau     fins≠mandat  score  popul.  chôm.  déficit  dette  inflat.  pénuries(mois)  relAlliés  dispo  capitalFinal');
for (const [nom, strat] of Object.entries(STRATEGIES)) for (const niveau of ['facile', 'normal', 'difficile']) {
  const r = GRAINES.map((g) => { let e = partie(g, niveau); let penuries = 0; for (let m = 0; m < 60 && !e.fin; m++) { e = essayer(() => strat(e)) ?? e; e = tourSuivant(e, d); if (Object.values(e.economie?.penuries ?? {}).some((p) => p > 0.02)) penuries++; } for (const i of INDICATEURS) if (!Number.isFinite(e.indicateurs[i])) throw new Error(`NaN ${i}`); const allies = pays.pays.filter((p) => p.otan || p.ue).map((p) => e.diplomatie.relations[p.id]); return { e, penuries, score: evaluerFin(e, { regions, objectifs }).score, allies: allies.reduce((a, b) => a + b, 0) / allies.length }; });
  const fins = r.filter((x) => x.e.fin && x.e.fin.type !== 'mandat').length;
  const ind = (k) => moy(r.map((x) => x.e.indicateurs[k]));
  console.log(`${nom.padEnd(12)} ${niveau.padEnd(10)} ${String(fins).padStart(2)}/${NB}        ${moy(r.map((x) => x.score)).padStart(5)}  ${ind('popularite').padStart(5)}  ${ind('chomage').padStart(5)}  ${ind('deficit').padStart(6)}  ${ind('dette').padStart(5)}  ${ind('inflation').padStart(6)}  ${moy(r.map((x) => x.penuries)).padStart(8)}       ${moy(r.map((x) => x.allies)).padStart(5)}   ${moy(r.map((x) => x.e.defense.disponibilite)).padStart(5)}  ${moy(r.map((x) => x.e.joueur.capital))}`);
}
