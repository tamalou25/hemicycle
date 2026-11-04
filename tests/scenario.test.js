// Partie courte « Douze mois pour convaincre » : même moteur, engagements déduits de l'état réel, crises programmées calculées.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  creerPartie, tourSuivant, lancerProjet, proposerLoi, amenderTexte, negocierAccord, engagerPolitique, resoudreEvenement, catalogueDecisions,
  evaluerEngagements, resultatScenario, criseDue, bilanScenario, priorites, apercuAmendement, projetsScenario, effetSoins,
  exporterPartie, importerPartie, encoderDefi, decoderDefi, VERSION_SAUVEGARDE, groupesAssemblee, voterChambre, eligible,
} from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events', 'objectifs'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements, objectifs] = noms.map((n) => lire(`${n}.json`));
const scenario = lire('scenario.json');
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements, objectifs, scenario };
const situation = lire('situation.json');
const PARTIS = ['epr', 'rn', 'lfi', 'ps', 'dr'];
const partie = (graine = 3, parti = 'epr') => creerPartie({
  joueur: { nom: 'Test', parti, role: 'premier_ministre', ideologie: { ...partis.find((p) => p.id === parti).positions } },
  situation, graine, ...donnees,
});
const jouer = (e, n) => { for (let i = 0; i < n && !e.fin; i++) e = tourSuivant(e, donnees); return e; };
const eng = (e, id) => evaluerEngagements(e, donnees).find((x) => x.id === id);
/** Première loi adoptable aujourd'hui à l'Assemblée (vote estimé), ou la première disponible. */
const loiAdoptable = (e) => {
  const AN = groupesAssemblee(partis, e.sieges);
  const dispo = catalogueDecisions(e, donnees).filter((x) => x.type === 'loi' && !x.raison).map((x) => lois.find((l) => `loi:${l.id}` === x.id));
  return (dispo.find((l) => voterChambre(e, AN, l.theme, l.orientation).adoptee) ?? dispo[0]).id;
};
/** Répond à l'événement en cours par l'option la plus active possible (index 0, sinon suivante). */
const repondre = (e, prefere = 0) => {
  if (!e.evenement) return e;
  const ev = evenements.find((x) => x.id === e.evenement);
  for (const i of [prefere, 0, 1, 2]) { try { return resoudreEvenement(e, i, donnees); } catch { /* choix refusé (capital, enveloppe) */ } }
  return e;
};

describe('scenario.json', () => {
  it('schéma : 12 mois, 3 engagements de types connus, options vers des projets agissant sur l’indice, crises vers des événements connus, acteur fictif', () => {
    expect(scenario.duree_mois).toBe(12);
    expect(scenario.engagements.map((e) => e.type)).toEqual(['indice_region', 'loi_promulguee', 'programme_effets']);
    const soins = scenario.engagements[0];
    expect(soins.cible).toBeGreaterThan(0);
    for (const o of soins.options) expect(projets.projets.find((p) => p.id === o.projetId)?.effets[scenario.indice]).toBeGreaterThan(0);
    for (const c of scenario.crises) {
      expect(c.mois).toBeGreaterThan(0); expect(c.mois).toBeLessThan(scenario.duree_mois);
      for (const id of c.candidats) expect(evenements.find((e) => e.id === id), id).toBeTruthy();
      if (c.suite) { expect(evenements.find((e) => e.id === c.suite.evenement)?.declenchement).toBe('scenario'); expect(c.suite.delaiMois).toBeGreaterThan(0); }
    }
    expect(scenario.acteur.fictif).toBe(true);
    expect(scenario.avertissement_indice).toMatch(/indice de jeu/);
  });
  it('un événement « declenchement: scenario » n’est jamais tiré au hasard', () => {
    const e = partie();
    const ev = evenements.find((x) => x.declenchement === 'scenario');
    expect(eligible(ev, e)).toBe(false);
    expect(eligible(ev, e, { scenario: true })).toBe(true);
  });
});

describe('création et compatibilité', () => {
  it('cadre : région au plus bas indice, 12 mois, rien sans le scénario ; une sauvegarde v13 n’en reçoit pas', () => {
    const e = partie();
    const min = Math.min(...Object.values(e.territoires).map((t) => t.sante));
    expect(e.territoires[e.scenario.region].sante).toBe(min);
    expect(e.scenario).toMatchObject({ statut: 'en_cours', debut: 0, echeance: 12, crises: [], roleInitial: 'premier_ministre' });
    expect(e.mission).toBeNull();
    expect(creerPartie({ joueur: { nom: 'X', parti: 'epr' }, situation, ...donnees, scenario: null }).scenario).toBeNull();
    const v13 = { ...creerPartie({ joueur: { nom: 'X', parti: 'epr' }, situation, ...donnees, scenario: null }), version: 13 };
    delete v13.scenario;
    const r = importerPartie(JSON.stringify(v13));
    expect(r.version).toBe(VERSION_SAUVEGARDE);
    expect(r.scenario).toBeNull();
    expect(jouer(r, 2).scenario).toBeNull();
  });
  it('reprise au milieu : état, engagements et suite identiques ; défi transmis (même graine, même scénario)', () => {
    let e = lancerProjet(partie(13), 'recrutement-soignants', partie(13).scenario.region, donnees);
    e = proposerLoi(e, loiAdoptable(e), donnees);
    e = jouer(e, 4);
    const repris = importerPartie(exporterPartie(e));
    expect(repris.scenario).toEqual(e.scenario);
    expect(evaluerEngagements(repris, donnees)).toEqual(evaluerEngagements(e, donnees));
    expect(jouer(repris, 8).scenario).toEqual(jouer(e, 8).scenario);
    const d = decoderDefi(encoderDefi({ graine: e.graineInitiale, joueur: { ...e.joueur, scenario: true } }));
    expect(d.joueur.scenario).toBe(true);
    expect(creerPartie({ ...d, situation, ...donnees, scenario: d.joueur.scenario ? scenario : null }).scenario).toEqual(partie(13).scenario);
  });
  it('bilan assaini : un bilan corrompu ne casse pas l’import', () => {
    let e = jouer(partie(2), 12);
    const brut = JSON.parse(exporterPartie(e));
    brut.scenario.bilan.engagements[0].etat = '<script>'; brut.scenario.bilan.resultat = 42;
    const r = importerPartie(JSON.stringify(brut));
    expect(r.scenario.bilan.engagements[0].etat).toBe('manque');
    expect(r.scenario.bilan.resultat).toBe('echec');
  });
});

describe('parcours complets (graines fixées, plusieurs partis)', () => {
  it('stratégie constructive : projet + loi adoptable + programme → engagements tenus ou en partie, jamais inventés', () => {
    const resultats = [];
    for (const [i, parti] of PARTIS.entries()) {
      let e = partie(10 + i, parti);
      e = lancerProjet(e, 'recrutement-soignants', e.scenario.region, donnees);
      e = proposerLoi(e, loiAdoptable(e), donnees);
      e = engagerPolitique(e, 'apprentissage', donnees);
      for (let m = 0; m < 12 && !e.fin; m++) { e = repondre(e); e = tourSuivant(e, donnees); }
      const b = e.scenario.bilan;
      expect(e.scenario.statut).toBe('termine');
      expect(b.tour).toBe(e.fin ? e.tour : 12);
      const soins = b.engagements.find((x) => x.id === 'soins');
      expect(soins.engage).toBe(true);
      // Cohérence : la valeur affichée = somme du registre des causes pour la région et la source
      expect(soins.valeur).toBeCloseTo(e.explications.filter((x) => x.source === 'projet:recrutement-soignants' && x.region === e.scenario.region && x.indicateur === 'sante').reduce((a, x) => a + x.delta, 0), 1);
      if (soins.etat === 'atteint') expect(soins.valeur).toBeGreaterThanOrEqual(8);
      const avenir = b.engagements.find((x) => x.id === 'avenir');
      if (!b.roleChange && !e.fin) expect(avenir.etat).toBe('atteint'); // apprentissage : 2 mois de préparation
      expect(b.gardeFou).toMatchObject({ indicateur: 'deficit', debut: e.scenario.deficit, fin: e.indicateurs.deficit });
      if (b.resultat === 'complet') expect(b.gardeFou.respecte).toBe(true);
      const parlement = b.engagements.find((x) => x.id === 'parlement');
      if (parlement.etat === 'atteint') expect(e.loisAdoptees.length).toBeGreaterThan(0);
      resultats.push(`${parti}:${b.resultat}:${b.engagements.map((x) => x.etat[0]).join('')}${b.roleChange ? ':role' : ''}${e.fin ? `:${e.fin.type}` : ''}`);
    }
    expect(resultats.some((r) => r.includes(':complet') || r.includes(':partiel'))).toBe(true);
    console.log('constructive →', resultats.join(' '));
  });

  it('inaction : échec ; différer n’existe plus, mais ne rien faire reste possible et expliqué', () => {
    let e = partie(5);
    for (let m = 0; m < 12 && !e.fin; m++) e = tourSuivant(e, donnees); // événements résolus par défaut
    const b = e.scenario.bilan;
    expect(b.resultat).toBe('echec');
    expect(b.engagements.every((x) => x.etat === 'manque')).toBe(true);
    expect(b.engagements.find((x) => x.id === 'soins').detail).toMatch(/Aucun projet/);
  });

  it('deux projets pour le même engagement : les deux contribuent ; un projet lent encore en chantier à l’échéance est « en partie » avec effets attendus', () => {
    let e = partie(8);
    e = lancerProjet(e, 'recrutement-soignants', e.scenario.region, donnees);
    e = lancerProjet(e, 'centres-sante', e.scenario.region, donnees);
    expect(projetsScenario(e, donnees)).toHaveLength(2);
    e = jouer(e, 12);
    if (e.fin) return;
    const soins = eng(e, 'soins');
    const parSource = (src) => e.explications.filter((x) => x.source === src && x.region === e.scenario.region && x.indicateur === 'sante').reduce((a, x) => a + x.delta, 0);
    expect(soins.valeur).toBeCloseTo(parSource('projet:recrutement-soignants') + parSource('projet:centres-sante'), 1);
    expect(soins.projets).toHaveLength(2);
    // Projet lent seul, lancé tard : à l'échéance il est encore en chantier → partiel, rien d'inventé
    let f = partie(8);
    f = jouer(f, 6);
    f = lancerProjet(f, 'centres-sante', f.scenario.region, donnees); // mise en service au mois 14, après l'échéance
    f = jouer(f, 6);
    if (f.fin) return;
    const s = f.scenario.bilan.engagements.find((x) => x.id === 'soins');
    expect(s).toMatchObject({ etat: 'partiel', valeur: 0, engage: true, mesure: false, effet: false });
    expect(s.restantAttendu).toBeGreaterThan(0);
    expect(s.finMontee).toBeGreaterThan(12);
  });

  it('négociation et refus selon les règles réelles : accord refusé si l’écart dépasse la tolérance, conclu sinon ; une loi rejetée laisse l’engagement « non tenu » avec la raison', () => {
    let e = partie(21, 'lfi');
    const trop = partis.find((p) => p.id === 'rn');
    e = negocierAccord(e, trop.id, donnees);
    expect(e.accords).toHaveLength(0);
    expect(e.journal.at(-1).texte).toMatch(/refuse/);
    e = tourSuivant(e, donnees);
    e = negocierAccord(e, 'ps', donnees);
    expect(e.accords.some((a) => a.parti === 'ps')).toBe(true);
    // Loi éloignée de la majorité de sièges : rejetée à l'Assemblée
    const AN = groupesAssemblee(partis, null);
    const rejetee = lois.find((l) => !voterChambre(e, AN, l.theme, l.orientation).adoptee && e.joueur.capital >= l.cout_politique);
    e = proposerLoi(e, rejetee.id, donnees);
    e = tourSuivant(e, donnees);
    expect(e.loisRejetees).toContain(rejetee.id);
    const p = eng(e, 'parlement');
    expect(p.etat).toBe('manque');
    expect(p.rejets).toBe(1);
    expect(p.detail).toMatch(/rejeté/);
    const b = bilanScenario(e, donnees);
    expect(b.compromis).toMatchObject({ accords: 1, accordsRefuses: 1 });
  });

  it('compromis : l’aperçu de l’amendement est pur et cohérent avec amenderTexte', () => {
    let e = partie(4);
    e = proposerLoi(e, lois[0].id, donnees);
    e = { ...e, actionCeMois: false };
    const avant = JSON.stringify(e);
    const a = apercuAmendement(e, donnees);
    expect(JSON.stringify(e)).toBe(avant);
    expect(a.chambre).toBe('assemblee');
    expect(a.possible).toBeNull();
    const amende = amenderTexte(e, donnees);
    expect(amende.texte.orientation).toBe(a.orientation);
    expect(amende.texte.facteur).toBe(a.facteur);
    expect(a.apres.pour + a.apres.contre).toBe(a.avant.pour + a.avant.contre);
    expect(apercuAmendement(amende, donnees).possible).toMatch(/déjà agi/);
    expect(apercuAmendement({ ...e, texte: null }, donnees)).toBeNull();
  });

  it('crise programmée : au mois 3, la maternité menace de fermer dans la région du scénario ; ses conséquences sont réellement calculées ; si on laisse faire, la suite arrive au mois 5', () => {
    for (const [graine, parti] of [[1, 'epr'], [7, 'rn'], [21, 'ps']]) {
      let e = partie(graine, parti);
      e = jouer(e, 2);
      e = repondre(e, 2); // événement aléatoire éventuel du mois 2 : réglé avant
      e = tourSuivant(e, donnees);
      expect(e.evenement, `graine ${graine}`).toBe('fermeture-maternite');
      expect(e.evenementRegion).toBe(e.scenario.region);
      expect(e.scenario.crises).toEqual([{ id: 'fermeture-maternite', tour: 3 }]);
      const avant = e.territoires[e.scenario.region].sante;
      const laisse = resoudreEvenement(e, 2, donnees);
      expect(laisse.territoires[laisse.scenario.region].sante).toBeCloseTo(Math.max(0, avant - 5), 6);
      expect(laisse.explications.some((x) => x.source === 'evenement:fermeture-maternite' && x.region === e.scenario.region)).toBe(true);
      const paye = resoudreEvenement(e, 0, donnees);
      expect(paye.territoires[paye.scenario.region].sante).toBeCloseTo(avant + 4, 6);
      expect(paye.finances.enveloppe).toBeCloseTo(e.finances.enveloppe - 0.15, 6);
      // Suite : fermeture effective deux mois plus tard, seulement si on a laissé faire
      let s = jouer(laisse, 1); s = repondre(s, 2); s = tourSuivant(s, donnees);
      expect(s.evenement).toBe('maternite-fermee');
      expect(s.evenementRegion).toBe(s.scenario.region);
      let q = jouer(paye, 1); q = repondre(q, 2); q = tourSuivant(q, donnees);
      expect(q.evenement).not.toBe('maternite-fermee');
      expect(criseDue(q, donnees, 99)).toBeNull();
    }
  });

  it('crise du mois 7 : procédure pour déficit excessif si déficit ≥ 4,5 et PM, sinon tensions commerciales ; jamais pour un député sur un événement réservé au PM', () => {
    let e = partie(3);
    e = jouer(e, 6);
    if (e.fin) return;
    e = repondre(e, 2);
    const haut = { ...e, indicateurs: { ...e.indicateurs, deficit: 5.5 }, evenementsPasses: e.evenementsPasses.filter((p) => p.id !== 'procedure-deficit-excessif') };
    expect(criseDue(haut, donnees, 7)?.evenementId).toBe('procedure-deficit-excessif');
    const bas = { ...e, indicateurs: { ...e.indicateurs, deficit: 3 } };
    expect(criseDue(bas, donnees, 7)?.evenementId).toBe('tensions-commerciales');
    const depute = { ...haut, joueur: { ...haut.joueur, role: 'depute' } };
    expect(criseDue(depute, donnees, 7)?.evenementId).toBe('tensions-commerciales');
    const t = tourSuivant(haut, donnees);
    if (!t.fin) { expect(t.evenement).toBe('procedure-deficit-excessif'); expect(t.evenementRegion).toBeNull(); }
    // Le bilan retrace la crise et le choix (ou la réponse par défaut)
    const fin = jouer(repondre(t, 1), 6);
    const c = fin.scenario.bilan.crises.find((x) => x.id === 'procedure-deficit-excessif');
    expect(c).toMatchObject({ tour: 7, choix: 1 });
  });

  it('changement de rôle (présidentielle) et fin anticipée : traités explicitement, programmes inaccessibles ensuite', () => {
    let e = partie(6);
    e = lancerProjet(e, 'recrutement-soignants', e.scenario.region, donnees);
    e = jouer(e, 2);
    e = { ...e, joueur: { ...e.joueur, role: 'depute' } }; // ce que fait la présidentielle quand le PM est remplacé
    expect(() => engagerPolitique(e, 'apprentissage', donnees)).toThrow(/gouvernement/);
    expect(priorites(e, donnees).some((p) => p.id === 'avenir')).toBe(false);
    e = jouer(e, 10);
    expect(e.scenario.bilan.roleChange).toBe('depute');
    expect(['atteint', 'partiel']).toContain(e.scenario.bilan.engagements.find((x) => x.id === 'soins').etat);
    let f = partie(4);
    f = lancerProjet(f, 'recrutement-soignants', f.scenario.region, donnees);
    f = tourSuivant({ ...f, indicateurs: { ...f.indicateurs, popularite: 1 } }, donnees);
    expect(f.fin?.type).toBe('defaite');
    expect(f.scenario.statut).toBe('termine');
    expect(f.scenario.bilan).toMatchObject({ fin: 'defaite', tour: 1 });
    expect(f.scenario.bilan.engagements.find((x) => x.id === 'soins').etat).toBe('partiel');
  });

  it('« tout lancer » n’est pas gratuit : capital et enveloppe limitent le premier mois, le déficit et les relations en portent la trace', () => {
    let e = partie(9);
    e = lancerProjet(e, 'recrutement-soignants', e.scenario.region, donnees);
    e = lancerProjet(e, 'centres-sante', e.scenario.region, donnees);
    expect(() => lancerProjet(e, 'renovation-ter', e.scenario.region, donnees)).toThrow(/Enveloppe/);
    e = proposerLoi(e, loiAdoptable(e), donnees); // 2 à 4 de capital sur 4
    expect(() => proposerLoi(e, lois[1].id, donnees)).toThrow(/déjà/);
    const capital = e.joueur.capital;
    const progs = politiques.politiques.filter((p) => !p.prerequis?.length);
    let n = 0;
    for (const p of progs) { try { e = engagerPolitique(e, p.id, donnees); n++; } catch { /* capital épuisé */ } }
    expect(n).toBeLessThanOrEqual(capital);
    expect(n).toBeLessThan(progs.length);
    const prevu = e.effetsEnCours.filter((x) => x.indicateur === 'deficit' && x.source.startsWith('politique:')).reduce((a, x) => a + x.parMois, 0);
    expect(prevu).toBeGreaterThan(0); // chaque programme pèse sur le déficit
    expect(Object.values(e.relations).some((r) => r !== 50)).toBe(true); // et fait réagir les partis
    // Sur 12 mois, en relançant tout chaque mois : engagements tenus mais garde-fou financier dépassé → résultat partiel
    let t = partie(9);
    for (let m = 0; m < 12 && !t.fin; m++) {
      for (const id of ['recrutement-soignants', 'centres-sante']) { try { t = lancerProjet(t, id, t.scenario.region, donnees); } catch { /* enveloppe */ } }
      if (!t.texte) { try { t = proposerLoi(t, loiAdoptable(t), donnees); } catch { /* capital */ } }
      for (const p of politiques.politiques) { try { t = engagerPolitique(t, p.id, donnees); } catch { /* capital, prérequis */ } }
      t = repondre(t, 0); t = tourSuivant(t, donnees);
    }
    if (!t.fin && !t.scenario.bilan.roleChange) { expect(t.scenario.bilan.gardeFou.respecte).toBe(false); expect(t.scenario.bilan.resultat).toBe('partiel'); }
  });
});

describe('priorités et aide au bon moment', () => {
  it('au plus 3 priorités, chacune avec une raison ; l’événement passe en premier ; un engagement commencé n’est plus une priorité', () => {
    let e = partie(2);
    const p0 = priorites(e, donnees);
    expect(p0.length).toBeLessThanOrEqual(3);
    for (const p of p0) { expect(p.raison.length).toBeGreaterThan(10); expect(p.aller.onglet).toBeTruthy(); }
    expect(p0.map((p) => p.id)).toEqual(['soins', 'parlement', 'avenir']);
    e = lancerProjet(e, 'recrutement-soignants', e.scenario.region, donnees);
    expect(priorites(e, donnees).map((p) => p.id)).toEqual(['parlement', 'avenir', 'budget']); // novembre : budget déposable
    e = { ...e, evenement: 'greve-transports' };
    expect(priorites(e, donnees)[0]).toMatchObject({ type: 'urgence' });
    expect(priorites(e, donnees)).toHaveLength(3);
    // Scénario terminé : seul l'événement éventuel reste
    const fini = jouer(partie(2), 12);
    expect(priorites(fini, donnees).every((p) => p.type === 'urgence')).toBe(true);
  });
  it('résultat global : complet si tout est tenu, partiel dès un engagement tenu ou si tout est en partie, échec sinon', () => {
    const E = (...etats) => etats.map((x) => ({ etat: x }));
    expect(resultatScenario(E('atteint', 'atteint', 'atteint'))).toBe('complet');
    expect(resultatScenario(E('atteint', 'atteint', 'atteint'), { respecte: false })).toBe('partiel');
    expect(resultatScenario(E('atteint', 'atteint', 'atteint'), { respecte: true })).toBe('complet');
    expect(resultatScenario(E('atteint', 'manque', 'manque'))).toBe('partiel');
    expect(resultatScenario(E('partiel', 'partiel', 'partiel'))).toBe('partiel');
    expect(resultatScenario(E('partiel', 'manque', 'manque'))).toBe('echec');
    expect(resultatScenario(E('manque', 'manque', 'manque'))).toBe('echec');
  });
});
