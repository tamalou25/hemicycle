// Prépare le dossier www/ embarqué par Capacitor (applications Android et iOS).
// Copie uniquement les fichiers du jeu (mêmes fichiers que le site GitHub Pages).
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const SORTIE = 'www';
rmSync(SORTIE, { recursive: true, force: true });
mkdirSync(SORTIE);
for (const f of ['index.html', 'manifest.webmanifest', 'sw.js', 'src', 'assets']) cpSync(f, `${SORTIE}/${f}`, { recursive: true });
console.log('www/ prêt pour Capacitor');
