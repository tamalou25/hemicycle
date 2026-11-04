// Difficulté (lot 5) : paramètres explicites, conservés par la sauvegarde et les défis, effets mesurables et bornés.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { creerPartie, tourSuivant, parametresDifficulte, nomDifficulte, comparerNiveaux, NIVEAUX, exporterPartie, importerPartie, encoderDefi, decoderDefi, resoudreEvenement, INDICATEURS } from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events', 'economie', 'pays', 'defense', 'difficulte', 'objectifs'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements, economie, pays, defense, difficulte, objectifs] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements, economie, pays, defense, difficulte, objectifs };
const situation = lire('situation.json');
const nouvelle = (graine = 1, niveau = 'normal') => creerPartie({ joueur: { nom: 'Sim', parti: 'epr', role: 'president', ideologie: partis.find((p) => p.id === 'epr').positions, difficulte: niveau }, situation, graine, dateDepart: '2027-05-01', ...donnees });
const reactif = (e) => { if (!e.evenement) return e; const ev = evenements.find((x) => x.id === e.evenement); const i = ev.choix.findIndex((c) => (c.cout_capital ?? 0) <= e.joueur.capital); return resoudreEvenement(e, Math.max(0, i), donnees); };
const jouer = (graine, niveau, mois = 60, strategie = (e) => e) => { let e = nouvelle(graine, niveau); for (let m = 0; m < mois && !e.fin; m++) e = tourSuivant(strategie(e), donnees); return e; };
const GRAINES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('niveaux', () => {
  it('trois niveaux explicites, normal = règles de base, facile conseillé aux débutants', () => {
    expect(Object.keys(difficulte.niveaux)).toEqual(NIVEAUX);
    expect(parametresDifficulte({ difficulte: null }, donnees)).toMatchObject({ niveau: 'normal', capital_bonus: 0, bruit: 1, evenements: 1, initiatives: 1, enveloppe: 1, usure: 1 });
    expect(parametresDifficulte({ difficulte: 'facile' }, donnees).capital_bonus).toBeGreaterThan(0);
    expect(parametresDifficulte({ difficulte: 'difficile' }, donnees).evenements).toBeGreaterThan(1);
    expect(difficulte.conseille_debutant).toBe('facile');
    expect(comparerNiveaux(donnees).length).toBe(6);
    expect(nomDifficulte({ difficulte: null }, donnees)).toBe('Normal');
  });
  it('un niveau inconnu devient null (normal) ; conservé par la sauvegarde et le défi', () => {
    expect(nouvelle(1, 'zzz').difficulte).toBeNull();
    const e = nouvelle(1, 'facile');
    expect(e.difficulte).toBe('facile');
    expect(importerPartie(exporterPartie(e)).difficulte).toBe('facile');
    const brut = { ...JSON.parse(exporterPartie(e)), difficulte: '<x>' };
    expect(importerPartie(JSON.stringify(brut)).difficulte).toBeNull();
    const d = decoderDefi(encoderDefi({ graine: 7, joueur: { ...e.joueur, difficulte: 'difficile' } }));
    expect(d.joueur.difficulte).toBe('difficile');
    expect(creerPartie({ ...d, situation, ...donnees }).difficulte).toBe('difficile');
  });
});

describe('effets mesurables', () => {
  it('même graine : le capital mensuel suit le niveau ; sans niveau (ancienne partie), identique à normal', () => {
    const f = tourSuivant(nouvelle(3, 'facile'), donnees), n = tourSuivant(nouvelle(3, 'normal'), donnees), d = tourSuivant(nouvelle(3, 'difficile'), donnees);
    expect(f.joueur.capital).toBe(n.joueur.capital + 1);
    expect(d.joueur.capital).toBe(n.joueur.capital - 1);
    const sans = tourSuivant({ ...nouvelle(3, 'normal'), difficulte: null }, donnees);
    expect(JSON.stringify({ ...sans, difficulte: 'normal' })).toBe(JSON.stringify(n));
  });
  it('enveloppe régionale renouvelée selon le niveau (janvier)', () => {
    const f = jouer(2, 'facile', 9), n = jouer(2, 'normal', 9), d = jouer(2, 'difficile', 9);
    expect(f.finances.enveloppe).toBeGreaterThan(n.finances.enveloppe);
    expect(d.finances.enveloppe).toBeLessThan(n.finances.enveloppe);
  });
  it('sur 12 graines et un mandat passif : moins d’événements et d’initiatives en facile qu’en difficile, aucune valeur invalide', () => {
    const compte = (niv) => GRAINES.map((g) => jouer(g, niv)).reduce((s, e) => s + e.evenementsPasses.length + (e.diplomatie?.initiativesPassees?.length ?? 0), 0);
    const parties = GRAINES.map((g) => jouer(g, 'difficile'));
    for (const e of parties) for (const i of INDICATEURS) expect(Number.isFinite(e.indicateurs[i])).toBe(true);
    expect(compte('facile')).toBeLessThan(compte('difficile'));
  });
  it('joueur réactif : moins d’échecs en facile qu’en difficile ; aucun niveau ne condamne d’avance (échecs < 60 %)', () => {
    const echec = (e) => e.fin && e.fin.type !== 'mandat';
    const taux = (niv) => GRAINES.map((g) => jouer(g, niv, 60, reactif)).filter(echec).length / GRAINES.length;
    const f = taux('facile'), d = taux('difficile');
    expect(f).toBeLessThanOrEqual(d);
    expect(d).toBeLessThan(0.6);
    expect(f).toBeLessThan(0.25);
  });
});
