// Mission d'initiation : même moteur, progression déduite de l'état réel.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, lancerProjet, etapesMission, differerMission, apercuProjet, projetMission, effetObserve,
  exporterPartie, importerPartie, encoderDefi, decoderDefi, VERSION_SAUVEGARDE,
} from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events', 'objectifs'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements, objectifs] = noms.map((n) => lire(`${n}.json`));
const mission = lire('mission.json');
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements, objectifs };
const situation = lire('situation.json');
const ideologie = { epr: 10, rn: 60, lfi: -70, ps: -40, dr: 40, ecolo: -50 };
const partie = (graine = 3, parti = 'epr', role = 'premier_ministre') => creerPartie({
  joueur: { nom: 'Test', parti, role, ideologie: Object.fromEntries(['retraites', 'immigration', 'fiscalite', 'europe', 'ecologie', 'securite'].map((a) => [a, ideologie[parti] ?? 0])) },
  situation, graine, ...donnees, mission,
});
const jouer = (e, n) => { for (let i = 0; i < n && !e.fin; i++) e = tourSuivant(e, donnees); return e; };

describe('mission.json', () => {
  it('schéma : options vers des projets connus agissant sur l’indice, acteur fictif', () => {
    expect(mission.duree_mois).toBe(6);
    expect(mission.options.length).toBeGreaterThanOrEqual(2);
    for (const o of mission.options) {
      const p = projets.projets.find((x) => x.id === o.projetId);
      expect(p, o.projetId).toBeTruthy();
      expect(p.effets[mission.indice]).toBeGreaterThan(0);
      expect(o.libelle.length).toBeGreaterThan(0);
    }
    expect(mission.acteur.fictif).toBe(true);
  });
});

describe('mission d’initiation', () => {
  it('création : région au plus bas indice (règle déterministe), aucune mission sans le mode découverte', () => {
    const e = partie();
    const min = Math.min(...Object.values(e.territoires).map((t) => t.sante));
    expect(e.territoires[e.mission.region].sante).toBe(min);
    expect(e.mission).toMatchObject({ statut: 'en_cours', debut: 0, echeance: 6, differe: null });
    expect(creerPartie({ joueur: { nom: 'X', parti: 'epr' }, situation, ...donnees }).mission).toBeNull();
  });

  it('voie courte : action réelle, ressources débitées, effet attribué et observé, débrief « réalisation »', () => {
    for (const [graine, parti] of [[1, 'epr'], [7, 'rn'], [21, 'lfi'], [42, 'ps'], [99, 'dr']]) {
      let e = partie(graine, parti);
      const env = e.finances.enveloppe;
      e = lancerProjet(e, 'recrutement-soignants', e.mission.region, donnees);
      expect(e.finances.enveloppe).toBeCloseTo(env - 0.15, 6);
      expect(etapesMission(e, donnees).find((x) => x.id === 'choisir').etat).toBe('fait');
      e = jouer(e, 6);
      if (e.fin && e.fin.type !== 'mandat') continue; // fin anticipée : couverte ailleurs
      const d = e.mission.debrief;
      expect(e.mission.statut, `graine ${graine}`).toBe('terminee');
      expect(d.resultat).toBe('realisation');
      expect(d.effetObserve).toBeGreaterThan(0);
      // Cohérence : l'effet du débrief = somme des entrées du registre des causes
      const somme = e.explications.filter((x) => x.source === 'projet:recrutement-soignants' && x.region === e.mission.region && x.indicateur === 'sante').reduce((a, x) => a + x.delta, 0);
      expect(d.effetObserve).toBeCloseTo(somme, 1);
      expect(d.restantAttendu).toBeGreaterThan(0); // montée en charge non terminée : la suite reste annoncée
    }
  });

  it('investissement lent : engagement pris, aucun effet inventé, effets annoncés après la mission', () => {
    let e = partie(5);
    e = lancerProjet(e, 'centres-sante', e.mission.region, donnees);
    e = jouer(e, 6);
    const d = e.mission.debrief;
    expect(d.resultat).toBe('engagement');
    expect(d.effetObserve).toBe(0);
    expect(d.service).toBeGreaterThan(e.mission.echeance);
    expect(d.restantAttendu).toBe(d.effetTheorique);
  });

  it('différer puis ne rien faire : occasion manquée, distincte des autres choix ; graine et ressources intactes', () => {
    let e = partie(5);
    const d0 = differerMission(e);
    expect(d0.graine).toBe(e.graine);
    expect(d0.finances).toEqual(e.finances);
    expect(etapesMission(d0, donnees).find((x) => x.id === 'choisir').etat).toBe('fait');
    const f = jouer(d0, 6);
    expect(f.mission.debrief.resultat).toBe('manque');
    expect(etapesMission(f, donnees).find((x) => x.id === 'chantier').etat).toBe('impossible');
  });

  it('les étapes suivent l’état réel du moteur (pas les écrans)', () => {
    let e = partie(11);
    e = lancerProjet(e, 'recrutement-soignants', e.mission.region, donnees);
    const p = projetMission(e, donnees);
    const etape = (x, id) => etapesMission(x, donnees).find((s) => s.id === id).etat;
    expect(etape(e, 'service')).toBe('en_cours');
    e = jouer(e, p.service);
    expect(etape(e, 'service')).toBe('fait');
    e = jouer(e, 1);
    expect(effetObserve(e, projetMission(e, donnees))).toBeGreaterThan(0);
    expect(etape(e, 'effet')).toBe('fait');
  });

  it('aperçu pur : ni état, ni graine, ni ressources modifiés', () => {
    const e = partie(8);
    const avant = JSON.stringify(e);
    const a = apercuProjet(e, 'recrutement-soignants', e.mission.region, donnees);
    const b = apercuProjet(e, 'centres-sante', e.mission.region, donnees);
    expect(JSON.stringify(e)).toBe(avant);
    expect(a.premiersEffetsTour).toBe(4);
    expect(a.effetsDansMission[0].total).toBeGreaterThan(0);
    expect(b.effetsDansMission[0].total).toBe(0); // résultats après la mission : annoncé honnêtement
    expect(a.coutMd).toBeLessThan(b.coutMd);
  });

  it('reprise au milieu : progression retrouvée exactement, suite identique', () => {
    let e = lancerProjet(partie(13), 'recrutement-soignants', partie(13).mission.region, donnees);
    e = jouer(e, 3);
    const repris = importerPartie(exporterPartie(e));
    expect(repris.mission).toEqual(e.mission);
    expect(etapesMission(repris, donnees)).toEqual(etapesMission(e, donnees));
    expect(jouer(repris, 3).mission).toEqual(jouer(e, 3).mission);
  });

  it('ancienne sauvegarde v12 : aucune mission activée rétroactivement, partie jouable', () => {
    const e = creerPartie({ joueur: { nom: 'Ancien', parti: 'epr' }, situation, ...donnees });
    const v12 = { ...e, version: 12 };
    delete v12.mission;
    const r = importerPartie(JSON.stringify(v12));
    expect(r.version).toBe(VERSION_SAUVEGARDE);
    expect(r.mission).toBeNull();
    expect(jouer(r, 2).mission).toBeNull();
  });

  it('fin anticipée : la mission se clôt avec un débrief qui l’indique', () => {
    let e = partie(4);
    e = lancerProjet(e, 'recrutement-soignants', e.mission.region, donnees);
    e = { ...e, indicateurs: { ...e.indicateurs, popularite: 1 } };
    e = tourSuivant(e, donnees);
    expect(e.fin?.type).toBe('defaite');
    expect(e.mission.statut).toBe('terminee');
    expect(e.mission.debrief).toMatchObject({ fin: 'defaite', resultat: 'engagement' });
  });

  it('changement de rôle (présidentielle) : la mission reste réalisable et le débrief le signale', () => {
    let e = partie(6);
    e = lancerProjet(e, 'recrutement-soignants', e.mission.region, donnees);
    e = jouer(e, 2);
    e = { ...e, joueur: { ...e.joueur, role: 'depute' } }; // ce que fait la présidentielle quand le PM est remplacé
    e = jouer(e, 4);
    expect(e.mission.debrief.roleChange).toBe('depute');
    expect(['realisation', 'engagement']).toContain(e.mission.debrief.resultat);
  });

  it('défi : la mission est transmise (même graine, même parcours)', () => {
    const e = partie(17);
    const code = encoderDefi({ graine: e.graineInitiale, joueur: { ...e.joueur, mission: true } });
    const d = decoderDefi(code);
    expect(d.joueur.mission).toBe(true);
    const r = creerPartie({ ...d, situation, ...donnees, mission: d.joueur.mission ? mission : null });
    expect(r.mission).toEqual(e.mission);
    expect(decoderDefi(encoderDefi({ graine: 1, joueur: { nom: 'S', parti: 'epr' } })).joueur.mission).toBeUndefined();
  });
});
