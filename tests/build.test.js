// Garde-fou : le service worker commité doit correspondre aux fichiers du jeu.
// (La CI le vérifie aussi ; ce test le signale dès `npm test`, avant de pousser.)
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

describe('service worker', () => {
  it('sw.js est à jour (sinon : npm run build)', () => {
    expect(() => execFileSync('node', ['scripts/generer-sw.js', '--verifier'], { stdio: 'pipe' })).not.toThrow();
  });
});
