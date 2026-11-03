// Serveur statique minimal pour les tests Playwright (aucune dépendance).
// Usage : node e2e/serveur.js [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const RACINE = process.cwd();
const PORT = Number(process.argv[2] ?? 4173);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };

createServer(async (req, res) => {
  const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const fichier = normalize(join(RACINE, chemin === '/' ? 'index.html' : chemin));
  if (!fichier.startsWith(RACINE)) { res.writeHead(403).end(); return; } // pas de sortie de la racine
  try {
    const contenu = await readFile(fichier);
    res.writeHead(200, { 'content-type': TYPES[extname(fichier)] ?? 'application/octet-stream' }).end(contenu);
  } catch {
    res.writeHead(404).end('Introuvable');
  }
}).listen(PORT, () => console.log(`Hémicycle servi sur http://localhost:${PORT}`));
