// Génère sw.js (service worker) avec la liste exacte des fichiers du jeu et une version
// dérivée de leur contenu : toute modification d'un fichier change la version du cache.
// Usage : npm run build:sw (la CI vérifie que sw.js commité est à jour).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const RACINE = process.cwd();
const INCLURE = ['index.html', 'manifest.webmanifest', 'assets', 'src'];
const EXCLURE = [/\.map$/, /(^|\/)\./, /^src\/styles\//];

function lister(chemin) {
  const abs = join(RACINE, chemin);
  if (statSync(abs).isDirectory()) return readdirSync(abs).sort().flatMap((f) => lister(join(chemin, f)));
  return [chemin];
}
const fichiers = INCLURE.flatMap(lister).map((f) => relative(RACINE, join(RACINE, f)).split('\\').join('/')).filter((f) => !EXCLURE.some((re) => re.test(f)));
const hash = createHash('sha256');
for (const f of fichiers) hash.update(f).update(readFileSync(join(RACINE, f)));
const version = hash.digest('hex').slice(0, 12);

const sw = `// FICHIER GÉNÉRÉ par scripts/generer-sw.js — ne pas modifier à la main.
// Service worker : le jeu fonctionne hors ligne après une première visite.
const CACHE = 'hemicycle-${version}';
const FICHIERS = ${JSON.stringify(['./', ...fichiers.map((f) => './' + f)], null, 2)};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // Supprime les anciennes versions du cache
  e.waitUntil(caches.keys().then((cles) => Promise.all(cles.filter((k) => k.startsWith('hemicycle-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  // Cache d'abord (fichiers versionnés), réseau en secours ; navigation hors ligne → index.html
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request).catch(() =>
    e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
`;
writeFileSync(join(RACINE, 'sw.js'), sw);
console.log(`sw.js : ${fichiers.length} fichiers, version ${version}`);
