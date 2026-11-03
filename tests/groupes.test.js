import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, recourir493, proposerLoi, resultats, satisfactionGroupe, confianceMoyenne,
  voteJoueurParGroupe, siegesParRegion, repartirSieges, importerPartie, exporterPartie,
} from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const partis = lire('parties.json'), situation = lire('situation.json');
const groupes = lire('groupes.json'), groupesEquilibrage = lire('groupes-equilibrage.json');
const regions = lire('regions.json'), projets = lire('projets.json'), finances = lire('finances.json');
const donnees = { partis, lois: lire('laws.json'), senat: lire('senat.json'), calendrier: lire('calendrier.json'), regions, projets, finances, groupes, groupesEquilibrage };
const partie = (g = 3) => creerPartie({ joueur: { nom: 'T', parti: 'epr', role: 'premier_ministre' }, situation, graine: g, ...donnees });

describe('groupes sociaux', () => {
  it('données : 6 groupes, parts ≈ 100 %, priorités complètes (somme 1)', () => {
    expect(groupes.groupes).toHaveLength(6);
    expect(groupes.groupes.reduce((s, g) => s + g.part, 0)).toBeCloseTo(100, 0);
    for (const g of groupes.groupes) {
      const p = groupesEquilibrage.priorites[g.id];
      expect(Object.values(p).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    }
  });
  it('neutralité : aucun groupe ne porte d’orientation politique', () => {
    for (const g of groupes.groupes) expect(g.positions).toBeUndefined();
    expect(groupesEquilibrage.positions).toBeUndefined();
  });
  it('satisfaction ≠ confiance : un groupe peut être satisfait sans faire confiance', () => {
    const e = partie();
    const g = e.groupes.retraites;
    expect(g.satisfaction).not.toBe(g.confiance);
  });
  it('la pression fiscale baisse la satisfaction du groupe exposé, pas des autres', () => {
    const res = resultats(partie(), donnees);
    const base = satisfactionGroupe('independants', res, groupesEquilibrage);
    expect(satisfactionGroupe('independants', res, groupesEquilibrage, { impots_entreprises: 5 })).toBeLessThan(base);
    expect(satisfactionGroupe('retraites', res, groupesEquilibrage, { impots_entreprises: 5 })).toBe(satisfactionGroupe('retraites', res, groupesEquilibrage));
  });
  it('un 49.3 fait perdre confiance à tous les groupes, expliqué', () => {
    let e = proposerLoi(partie(), 'fiscalite-baisse-impots', donnees);
    const avant = confianceMoyenne(e.groupes, groupes);
    e = tourSuivant(recourir493(e, donnees), donnees);
    if (!e.fin) {
      expect(confianceMoyenne(e.groupes, groupes)).toBeLessThan(avant);
      expect(e.explications.some((x) => x.type === 'choc' && x.source === '49.3')).toBe(true);
    }
  });
  it('vote par groupe suit la confiance ; sondage décomposé', () => {
    const e = tourSuivant(partie(), donnees);
    expect(e.sondage.parGroupe).toBeDefined();
    const v = voteJoueurParGroupe({ ...e.groupes, cadres: { ...e.groupes.cadres, confiance: e.groupes.cadres.confianceInitiale + 20 } }, groupes, 10);
    expect(v.cadres).toBeGreaterThan(v.retraites === undefined ? 0 : 10 - 1);
    const total = Object.values(e.sondage.intentions).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(100, 0);
  });
});

describe('législatives par région', () => {
  it('577 sièges ; une région satisfaite favorise le parti du joueur', () => {
    const e = partie();
    const scores = { epr: 20, rn: 30, lfi: 15, ps: 12, dr: 10, ecolo: 7, reconquete: 6 };
    const r = siegesParRegion(scores, 'epr', e.territoires, regions.regions, repartirSieges, 577);
    expect(Object.values(r.sieges).reduce((a, b) => a + b, 0)).toBe(577);
    const heureux = Object.fromEntries(Object.entries(e.territoires).map(([k, t]) => [k, { ...t, satisfaction: k === 'ile-de-france' ? 95 : t.satisfaction }]));
    const r2 = siegesParRegion(scores, 'epr', heureux, regions.regions, repartirSieges, 577);
    expect(r2.parRegion['ile-de-france'].epr).toBeGreaterThan(r.parRegion['ile-de-france'].epr);
  });
});

describe('sauvegarde v7', () => {
  it('aller-retour', () => {
    const e = tourSuivant(partie(), donnees);
    expect(importerPartie(exporterPartie(e))).toEqual(e);
  });
});
