import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, proposerLoi, amenderTexte, recourir493, negocierAccord,
  groupesAssemblee, groupesSenat, voterChambre, voterCensure, importerPartie, MAJORITE_CENSURE,
} from '../src/engine/index.js';
import { avancerNavette } from '../src/engine/navette.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const partis = lire('parties.json'), lois = lire('laws.json'), situation = lire('situation.json'), senat = lire('senat.json');
const donnees = { partis, lois, senat };
const comp = { charisme: 50, negociation: 50, economie: 50, communication: 50 };
const partie = (parti, role = 'depute', ideologie = {}, graine = 3) =>
  creerPartie({ joueur: { nom: 'Test', parti, role, ideologie, competences: comp }, situation, graine });
const loi = (id) => lois.find((l) => l.id === id);
const avec = (e, etape, extra = {}) => ({ ...e, texte: { loiId: 'securite-fermete', etape, orientation: loi('securite-fermete').orientation, facteur: 1, recours493: false, amendements: 0, ...extra } });

describe('chambres', () => {
  it('le Sénat totalise ses sièges et reprend les positions des partis', () => {
    const g = groupesSenat(senat, partis);
    expect(g.reduce((s, x) => s + x.sieges, 0)).toBe(senat.total);
    expect(g.every((x) => x.positions)).toBe(true);
  });
  it('un vote somme tous les sièges', () => {
    const v = voterChambre(partie('ps'), groupesAssemblee(partis), 'fiscalite', -80);
    expect(v.pour + v.contre).toBe(groupesAssemblee(partis).reduce((s, g) => s + g.sieges, 0));
  });
  it('un accord augmente le soutien du groupe allié', () => {
    const e = partie('ps');
    const sansAccord = voterChambre(e, groupesAssemblee(partis), 'fiscalite', 0).detail.find((d) => d.groupe === 'epr').score;
    const avecAccord = voterChambre({ ...e, accords: [{ parti: 'epr', jusqua: 99 }] }, groupesAssemblee(partis), 'fiscalite', 0).detail.find((d) => d.groupe === 'epr').score;
    expect(avecAccord).toBeGreaterThan(sansAccord);
  });
});

describe('navette', () => {
  it('Assemblée adopte → Sénat', () => {
    const { etat } = avancerNavette(avec(partie('rn'), 'assemblee'), donnees, 1);
    expect(etat.texte.etape).toBe('senat');
    expect(etat.dernierVote.chambre).toBe('assemblee');
  });
  it('rejet à l’Assemblée → texte abandonné', () => {
    const e = { ...partie('lfi'), texte: { loiId: 'europe-federalisme', etape: 'assemblee', orientation: 100, facteur: 1, recours493: false, amendements: 0 } };
    // Joueur LFI pousse un texte maximaliste : on vérifie seulement la cohérence du résultat
    const { etat } = avancerNavette(e, donnees, 1);
    if (etat.dernierVote.adoptee) expect(etat.texte.etape).toBe('senat');
    else { expect(etat.texte).toBeNull(); expect(etat.loisRejetees).toContain('europe-federalisme'); }
  });
  it('conseil → promulgation et effets planifiés (ou censure)', () => {
    const { etat } = avancerNavette(avec(partie('rn'), 'conseil'), donnees, 5);
    expect(etat.texte).toBeNull();
    const promulguee = etat.loisAdoptees.includes('securite-fermete');
    expect(promulguee || etat.loisRejetees.includes('securite-fermete')).toBe(true);
    if (promulguee) expect(etat.effetsEnCours.length).toBe(loi('securite-fermete').effets.length);
  });
  it('un texte finit toujours par sortir de la navette', () => {
    let e = proposerLoi(partie('epr'), 'fiscalite-baisse-impots', donnees);
    for (let i = 0; i < 6 && e.texte; i++) e = tourSuivant(e, donnees);
    expect(e.texte).toBeNull();
  });
});

describe('amendement', () => {
  it('refusé le même mois que le dépôt, accepté le mois suivant', () => {
    const e = proposerLoi(partie('rn'), 'securite-fermete', donnees);
    expect(() => amenderTexte(e, donnees)).toThrow(/déjà agi/);
    const a = amenderTexte({ ...e, actionCeMois: false }, donnees);
    expect(Math.abs(a.texte.orientation)).toBeLessThan(Math.abs(e.texte.orientation));
    expect(a.texte.facteur).toBe(0.8);
  });
});

describe('49.3 et censure', () => {
  it('réservé au Premier ministre', () => {
    const e = proposerLoi(partie('epr', 'depute'), 'securite-fermete', donnees);
    expect(() => recourir493({ ...e, actionCeMois: false }, donnees)).toThrow(/Premier ministre/);
  });
  it('censure adoptée si l’opposition atteint 289', () => {
    const e = partie('epr', 'premier_ministre', { retraites: 100, immigration: -100, fiscalite: 100, europe: 100, ecologie: -100, securite: 100 });
    const c = voterCensure(e, groupesAssemblee(partis));
    expect(c.requis).toBe(MAJORITE_CENSURE);
    expect(c.adoptee).toBe(c.pour >= 289);
  });
  it('49.3 → motion de censure traitée à la fin du mois', () => {
    let e = proposerLoi(partie('epr', 'premier_ministre'), 'fiscalite-baisse-impots', donnees);
    e = recourir493(e, donnees); // autorisé le mois du dépôt
    expect(e.dernier493).toBe(0);
    const apres = tourSuivant(e, donnees);
    expect(apres.journal.some((j) => j.type === 'censure')).toBe(true);
    if (apres.fin) expect(apres.fin.type).toBe('censure');
    else expect(apres.texte.etape).toBe('senat');
  });
  it('délai entre deux 49.3', () => {
    const e = { ...avec(partie('epr', 'premier_ministre'), 'assemblee'), dernier493: 0, tour: 3 };
    expect(() => recourir493(e, donnees)).toThrow(/possible dans 9 mois/);
  });
});

describe('accords', () => {
  it('accepté entre partis proches, refusé entre partis opposés', () => {
    const ideoPs = partis.find((p) => p.id === 'ps').positions;
    const ok = negocierAccord(partie('ps', 'depute', ideoPs), 'ecolo', donnees);
    expect(ok.accords).toHaveLength(1);
    const ko = negocierAccord(partie('ps', 'depute', ideoPs), 'reconquete', donnees);
    expect(ko.accords).toHaveLength(0);
    expect(() => negocierAccord(ok, 'gdr', donnees)).toThrow(/une seule/i);
  });
  it('expire après 6 mois', () => {
    let e = negocierAccord(partie('ps', 'depute', partis.find((p) => p.id === 'ps').positions), 'ecolo', donnees);
    for (let i = 0; i < 7; i++) e = tourSuivant(e, donnees);
    expect(e.accords).toHaveLength(0);
  });
});

describe('migration', () => {
  it('importe une sauvegarde v1', () => {
    const v1 = { ...partie('ps'), version: 1 };
    delete v1.texte; delete v1.accords; delete v1.joueur.role;
    const e = importerPartie(JSON.stringify(v1));
    expect(e.version).toBe(3);
    expect(e.joueur.role).toBe('depute');
    expect(e.accords).toEqual([]);
  });
});
