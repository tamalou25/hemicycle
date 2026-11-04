// Fiches comparables, bilan du mois, engagements et valeurs de départ des objectifs : API pures et cohérentes.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, lancerProjet, engagerPolitique, proposerLoi, catalogueDecisions, ficheDecision, bilanMois, engagements,
  evaluerObjectifs, exporterPartie, importerPartie,
} from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events', 'objectifs'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements, objectifs] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements, objectifs };
const partie = (graine = 9, parti = 'epr') => creerPartie({ joueur: { nom: 'T', parti, role: 'premier_ministre' }, situation: lire('situation.json'), graine, ...donnees, mission: lire('mission.json') });

describe('fiches de décision', () => {
  it('lois, programmes et projets ont une fiche complète ; consulter ne modifie rien', () => {
    const e = partie();
    const avant = JSON.stringify(e);
    const cat = catalogueDecisions(e, donnees);
    for (const type of ['loi', 'programme', 'projet']) {
      for (const item of cat.filter((x) => x.type === type)) {
        const f = ficheDecision(e, item, donnees);
        expect(f, item.id).toBeTruthy();
        expect(f.effets.length).toBeGreaterThan(0);
        expect(typeof f.premiersEffets).toBe('string');
        expect(typeof f.institution).toBe('string');
        expect(Array.isArray(f.objectifs)).toBe(true);
      }
    }
    expect(JSON.stringify(e)).toBe(avant);
  });
  it('loi : vote estimé et risque constitutionnel ; projet de santé lié à la mission ; blocage repris du catalogue', () => {
    const e = partie();
    const cat = catalogueDecisions(e, donnees);
    const loi = ficheDecision(e, cat.find((x) => x.type === 'loi'), donnees);
    expect(loi.risques.some((r) => r.includes('Vote estimé'))).toBe(true);
    expect(loi.risques.some((r) => r.includes('Conseil constitutionnel'))).toBe(true);
    expect(ficheDecision(e, cat.find((x) => x.id === 'projet:recrutement-soignants'), donnees).mission).toBe(true);
    expect(ficheDecision(e, cat.find((x) => x.id === 'projet:renovation-ter'), donnees).mission).toBe(false);
    const bloque = cat.find((x) => x.raison && ['loi', 'programme', 'projet'].includes(x.type));
    if (bloque) expect(ficheDecision(e, bloque, donnees).blocage).toBe(bloque.raison);
    // Objectif « déficit » sélectionné par défaut : une loi agissant sur le déficit y est reliée
    const loiDeficit = cat.find((x) => x.type === 'loi' && lois.find((l) => `loi:${l.id}` === x.id).effets.some((ef) => ef.indicateur === 'deficit'));
    expect(ficheDecision(e, loiDeficit, donnees).objectifs).toContain('Revenir sous 3 % de déficit');
  });
});

describe('bilan du mois et engagements', () => {
  it('décisions, effets locaux attribués (même minimes), engagements et échéances', () => {
    let e = partie(31);
    expect(bilanMois(e, donnees)).toBeNull();
    e = lancerProjet(e, 'recrutement-soignants', e.mission.region, donnees);
    e = engagerPolitique(e, politiques.politiques[0].id, donnees);
    e = tourSuivant(e, donnees);
    const b = bilanMois(e, donnees);
    expect(b.decisions.some((d) => d.startsWith('Lancement : Recrutement de soignants'))).toBe(true);
    expect(b.decisions.some((d) => d.startsWith('Programme engagé'))).toBe(true);
    const eng = engagements(e, donnees);
    expect(eng.find((x) => x.type === 'projet')).toMatchObject({ detail: 'Mise en service', echeance: 3 });
    expect(eng.find((x) => x.type === 'mission').echeance).toBe(6);
    expect(eng.map((x) => x.echeance)).toEqual([...eng.map((x) => x.echeance)].sort((a, c) => a - c));
    for (let i = 0; i < 3; i++) e = tourSuivant(e, donnees);
    const b4 = bilanMois(e, donnees);
    const local = b4.locaux.find((x) => x.source === 'projet:recrutement-soignants');
    expect(local?.delta).toBeGreaterThan(0);
    // Cohérence : chaque effet affiché vient du registre des causes du mois
    for (const x of [...b4.vosEffets, ...b4.locaux, ...b4.conjoncture]) expect(e.explications).toContainEqual(x);
  });
  it('réponse automatique à un événement : pas comptée comme une décision du joueur', () => {
    let e = partie(2);
    for (let i = 0; i < 12 && !e.evenement; i++) e = tourSuivant(e, donnees);
    if (!e.evenement) return;
    e = tourSuivant(e, donnees);
    const b = bilanMois(e, donnees);
    expect(b.decisions.some((d) => d.includes('réponse par défaut'))).toBe(false);
    expect(b.resultats.some((d) => d.includes('réponse par défaut'))).toBe(true);
  });
  it('dépôt d’une loi : décision au mois du dépôt, engagement « prochaine étape » ensuite', () => {
    let e = partie(4);
    const loi = catalogueDecisions(e, donnees).find((x) => x.type === 'loi' && !x.raison);
    e = proposerLoi(e, loi.id.slice(4), donnees);
    expect(engagements(e, donnees).find((x) => x.type === 'loi').detail).toMatch(/Prochaine étape/);
    e = tourSuivant(e, donnees);
    expect(bilanMois(e, donnees).decisions.some((d) => d.includes('déposé'))).toBe(true);
  });
});

describe('objectifs : départ, actuel, cible', () => {
  it('valeurs de départ figées à la création, conservées à l’export ; absentes (null) pour une ancienne partie', () => {
    let e = partie(12);
    const depart = evaluerObjectifs(e, donnees).map((o) => o.depart);
    expect(depart.every((v) => v != null)).toBe(true);
    for (let i = 0; i < 3; i++) e = tourSuivant(e, donnees);
    expect(evaluerObjectifs(e, donnees).map((o) => o.depart)).toEqual(depart);
    expect(evaluerObjectifs(importerPartie(exporterPartie(e)), donnees).map((o) => o.depart)).toEqual(depart);
    const v12 = { ...e, version: 12 }; delete v12.objectifsInitiaux; delete v12.mission;
    expect(evaluerObjectifs(importerPartie(JSON.stringify(v12)), donnees).every((o) => o.depart === null)).toBe(true);
  });
});
