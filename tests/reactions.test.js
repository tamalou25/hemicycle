import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { attitude, reactionsAuTexte, joueurDepuisPoliticien, creerPartie } from '../src/engine/index.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const partis = lire('parties.json');
const fictifs = [{ id: 'a', nom: 'A', parti: 'ps' }, { id: 'b', nom: 'B', parti: 'rn' }];

describe('réactions simulées', () => {
  it('attitude selon l’écart', () => {
    expect(attitude({ fiscalite: 80 }, 'fiscalite', 70)).toBe('soutien');
    expect(attitude({ fiscalite: 0 }, 'fiscalite', 80)).toBe('reserve');
    expect(attitude({ fiscalite: -90 }, 'fiscalite', 80)).toBe('opposition');
  });
  it('marque toujours les réactions comme simulées et ne produit aucun texte', () => {
    const r = reactionsAuTexte({ theme: 'retraites', orientation: 80 }, fictifs, partis);
    expect(r).toHaveLength(2);
    for (const x of r) {
      expect(x.simulation).toBe(true);
      expect(Object.keys(x).sort()).toEqual(['attitude', 'id', 'nom', 'parti', 'simulation']);
    }
  });
  it('exclut le joueur lui-même', () => {
    expect(reactionsAuTexte({ theme: 'europe', orientation: 0 }, fictifs, partis, 'a')).toHaveLength(1);
  });
  it('jouer un élu : positions du parti, compétences neutres', () => {
    const j = joueurDepuisPoliticien(fictifs[0], partis);
    expect(j.ideologie).toEqual(partis.find((p) => p.id === 'ps').positions);
    expect(new Set(Object.values(j.competences)).size).toBe(1);
    const e = creerPartie({ joueur: j, situation: lire('situation.json') });
    expect(e.joueur.politicienId).toBe('a');
  });
});
