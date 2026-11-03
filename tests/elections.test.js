import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, prochainesElections, enCampagne, actionCampagne, seDeclarerCandidat,
  proposerDissolution, repartirSieges, secondTour, tourDeDate, importerPartie, groupesAssemblee,
} from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const partis = lire('parties.json'), lois = lire('laws.json'), situation = lire('situation.json');
const senat = lire('senat.json'), calendrier = lire('calendrier.json');
const donnees = { partis, lois, senat, calendrier };
const comp = { charisme: 80, negociation: 50, economie: 50, communication: 70 };
const partie = (parti = 'epr', role = 'depute', graine = 4) =>
  creerPartie({ joueur: { nom: 'Test', parti, role, ideologie: partis.find((p) => p.id === parti).positions, competences: comp }, situation, graine });

describe('calendrier', () => {
  it('présidentielle d’avril 2027 = 5e tour depuis novembre 2026', () => {
    const e = partie();
    expect(tourDeDate(e, '2027-04')).toBe(5);
    expect(prochainesElections(e, calendrier)[0].type).toBe('presidentielle');
  });
  it('campagne ouverte 3 mois avant', () => {
    expect(enCampagne(partie(), calendrier)).toBeNull();
    expect(enCampagne({ ...partie(), tour: 2 }, calendrier).type).toBe('presidentielle');
  });
});

describe('campagne', () => {
  it('une action par mois, coûte du capital, change l’élan', () => {
    const e = { ...partie(), tour: 3 };
    const a = actionCampagne(e, 'meeting', donnees);
    expect(a.joueur.capital).toBe(e.joueur.capital - 1);
    expect(a.elan).not.toBe(0);
    expect(() => actionCampagne(a, 'debat', donnees)).toThrow(/une seule/i);
  });
  it('candidature soumise à 15 % de popularité', () => {
    const e = partie();
    expect(() => seDeclarerCandidat({ ...e, indicateurs: { ...e.indicateurs, popularite: 10 } }, donnees)).toThrow(/15 %/);
    expect(seDeclarerCandidat(e, donnees).candidat).toBe(true);
  });
});

describe('scrutins', () => {
  it('législatives : 577 sièges, prime au premier parti', () => {
    const s = repartirSieges({ rn: 33, epr: 20, lfi: 15, ps: 12, dr: 10, ecolo: 6, reconquete: 4 });
    expect(Object.values(s).reduce((a, b) => a + b, 0)).toBe(577);
    expect(s.rn / 577).toBeGreaterThan(0.33);
    expect(s.reconquete).toBe(0); // sous 5 %
  });
  it('2nd tour : 100 % entre deux finalistes', () => {
    const t2 = secondTour({ rn: 30, epr: 25, lfi: 20, dr: 25 }, ['rn', 'epr'], partis);
    expect(t2.rn + t2.epr).toBeCloseTo(100, 0);
  });
  it('la présidentielle a lieu au tour 5 et produit un résultat simulé', () => {
    let e = partie();
    for (let i = 0; i < 5; i++) e = tourSuivant(e, donnees);
    const r = e.resultatsElections.find((x) => x.type === 'presidentielle');
    expect(r).toBeDefined();
    expect(r.simulation).toBe(true);
    expect(r.finalistes).toHaveLength(2);
    expect(prochainesElections(e, calendrier).every((x) => x.type !== 'presidentielle')).toBe(true);
  });
});

describe('dissolution', () => {
  it('réservée au PM ; législatives anticipées 2 mois après, nouvelle Assemblée utilisée', () => {
    expect(() => proposerDissolution(partie())).toThrow(/Premier ministre/);
    let e = null;
    for (let g = 1; g < 50 && !e?.derniereDissolution && e?.derniereDissolution !== 0; g++) e = proposerDissolution(partie('epr', 'premier_ministre', g));
    expect(e.derniereDissolution).toBe(0);
    expect(() => proposerDissolution(e)).toThrow();
    e = { ...e, resultatsElections: [{ id: 'presidentielle-2027' }] };
    for (let i = 0; i < 2 && !e.fin; i++) e = tourSuivant(e, donnees);
    if (!e.fin) {
      expect(e.sieges).not.toBeNull();
      const total = groupesAssemblee(partis, e.sieges).reduce((s, g) => s + g.sieges, 0);
      expect(total).toBe(577);
    }
  });
});

describe('migration', () => {
  it('v2 → v3', () => {
    const v2 = { ...partie(), version: 2 };
    delete v2.resultatsElections; delete v2.sieges;
    const e = importerPartie(JSON.stringify(v2));
    expect(e.version).toBe(4);
    expect(e.resultatsElections).toEqual([]);
  });
});
