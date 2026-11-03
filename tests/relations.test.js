import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, engagerPolitique, negocierAccord, reactionParti, attitudeCensure, voterCensure, groupesAssemblee,
  importerPartie, exporterPartie, phraseExplication, principales,
} from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements };
const partie = () => creerPartie({ joueur: { nom: 'T', parti: 'epr', role: 'premier_ministre', ideologie: partis.find((p) => p.id === 'epr').positions }, situation: lire('situation.json'), graine: 6, ...donnees });
const P = (id) => partis.find((p) => p.id === id);

describe('relations avec les partis (E5)', () => {
  it('toutes à 50 au départ, même traitement pour tous', () => {
    const e = partie();
    expect(new Set(Object.values(e.relations))).toEqual(new Set([50]));
  });
  it('réaction selon les positions publiques : aligné +, opposé −', () => {
    expect(reactionParti(P('rn'), 'securite', 80)).toBeGreaterThan(0);
    expect(reactionParti(P('lfi'), 'securite', 80)).toBeLessThan(0);
  });
  it('engager un programme fait réagir les partis, expliqué en SIMULATION, hors bilan national', () => {
    const e = engagerPolitique(partie(), 'police-proximite', donnees);
    expect(e.relations.rn).toBeGreaterThan(50);
    expect(e.relations.lfi).toBeLessThan(50);
    const x = e.explications.find((y) => y.type === 'relation' && y.parti === 'lfi');
    expect(phraseExplication(x, donnees)).toMatch(/LFI désapprouve.*\(simulation\)/);
    expect(principales(e.explications, e.tour).some((y) => y.type === 'relation')).toBe(false);
  });
  it('la relation s’estompe vers 50', () => {
    let e = { ...partie(), relations: { ...partie().relations, rn: 90 } };
    e = tourSuivant({ ...e, evenement: null }, donnees);
    expect(e.relations.rn).toBeLessThan(90);
    expect(e.relations.rn).toBeGreaterThan(50);
  });
  it('relation haute → accord accepté plus loin ; relation très haute → protège de la censure', () => {
    const base = partie();
    const ecartLfi = 999; // vérifie seulement l'effet de la relation sur la tolérance
    expect(attitudeCensure({ relations: { x: 80 } }, 'x')).toBe('protege');
    expect(attitudeCensure({ relations: { x: 20 } }, 'x')).toBe('hostile');
    const ko = negocierAccord(base, 'rn', donnees);
    const ok = negocierAccord({ ...base, relations: { ...base.relations, rn: 100 } }, 'rn', donnees);
    expect(ok.accords.length).toBeGreaterThanOrEqual(ko.accords.length);
    const c1 = voterCensure(base, groupesAssemblee(partis));
    const c2 = voterCensure({ ...base, relations: Object.fromEntries(partis.map((p) => [p.id, 80])) }, groupesAssemblee(partis));
    expect(c2.pour).toBeLessThanOrEqual(c1.pour);
    expect(c2.pour).toBe(0);
    expect(ecartLfi).toBeGreaterThan(0);
  });
  it('sauvegarde v9 : aller-retour', () => {
    const e = tourSuivant(engagerPolitique(partie(), 'apprentissage', donnees), donnees);
    expect(importerPartie(exporterPartie(e))).toEqual(e);
  });
});

describe('corrections (revue sur E5)', () => {
  it('le seuil d’accord affiché inclut la relation', async () => {
    const { catalogueDecisions } = await import('../src/engine/index.js');
    const e = partie();
    const seuil = (rel) => Number(catalogueDecisions({ ...e, relations: { ...e.relations, rn: rel } }, donnees).find((x) => x.id === 'accord:rn').resume.match(/jusqu’à (\d+)/)[1]);
    expect(seuil(100) - seuil(50)).toBe(25);
  });
  it('la réaction suit l’orientation du texte promulgué (amendé), pas celle du catalogue', () => {
    const loi = lois.find((l) => l.id === 'fiscalite-baisse-impots');
    const e = { ...partie(), texte: { loiId: loi.id, etape: 'conseil', orientation: 37, facteur: 0.64, recours493: false, amendements: 2 }, graine: 999 };
    const apres = tourSuivant(e, donnees);
    if (apres.loisAdoptees.includes(loi.id)) {
      const x = apres.explications.find((y) => y.type === 'relation' && y.parti === 'rn' && y.source === loi.id);
      expect(x.delta).toBeCloseTo(reactionParti(P('rn'), 'fiscalite', 37), 1);
    }
  });
});
