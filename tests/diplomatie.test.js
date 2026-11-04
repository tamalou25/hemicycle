// Diplomatie (lot 3) : relations, accords, sanctions, initiatives étrangères, effets sur le commerce. Moteur pur et déterministe.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { creerPartie, tourSuivant, diplomatieInitiale, evoluerDiplomatie, proposerAccord, raisonRefusAccordPays, sanctionner, leverSanctions, raisonRefusSanction, repondreInitiative, raisonRefusReponseInitiative, fichePays, relationCible, evoluerEconomie, exporterPartie, importerPartie, assurerTerritoires, raisonPause } from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events', 'economie', 'pays'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements, economie, pays] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements, economie, pays };
const situation = lire('situation.json');
const nouvelle = (graine = 1, parti = 'epr') => creerPartie({ joueur: { nom: 'Sim', parti, role: 'president', ideologie: partis.find((p) => p.id === parti).positions }, situation, graine, dateDepart: '2027-05-01', ...donnees });
const gel = (o) => JSON.stringify(o);

describe('état initial et dérive des relations', () => {
  it('relations initiales par pays et Union européenne ; aucune initiative, aucun accord', () => {
    const d = diplomatieInitiale(pays);
    expect(Object.keys(d.relations)).toHaveLength(pays.pays.length);
    expect(d.relations.de).toBe(72);
    expect(d.ue.relation).toBe(62);
    expect(d.accords).toEqual([]); expect(d.initiative).toBeNull();
  });
  it('la cible d’une relation dépend de la proximité idéologique ; elle est explicable (facteurs)', () => {
    const e = nouvelle();
    const c = relationCible(e, 'de', donnees);
    expect(c.facteurs.some((f) => f.source === 'proximite')).toBe(true);
    expect(Math.abs(c.valeur - 72)).toBeLessThan(15);
    const loin = { ...e, joueur: { ...e.joueur, ideologie: { ...e.joueur.ideologie, europe: -100 } } };
    expect(relationCible(loin, 'de', donnees).valeur).toBeLessThan(c.valeur);
  });
  it('les relations convergent vers leur cible sans mutation, de façon déterministe', () => {
    const e = nouvelle(3);
    const avant = gel(e);
    const a = evoluerDiplomatie(e, donnees, 1, e.graine), b = evoluerDiplomatie(e, donnees, 1, e.graine);
    expect(gel(e)).toBe(avant); expect(gel(a)).toBe(gel(b));
    const cible = relationCible(e, 'us', donnees).valeur;
    const r0 = e.diplomatie.relations.us, r1 = a.etat.diplomatie.relations.us;
    expect(Math.abs(r1 - cible)).toBeLessThanOrEqual(Math.abs(r0 - cible));
  });
  it('un déficit élevé dégrade la relation avec l’Union européenne (règle des 3 %)', () => {
    const e = nouvelle();
    const haut = { ...e, indicateurs: { ...e.indicateurs, deficit: 7 } }, bas = { ...e, indicateurs: { ...e.indicateurs, deficit: 2.5 } };
    expect(relationCible(haut, 'ue', donnees).valeur).toBeLessThan(relationCible(bas, 'ue', donnees).valeur);
  });
});

describe('accords', () => {
  it('refus expliqués : relation insuffisante, capital, action du mois déjà faite, accord déjà en vigueur, partenaire sous sanctions', () => {
    const e = nouvelle();
    expect(raisonRefusAccordPays(e, 'cn', 'defense', donnees)).toMatch(/OTAN|Union/);
    expect(raisonRefusAccordPays({ ...e, diplomatie: { ...e.diplomatie, relations: { ...e.diplomatie.relations, de: 30 } } }, 'de', 'commerce', donnees)).toMatch(/relation/i);
    expect(raisonRefusAccordPays({ ...e, joueur: { ...e.joueur, capital: 0 } }, 'de', 'commerce', donnees)).toMatch(/Capital/);
    const a = proposerAccord(e, 'de', 'commerce', donnees);
    expect(raisonRefusAccordPays(a, 'it', 'commerce', donnees)).toMatch(/ce mois-ci/);
    expect(raisonRefusAccordPays({ ...a, diploCeMois: false }, 'de', 'commerce', donnees)).toMatch(/déjà/);
    const s = sanctionner(e, 'cn', donnees);
    expect(raisonRefusAccordPays({ ...s, diploCeMois: false }, 'cn', 'commerce', donnees)).toMatch(/sanction/);
    expect(raisonRefusAccordPays(e, 'de', 'commerce', donnees)).toBeNull();
  });
  it('un accord accepté : capital, relation +, durée, coût annuel au déficit, débouchés et disponibilité pour l’économie, journal', () => {
    const e = nouvelle();
    const a = proposerAccord(e, 'de', 'energie', donnees);
    expect(a.joueur.capital).toBe(e.joueur.capital - 1);
    expect(a.diplomatie.relations.de).toBe(e.diplomatie.relations.de + 6);
    expect(a.diplomatie.accords[0]).toMatchObject({ pays: 'de', type: 'energie', debut: 0, fin: 48 });
    expect(a.effetsEnCours.some((x) => x.source === 'diplomatie:energie:de' && x.indicateur === 'deficit')).toBe(true);
    expect(a.journal.at(-1).texte).toMatch(/Allemagne/);
    // Appliqué à l'économie au tour suivant
    const t = evoluerDiplomatie(a, donnees, 1, a.graine).etat;
    expect(t.economie.disponibilite.de).toBeCloseTo(1.3, 3);
  });
  it('un accord expire à son terme : journal et modificateurs retirés', () => {
    let e = proposerAccord(nouvelle(), 'de', 'commerce', donnees);
    for (let m = 1; m <= 37; m++) e = evoluerDiplomatie({ ...e, tour: m - 1 }, donnees, m, e.graine).etat;
    expect(e.diplomatie.accords.some((x) => x.pays === 'de' && x.type === 'commerce')).toBe(false);
    expect(e.journal.some((j) => /expire|arrive à son terme/.test(j.texte))).toBe(true);
    expect(e.economie.debouches.de ?? 1).toBe(1);
  });
});

describe('sanctions', () => {
  it('sanctionner : relation en chute, échanges réduits des deux côtés dès le mois suivant, levée possible après 6 mois', () => {
    const e = nouvelle();
    expect(raisonRefusSanction(e, 'cn', donnees)).toBeNull();
    const s = sanctionner(e, 'cn', donnees);
    expect(s.diplomatie.sanctions[0]).toMatchObject({ pays: 'cn', debut: 0 });
    expect(s.diplomatie.relations.cn).toBeLessThan(e.diplomatie.relations.cn);
    const t = evoluerDiplomatie({ ...s, diploCeMois: false }, donnees, 1, s.graine).etat;
    expect(t.economie.disponibilite.cn).toBeCloseTo(0.5, 3);
    expect(t.economie.debouches.cn).toBeCloseTo(0.5, 3);
    expect(() => leverSanctions({ ...t, tour: 2, diploCeMois: false }, 'cn', donnees)).toThrow(/6 mois/);
    const l = leverSanctions({ ...t, tour: 7, diploCeMois: false }, 'cn', donnees);
    expect(l.diplomatie.sanctions).toEqual([]);
    const ec = evoluerEconomie(t, donnees, 2);
    expect(ec.etat.economie.commerce.importations.industrie).toBeLessThan(e.economie.commerce.importations.industrie);
  });
});

describe('initiatives étrangères', () => {
  it('une initiative survient selon la graine, met le temps en pause, et la réponse par défaut s’applique au passage du mois si on l’ignore', () => {
    let e = nouvelle(11), trouvee = null;
    for (let m = 0; m < 24 && !trouvee; m++) { e = tourSuivant(e, donnees); if (e.diplomatie.initiative) trouvee = e; }
    expect(trouvee, 'une initiative en 24 mois').toBeTruthy();
    expect(raisonPause(trouvee)).toMatch(/initiative|diplomati/i);
    const init = pays.initiatives.find((i) => i.id === trouvee.diplomatie.initiative.id);
    expect(init).toBeTruthy();
    const apres = tourSuivant(trouvee, donnees);
    expect(apres.diplomatie.initiative).toBeNull();
    expect(apres.diplomatie.initiativesPassees.at(-1)).toMatchObject({ id: init.id, parDefaut: true });
  });
  it('répondre à une tension douanière : négocier annule la mesure ; riposter la maintient et réduit la disponibilité', () => {
    const e = nouvelle();
    const base = { ...e, diplomatie: { ...e.diplomatie, initiative: { id: 'droits-douane', pays: 'us', tour: 0 } } };
    expect(raisonRefusReponseInitiative({ ...base, joueur: { ...base.joueur, capital: 1 } }, 0, donnees)).toMatch(/Capital/);
    const neg = repondreInitiative(base, 0, donnees);
    expect(neg.diplomatie.initiative).toBeNull();
    expect(neg.diplomatie.mesures).toEqual([]);
    expect(neg.diplomatie.relations.us).toBe(e.diplomatie.relations.us + 6);
    const rip = repondreInitiative(base, 1, donnees);
    expect(rip.diplomatie.mesures[0]).toMatchObject({ pays: 'us', debouches: -0.25, disponibilite: -0.2 });
    const t = evoluerDiplomatie(rip, donnees, 1, rip.graine).etat;
    expect(t.economie.debouches.us).toBeCloseTo(0.75, 3);
    expect(t.economie.disponibilite.us).toBeCloseTo(0.8, 3);
    expect(rip.effetsEnCours.some((x) => x.source === 'diplomatie:droits-douane:us')).toBe(true);
  });
  it('accepter une proposition d’accord étrangère crée l’accord sans passer par la négociation du mois', () => {
    const e = nouvelle();
    const base = { ...e, diploCeMois: true, diplomatie: { ...e.diplomatie, initiative: { id: 'proposition-commerce', pays: 'it', tour: 0 } } };
    const acc = repondreInitiative(base, 0, donnees);
    expect(acc.diplomatie.accords[0]).toMatchObject({ pays: 'it', type: 'commerce' });
    const ref = repondreInitiative(base, 1, donnees);
    expect(ref.diplomatie.accords).toEqual([]);
    expect(ref.diplomatie.relations.it).toBeLessThan(e.diplomatie.relations.it);
  });
});

describe('fiche pays, sauvegarde, compatibilité', () => {
  it('fichePays : relation, cible expliquée, échanges, accords, actions disponibles avec raison de refus', () => {
    const f = fichePays(nouvelle(), 'de', donnees);
    expect(f.nom).toBe('Allemagne'); expect(f.relation).toBe(72); expect(f.ue).toBe(true);
    expect(f.echanges.importations).toBeGreaterThan(0);
    expect(f.actions.find((a) => a.id === 'accord:commerce').raison).toBeNull();
    expect(f.actions.find((a) => a.id === 'sanction').raison).toBeNull();
    expect(f.cible.facteurs.length).toBeGreaterThan(0);
  });
  it('aller-retour de sauvegarde ; v15 complétée sans accord rétroactif ; contenu hostile assaini', () => {
    let e = sanctionner({ ...proposerAccord(nouvelle(4), 'de', 'commerce', donnees), diploCeMois: false }, 'cn', donnees);
    e = tourSuivant({ ...e, diploCeMois: false }, donnees);
    expect(importerPartie(exporterPartie(e))).toEqual(e);
    const v15 = { ...JSON.parse(exporterPartie(nouvelle(2))), version: 15 };
    delete v15.diplomatie; delete v15.economie; delete v15.defense; delete v15.difficulte; delete v15.diploCeMois;
    const c = assurerTerritoires(importerPartie(JSON.stringify(v15)), donnees);
    expect(c.diplomatie.accords).toEqual([]); expect(c.diplomatie.relations.de).toBe(72);
    const brut = JSON.parse(exporterPartie(e));
    brut.diplomatie.relations.de = 'x'; brut.diplomatie.initiative = { id: 'zzz'.repeat(100), pays: 7 }; brut.diplomatie.accords.push({ pays: 'de', type: 'inconnu' });
    const s = importerPartie(JSON.stringify(brut));
    expect(s.diplomatie.relations.de).toBeUndefined();
    expect(s.diplomatie.initiative.id.length).toBeLessThanOrEqual(60);
    expect(s.diplomatie.accords.length).toBe(2); // un type inconnu est conservé mais ignoré par le moteur
  });
  it('une partie sans données de pays joue comme avant (diplomatie null)', () => {
    const { pays: _p, ...sans } = donnees;
    const e = creerPartie({ joueur: { nom: 'Sim', parti: 'epr', role: 'president', ideologie: partis[0].positions }, situation, graine: 3, dateDepart: '2027-05-01', ...sans });
    expect(tourSuivant(e, sans).diplomatie).toBeNull();
  });
});
