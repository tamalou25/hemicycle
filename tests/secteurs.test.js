import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, engagerPolitique, raisonRefusPolitique, catalogueDecisions, filtrerDecisions, compterDecisions,
  CATEGORIES, SECTEURS_DECISION, importerPartie, exporterPartie, phraseExplication,
} from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements };
const partie = (role = 'premier_ministre') => creerPartie({ joueur: { nom: 'T', parti: 'epr', role }, situation: lire('situation.json'), graine: 5, ...donnees });
const def = (id) => politiques.politiques.find((p) => p.id === id);

describe('politiques.json', () => {
  it('6 secteurs, 2 programmes au moins par secteur, contrepartie toujours renseignée', () => {
    expect(Object.keys(politiques.secteurs)).toHaveLength(6);
    for (const s of Object.keys(politiques.secteurs)) expect(politiques.politiques.filter((p) => p.secteur === s).length).toBeGreaterThanOrEqual(2);
    for (const p of politiques.politiques) {
      expect(p.cout_annuel_md).toBeGreaterThan(0);
      expect(p.contrepartie.length).toBeGreaterThan(10);
      for (const r of p.prerequis) expect(politiques.politiques.some((x) => x.id === r)).toBe(true);
    }
  });
});

describe('programmes nationaux', () => {
  it('engager : coût annuel → dépenses et déficit, capital −1, pas deux fois', () => {
    const e = partie();
    const a = engagerPolitique(e, 'police-proximite', donnees);
    expect(a.budget.depenses.defense_securite).toBeCloseTo(e.budget.depenses.defense_securite + 1.5);
    expect(a.joueur.capital).toBe(e.joueur.capital - 1);
    expect(a.effetsEnCours.some((x) => x.indicateur === 'deficit' && x.source === 'politique:police-proximite')).toBe(true);
    expect(() => engagerPolitique(a, 'police-proximite', donnees)).toThrow(/déjà/);
  });
  it('réservé au gouvernement', () => {
    expect(raisonRefusPolitique(partie('depute'), def('apprentissage'), politiques)).toMatch(/gouvernement/);
  });
  it('prérequis de la recherche : programme fondamental en œuvre ET niveau ≥ 60', () => {
    const e = partie();
    expect(raisonRefusPolitique(e, def('transfert-innovation'), politiques)).toMatch(/Prérequis/);
    const avec = { ...e, politiques: [{ id: 'programme-recherche-fondamentale', statut: 'en_oeuvre' }], secteurs: { ...e.secteurs, recherche: 61 } };
    expect(raisonRefusPolitique(avec, def('transfert-innovation'), politiques)).toBeNull();
  });
  it('délai puis montée en charge du niveau, expliquée ; usure sinon', () => {
    let e = engagerPolitique(partie(), 'apprentissage', donnees);
    const n0 = e.secteurs.education;
    for (let i = 0; i < 9 && !e.fin; i++) e = tourSuivant({ ...e, evenement: null }, donnees);
    expect(e.secteurs.education).toBeCloseTo(n0 + 5 - 0.05 * 9, 1);
    const x = e.explications.find((y) => y.type === 'politique' && y.secteur === 'education');
    expect(phraseExplication(x, donnees)).toMatch(/Aide à l'apprentissage.*Éducation/);
    expect(e.politiques[0].statut).toBe('en_oeuvre');
  });
  it('sauvegarde v8 : aller-retour', () => {
    const e = tourSuivant(engagerPolitique(partie(), 'moyens-justice', donnees), donnees);
    expect(importerPartie(exporterPartie(e))).toEqual(e);
  });
});

describe('catalogue des décisions', () => {
  it('toutes les catégories et secteurs sont connus, chaque bloqué a une raison', () => {
    const c = catalogueDecisions(partie(), donnees);
    for (const x of c) {
      expect(Object.keys(CATEGORIES)).toContain(x.categorie);
      if (x.secteur) expect(Object.keys(SECTEURS_DECISION)).toContain(x.secteur);
      if (x.statut === 'bloque') expect(x.raison).toBeTruthy();
      expect(x.action?.type).toBeTruthy();
    }
    const n = compterDecisions(c);
    expect(n.parCategorie.nationale).toBeGreaterThan(10);
    expect(n.parCategorie.territoriale).toBe(projets.projets.length);
  });
  it('statuts suivis : programme engagé → en cours ; événement → urgent en tête', () => {
    const e = { ...engagerPolitique(partie(), 'apprentissage', donnees), evenement: evenements[0].id };
    const c = catalogueDecisions(e, donnees);
    expect(c[0].statut).toBe('urgent');
    expect(c.find((x) => x.id === 'programme:apprentissage').statut).toBe('en_cours');
    expect(filtrerDecisions(c, { categorie: 'negociation' }).every((x) => x.type === 'accord')).toBe(true);
    expect(filtrerDecisions(c, { secteur: 'recherche' }).length).toBe(2);
  });
  it('un député ne voit ni 49.3 ni dissolution', () => {
    expect(catalogueDecisions(partie('depute'), donnees).some((x) => x.type === 'dissolution')).toBe(false);
  });
});
