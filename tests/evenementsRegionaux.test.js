import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { creerPartie, tourSuivant, tirerEvenement, resoudreEvenement, raisonRefusChoix, eligible, importerPartie, exporterPartie, phraseExplication } from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements };
const partie = (g = 3) => creerPartie({ joueur: { nom: 'T', parti: 'epr', role: 'premier_ministre' }, situation: lire('situation.json'), graine: g, ...donnees });
const regionaux = evenements.filter((e) => e.region_cible);

describe('événements régionaux', () => {
  it('données : au moins 4 événements régionaux, indices connus, dernier choix passif gratuit', () => {
    expect(regionaux.length).toBeGreaterThanOrEqual(4);
    for (const e of regionaux) {
      expect(['emploi', 'sante', 'transports']).toContain(e.region_cible.indice);
      expect(e.choix.at(-1).cout_capital).toBe(0);
      expect(e.choix.at(-1).cout_md ?? 0).toBe(0);
      for (const c of e.choix) for (const x of c.effets_region ?? []) expect(['emploi', 'sante', 'transports', 'confiance']).toContain(x.indice);
    }
  });
  it('sans territoires, aucun événement régional n’est tiré', () => {
    expect(eligible(regionaux[0], { ...partie(), territoires: null })).toBe(false);
  });
  it('la région visée est parmi les 3 plus fragiles sur l’indice concerné', () => {
    const e = partie();
    for (let g = 1; g < 400; g++) {
      const t = tirerEvenement(e, regionaux, g);
      if (!t.evenementId) continue;
      const ev = regionaux.find((x) => x.id === t.evenementId);
      const fragiles = Object.entries(e.territoires).sort((a, b) => a[1][ev.region_cible.indice] - b[1][ev.region_cible.indice]).slice(0, 3).map(([id]) => id);
      expect(fragiles).toContain(t.region);
    }
  });
  it('répondre : effets locaux immédiats, expliqués, coût sur l’enveloppe', () => {
    const ev = regionaux.find((x) => x.id === 'fermeture-maternite');
    const e = { ...partie(), evenement: ev.id, evenementRegion: 'mayotte' };
    const r = resoudreEvenement(e, 0, donnees);
    expect(r.territoires.mayotte.sante).toBeCloseTo(e.territoires.mayotte.sante + 4);
    expect(r.confianceRegions.mayotte).toBeCloseTo(e.confianceRegions.mayotte + 4);
    expect(r.finances.enveloppe).toBeCloseTo(e.finances.enveloppe - 0.15);
    expect(r.evenementRegion).toBeNull();
    const x = r.explications.find((y) => y.region === 'mayotte' && y.indicateur === 'sante');
    expect(phraseExplication(x, donnees)).toMatch(/maternité.*Mayotte/);
    expect(r.journal.at(-1).texte).toMatch(/\(Mayotte\)/);
  });
  it('enveloppe insuffisante → choix refusé ; option passive toujours possible', () => {
    const ev = regionaux.find((x) => x.id === 'ligne-suspendue');
    const e = { ...partie(), evenement: ev.id, evenementRegion: 'corse', finances: { ...partie().finances, enveloppe: 0 } };
    expect(raisonRefusChoix(e, ev.choix[0])).toMatch(/Enveloppe/);
    expect(() => resoudreEvenement(e, ev.choix.length - 1, donnees)).not.toThrow();
  });
  it('ignoré : l’option passive s’applique à la région à la fin du mois ; sauvegarde v12', () => {
    const ev = regionaux.find((x) => x.id === 'fermeture-usine');
    const e = { ...partie(), evenement: ev.id, evenementRegion: 'guyane' };
    const r = tourSuivant(e, donnees);
    // Datés du mois affiché après le passage, pour apparaître dans la fiche région (revue PR #22)
    expect(r.explications.some((y) => y.region === 'guyane' && y.source === `evenement:${ev.id}` && y.tour === r.tour)).toBe(true);
    const s = { ...partie(), evenement: ev.id, evenementRegion: 'guyane' };
    expect(importerPartie(exporterPartie(s))).toEqual(s);
  });
});
