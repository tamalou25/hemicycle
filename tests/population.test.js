import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { creerPartie, assurerTerritoires, tourSuivant, exporterPartie, importerPartie } from '../src/engine/index.js';
import { GROUPES_SOCIAUX, evoluerPopulation, intentionsRegionales, agregerRegions, resumeRegion, resumePopulation } from '../src/engine/population.js';
import { tenirElections } from '../src/engine/elections.js';
const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url)));
const donnees = Object.fromEntries(['regions', 'projets', 'finances', 'parties', 'senat', 'calendrier'].map((f) => [f === 'parties' ? 'partis' : f, lire(f)]));
donnees.lois = lire('laws');
const nouvelle = () => creerPartie({ joueur: { nom: 'Camille', parti: 'epr', role: 'premier_ministre' }, situation: lire('situation'), graine: 42, ...donnees });
const somme = (o) => Object.values(o).reduce((s, n) => s + n, 0);

describe('Population et comportement électoral', () => {
  it('initialise 18 régions, quatre profils, parts et priorités normalisées', () => {
    const e = nouvelle();
    expect(Object.keys(e.population)).toHaveLength(18);
    expect(GROUPES_SOCIAUX.reduce((s, g) => s + g.part, 0)).toBeCloseTo(1);
    for (const g of GROUPES_SOCIAUX) expect(somme(g.poids)).toBeCloseTo(1);
    const r = Object.keys(e.population)[0];
    expect(Object.keys(e.population[r])).toHaveLength(4);
    expect(resumeRegion(e.population[r]).satisfaction).not.toBe(resumeRegion(e.population[r]).confiance);
  });
  it('des soins dégradés touchent davantage les retraités et la confiance réagit avec retard', () => {
    const e = nouvelle(), id = Object.keys(e.territoires)[0];
    const avant = JSON.stringify(e);
    const base = evoluerPopulation(e, 1);
    const choc = evoluerPopulation({ ...e, territoires: { ...e.territoires, [id]: { ...e.territoires[id], sante: 0 } } }, 1);
    const perte = (g) => base.population[id][g].satisfaction - choc.population[id][g].satisfaction;
    expect(perte('retraites')).toBeGreaterThan(perte('jeunes'));
    expect(choc.population[id].retraites.confiance).toBeLessThan(base.population[id].retraites.confiance);
    expect(JSON.stringify(e)).toBe(avant);
  });
  it('l’éducation et la protection sociale ont des bénéficiaires différents', () => {
    const e = nouvelle(), id = Object.keys(e.population)[0];
    const base = evoluerPopulation(e, 1);
    const edu = evoluerPopulation({ ...e, budget: { ...e.budget, ecarts: { education: 10 } } }, 1);
    expect(edu.population[id].jeunes.satisfaction - base.population[id].jeunes.satisfaction)
      .toBeGreaterThan(edu.population[id].retraites.satisfaction - base.population[id].retraites.satisfaction);
  });
  it('améliorer la confiance locale modifie le vote local sans le confondre avec elle', () => {
    const e = nouvelle(), [a, b] = Object.keys(e.population);
    const initial = intentionsRegionales(e, donnees.partis);
    const population = { ...e.population, [a]: Object.fromEntries(GROUPES_SOCIAUX.map((g) => [g.id, { ...e.population[a][g.id], confiance: 90 }])) };
    const intentions = intentionsRegionales({ ...e, population }, donnees.partis);
    expect(intentions[a].epr).toBeGreaterThan(initial[a].epr);
    expect(intentions[a].epr).not.toBe(90);
    expect(intentions[b]).toEqual(initial[b]);
    for (const scores of Object.values(intentions)) expect(somme(scores)).toBeCloseTo(100, 8);
  });
  it('pondère les résultats par la population, sans compter les régions absentes', () => {
    const scores = agregerRegions({ a: { x: 80, y: 20 }, b: { x: 20, y: 80 } }, [{ id: 'a', population: 3 }, { id: 'b', population: 1 }, { id: 'absente', population: 99 }]);
    expect(scores.x).toBe(65);
    expect(scores.y).toBe(35);
  });
  it('scrutins régionaux reproductibles, agrégation exacte et 577 sièges', () => {
    const e = nouvelle();
    e.tour = 2;
    e.electionsAnticipees = [{ id: 'test', type: 'legislatives', tour: 2 }];
    const avant = JSON.stringify(e);
    const a = tenirElections(e, donnees, {}, e.graine);
    expect(a).toEqual(tenirElections(e, donnees, {}, e.graine));
    const r = a.etat.resultatsElections[0];
    expect(Object.keys(r.regions)).toHaveLength(18);
    expect(r.scores).toEqual(agregerRegions(r.regions, donnees.regions.regions));
    expect(somme(r.sieges)).toBe(577);
    expect(JSON.stringify(e)).toBe(avant);
    expect(importerPartie(exporterPartie(a.etat)).resultatsElections).toEqual(a.etat.resultatsElections);
  });
  it('conserve les profils et explique leurs variations lors d’un aller-retour', () => {
    const e = tourSuivant(nouvelle(), donnees);
    expect(e.explications.some((x) => x.groupe && x.indicateur === 'satisfaction')).toBe(true);
    expect(importerPartie(exporterPartie(e))).toEqual(e);
    expect(resumePopulation(e, donnees.regions.regions)).not.toBeNull();
  });
  it('migre la v6 sans effacer les territoires ni les projets', () => {
    const e = nouvelle();
    const ancien = { ...e, version: 6 }; delete ancien.population;
    const importe = importerPartie(JSON.stringify(ancien));
    expect(importe.version).toBe(7);
    expect(importe.population).toBeNull();
    const complete = assurerTerritoires(importe, donnees);
    expect(complete.population).toEqual(e.population);
    expect(complete.territoires).toEqual(e.territoires);
  });
  it('nettoie les profils importés et reconstruit une structure incomplète', () => {
    const e = nouvelle(), id = Object.keys(e.population)[0];
    e.population[id].jeunes = { satisfaction: 500, confiance: '<script>', reference: -50, inconnu: true };
    const propre = importerPartie(exporterPartie(e));
    expect(propre.population[id].jeunes).toEqual({ satisfaction: 100, confiance: 30, reference: 0 });
    delete e.population[id].retraites;
    expect(assurerTerritoires(importerPartie(exporterPartie(e)), donnees).population[id].retraites).toBeDefined();
  });
  it('reste borné et déterministe sur deux ans, tous les profils évoluent sans mutation', () => {
    let e = nouvelle();
    for (let i = 0; i < 24; i++) {
      // Ne pas déclencher les scrutins nationaux ni la censure dans ce test de durée.
      const d = { ...donnees, calendrier: { elections: [] } };
      e = { ...e, joueur: { ...e.joueur, role: 'depute' } };
      const initial = JSON.stringify(e);
      const prochain = tourSuivant(e, d);
      expect(prochain).toEqual(tourSuivant(e, d));
      expect(JSON.stringify(e)).toBe(initial);
      e = prochain;
      for (const region of Object.values(e.population)) for (const groupe of Object.values(region)) {
        for (const valeur of Object.values(groupe)) {
          expect(valeur).toBeGreaterThanOrEqual(0);
          expect(valeur).toBeLessThanOrEqual(100);
        }
      }
    }
    expect(e.tour).toBe(24);
  });
});
