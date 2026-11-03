// Non-régression de l'équilibrage : parties complètes simulées sur plusieurs graines.
// Les fourchettes ne visent pas un « bon » résultat politique : elles détectent les dérives
// (dette qui explose, défaite systématique, investissements sans effet, élections jouées d'avance…).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, lancerProjet, raisonRefusProjet, satisfactionNationale, seDeclarerCandidat,
  voterBudgetAssemblee, normaliserPLF, INDICATEURS, resoudreEvenement,
} from '../src/engine/index.js';
import { groupesAssemblee } from '../src/engine/parliament.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements };
const situation = lire('situation.json');
const GRAINES = Array.from({ length: 20 }, (_, i) => i + 1);
const moyenne = (t) => t.reduce((a, b) => a + b, 0) / t.length;

const nouvelle = (graine, parti = 'epr') => creerPartie({ joueur: { nom: 'Sim', parti, role: 'premier_ministre', ideologie: partis.find((p) => p.id === parti).positions }, situation, graine, ...donnees });

/** Joue `mois` tours ; `strategie(etat)` peut renvoyer un nouvel état (décisions du mois). Sans réponse, un événement reçoit l'option passive. */
function jouer(graine, mois, strategie = (e) => e, parti) {
  let e = nouvelle(graine, parti);
  for (let m = 0; m < mois && !e.fin; m++) e = tourSuivant(strategie(e), donnees);
  return e;
}
const investir = (e) => {
  for (const r of [...regions.regions].sort((a, b) => b.population - a.population)) {
    for (const p of projets.projets) if (!raisonRefusProjet(e, p, r)) return lancerProjet(e, p.id, r.id, donnees);
  }
  return e;
};

describe('équilibrage : partie passive sur un mandat (20 graines)', () => {
  const parties = GRAINES.map((g) => jouer(g, 60));
  it('aucune valeur invalide (NaN, infini) dans les indicateurs', () => {
    for (const e of parties) for (const i of INDICATEURS) expect(Number.isFinite(e.indicateurs[i]), `${i}`).toBe(true);
  });
  const echec = (e) => e.fin && e.fin.type !== 'mandat' && e.fin.type !== 'victoire';
  it('ignorer tous les événements coûte cher, sans condamner d’avance (moins de 75 % d’échecs)', () => {
    expect(parties.filter(echec).length / parties.length).toBeLessThan(0.75);
  });
  it('répondre aux événements permet de finir son mandat (moins de 20 % d’échecs) : la réactivité compte', () => {
    const reactif = (e) => {
      if (!e.evenement) return e;
      const ev = evenements.find((x) => x.id === e.evenement);
      const i = ev.choix.findIndex((c) => (c.cout_capital ?? 0) <= e.joueur.capital);
      return resoudreEvenement(e, Math.max(0, i), donnees);
    };
    const reactives = GRAINES.map((g) => jouer(g, 60, reactif));
    expect(reactives.filter(echec).length / reactives.length).toBeLessThan(0.2);
    expect(reactives.filter(echec).length).toBeLessThan(parties.filter(echec).length);
  });
  it('dette : progression modérée sans action (pas d’emballement)', () => {
    const dette = moyenne(parties.map((e) => e.indicateurs.dette));
    expect(dette).toBeGreaterThan(110);
    expect(dette).toBeLessThan(140);
  });
  it('déficit, chômage, inflation restent dans des ordres de grandeur plausibles', () => {
    expect(moyenne(parties.map((e) => e.indicateurs.deficit))).toBeGreaterThan(2);
    expect(moyenne(parties.map((e) => e.indicateurs.deficit))).toBeLessThan(9);
    expect(moyenne(parties.map((e) => e.indicateurs.chomage))).toBeGreaterThan(5);
    expect(moyenne(parties.map((e) => e.indicateurs.chomage))).toBeLessThan(12);
    expect(moyenne(parties.map((e) => e.indicateurs.inflation))).toBeLessThan(5);
  });
});

describe('équilibrage : les décisions comptent', () => {
  it('investir dans les territoires améliore la satisfaction par rapport à l’inaction (24 mois)', () => {
    const passif = moyenne(GRAINES.map((g) => satisfactionNationale(jouer(g, 24).territoires, regions.regions)));
    const actif = moyenne(GRAINES.map((g) => satisfactionNationale(jouer(g, 24, investir).territoires, regions.regions)));
    expect(actif - passif).toBeGreaterThan(2);
  });
  it('investir coûte : l’enveloppe se vide et des coûts de fonctionnement apparaissent', () => {
    const e = jouer(1, 24, investir);
    expect(e.finances.recurrent).toBeGreaterThan(0.2);
  });
});

describe('équilibrage : politique', () => {
  it('un budget neutre d’un gouvernement minoritaire sans accord n’est pas assuré de passer', () => {
    const v = voterBudgetAssemblee(nouvelle(1), groupesAssemblee(partis), normaliserPLF({}));
    expect(v.pour).toBeLessThan(400); // pas de majorité écrasante sans négocier
  });
  it('présidentielle : ni jouée d’avance ni impossible pour un grand parti, difficile pour un petit', () => {
    const victoires = (parti) => GRAINES.filter((g) => {
      let e = seDeclarerCandidat(nouvelle(g, parti), donnees);
      for (let m = 0; m < 6 && !e.fin; m++) e = tourSuivant({ ...e, evenement: null }, donnees);
      const r = (e.resultatsElections ?? []).find((x) => x.type === 'presidentielle');
      return r?.vainqueur === parti;
    }).length / GRAINES.length;
    const epr = victoires('epr'), rn = victoires('rn'), ecolo = victoires('ecolo');
    expect(epr).toBeGreaterThan(0.2); expect(epr).toBeLessThan(1);
    expect(rn).toBeGreaterThan(0.1); expect(rn).toBeLessThan(1);
    expect(ecolo).toBeLessThan(0.3);
  });
});
