import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { creerPartie, tourSuivant, proposerLoi, prevoir, principales, phraseExplication, importerPartie, exporterPartie } from '../src/engine/index.js';
import { registreDuMois } from '../src/engine/explications.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const partis = lire('parties.json'), lois = lire('laws.json'), situation = lire('situation.json');
const donnees = { partis, lois, senat: lire('senat.json'), calendrier: lire('calendrier.json') };
const partie = () => creerPartie({ joueur: { nom: 'T', parti: 'rn', role: 'premier_ministre', ideologie: partis.find((p) => p.id === 'rn').positions }, situation, graine: 3 });

describe('registre des causes', () => {
  it('la somme des explications = la variation réelle de chaque indicateur', () => {
    let e = partie();
    for (let i = 0; i < 4; i++) {
      const avant = e.indicateurs;
      e = tourSuivant(e, donnees);
      for (const ind of ['chomage', 'croissance', 'deficit', 'inflation', 'tensions', 'popularite']) {
        const somme = e.explications.filter((x) => x.tour === e.tour && x.indicateur === ind).reduce((s, x) => s + x.delta, 0);
        expect(somme).toBeCloseTo(e.indicateurs[ind] - avant[ind], 1);
      }
    }
  });
  it('une loi promulguée apparaît comme cause, avec « commence à produire ses effets »', () => {
    let e = proposerLoi(partie(), 'securite-fermete', donnees);
    for (let i = 0; i < 10 && !e.explications.some((x) => x.type === 'loi'); i++) e = tourSuivant(e, donnees);
    const x = e.explications.find((y) => y.type === 'loi');
    expect(x).toBeDefined();
    expect(phraseExplication(x, donnees)).toMatch(/Loi de fermeté pénale/);
  });
  it('prévisions = effets programmés non encore réalisés', () => {
    const e = { ...partie(), effetsEnCours: [{ indicateur: 'chomage', parMois: -0.1, debut: 3, fin: 8, source: 'budget' }] };
    const p = prevoir(e, 6);
    expect(p).toHaveLength(1);
    expect(p[0].delta).toBeCloseTo(-0.4); // mois 3 à 6
    expect(phraseExplication(p[0], donnees)).toMatch(/^Prévu/);
  });
  it('conserve 12 mois et survit à l’export/import', () => {
    let e = partie();
    for (let i = 0; i < 15 && !e.fin; i++) e = tourSuivant({ ...e, evenement: null }, donnees);
    expect(Math.min(...e.explications.map((x) => x.tour))).toBeGreaterThan(e.tour - 12);
    expect(importerPartie(exporterPartie(e)).explications).toEqual(e.explications);
    expect(principales(e.explications, e.tour, 3).length).toBeLessThanOrEqual(3);
  });
  it('regroupe par source et indicateur', () => {
    const r = registreDuMois(5, [
      { indicateur: 'chomage', parMois: -0.1, debut: 4, fin: 9, source: 'x' },
      { indicateur: 'chomage', parMois: -0.05, debut: 5, fin: 9, source: 'x' },
    ], { chomage: 7.85 }, { chomage: 7.85 });
    expect(r).toHaveLength(1);
    expect(r[0].delta).toBeCloseTo(-0.15);
  });
});

describe('phrases', () => {
  it('jamais « undefined » (usure, entrées sans durée)', () => {
    const p = phraseExplication({ tour: 1, region: 'x', indicateur: 'sante', delta: -0.08, source: 'usure', type: 'usure', nature: 'observe' }, { regions: { regions: [{ id: 'x', nom: 'Xland' }] } });
    expect(p).not.toMatch(/undefined/);
    expect(p).toMatch(/usure.*Xland/);
  });
});
