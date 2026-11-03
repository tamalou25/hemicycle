import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, evaluerObjectifs, normaliserObjectifs, evaluerFin, scoreBilan, POINTS_PAR_OBJECTIF, importerPartie, exporterPartie,
} from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events', 'objectifs'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements, objectifs] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements, objectifs };
const partie = (choix) => creerPartie({ joueur: { nom: 'T', parti: 'epr', role: 'premier_ministre', objectifs: choix }, situation: lire('situation.json'), graine: 2, ...donnees });

describe('objectifs.json', () => {
  it('10 objectifs, ids uniques, défaut valide, mesures connues', () => {
    expect(objectifs.objectifs.length).toBeGreaterThanOrEqual(8);
    const ids = new Set(objectifs.objectifs.map((o) => o.id));
    expect(ids.size).toBe(objectifs.objectifs.length);
    expect(objectifs.defaut.every((id) => ids.has(id))).toBe(true);
    expect(objectifs.defaut).toHaveLength(objectifs.nombre_a_choisir);
    for (const o of objectifs.objectifs) expect(['max', 'min']).toContain(o.sens);
  });
});

describe('objectifs de mandat', () => {
  it('choix valide conservé ; choix invalide → défaut', () => {
    expect(partie(['dette', 'reformes', 'confiance']).objectifs).toEqual(['dette', 'reformes', 'confiance']);
    expect(normaliserObjectifs(['dette', 'dette', 'inconnu'], objectifs)).toEqual(objectifs.defaut);
    expect(partie(undefined).objectifs).toEqual(objectifs.defaut);
  });
  it('toutes les mesures sont calculables dans une partie complète', () => {
    const e = { ...partie(), objectifs: objectifs.objectifs.map((o) => o.id) };
    for (const r of evaluerObjectifs(e, donnees)) expect(r.valeur, r.id).not.toBeNull();
  });
  it('atteint selon le sens (max/min), progression bornée', () => {
    const e = partie(['chomage', 'reformes', 'deficit']);
    const r = evaluerObjectifs({ ...e, indicateurs: { ...e.indicateurs, chomage: 6.5, deficit: 4 } }, donnees);
    expect(r.find((x) => x.id === 'chomage').atteint).toBe(true);
    expect(r.find((x) => x.id === 'deficit').atteint).toBe(false);
    expect(r.find((x) => x.id === 'deficit').progression).toBeCloseTo(0.75);
    expect(r.find((x) => x.id === 'reformes').progression).toBe(0);
  });
  it('fin de partie : chaque objectif atteint ajoute des points au bilan', () => {
    const e = { ...partie(['chomage', 'deficit', 'dette']), fin: { type: 'mandat' } };
    const atteints = { ...e, indicateurs: { ...e.indicateurs, chomage: 5, deficit: 2, dette: 100 } };
    const sans = evaluerFin(atteints, { ...donnees, objectifs: null });
    const avec = evaluerFin(atteints, donnees);
    expect(avec.objectifs.filter((o) => o.atteint)).toHaveLength(3);
    expect(avec.score).toBe(Math.min(100, scoreBilan(atteints) + 3 * POINTS_PAR_OBJECTIF));
    expect(sans.score).toBe(scoreBilan(atteints));
  });
  it('sauvegarde v11 : aller-retour', () => {
    const e = tourSuivant(partie(['apaisement', 'programmes', 'popularite']), donnees);
    expect(importerPartie(exporterPartie(e))).toEqual(e);
  });
});
