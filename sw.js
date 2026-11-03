// FICHIER GÉNÉRÉ par scripts/generer-sw.js — ne pas modifier à la main.
// Service worker : le jeu fonctionne hors ligne après une première visite.
const CACHE = 'hemicycle-54b22c52f07c';
const FICHIERS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/app.css",
  "./assets/fonts/LICENSE-OFL.txt",
  "./assets/fonts/source-serif-4-latin-500-normal.woff2",
  "./assets/fonts/source-serif-4-latin-700-normal.woff2",
  "./assets/icones/icone-192.png",
  "./assets/icones/icone-512.png",
  "./assets/icones/icone-maskable-512.png",
  "./src/data/calendrier.json",
  "./src/data/carte-regions.json",
  "./src/data/events.json",
  "./src/data/finances.json",
  "./src/data/groupes-equilibrage.json",
  "./src/data/groupes.json",
  "./src/data/laws.json",
  "./src/data/objectifs.json",
  "./src/data/parties.json",
  "./src/data/politicians.json",
  "./src/data/politiques.json",
  "./src/data/projets.json",
  "./src/data/regions.json",
  "./src/data/senat.json",
  "./src/data/situation.json",
  "./src/engine/briefing.js",
  "./src/engine/budget.js",
  "./src/engine/budgetEtat.js",
  "./src/engine/confianceRegions.js",
  "./src/engine/constants.js",
  "./src/engine/decisions.js",
  "./src/engine/effects.js",
  "./src/engine/elections.js",
  "./src/engine/events.js",
  "./src/engine/explications.js",
  "./src/engine/finances.js",
  "./src/engine/fins.js",
  "./src/engine/groupes.js",
  "./src/engine/index.js",
  "./src/engine/laws.js",
  "./src/engine/navette.js",
  "./src/engine/objectifs.js",
  "./src/engine/parliament.js",
  "./src/engine/polls.js",
  "./src/engine/projets.js",
  "./src/engine/reactions.js",
  "./src/engine/relations.js",
  "./src/engine/rng.js",
  "./src/engine/save.js",
  "./src/engine/secteurs.js",
  "./src/engine/share.js",
  "./src/engine/state.js",
  "./src/engine/territoires.js",
  "./src/engine/turn.js",
  "./src/main.js",
  "./src/ui/components/avatar.js",
  "./src/ui/components/budget.js",
  "./src/ui/components/carte.js",
  "./src/ui/components/carteLoi.js",
  "./src/ui/components/ceMois.js",
  "./src/ui/components/decisions.js",
  "./src/ui/components/elections.js",
  "./src/ui/components/etatPays.js",
  "./src/ui/components/evenement.js",
  "./src/ui/components/finances.js",
  "./src/ui/components/jauge.js",
  "./src/ui/components/navigation.js",
  "./src/ui/components/objectifs.js",
  "./src/ui/components/opinion.js",
  "./src/ui/components/parlement.js",
  "./src/ui/components/partage.js",
  "./src/ui/components/reactions.js",
  "./src/ui/components/relations.js",
  "./src/ui/components/secteurs.js",
  "./src/ui/components/toast.js",
  "./src/ui/components/vote.js",
  "./src/ui/screens/accueil.js",
  "./src/ui/screens/choixElu.js",
  "./src/ui/screens/classement.js",
  "./src/ui/screens/creation.js",
  "./src/ui/screens/defi.js",
  "./src/ui/screens/fin.js",
  "./src/ui/screens/tableau.js",
  "./src/ui/util.js"
];

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
