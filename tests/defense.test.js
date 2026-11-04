// Défense stratégique (lot 4) : équipement, préparation, disponibilité, programmes, engagements, alliances, crises.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { creerPartie, tourSuivant, defenseInitiale, evoluerDefense, lancerProgrammeDefense, raisonRefusProgrammeDefense, engagerForces, raisonRefusEngagement, disponibiliteForces, bilanDefense, repondreInitiative, raisonRefusReponseInitiative, exporterPartie, importerPartie, assurerTerritoires, relationCible, deposerPLF, voterPLF } from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events', 'economie', 'pays', 'defense'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements, economie, pays, defense] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements, economie, pays, defense };
const situation = lire('situation.json');
const nouvelle = (graine = 1) => creerPartie({ joueur: { nom: 'Sim', parti: 'epr', role: 'president', ideologie: partis.find((p) => p.id === 'epr').positions }, situation, graine, dateDepart: '2027-05-01', ...donnees });
const gel = (o) => JSON.stringify(o);

describe('état et disponibilité', () => {
  it('état initial : équipement et engagement OTAN des données, aucun programme ni engagement', () => {
    const d = defenseInitiale(defense);
    expect(d).toMatchObject({ equipement: 58, engagementOtan: 55, programmes: [], engagements: [] });
    expect(nouvelle().defense.disponibilite).toBeGreaterThan(0);
  });
  it('la disponibilité combine équipement et préparation (secteur défense), moins les engagements en cours ; elle est expliquée', () => {
    const e = nouvelle();
    const d = disponibiliteForces(e, defense);
    expect(d.valeur).toBeCloseTo(0.5 * 58 + 0.5 * e.secteurs.defense, 1);
    expect(d.facteurs.map((f) => f.source)).toEqual(expect.arrayContaining(['equipement', 'preparation']));
    const engage = { ...e, defense: { ...e.defense, engagements: [{ id: 'x', type: 'operation', debut: 0, fin: 12, coutAnnuelMd: 1, disponibilite: -8 }] } };
    expect(disponibiliteForces(engage, defense).valeur).toBeCloseTo(d.valeur - 8, 1);
  });
  it('sans budget supplémentaire, l’équipement s’use et l’engagement OTAN recule lentement ; un écart budgétaire positif le relève', () => {
    const e = nouvelle();
    const r = evoluerDefense(e, donnees, 1);
    expect(r.etat.defense.equipement).toBeCloseTo(58 - defense.parametres.usure_equipement, 3);
    expect(r.etat.defense.engagementOtan).toBeLessThan(55);
    const plus = { ...e, budget: { ...e.budget, ecarts: { ...e.budget.ecarts, defense_securite: 10 } } };
    const r2 = evoluerDefense(plus, donnees, 1);
    expect(r2.etat.defense.equipement).toBeGreaterThan(r.etat.defense.equipement);
    expect(r2.etat.defense.engagementOtan).toBeGreaterThan(55);
    expect(r2.entrees.some((x) => x.indicateur === 'defense:equipement' && x.source === 'budget')).toBe(true);
    expect(gel(e.defense)).toBe(gel(nouvelle().defense));
  });
});

describe('programmes et engagements', () => {
  const prog = defense.programmes.find((p) => p.id === 'stocks-munitions');
  it('programme : refus expliqué (gouvernement, capital, déjà lancé) ; lancement : coût au déficit et au poste défense, gain après le délai', () => {
    const e = nouvelle();
    expect(raisonRefusProgrammeDefense({ ...e, gouvernement: { ...e.gouvernement, statut: 'renverse' } }, prog, defense)).toMatch(/gouvernement/);
    expect(raisonRefusProgrammeDefense({ ...e, joueur: { ...e.joueur, capital: 0 } }, prog, defense)).toMatch(/Capital/);
    let a = lancerProgrammeDefense(e, prog.id, donnees);
    expect(raisonRefusProgrammeDefense(a, prog, defense)).toMatch(/déjà/);
    expect(a.joueur.capital).toBe(e.joueur.capital - 1);
    expect(a.budget.depenses.defense_securite).toBeCloseTo(e.budget.depenses.defense_securite + prog.cout_total_md, 2);
    expect(a.effetsEnCours.filter((x) => x.source === `defense:${prog.id}` && x.indicateur === 'deficit').length).toBe(2);
    const eq0 = a.defense.equipement;
    for (let m = 1; m <= prog.delai_mois + prog.montee_mois; m++) a = evoluerDefense({ ...a, tour: m - 1 }, donnees, m).etat;
    expect(a.defense.equipement).toBeCloseTo(eq0 - defense.parametres.usure_equipement * (prog.delai_mois + prog.montee_mois) + prog.gain_equipement, 1);
    expect(a.defense.programmes[0].statut).toBe('service');
  });
  it('engagement : exercice OTAN immobilise des moyens, coûte et rapproche des alliés ; refus si la disponibilité est trop basse ; expire', () => {
    const e = nouvelle();
    const eng = defense.engagements.find((x) => x.id === 'exercice-otan');
    expect(raisonRefusEngagement(e, eng, defense)).toBeNull();
    let a = engagerForces(e, eng.id, donnees);
    expect(a.defense.engagements[0]).toMatchObject({ id: eng.id, fin: eng.duree_mois, disponibilite: -4 });
    expect(a.defense.disponibilite).toBeCloseTo(e.defense.disponibilite - 4, 1);
    expect(a.defense.engagementOtan).toBe(e.defense.engagementOtan + eng.otan);
    expect(a.diplomatie.relations.us).toBe(e.diplomatie.relations.us + eng.relation_allies);
    expect(a.diplomatie.relations.cn).toBe(e.diplomatie.relations.cn);
    expect(raisonRefusEngagement(a, eng, defense)).toMatch(/déjà/);
    const bas = { ...e, defense: { ...e.defense, equipement: 10 }, secteurs: { ...e.secteurs, defense: 10 } };
    expect(raisonRefusEngagement(bas, eng, defense)).toMatch(/isponibilité/);
    for (let m = 1; m <= eng.duree_mois + 1; m++) a = evoluerDefense({ ...a, tour: m - 1 }, donnees, m).etat;
    expect(a.defense.engagements).toEqual([]);
    expect(a.journal.some((j) => /prend fin/.test(j.texte))).toBe(true);
  });
  it('l’engagement OTAN influence la relation avec les alliés de l’OTAN mais pas les autres', () => {
    const e = nouvelle();
    const haut = { ...e, defense: { ...e.defense, engagementOtan: 90 } }, bas = { ...e, defense: { ...e.defense, engagementOtan: 10 } };
    expect(relationCible(haut, 'us', donnees).valeur).toBeGreaterThan(relationCible(bas, 'us', donnees).valeur);
    expect(relationCible(haut, 'cn', donnees).valeur).toBe(relationCible(bas, 'cn', donnees).valeur);
  });
});

describe('crises', () => {
  it('une crise sécuritaire : l’option militaire exige une disponibilité suffisante et crée un engagement coûteux ; en retrait, la relation aux alliés baisse', () => {
    const e = nouvelle();
    const base = { ...e, diplomatie: { ...e.diplomatie, initiative: { id: 'crise-frontiere', pays: 'de', tour: 0 } } };
    const faible = { ...base, defense: { ...base.defense, equipement: 20, disponibilite: 30 }, secteurs: { ...base.secteurs, defense: 20 } };
    expect(raisonRefusReponseInitiative(faible, 0, donnees)).toMatch(/isponibilité/);
    expect(raisonRefusReponseInitiative(base, 0, donnees)).toBeNull();
    const mil = repondreInitiative(base, 0, donnees);
    expect(mil.defense.engagements[0]).toMatchObject({ type: 'operation', pays: 'de', disponibilite: -8 });
    expect(mil.finances.enveloppe).toBeCloseTo(e.finances.enveloppe - 1.5, 3);
    expect(mil.effetsEnCours.some((x) => x.source === 'diplomatie:crise-frontiere:de' && x.indicateur === 'deficit')).toBe(true);
    const retrait = repondreInitiative(base, 2, donnees);
    expect(retrait.diplomatie.relations.us).toBeLessThan(e.diplomatie.relations.us);
    expect(retrait.diplomatie.relations.de).toBeLessThan(e.diplomatie.relations.de);
  });
  it('bilanDefense : disponibilité expliquée, alerte sous le seuil critique, part du PIB, engagements', () => {
    const e = nouvelle();
    const b = bilanDefense(e, donnees);
    expect(b.disponibilite.valeur).toBeGreaterThan(defense.parametres.seuil_disponibilite_critique);
    expect(b.alerte).toBe(false);
    expect(b.partPib).toBeGreaterThan(1);
    const bas = { ...e, defense: { ...e.defense, equipement: 10 }, secteurs: { ...e.secteurs, defense: 10 } };
    expect(bilanDefense(bas, donnees).alerte).toBe(true);
  });
});

describe('intégration, sauvegarde', () => {
  it('tourSuivant fait évoluer la défense ; un PLF qui augmente la défense relève l’équipement dans les mois suivants', () => {
    let e = nouvelle(5);
    e = tourSuivant(e, donnees);
    expect(e.defense.equipement).toBeLessThan(58);
    // Septembre 2027 = tour 4 : dépôt d'un PLF +5 % défense, voté en fin de mois
    while (e.tour < 4) e = tourSuivant(e, donnees);
    e = deposerPLF(e, { depenses: { defense_securite: 5 } });
    e = tourSuivant(e, donnees);
    const avant = e.defense.equipement;
    if (e.budget.ecarts.defense_securite > 0) {
      e = tourSuivant(e, donnees);
      expect(e.defense.equipement).toBeGreaterThan(avant - defense.parametres.usure_equipement);
    }
  });
  it('aller-retour de sauvegarde ; v15 complétée ; contenu hostile assaini ; sans données : null', () => {
    let e = engagerForces(lancerProgrammeDefense(nouvelle(2), 'cyber-espace', donnees), 'exercice-otan', donnees);
    e = tourSuivant(e, donnees);
    expect(importerPartie(exporterPartie(e))).toEqual(e);
    const v15 = { ...JSON.parse(exporterPartie(nouvelle(2))), version: 15 };
    for (const k of ['defense', 'diplomatie', 'economie', 'difficulte', 'diploCeMois']) delete v15[k];
    const c = assurerTerritoires(importerPartie(JSON.stringify(v15)), donnees);
    expect(c.defense.programmes).toEqual([]); expect(c.defense.equipement).toBe(58);
    const brut = JSON.parse(exporterPartie(e)); brut.defense.equipement = 'x'; brut.defense.engagements = [{ id: 'a'.repeat(200), disponibilite: 'z' }];
    const s = importerPartie(JSON.stringify(brut));
    expect(s.defense.equipement).toBe(50); expect(s.defense.engagements[0].id.length).toBeLessThanOrEqual(60); expect(s.defense.engagements[0].disponibilite).toBe(0);
    const { defense: _d, ...sans } = donnees;
    expect(tourSuivant(creerPartie({ joueur: { nom: 'S', parti: 'epr', role: 'president', ideologie: partis[0].positions }, situation, graine: 1, ...sans }), sans).defense).toBeNull();
  });
});
