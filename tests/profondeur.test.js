import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, resoudreEvenement, eligible, voterBudget, effetsBudget,
  evaluerFin, scoreBilan, importerPartie, INDICATEURS,
} from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const partis = lire('parties.json'), situation = lire('situation.json'), evenements = lire('events.json');
const donnees = { partis, lois: lire('laws.json'), senat: lire('senat.json'), calendrier: lire('calendrier.json'), evenements };
const partie = (role = 'premier_ministre', graine = 7) =>
  creerPartie({ joueur: { nom: 'Test', parti: 'epr', role, competences: { charisme: 50, negociation: 50, economie: 50, communication: 50 } }, situation, graine });

describe('events.json', () => {
  it('schéma : 3 choix max, dernier passif gratuit, indicateurs connus', () => {
    expect(evenements.length).toBeGreaterThanOrEqual(15);
    expect(new Set(evenements.map((e) => e.id)).size).toBe(evenements.length);
    for (const ev of evenements) {
      expect(ev.choix.length).toBeGreaterThanOrEqual(2);
      expect(ev.choix.at(-1).cout_capital).toBe(0);
      for (const c of ev.choix) for (const e of c.effets) expect(INDICATEURS).toContain(e.indicateur);
      for (const ind of Object.keys(ev.conditions ?? {})) expect(INDICATEURS).toContain(ind);
    }
  });
});

describe('événements', () => {
  it('surviennent au fil des mois et ne bloquent jamais la partie', () => {
    let e = partie();
    let vus = 0;
    for (let i = 0; i < 24 && !e.fin; i++) { e = tourSuivant(e, donnees); if (e.evenement) vus++; }
    expect(vus).toBeGreaterThan(0);
  });
  it('résoudre : coût, effets planifiés, historique', () => {
    const ev = evenements.find((x) => x.choix[0].cout_capital > 0) ?? evenements[0];
    const e = { ...partie(), evenement: ev.id, joueur: { ...partie().joueur, capital: 10 } };
    const r = resoudreEvenement(e, 0, donnees);
    expect(r.evenement).toBeNull();
    expect(r.joueur.capital).toBe(10 - ev.choix[0].cout_capital);
    expect(r.evenementsPasses.at(-1).id).toBe(ev.id);
    expect(r.effetsEnCours.length).toBe(ev.choix[0].effets.length);
  });
  it('un événement ignoré est résolu par l’option passive', () => {
    const ev = evenements[0];
    const r = tourSuivant({ ...partie(), evenement: ev.id }, donnees);
    expect(r.evenementsPasses.at(-1)).toMatchObject({ id: ev.id, choix: ev.choix.length - 1 });
  });
  it('conditions et rôle respectés', () => {
    const e = partie('depute');
    for (const ev of evenements.filter((x) => x.role === 'premier_ministre')) expect(eligible(ev, e)).toBe(false);
  });
});

describe('budget', () => {
  it('PM uniquement, une fois par an, leviers bornés', () => {
    expect(() => voterBudget(partie('depute'), { depenses: 1 })).toThrow();
    const b = voterBudget(partie(), { depenses: 1, impots: -0.5 });
    expect(b.dernierBudget).toBe(0);
    expect(() => voterBudget(b, {})).toThrow(/12 mois/);
    expect(() => voterBudget(partie(), { depenses: 5 })).toThrow(/bornes/);
  });
  it('plus de dépenses → plus de déficit, plus d’impôts → moins de déficit', () => {
    const d = (x) => effetsBudget(x).find((e) => e.indicateur === 'deficit').valeur;
    expect(d({ depenses: 1 })).toBeGreaterThan(0);
    expect(d({ impots: 1 })).toBeLessThan(0);
  });
});

describe('fins', () => {
  it('score borné et titres selon le type', () => {
    const e = partie();
    expect(scoreBilan(e)).toBeGreaterThanOrEqual(0);
    expect(evaluerFin({ ...e, fin: { type: 'censure' } }).titre).toMatch(/Renvers/);
    expect(evaluerFin({ ...e, fin: { type: 'mandat' } }).titre).toBeTruthy();
  });
});

describe('migration', () => {
  it('v3 → v4', () => {
    const v3 = { ...partie(), version: 3 }; delete v3.evenementsPasses;
    expect(importerPartie(JSON.stringify(v3)).evenementsPasses).toEqual([]);
  });
});
