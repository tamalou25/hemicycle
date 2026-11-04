// Présidence : pouvoirs et limites du rôle, censure → gouvernement renversé (pas la présidence), nomination, compatibilité.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, proposerLoi, recourir493, raisonRefus493, engagerPolitique, raisonRefusPolitique, deposerPLF, raisonRefusPLF,
  proposerDissolution, raisonRefusDissolution, negocierAccord, nommerGouvernement, raisonRefusNommer, gouverne, partiGouvernement,
  catalogueDecisions, groupesAssemblee, voterCensure, voterChambre, scoreGroupe, exporterPartie, importerPartie, VERSION_SAUVEGARDE,
  evaluerObjectifs, normaliserObjectifs, eligible, situationGouvernement, DELAI_NOMINATION, prochainesElections,
} from '../src/engine/index.js';
import { avancerNavette, censureSpontanee } from '../src/engine/navette.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events', 'objectifs'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements, objectifs] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements, objectifs };
const situation = lire('situation.json');
const positions = (parti) => ({ ...partis.find((p) => p.id === parti).positions });
/** Campagne présidentielle : président·e fictif·ve, mandat à partir de mai 2027 (après la présidentielle simulée hors jeu). */
const president = (parti = 'epr', graine = 3) => creerPartie({ joueur: { nom: 'P', parti, role: 'president', ideologie: positions(parti) }, situation, graine, dateDepart: '2027-05-01', ...donnees });
const pm = (parti = 'epr', graine = 3) => creerPartie({ joueur: { nom: 'M', parti, role: 'premier_ministre', ideologie: positions(parti) }, situation, graine, ...donnees });
/** Extrême opposé de tout l'hémicycle : la censure passe. */
const presidentIsole = () => creerPartie({ joueur: { nom: 'I', parti: 'epr', role: 'president', ideologie: { retraites: 100, immigration: -100, fiscalite: 100, europe: 100, ecologie: -100, securite: 100 } }, situation, graine: 3, dateDepart: '2027-05-01', ...donnees });
const jouer = (e, n) => { for (let i = 0; i < n && !e.fin; i++) e = tourSuivant(e, donnees); return e; };

describe('pouvoirs et limites du président', () => {
  it('création : gouvernement du parti du joueur, +1 capital par mois comme le PM, pas de présidentielle pendant le mandat', () => {
    const e = president();
    expect(e.gouvernement).toMatchObject({ parti: 'epr', statut: 'en_place', depuis: 0, renversements: 0 });
    expect(gouverne(e)).toBe(true);
    expect(partiGouvernement(e)).toBe('epr');
    expect(jouer(e, 1).joueur.capital).toBe(jouer(pm(), 1).joueur.capital);
    expect(prochainesElections(e, calendrier).some((x) => x.type === 'presidentielle')).toBe(false);
    expect(prochainesElections(e, calendrier).some((x) => x.type === 'legislatives')).toBe(true);
    expect(pm().gouvernement).toBeNull();
  });

  it('agit par son gouvernement : projet de loi, programme, PLF, 49.3 ; dissolution de plein droit ; pas de candidature', () => {
    let e = president('epr', 5);
    e = proposerLoi(e, 'securite-fermete', donnees);
    expect(e.journal.at(-1).texte).toMatch(/^Projet de loi/);
    expect(raisonRefus493({ ...e, actionCeMois: false })).toBeNull();
    expect(raisonRefusPolitique(e, politiques.politiques[0], politiques)).toBeNull();
    expect(raisonRefusPLF({ ...e, dateDepart: { annee: 2027, mois: 9 } })).toBeNull();
    expect(raisonRefusDissolution(e)).toBeNull();
    const d = proposerDissolution({ ...e, actionCeMois: false });
    expect(d.electionsAnticipees).toHaveLength(1); // jamais refusée : c'est sa décision (art. 12)
    expect(d.journal.at(-1).texte).toMatch(/^Vous dissolvez/);
    expect(d.texte).toBeNull(); // les textes en cours tombent
    // Objectif « programmes » (réservé au gouvernement) accessible au président
    expect(normaliserObjectifs(['programmes', 'chomage', 'deficit'], objectifs, 'president')).toEqual(['programmes', 'chomage', 'deficit']);
    // Événements réservés au Premier ministre : éligibles tant qu'un gouvernement est en place
    const evPM = evenements.find((x) => x.role === 'premier_ministre');
    expect(eligible(evPM, { ...e, indicateurs: { ...e.indicateurs, deficit: 6, dette: 130, popularite: 20 } })).toBe(true);
    expect(eligible(evPM, { ...e, gouvernement: { ...e.gouvernement, statut: 'renverse' }, indicateurs: { ...e.indicateurs, deficit: 6, dette: 130, popularite: 20 } })).toBe(false);
  });

  it('sans gouvernement (renversé) : mesures gouvernementales, PLF et 49.3 refusés avec une raison ; projets et propositions de loi restent possibles', () => {
    let e = president('epr', 5);
    e = { ...e, gouvernement: { ...e.gouvernement, statut: 'renverse' } };
    expect(gouverne(e)).toBe(false);
    expect(raisonRefusPolitique(e, politiques.politiques[0], politiques)).toMatch(/gouvernement/);
    expect(raisonRefusPLF({ ...e, dateDepart: { annee: 2027, mois: 9 } })).toMatch(/gouvernement/);
    expect(() => recourir493(proposerLoi(e, 'securite-fermete', donnees), donnees)).toThrow(/nommez/);
    expect(proposerLoi(e, 'securite-fermete', donnees).journal.at(-1).texte).toMatch(/^Proposition de loi/);
    const cat = catalogueDecisions(e, donnees);
    expect(cat.filter((x) => x.type === 'gouvernement' && x.statut === 'urgent').length).toBeGreaterThan(0);
    expect(cat.find((x) => x.type === 'projet' && !x.raison)).toBeTruthy();
  });
});

describe('censure et conséquences institutionnelles', () => {
  it('49.3 puis censure adoptée : le gouvernement tombe, la partie continue ; même situation pour un PM : fin de partie', () => {
    const AN = groupesAssemblee(partis, null);
    let e = presidentIsole();
    expect(voterCensure(e, AN).adoptee).toBe(true);
    e = recourir493(proposerLoi(e, 'securite-fermete', donnees), donnees);
    const r = avancerNavette(e, donnees, e.graine).etat;
    expect(r.fin).toBeNull();
    expect(r.gouvernement).toMatchObject({ statut: 'renverse', renversements: 1, renverseLe: 0 });
    expect(r.texte).toBeNull();
    expect(r.journal.some((j) => j.type === 'gouvernement' && /nommez/.test(j.texte))).toBe(true);
    const m = creerPartie({ joueur: { nom: 'M', parti: 'epr', role: 'premier_ministre', ideologie: e.joueur.ideologie }, situation, graine: 3, ...donnees });
    const rm = avancerNavette(recourir493(proposerLoi(m, 'securite-fermete', donnees), donnees), donnees, m.graine).etat;
    expect(rm.fin?.type).toBe('censure');
  });

  it('censure spontanée : renverse le gouvernement du président sans finir la partie ; aucune censure sans gouvernement', () => {
    let e = presidentIsole();
    e = { ...e, indicateurs: { ...e.indicateurs, tensions: 100, popularite: 9 } }; // probabilité ≈ 0,45 + 0,22 : certaine à la graine testée ?
    let r = null;
    for (let g = 1; g < 60 && !r?.gouvernement?.renversements; g++) r = censureSpontanee(e, donnees, g).etat;
    expect(r.gouvernement.statut).toBe('renverse');
    expect(r.fin).toBeNull();
    const sans = censureSpontanee({ ...r, journal: [] }, donnees, 1).etat;
    expect(sans.journal).toHaveLength(0); // plus de gouvernement à censurer
  });

  it('censure sur le budget (49.3) : loi spéciale et gouvernement renversé, partie continue', () => {
    let e = presidentIsole();
    e = { ...e, dateDepart: { annee: 2027, mois: 10 } };
    e = deposerPLF(e, { depenses: {}, recettes: {} });
    e = { ...e, plf: { ...e.plf, recours493: true } };
    const r = tourSuivant(e, donnees);
    expect(r.fin).toBeNull();
    expect(r.gouvernement.statut).toBe('renverse');
    expect(r.plf).toBeNull();
    expect(r.dernierPLF).toBe(0);
  });

  it('nommer un gouvernement : règles réelles (capital, délai de 12 mois sans censure, parti sans député), soutien et protection du nouveau parti', () => {
    let e = presidentIsole();
    e = { ...e, gouvernement: { ...e.gouvernement, statut: 'renverse', renversements: 1 } };
    expect(raisonRefusNommer(e, 'reconquete', partis)).toMatch(/aucun député/);
    expect(raisonRefusNommer({ ...e, joueur: { ...e.joueur, capital: 1 } }, 'rn', partis)).toMatch(/Capital/);
    expect(raisonRefusNommer(pm(), 'rn', partis)).toMatch(/président/);
    const capital = e.joueur.capital;
    const n = nommerGouvernement(e, 'rn', donnees);
    expect(n.gouvernement).toMatchObject({ parti: 'rn', statut: 'en_place', depuis: 0, nominations: 1 });
    expect(n.joueur.capital).toBe(capital - 2);
    expect(n.indicateurs.popularite).toBeLessThan(e.indicateurs.popularite); // cohabitation choisie, écart > 60
    expect(gouverne(n)).toBe(true);
    const AN = groupesAssemblee(partis, null);
    const rn = AN.find((g) => g.parti === 'rn');
    expect(scoreGroupe(n, rn, 'immigration', 0)).toBeCloseTo(scoreGroupe(e, rn, 'immigration', 0) + 0.15, 6);
    expect(voterCensure(n, AN).detail.find((d) => d.groupe === 'rn').vote).toBe('contre');
    expect(raisonRefusNommer({ ...n, actionCeMois: false }, 'dr', partis)).toMatch(/12 mois/);
    expect(raisonRefusNommer({ ...n, actionCeMois: false, tour: DELAI_NOMINATION }, 'dr', partis)).toBeNull();
    expect(() => negocierAccord({ ...n, negoCeMois: false }, 'rn', donnees)).toThrow(/dirige déjà/);
    expect(situationGouvernement(n, partis)).toMatchObject({ sigle: 'RN', cohabitation: true, renversements: 1 });
  });
});

describe('compatibilité', () => {
  it('sauvegarde v15 : aller-retour exact ; v14 → v15 : gouvernement null, rôle et règles inchangés ; rôle inconnu refusé', () => {
    let e = president('ps', 7);
    e = jouer(e, 2);
    const r = importerPartie(exporterPartie(e));
    expect(r).toEqual(e);
    const ancien = { ...pm('ps', 7), version: 14 }; delete ancien.gouvernement;
    const m = importerPartie(JSON.stringify(ancien));
    expect(m.version).toBe(VERSION_SAUVEGARDE);
    expect(m.gouvernement).toBeNull();
    expect(m.joueur.role).toBe('premier_ministre');
    expect(jouer(m, 2).gouvernement).toBeNull();
    // Un gouvernement joint à un non-président est ignoré ; un président sans gouvernement reste jouable
    expect(importerPartie(JSON.stringify({ ...pm(), gouvernement: { parti: 'rn', statut: 'en_place' } })).gouvernement).toBeNull();
    const sans = importerPartie(JSON.stringify({ ...president(), gouvernement: null }));
    expect(sans.joueur.role).toBe('president');
    expect(gouverne(sans)).toBe(false);
    expect(importerPartie(JSON.stringify({ ...president(), joueur: { ...president().joueur, role: 'roi' } })).joueur.role).toBe('depute');
  });

  it('parcours de 24 mois d’un président (plusieurs partis, graines fixées) : aucun double traitement, fin cohérente, objectifs évalués', () => {
    for (const [parti, graine] of [['epr', 1], ['rn', 2], ['lfi', 3], ['ps', 4], ['dr', 5]]) {
      let e = president(parti, graine);
      const premier = politiques.politiques.find((p) => !p.prerequis?.length);
      e = engagerPolitique(e, premier.id, donnees);
      e = proposerLoi(e, 'securite-fermete', donnees);
      for (let m = 0; m < 24 && !e.fin; m++) {
        e = tourSuivant(e, donnees);
        if (e.gouvernement?.statut === 'renverse' && !e.actionCeMois && e.joueur.capital >= 2) e = nommerGouvernement(e, e.joueur.parti, donnees);
      }
      expect(e.fin?.type ?? null).not.toBe('censure');
      expect(e.fin?.type ?? null).not.toBe('victoire');
      // Une mise en service ou une promulgation n'est jamais journalisée deux fois
      const textes = e.journal.filter((j) => j.type === 'adoption' || /^Mise en service/.test(j.texte)).map((j) => j.texte);
      expect(new Set(textes).size).toBe(textes.length);
      expect(evaluerObjectifs(e, donnees).length).toBe(3);
    }
  });
});
