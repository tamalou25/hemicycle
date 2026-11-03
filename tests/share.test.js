import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { encoderDefi, decoderDefi, ajouterAuClassement, creerPartie, tourSuivant } from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const situation = lire('situation.json');
const donnees = { partis: lire('parties.json'), lois: lire('laws.json'), senat: lire('senat.json'), calendrier: lire('calendrier.json'), evenements: lire('events.json') };
const joueur = { nom: 'Élise Défi', age: 33, parti: 'ps', role: 'premier_ministre', ideologie: { europe: 70, fiscalite: -40 }, competences: { charisme: 70, negociation: 40, economie: 50, communication: 40 } };

describe('défis', () => {
  it('aller-retour fidèle (accents compris), code compatible URL', () => {
    const code = encoderDefi({ graine: 123456, joueur });
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const d = decoderDefi(code);
    expect(d.graine).toBe(123456);
    expect(d.joueur.nom).toBe('Élise Défi');
    expect(d.joueur.ideologie.europe).toBe(70);
    expect(d.joueur.role).toBe('premier_ministre');
  });
  it('même défi + mêmes choix = même partie', () => {
    const d = decoderDefi(encoderDefi({ graine: 9, joueur }));
    const jouer = () => { let e = creerPartie({ ...d, situation }); for (let i = 0; i < 12 && !e.fin; i++) e = tourSuivant({ ...e, evenement: null }, donnees); return e.indicateurs; };
    expect(jouer()).toEqual(jouer());
  });
  it('rejette les codes invalides et borne les valeurs', () => {
    expect(() => decoderDefi('???')).toThrow();
    const pirate = btoa(JSON.stringify({ v: 1, g: 1, j: { n: 'x', i: [999], c: [-5], r: 'roi' } }));
    const d = decoderDefi(pirate);
    expect(d.joueur.ideologie.retraites).toBe(100);
    expect(d.joueur.competences.charisme).toBe(0);
    expect(d.joueur.role).toBe('depute');
  });
});

describe('classement', () => {
  it('trié, limité à 10, robuste aux données corrompues', () => {
    let c = null;
    for (let i = 0; i < 15; i++) c = ajouterAuClassement(c, { nom: `J${i}`, score: i * 5, mois: 60 });
    expect(c).toHaveLength(10);
    expect(c[0].score).toBe(70);
    expect(ajouterAuClassement([null, { score: 'x' }], { score: 1, mois: 1 })).toHaveLength(1);
  });
});
