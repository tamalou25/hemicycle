import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, lancerProjet, raisonRefusProjet, briefing, prevoirProjets, principales,
  phraseExplication, importerPartie, exporterPartie, assurerTerritoires, indiceEmploi, indiceSante, facteurTaille,
} from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const partis = lire('parties.json'), situation = lire('situation.json'), projets = lire('projets.json');
// Régions fictives de test (les vraies données sont testées dans data.schema.test.js)
const regions = { regions: [
  { id: 'alpha', nom: 'Alpha', population: 5_000_000, chomage: 7, apl_medecins: 3.5 },
  { id: 'beta', nom: 'Bêta', population: 1_250_000, chomage: 12, apl_medecins: 1.5 },
] };
const donnees = { partis, lois: lire('laws.json'), senat: lire('senat.json'), calendrier: lire('calendrier.json'), regions, projets };
const partie = (g = 2) => creerPartie({ joueur: { nom: 'T', parti: 'epr', role: 'premier_ministre' }, situation, graine: g, regions, projets });
const sansAlea = (e) => ({ ...e, graine: 999_999 }); // graine pour laquelle on vérifie l'absence d'aléa ci-dessous

describe('territoires', () => {
  it('indices dérivés des données observées, bornés 0-100', () => {
    expect(indiceEmploi(4)).toBe(100);
    expect(indiceEmploi(30)).toBe(0);
    expect(indiceSante(4.5)).toBe(100);
    expect(indiceSante(null)).toBe(50);
    const e = partie();
    expect(e.territoires.beta.sante).toBeLessThan(e.territoires.alpha.sante);
    expect(e.satisfactionInitiale).toBeGreaterThan(0);
  });
  it('les services s’usent sans investissement', () => {
    let e = partie();
    const s0 = e.territoires.alpha.sante;
    for (let i = 0; i < 6; i++) e = tourSuivant({ ...e, evenement: null }, donnees);
    expect(e.territoires.alpha.sante).toBeCloseTo(s0 - 0.72, 1);
  });
});

describe('projets', () => {
  it('lancer : débite l’enveloppe, pas deux fois le même projet dans la même région', () => {
    const e = partie();
    const a = lancerProjet(e, 'centres-sante', 'beta', donnees);
    expect(a.finances.enveloppe).toBeCloseTo(e.finances.enveloppe - 0.3);
    expect(a.projets[0].statut).toBe('chantier');
    expect(() => lancerProjet(a, 'centres-sante', 'beta', donnees)).toThrow(/déjà en cours/);
    expect(lancerProjet(a, 'centres-sante', 'alpha', donnees).projets).toHaveLength(2);
  });
  it('enveloppe insuffisante → refus', () => {
    const e = { ...partie(), finances: { enveloppe: 0.1, recurrent: 0 } };
    expect(raisonRefusProjet(e, projets.projets[0], regions.regions[0])).toMatch(/insuffisante/);
  });
  it('cycle complet : chantier → mise en service (coût annuel → déficit) → montée en charge → effet expliqué', () => {
    let e = lancerProjet(partie(), 'centres-sante', 'beta', donnees);
    const p = e.projets[0];
    const def = projets.projets.find((x) => x.id === 'centres-sante');
    const s0 = e.territoires.beta.sante;
    while (e.tour < p.service + def.montee_mois && !e.fin) e = tourSuivant({ ...e, evenement: null }, donnees);
    expect(e.projets[0].statut).toBe('service');
    expect(e.finances.recurrent).toBeCloseTo(def.cout_annuel_md);
    // gain total = effet × efficacité × facteur taille ; moins l'usure sur la période
    const gain = def.effets.sante * p.efficacite * facteurTaille(1_250_000);
    expect(e.territoires.beta.sante - s0).toBeCloseTo(gain - 0.12 * e.tour, 0);
    const x = e.explications.find((y) => y.type === 'projet' && y.region === 'beta');
    expect(phraseExplication(x, donnees)).toMatch(/Centres de santé.*Bêta/);
    expect(e.journal.some((j) => /Mise en service/.test(j.texte))).toBe(true);
  });
  it('une petite région gagne plus par euro investi (facteur borné)', () => {
    expect(facteurTaille(1_250_000)).toBe(2);
    expect(facteurTaille(12_000_000)).toBeGreaterThanOrEqual(0.5);
  });
  it('prévisions de montée en charge', () => {
    let e = lancerProjet(partie(), 'recrutement-soignants', 'alpha', donnees);
    e = tourSuivant({ ...e, evenement: null }, donnees);
    expect(prevoirProjets(e, donnees, 6).some((x) => x.region === 'alpha' && x.delta > 0)).toBe(true);
  });
  it('le risque est tiré à la graine : reproductible', () => {
    const a = lancerProjet(partie(5), 'renovation-ter', 'alpha', donnees).projets[0];
    const b = lancerProjet(partie(5), 'renovation-ter', 'alpha', donnees).projets[0];
    expect(a).toEqual(b);
  });
  it('enveloppe renouvelée en janvier', () => {
    let e = { ...partie(), finances: { enveloppe: 0, recurrent: 0, annee: 0 } };
    for (let i = 0; i < 3; i++) e = tourSuivant({ ...e, evenement: null }, donnees); // nov → fév
    expect(e.finances.enveloppe).toBe(projets.enveloppe_annuelle_md);
  });
});

describe('briefing et bilan', () => {
  it('au plus 3 points, situation critique en tête', () => {
    const e = { ...partie(), territoires: { ...partie().territoires, beta: { emploi: 20, sante: 30, transports: 50, satisfaction: 30 } } };
    const b = briefing(e, donnees);
    expect(b.length).toBeLessThanOrEqual(3);
    expect(b[0].region).toBe('beta');
  });
  it('le bilan national ignore l’usure régionale (pas de bruit)', () => {
    let e = tourSuivant(partie(), donnees);
    expect(principales(e.explications, e.tour, 10).every((x) => !x.region || x.type === 'projet')).toBe(true);
  });
});

describe('sauvegarde v5', () => {
  it('aller-retour et migration v4 → territoires complétés', () => {
    const e = tourSuivant(lancerProjet(partie(), 'plan-mobilite', 'beta', donnees), donnees);
    expect(importerPartie(exporterPartie(e))).toEqual(e);
    const v4 = { ...partie(), version: 4 }; delete v4.territoires; delete v4.projets; delete v4.finances;
    const m = importerPartie(JSON.stringify(v4));
    expect(m.territoires).toBeNull();
    expect(assurerTerritoires(m, donnees).territoires.alpha).toBeDefined();
  });
});
