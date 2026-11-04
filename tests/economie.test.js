// Économie (lot 2) : filières, dépendances, commerce extérieur, investissements. Moteur pur et déterministe.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { creerPartie, tourSuivant, economieInitiale, evoluerEconomie, lancerInvestissement, raisonRefusInvestissement, alertesEconomie, bilanCommerce, dependanceFiliere } from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events', 'economie'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements, economie] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements, economie };
const situation = lire('situation.json');
const nouvelle = (graine = 1) => creerPartie({ joueur: { nom: 'Sim', parti: 'epr', role: 'president', ideologie: partis.find((p) => p.id === 'epr').positions }, situation, graine, dateDepart: '2027-05-01', ...donnees });
const gel = (o) => JSON.stringify(o);

describe('état initial', () => {
  it('quatre filières à 100 de production, capacités et demande issues des données, échanges initiaux cohérents avec les données', () => {
    const e = economieInitiale(economie);
    expect(Object.keys(e.filieres)).toEqual(['energie', 'agriculture', 'industrie', 'services']);
    for (const f of Object.values(e.filieres)) { expect(f.production).toBe(100); expect(f.capacite).toBeGreaterThanOrEqual(100); expect(f.demande).toBe(100); }
    expect(e.commerce.importations.energie).toBe(60);
    expect(e.commerce.solde).toBe(Math.round((20 + 76 + 500 + 365 - 60 - 75 - 520 - 320) * 100) / 100);
    expect(e.investissements).toEqual([]);
  });
  it('creerPartie attache l’économie quand les données sont fournies, null sinon', () => {
    expect(nouvelle().economie.filieres.industrie.production).toBe(100);
    expect(creerPartie({ joueur: { nom: 'X', parti: 'epr', role: 'depute' }, situation, graine: 1 }).economie).toBeNull();
  });
  it('la dépendance nette d’une filière est la part des importations non compensées dans le besoin intérieur', () => {
    const e = nouvelle();
    // énergie : 60 importés − 20 exportés sur un besoin de 130 + 60 − 20 = 170 ; agriculture : échanges équilibrés → 0
    expect(dependanceFiliere(e, 'energie', economie)).toBeCloseTo(40 / 170, 3);
    expect(dependanceFiliere(e, 'agriculture', economie)).toBe(0);
  });
});

describe('évolution mensuelle', () => {
  it('ne mute pas l’état et est déterministe', () => {
    const e = nouvelle();
    const avant = gel(e);
    const a = evoluerEconomie(e, donnees, 1), b = evoluerEconomie(e, donnees, 1);
    expect(gel(e)).toBe(avant);
    expect(gel(a)).toBe(gel(b));
  });
  it('sans contrainte, la production suit la demande et aucune pénurie n’apparaît', () => {
    const r = evoluerEconomie(nouvelle(), donnees, 1);
    for (const f of Object.keys(r.etat.economie.filieres)) expect(r.etat.economie.penuries[f]).toBe(0);
    expect(r.deltas.inflation).toBe(0);
  });
  it('une capacité énergétique insuffisante crée une pénurie qui se propage à l’industrie et pèse sur croissance, chômage et inflation', () => {
    const e = nouvelle();
    const contraint = { ...e, economie: { ...e.economie, filieres: { ...e.economie.filieres, energie: { ...e.economie.filieres.energie, capacite: 60 } } } };
    const r = evoluerEconomie(contraint, donnees, 1);
    expect(r.etat.economie.penuries.energie).toBeGreaterThan(0.05);
    expect(r.etat.economie.filieres.industrie.production).toBeLessThan(100);
    expect(r.deltas.croissance).toBeLessThan(0);
    expect(r.deltas.chomage).toBeGreaterThan(0);
    expect(r.deltas.inflation).toBeGreaterThan(0);
    const types = new Set(r.entrees.map((x) => x.type));
    expect(types.has('economie')).toBe(true);
    expect(r.entrees.some((x) => x.indicateur === 'croissance' && x.source === 'economie:industrie')).toBe(true);
  });
  it('une importation indisponible (partenaire à 0) réduit les importations et crée une pénurie sur la filière concernée', () => {
    const e = nouvelle();
    const coupe = { ...e, economie: { ...e.economie, disponibilite: { no: 0, dz: 0, us: 0, be: 0, nl: 0 } } };
    const r = evoluerEconomie(coupe, donnees, 1);
    const normal = evoluerEconomie(e, donnees, 1);
    expect(r.etat.economie.commerce.importations.energie).toBeLessThan(normal.etat.economie.commerce.importations.energie);
    expect(r.etat.economie.penuries.energie).toBeGreaterThan(0);
    expect(r.entrees.some((x) => x.type === 'commerce')).toBe(true);
  });
  it('les capacités s’usent lentement : sans investissement, la couverture énergétique se dégrade sur un mandat', () => {
    let e = nouvelle();
    for (let m = 1; m <= 60; m++) e = evoluerEconomie(e, donnees, m).etat;
    expect(e.economie.filieres.energie.capacite).toBeLessThan(economie.filieres.energie.capacite_initiale);
    expect(e.economie.filieres.energie.capacite).toBeGreaterThan(95);
  });
});

describe('investissements', () => {
  const inv = economie.investissements.find((x) => x.id === 'eolien-offshore');
  it('refus expliqué : gouvernement absent, capital insuffisant, déjà lancé', () => {
    const e = nouvelle();
    expect(raisonRefusInvestissement({ ...e, gouvernement: { ...e.gouvernement, statut: 'renverse' } }, inv, economie)).toMatch(/gouvernement/);
    expect(raisonRefusInvestissement({ ...e, joueur: { ...e.joueur, capital: 0 } }, inv, economie)).toMatch(/Capital/);
    expect(raisonRefusInvestissement(lancerInvestissement(e, inv.id, donnees), inv, economie)).toMatch(/déjà/);
    expect(raisonRefusInvestissement(e, inv, economie)).toBeNull();
  });
  it('lancer : 1 capital, coût inscrit au budget et au déficit (une seule fois), chantier daté, journal', () => {
    const e = nouvelle();
    const a = lancerInvestissement(e, inv.id, donnees);
    expect(a.joueur.capital).toBe(e.joueur.capital - 1);
    const annuel = inv.cout_total_md / (inv.delai_mois / 12);
    expect(a.budget.depenses.infrastructures_environnement).toBeCloseTo(e.budget.depenses.infrastructures_environnement + annuel, 2);
    const effets = a.effetsEnCours.filter((x) => x.source === `investissement:${inv.id}` && x.indicateur === 'deficit');
    expect(effets.length).toBe(2); // chantier puis entretien
    const total = effets[0].parMois * (effets[0].fin - effets[0].debut + 1);
    expect(total).toBeCloseTo((inv.cout_total_md / e.budget.pib) * 100, 3);
    expect(a.economie.investissements[0]).toMatchObject({ id: inv.id, statut: 'chantier', enService: e.tour + inv.delai_mois });
    expect(a.journal.at(-1).texte).toMatch(/éolien/i);
    expect(gel(e.economie.investissements)).toBe('[]');
  });
  it('après le délai, la capacité monte pendant la montée en charge puis le chantier passe en service ; l’entretien remplace le coût de chantier', () => {
    let e = lancerInvestissement(nouvelle(), inv.id, donnees);
    const cap0 = e.economie.filieres.energie.capacite;
    const depensesChantier = e.budget.depenses.infrastructures_environnement;
    for (let m = 1; m <= inv.delai_mois + inv.montee_mois; m++) e = evoluerEconomie({ ...e, tour: m - 1 }, donnees, m).etat;
    const usure = economie.filieres.energie.usure_mensuelle * (inv.delai_mois + inv.montee_mois);
    expect(e.economie.filieres.energie.capacite).toBeCloseTo(cap0 - usure + inv.gain_capacite, 1);
    expect(e.economie.investissements[0].statut).toBe('service');
    expect(e.budget.depenses.infrastructures_environnement).toBeCloseTo(depensesChantier - inv.cout_total_md / (inv.delai_mois / 12) + inv.entretien_md, 2);
  });
  it('les stocks stratégiques amortissent une rupture d’importation sans produire', () => {
    const e = nouvelle();
    const stocks = economie.investissements.find((x) => x.id === 'stocks-strategiques');
    let avec = lancerInvestissement(e, stocks.id, donnees);
    for (let m = 1; m <= stocks.delai_mois + stocks.montee_mois; m++) avec = evoluerEconomie({ ...avec, tour: m - 1 }, donnees, m).etat;
    const coupe = (x) => ({ ...x, economie: { ...x.economie, disponibilite: { no: 0, dz: 0, us: 0, be: 0, nl: 0 } } });
    const sans = evoluerEconomie(coupe(e), donnees, 1).etat.economie.penuries.energie;
    const amorti = evoluerEconomie(coupe(avec), donnees, 20).etat.economie.penuries.energie;
    expect(amorti).toBeLessThan(sans);
    expect(amorti).toBeGreaterThan(0);
  });
});

describe('lecture pour le joueur', () => {
  it('alertes : la dépendance énergétique est identifiable dès le départ, la pénurie est signalée quand elle existe', () => {
    const e = nouvelle();
    const a = alertesEconomie(e, donnees);
    expect(a.some((x) => x.filiere === 'energie' && x.type === 'dependance')).toBe(true);
    expect(a.some((x) => x.type === 'penurie')).toBe(false);
    const r = evoluerEconomie({ ...e, economie: { ...e.economie, filieres: { ...e.economie.filieres, energie: { ...e.economie.filieres.energie, capacite: 60 } } } }, donnees, 1).etat;
    expect(alertesEconomie(r, donnees).some((x) => x.type === 'penurie' && x.filiere === 'energie')).toBe(true);
  });
  it('bilan du commerce : importations, exportations, solde par filière et premiers partenaires', () => {
    const b = bilanCommerce(nouvelle(), donnees);
    expect(b.filieres.energie.importations).toBe(60);
    expect(b.filieres.energie.partenaires[0].id).toBe('be');
    expect(b.solde).toBeLessThan(0);
  });
});

describe('intégration au tour', () => {
  it('tourSuivant fait évoluer l’économie, garde les explications et reste déterministe', () => {
    const e = nouvelle(7);
    const a = tourSuivant(e, donnees), b = tourSuivant(e, donnees);
    expect(gel(a)).toBe(gel(b));
    expect(a.economie.mois).toBe(1);
    expect(a.economie.filieres.services.demande).not.toBe(100);
    expect(a.historique.length).toBe(1);
  });
  it('une partie sans données économiques joue comme avant', () => {
    const { economie: _e, ...sans } = donnees;
    const e = creerPartie({ joueur: { nom: 'Sim', parti: 'epr', role: 'president', ideologie: partis[0].positions }, situation, graine: 3, dateDepart: '2027-05-01', ...sans });
    const a = tourSuivant(e, sans);
    expect(a.economie).toBeNull();
    expect(a.tour).toBe(1);
  });
});

describe('sauvegarde v16', () => {
  it('aller-retour exact d’une partie avec investissement ; v15 → v16 : économie null, puis complétée à la reprise sans investissement', async () => {
    const { exporterPartie, importerPartie, assurerTerritoires } = await import('../src/engine/index.js');
    let e = lancerInvestissement(nouvelle(5), 'relocalisation', donnees);
    e = tourSuivant(e, donnees);
    expect(importerPartie(exporterPartie(e))).toEqual(e);
    const v15 = { ...JSON.parse(exporterPartie(nouvelle(2))), version: 15 };
    delete v15.economie; delete v15.diplomatie; delete v15.defense; delete v15.difficulte;
    const migre = importerPartie(JSON.stringify(v15));
    expect(migre.version).toBe(16);
    expect(migre.economie).toBeNull();
    const complet = assurerTerritoires(migre, donnees);
    expect(complet.economie.investissements).toEqual([]);
    expect(complet.economie.filieres.energie.production).toBe(100);
  });
  it('un contenu hostile dans l’économie est assaini', async () => {
    const { exporterPartie, importerPartie } = await import('../src/engine/index.js');
    const brut = JSON.parse(exporterPartie(nouvelle(1)));
    brut.economie.filieres.energie.capacite = 'x'; brut.economie.investissements = [{ id: '<script>'.repeat(50), statut: 'zzz' }]; brut.economie.disponibilite = { de: 'non', us: 0.5 };
    const e = importerPartie(JSON.stringify(brut));
    expect(e.economie.filieres.energie.capacite).toBe(100);
    expect(e.economie.investissements[0].statut).toBe('service');
    expect(e.economie.investissements[0].id.length).toBeLessThanOrEqual(60);
    expect(e.economie.disponibilite).toEqual({ us: 0.5 });
  });
});
