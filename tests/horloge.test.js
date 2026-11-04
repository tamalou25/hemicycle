// Horloge de simulation : pure, déterministe, un mois au plus par pas, résultats indépendants de la vitesse.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { creerPartie, tourSuivant, proposerLoi, lancerProjet, horlogeInitiale, demarrer, pauser, basculer, changerVitesse, avancer, jourDuMois, raisonPause, VITESSES } from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const noms = ['parties', 'laws', 'senat', 'calendrier', 'regions', 'projets', 'finances', 'groupes', 'politiques', 'events', 'objectifs'];
const [partis, lois, senat, calendrier, regions, projets, finances, groupes, politiques, evenements, objectifs] = noms.map((n) => lire(`${n}.json`));
const donnees = { partis, lois, senat, calendrier, regions, projets, finances, groupes, groupesEquilibrage: lire('groupes-equilibrage.json'), politiques, evenements, objectifs };
const partie = (graine = 3) => creerPartie({ joueur: { nom: 'P', parti: 'epr', role: 'president', ideologie: { ...partis.find((p) => p.id === 'epr').positions } }, situation: lire('situation.json'), graine, dateDepart: '2027-05-01', ...donnees });

/** Simule une boucle d'affichage : ticks de `dt` ms ; à chaque pas d'horloge, le moteur joue un mois ; les décisions sont prises aux dates prévues. */
function simuler(etat, horloge, dt, mois, decisions = {}) {
  let e = etat, h = horloge, t = 0;
  while (e.tour < mois && t < 10_000_000) {
    t += dt;
    const r = avancer(h, dt);
    h = r.horloge;
    if (r.pas) {
      e = tourSuivant(e, donnees);
      if (raisonPause(e)) h = pauser(h);
      if (decisions[e.tour]) e = decisions[e.tour](e);
      if (!h.marche && !e.fin) { e = { ...e, evenement: null, evenementRegion: null }; h = demarrer(h); } // le joueur répond (ici : on ignore l'événement) et relance
    }
  }
  return e;
}

describe('horloge', () => {
  it('démarre en pause ; pause, reprise et vitesse ; un mois au plus par appel, quel que soit le temps réel écoulé', () => {
    let h = horlogeInitiale();
    expect(h.marche).toBe(false);
    expect(avancer(h, 100_000).pas).toBe(0); // en pause : rien ne bouge
    h = demarrer(h);
    expect(avancer(h, VITESSES[1] - 1).pas).toBe(0);
    expect(avancer(h, VITESSES[1]).pas).toBe(1);
    // Retour d'arrière-plan : 10 minutes réelles → un seul mois, et l'avancement repart de zéro (aucun rattrapage)
    const r = avancer(h, 600_000);
    expect(r.pas).toBe(1);
    expect(r.horloge.ecoule).toBe(0);
    expect(avancer(r.horloge, 1).pas).toBe(0);
    // Changement de vitesse : l'avancement est conservé, la durée du mois change
    let m = avancer(h, 10_000).horloge; // 10 s sur 30
    m = changerVitesse(m, 3); // mois de 5 s : déjà dépassé
    expect(avancer(m, 1).pas).toBe(1);
    expect(changerVitesse(h, 9).vitesse).toBe(1); // vitesse inconnue ignorée
    expect(basculer(basculer(h)).marche).toBe(true);
    expect(jourDuMois(horlogeInitiale())).toBe(1);
    expect(jourDuMois({ ...h, ecoule: VITESSES[1] - 1 })).toBe(30);
  });

  it('pause automatique expliquée : événement, gouvernement renversé, fin de partie, conclusion de scénario', () => {
    const e = partie();
    expect(raisonPause(e)).toBeNull();
    expect(raisonPause({ ...e, evenement: 'greve-transports' })).toMatch(/événement/);
    expect(raisonPause({ ...e, gouvernement: { ...e.gouvernement, statut: 'renverse' } })).toMatch(/renversé/);
    expect(raisonPause({ ...e, fin: { type: 'mandat', texte: '' } })).toMatch(/Fin/);
    expect(raisonPause(null)).toMatch(/Aucune/);
  });

  it('indépendance de la vitesse : mêmes décisions aux mêmes mois → même état final, aux trois vitesses et avec des ticks irréguliers', () => {
    const decisions = {
      2: (e) => lancerProjet(e, 'centres-sante', 'mayotte', donnees),
      4: (e) => (e.texte || e.actionCeMois ? e : proposerLoi(e, 'securite-fermete', donnees)),
    };
    const ref = simuler(partie(11), demarrer(horlogeInitiale()), 250, 14, decisions);
    for (const [v, dt] of [[1, 250], [2, 1000], [3, 333], [3, 4999], [1, 17]]) {
      const e = simuler(partie(11), demarrer(changerVitesse(horlogeInitiale(), v)), dt, 14, decisions);
      expect(e.tour).toBe(14);
      expect(e.indicateurs).toEqual(ref.indicateurs);
      expect(e.journal).toEqual(ref.journal);
      expect(e.graine).toBe(ref.graine);
    }
    // Et identique à un enchaînement direct de tourSuivant (l'horloge n'ajoute aucune règle)
    let d = partie(11);
    for (let m = 0; m < 14; m++) { d = tourSuivant(d, donnees); if (decisions[d.tour]) d = decisions[d.tour](d); if (d.evenement) d = { ...d, evenement: null, evenementRegion: null }; }
    expect(d.indicateurs).toEqual(ref.indicateurs);
  });

  it('aucun double traitement : un pas d’horloge = un appel du moteur ; deux pas à la même date sont impossibles', () => {
    let h = demarrer(horlogeInitiale());
    let appels = 0;
    for (let t = 0; t < VITESSES[1] * 3; t += 500) { const r = avancer(h, 500); h = r.horloge; appels += r.pas; }
    expect(appels).toBe(3);
  });
});
