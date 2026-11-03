import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, lancerProjet, recourir493PLF, deposerPLF, evoluerConfianceRegions, confianceRegionaleMoyenne,
  siegesParRegion, repartirSieges, importerPartie, exporterPartie, phraseExplication, BONUS_MISE_EN_SERVICE,
} from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements };
const partie = (g = 4) => creerPartie({ joueur: { nom: 'T', parti: 'epr', role: 'premier_ministre' }, situation: lire('situation.json'), graine: g, ...donnees });

describe('confiance par région', () => {
  it('initialisée à 40 dans toutes les régions', () => {
    const e = partie();
    expect(Object.keys(e.confianceRegions)).toHaveLength(18);
    expect(new Set(Object.values(e.confianceRegions))).toEqual(new Set([40]));
  });
  it('suit la satisfaction avec retard (distincte d’elle)', () => {
    const { confianceRegions } = evoluerConfianceRegions({ a: 40 }, { a: { satisfaction: 90 } }, {}, [], 1);
    expect(confianceRegions.a).toBeGreaterThan(40);
    expect(confianceRegions.a).toBeLessThan(90 * 0.7);
  });
  it('choc national appliqué partout, expliqué', () => {
    const r = evoluerConfianceRegions({ a: 40, b: 40 }, { a: { satisfaction: 57 }, b: { satisfaction: 57 } }, { '49.3': -3 }, [], 1);
    expect(r.confianceRegions.a).toBeCloseTo(40 + (57 * 0.7 - 40) * 0.08 - 3, 1);
    expect(phraseExplication(r.entrees[0], {})).toMatch(/49\.3/);
  });
  it('un projet mis en service redonne confiance à sa région seulement', () => {
    let e = lancerProjet(partie(), 'recrutement-soignants', 'bretagne', donnees);
    const p = e.projets[0];
    while (e.tour < p.service && !e.fin) e = tourSuivant({ ...e, evenement: null }, donnees);
    const x = e.explications.find((y) => y.type === 'mise-en-service');
    expect(x?.region).toBe('bretagne');
    expect(x.delta).toBe(BONUS_MISE_EN_SERVICE);
  });
  it('législatives : une région confiante favorise le parti du joueur', () => {
    const e = partie();
    const scores = { epr: 20, rn: 30, lfi: 15, ps: 12, dr: 10, ecolo: 7, reconquete: 6 };
    const base = siegesParRegion(scores, 'epr', e.territoires, regions.regions, repartirSieges, 577, e.confianceRegions);
    const confiante = siegesParRegion(scores, 'epr', e.territoires, regions.regions, repartirSieges, 577, { ...e.confianceRegions, 'ile-de-france': 80 });
    expect(confiante.parRegion['ile-de-france'].epr).toBeGreaterThan(base.parRegion['ile-de-france'].epr);
    expect(Object.values(confiante.sieges).reduce((a, b) => a + b, 0)).toBe(577);
  });
  it('moyenne pondérée par la population ; sauvegarde v10', () => {
    expect(confianceRegionaleMoyenne(partie().confianceRegions, regions.regions)).toBe(40);
    const e = tourSuivant(partie(), donnees);
    expect(importerPartie(exporterPartie(e))).toEqual(e);
  });
});
