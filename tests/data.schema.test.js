import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { AXES, INDICATEURS } from '../src/engine/constants.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const partis = lire('parties.json');
const lois = lire('laws.json');
const situation = lire('situation.json');

describe('parties.json', () => {
  it('ids uniques, couleurs hex, positions complètes et bornées', () => {
    expect(new Set(partis.map((p) => p.id)).size).toBe(partis.length);
    for (const p of partis) {
      expect(p.couleur).toMatch(/^#[0-9a-f]{6}$/i);
      for (const a of AXES) {
        expect(p.positions[a]).toBeGreaterThanOrEqual(-100);
        expect(p.positions[a]).toBeLessThanOrEqual(100);
      }
    }
  });
  it('sièges cohérents avec l’Assemblée', () => {
    const total = partis.reduce((s, p) => s + (p.sieges_assemblee ?? 0), 0);
    expect(total).toBeLessThanOrEqual(situation.assemblee_total);
  });
});

describe('laws.json', () => {
  it('schéma valide', () => {
    expect(lois.length).toBeGreaterThanOrEqual(10);
    expect(new Set(lois.map((l) => l.id)).size).toBe(lois.length);
    for (const l of lois) {
      expect(AXES).toContain(l.theme);
      expect(l.titre.length).toBeGreaterThan(0);
      expect(Math.abs(l.orientation)).toBeLessThanOrEqual(100);
      expect(l.cout_politique).toBeGreaterThanOrEqual(1);
      expect(l.cout_politique).toBeLessThanOrEqual(5);
      for (const e of l.effets) {
        expect(INDICATEURS).toContain(e.indicateur);
        expect(typeof e.valeur).toBe('number');
        expect(e.delaiMois).toBeGreaterThanOrEqual(0);
        expect(e.duree).toBeGreaterThanOrEqual(1);
      }
    }
  });
  it('aucune loi purement bénéfique (arbitrages)', () => {
    // valeur « bonne » : baisse de chomage/deficit/dette/inflation/tensions, hausse croissance/popularite
    const sens = { chomage: -1, deficit: -1, dette: -1, inflation: -1, tensions: -1, croissance: 1, popularite: 1 };
    for (const l of lois) {
      expect(l.effets.some((e) => e.valeur * sens[e.indicateur] < 0), l.id).toBe(true);
    }
  });
});

describe('situation.json', () => {
  it('date de collecte et sources présentes', () => {
    expect(situation.date_collecte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(situation.sources.length).toBeGreaterThan(0);
    for (const s of situation.sources) expect(s.url).toMatch(/^https?:\/\//);
  });
});
