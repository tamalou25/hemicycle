import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, deposerPLF, recourir493PLF, raisonRefusPLF, chiffrerPLF, orientationPLF, normaliserPLF,
  solde, importerPartie, exporterPartie, phraseExplication,
} from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const partis = lire('parties.json'), situation = lire('situation.json');
// Finances fictives (les vraies sont validées dans data.schema.test.js)
const finances = {
  pib_md: 3000, dette_md: 3450, charge_interets_md: 60, deficit_pct_pib: 5,
  recettes_md: { impots_menages: 400, impots_entreprises: 200, tva_consommation: 300, cotisations_sociales: 450, autres: 150 },
  depenses_md: { protection_sociale: 700, sante: 250, education: 150, defense_securite: 80, infrastructures_environnement: 100, recherche: 30, administration_autres: 280, interets: 60 },
};
const donnees = { partis, lois: lire('laws.json'), senat: lire('senat.json'), calendrier: lire('calendrier.json'), finances };
// Départ en septembre (fenêtre du PLF ouverte)
const partie = (parti = 'epr', role = 'premier_ministre') => creerPartie({ joueur: { nom: 'T', parti, role, ideologie: partis.find((p) => p.id === parti).positions }, situation, graine: 4, dateDepart: '2026-09-01', finances });

describe('budget de l’État', () => {
  it('initialisé depuis les données, solde = recettes − dépenses', () => {
    const e = partie();
    expect(solde(e.budget)).toBe(1500 - 1650);
    expect(e.budget.taux).toBeCloseTo(60 / 3450);
  });
  it('PLF : PM uniquement, à l’automne, un par an', () => {
    expect(raisonRefusPLF(partie('epr', 'depute'))).toMatch(/gouvernement/);
    expect(raisonRefusPLF({ ...partie(), dateDepart: { annee: 2026, mois: 3 } })).toMatch(/automne/);
    const e = deposerPLF(partie(), {});
    expect(() => deposerPLF(e, {})).toThrow(/déjà/);
  });
  it('chiffrage : +5 % santé = +12,5 Md€ → déficit +0,42 pt ; bornes ±5 %', () => {
    const plf = normaliserPLF({ depenses: { sante: 9 } });
    expect(plf.depenses.sante).toBe(5);
    const c = chiffrerPLF(partie().budget, plf);
    expect(c.dD.sante).toBe(12.5);
    expect(c.deltaDeficitPts).toBeCloseTo(0.42, 2);
  });
  it('orientation : baisses d’impôts → droite, hausses sociales → gauche', () => {
    expect(orientationPLF(normaliserPLF({ recettes: { impots_menages: -4, impots_entreprises: -4, tva_consommation: -4, cotisations_sociales: -4 } }))).toBeGreaterThan(50);
    expect(orientationPLF(normaliserPLF({ depenses: { protection_sociale: 5, sante: 5, education: 5 } }))).toBeLessThan(-50);
  });
  it('vote en fin de mois : adopté → montants modifiés et effets planifiés ; rejeté → loi spéciale', () => {
    let e = tourSuivant(deposerPLF(partie(), { depenses: { sante: 2 } }), donnees);
    expect(e.plf).toBeNull();
    const adopte = e.journal.some((j) => /promulguée/.test(j.texte));
    const special = e.journal.some((j) => /loi spéciale/.test(j.texte));
    expect(adopte || special).toBe(true);
    if (adopte) { expect(e.budget.depenses.sante).toBe(255); expect(e.budget.ecarts.sante).toBe(5); }
    else expect(e.budget.depenses.sante).toBe(250);
  });
  it('49.3 sur le budget → motion de censure', () => {
    const e = tourSuivant(recourir493PLF(deposerPLF(partie(), { recettes: { impots_entreprises: -5 } })), donnees);
    expect(e.journal.some((j) => j.type === 'censure')).toBe(true);
  });
  it('charge d’intérêts révisée en janvier, expliquée', () => {
    let e = partie();
    for (let i = 0; i < 5; i++) e = tourSuivant({ ...e, evenement: null }, donnees); // sept → fév
    expect(e.budget.depenses.interets).not.toBe(60);
    const x = e.effetsEnCours.find((y) => y.source === 'interets') ?? e.explications.find((y) => y.type === 'interets');
    expect(x).toBeDefined();
  });
  it('crédits santé → effet régional expliqué', () => {
    const regions = { regions: [{ id: 'a', nom: 'A', population: 1e6, chomage: 8, medecins_generalistes_100k: 120 }] };
    const projets = lire('projets.json');
    const d = { ...donnees, regions, projets };
    let e = creerPartie({ joueur: { nom: 'T', parti: 'epr', role: 'premier_ministre' }, situation, graine: 4, dateDepart: '2026-09-01', finances, regions, projets });
    e = { ...e, budget: { ...e.budget, ecarts: { sante: 10 } } };
    e = tourSuivant(e, d);
    const x = e.explications.find((y) => y.source === 'budget:sante');
    expect(x.delta).toBeCloseTo(0.12);
    expect(phraseExplication(x, d)).toMatch(/crédits « santé »/);
  });
  it('sauvegarde v6 : aller-retour', () => {
    const e = deposerPLF(partie(), { depenses: { recherche: 3 } });
    expect(importerPartie(exporterPartie(e))).toEqual(e);
  });
});

describe('vote du budget', () => {
  it('l’opposition éloignée vote contre par principe ; un accord peut la retourner', async () => {
    const { voterBudgetAssemblee } = await import('../src/engine/index.js');
    const { groupesAssemblee } = await import('../src/engine/parliament.js');
    const e = partie('epr');
    const plf = normaliserPLF({});
    const v = voterBudgetAssemblee(e, groupesAssemblee(partis, null), plf);
    expect(v.detail.find((d) => d.groupe === 'lfi').vote).toBe('contre');
    expect(v.detail.find((d) => d.groupe === 'lfi').opposition).toBe(true);
    const avecAccord = voterBudgetAssemblee({ ...e, accords: [{ parti: 'dr', jusqua: 99 }] }, groupesAssemblee(partis, null), plf);
    expect(avecAccord.pour).toBeGreaterThanOrEqual(v.pour);
  });
});
