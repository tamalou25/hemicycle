import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, proposerLoi, calculerVote, dateDuTour,
  exporterPartie, importerPartie, BORNES, DUREE_MANDAT,
} from '../src/engine/index.js';
import { planifierEffets, appliquerEffets } from '../src/engine/effects.js';
import { aleatoire } from '../src/engine/rng.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const partis = lire('parties.json');
const lois = lire('laws.json');
const situation = lire('situation.json');
const donnees = { partis, lois };

const joueur = {
  nom: 'Camille Test', age: 35, parti: 'ps',
  ideologie: { retraites: 50, fiscalite: -50 },
  competences: { charisme: 60, negociation: 60, economie: 40, communication: 40 },
};
const nouvelle = (graine = 42) => creerPartie({ joueur, situation, graine });

describe('rng', () => {
  it('est déterministe', () => {
    expect(aleatoire(7)).toEqual(aleatoire(7));
    const [v] = aleatoire(7);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});

describe('creerPartie', () => {
  it('reprend les indicateurs réels de départ', () => {
    const e = nouvelle();
    expect(e.indicateurs.chomage).toBe(situation.indicateurs.chomage ?? 7.5);
    expect(e.tour).toBe(0);
  });
  it('borne idéologie et compétences', () => {
    const e = creerPartie({ joueur: { ...joueur, ideologie: { europe: 500 }, competences: { charisme: -3 } }, situation });
    expect(e.joueur.ideologie.europe).toBe(100);
    expect(e.joueur.competences.charisme).toBe(0);
  });
  it('refuse un nom vide', () => {
    expect(() => creerPartie({ joueur: { ...joueur, nom: '  ' }, situation })).toThrow();
  });
});

describe('effets différés', () => {
  it('répartit la valeur sur la durée après le délai', () => {
    const file = planifierEffets([{ indicateur: 'chomage', valeur: -0.6, delaiMois: 2, duree: 3 }], 1, 'x');
    let ind = { chomage: 8 };
    let f = file;
    const serie = [];
    for (let m = 1; m <= 7; m++) ({ indicateurs: ind, file: f } = appliquerEffets(ind, f, m)), serie.push(ind.chomage);
    expect(serie).toEqual([8, 8, 7.8, 7.6, 7.4, 7.4, 7.4]);
    expect(f).toHaveLength(0);
  });
});

describe('lois', () => {
  it('le parti du joueur vote pour', () => {
    const v = calculerVote(nouvelle(), lois[0], partis);
    expect(v.detail.find((d) => d.parti === 'ps').vote).toBe('pour');
    expect(v.pour + v.contre).toBe(partis.reduce((s, p) => s + (p.sieges_assemblee ?? 0), 0));
  });
  it('proposer une loi ne mute pas l’état et coûte du capital', () => {
    const e = nouvelle();
    const gel = JSON.stringify(e);
    const apres = proposerLoi(e, lois[0].id, donnees);
    expect(JSON.stringify(e)).toBe(gel);
    expect(apres.joueur.capital).toBe(e.joueur.capital - lois[0].cout_politique);
    expect(apres.actionCeMois).toBe(true);
  });
  it('une seule loi par mois', () => {
    const e = proposerLoi(nouvelle(), lois[0].id, donnees);
    expect(() => proposerLoi(e, lois[1].id, donnees)).toThrow(/déjà proposé/);
  });
  it('une loi adoptée planifie ses effets', () => {
    // Joueur RN + loi alignée sur la droite : majorité probable
    const e = creerPartie({ joueur: { ...joueur, parti: 'rn' }, situation });
    const loi = lois.find((l) => l.id === 'securite-fermete');
    const apres = proposerLoi(e, loi.id, donnees);
    expect(apres.loisAdoptees).toContain(loi.id);
    expect(apres.effetsEnCours.length).toBe(loi.effets.length);
  });
});

describe('tourSuivant', () => {
  it('est déterministe à graine égale', () => {
    expect(tourSuivant(nouvelle(1), donnees)).toEqual(tourSuivant(nouvelle(1), donnees));
  });
  it('avance le calendrier et réinitialise l’action', () => {
    const e = tourSuivant(proposerLoi(nouvelle(), lois[0].id, donnees), donnees);
    expect(e.tour).toBe(1);
    expect(e.actionCeMois).toBe(false);
    expect(e.sondage.intentions).toBeDefined();
    const total = Object.values(e.sondage.intentions).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(100, 0);
    const d0 = dateDuTour(nouvelle()), d12 = dateDuTour({ ...e, tour: 12 });
    expect(d12.annee).toBe(d0.annee + 1);
  });
  it('reste dans les bornes sur un mandat complet, quelles que soient les graines', () => {
    for (const g of [1, 2, 3, 99, 12345]) {
      let e = nouvelle(g);
      let i = 0;
      while (!e.fin) {
        const loi = lois[i++ % lois.length];
        try { e = proposerLoi(e, loi.id, donnees); } catch { /* refus attendu */ }
        e = tourSuivant(e, donnees);
        for (const [k, [min, max]] of Object.entries(BORNES)) {
          expect(e.indicateurs[k]).toBeGreaterThanOrEqual(min);
          expect(e.indicateurs[k]).toBeLessThanOrEqual(max);
        }
      }
      expect(e.tour).toBeLessThanOrEqual(DUREE_MANDAT);
      expect(tourSuivant(e, donnees)).toBe(e); // partie figée
    }
  });
});

describe('sauvegarde', () => {
  it('aller-retour sans perte', () => {
    const e = tourSuivant(nouvelle(), donnees);
    expect(importerPartie(exporterPartie(e))).toEqual(e);
  });
  it('rejette les fichiers invalides', () => {
    expect(() => importerPartie('pas du json')).toThrow(/illisible/);
    expect(() => importerPartie('{"version":99}')).toThrow(/incompatible/);
    expect(() => importerPartie(JSON.stringify({ ...nouvelle(), indicateurs: {} }))).toThrow(/Indicateur/);
  });
});
