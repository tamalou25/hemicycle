// Génère src/data/carte-monde.json : fond mondial + régions de France métropolitaine, projetés ensemble (Mercator).
// Sources (téléchargées à l'exécution, non versionnées) :
//  - pays : Natural Earth 1:110m admin 0 countries (domaine public), via github.com/nvkelso/natural-earth-vector ;
//  - régions : france-geojson (gregoiredavid), version simplifiée, Licence Ouverte / Open Licence (IGN ADMIN EXPRESS, INSEE).
// Les DROM gardent leurs tracés existants (carte-regions.json, encarts) ; ils sont placés en encarts et repérés par leurs coordonnées réelles.
// Usage : node scripts/generer-carte-monde.mjs
import { writeFileSync, readFileSync } from 'node:fs';

const SRC_PAYS = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const SRC_REGIONS = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions-version-simplifiee.geojson';
const LARGEUR = 8192; // unités SVG pour 360° de longitude (précision 0,1 unité ≈ 0,004°)
const LAT_MAX = 84;

const rad = (d) => (d * Math.PI) / 180;
const projeter = ([lon, lat]) => {
  const l = Math.max(-LAT_MAX, Math.min(LAT_MAX, lat));
  const x = ((lon + 180) / 360) * LARGEUR;
  const y = ((1 - Math.log(Math.tan(rad(l)) + 1 / Math.cos(rad(l))) / Math.PI) / 2) * LARGEUR;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
};
const anneau = (pts) => {
  let d = '', prev = null, n = 0;
  for (const p of pts.map(projeter)) {
    if (prev && Math.abs(p[0] - prev[0]) < 0.15 && Math.abs(p[1] - prev[1]) < 0.15) continue; // points confondus à l'échelle
    d += `${prev ? 'L' : 'M'}${p[0]} ${p[1]}`; prev = p; n++;
  }
  return n >= 3 ? d + 'Z' : ''; // un anneau dégénéré (îlot plus petit que la précision) est ignoré
};
const chemin = (geom) => (geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat(1)).map(anneau).join('');
const centre = (geom) => { const pts = (geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates.sort((a, b) => b[0].length - a[0].length)[0][0]).map(projeter); const c = pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]); return [Math.round(c[0] / pts.length), Math.round(c[1] / pts.length)]; };

const lire = async (url) => (await fetch(url)).json();
const [pays, regionsFr] = await Promise.all([lire(SRC_PAYS), lire(SRC_REGIONS)]);
const regionsJeu = JSON.parse(readFileSync(new URL('../src/data/regions.json', import.meta.url))).regions;
const carteRegions = JSON.parse(readFileSync(new URL('../src/data/carte-regions.json', import.meta.url)));
const normaliser = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

const paysOut = pays.features.filter((f) => f.properties.ADM0_A3 !== 'FRA').map((f) => ({ id: (f.properties.ISO_A2_EH ?? f.properties.ISO_A2 ?? f.properties.ADM0_A3).toLowerCase(), nom: f.properties.NAME_FR ?? f.properties.NAME, d: chemin(f.geometry) }));
const france = pays.features.find((f) => f.properties.ADM0_A3 === 'FRA');
const regionsOut = regionsFr.features.map((f) => {
  const id = regionsJeu.find((r) => normaliser(r.nom) === normaliser(f.properties.nom))?.id;
  if (!id) throw new Error(`Région inconnue : ${f.properties.nom}`);
  const [cx, cy] = centre(f.geometry);
  return { id, d: chemin(f.geometry), cx, cy };
});
// DROM : position réelle (centre approximatif, pour les repères et le recentrage) ; tracés repris des encarts existants
const DROM = { guadeloupe: [-61.55, 16.2], martinique: [-61.0, 14.65], guyane: [-53.1, 3.9], 'la-reunion': [55.5, -21.1], mayotte: [45.15, -12.8] };
const drom = Object.entries(DROM).map(([id, ll]) => { const [cx, cy] = projeter(ll); const e = carteRegions.encarts.find((x) => x.id === id); const r = carteRegions.regions.find((x) => x.id === id); return { id, cx, cy, encart: e, d: r?.d ?? '' }; });
const bbox = (liste) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const d of liste) for (const m of d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)) { const x = +m[1], y = +m[2]; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) }; };
const metro = bbox(regionsOut.map((r) => r.d));
const marge = (b, k) => ({ x: Math.round(b.x - b.w * k), y: Math.round(b.y - b.h * k), w: Math.round(b.w * (1 + 2 * k)), h: Math.round(b.h * (1 + 2 * k)) });
const sortie = {
  note: 'Fond mondial et régions projetés ensemble en Mercator (largeur 8192 unités pour 360°) par scripts/generer-carte-monde.mjs. Les frontières étrangères sont géographiques, sans aucune donnée de jeu. Les DROM sont des encarts (tracés existants) repérés par leurs coordonnées réelles.',
  attribution: 'Fond mondial : Natural Earth 1:110m (domaine public). Régions : IGN ADMIN EXPRESS / INSEE via gregoiredavid/france-geojson (Licence Ouverte), simplifiées. Projection Mercator par le projet.',
  sources: [{ source: 'Natural Earth, Admin 0 – Countries, 1:110m', url: 'https://www.naturalearthdata.com/downloads/110m-cultural-vectors/', licence: 'Domaine public', date: '2026-11-04' }, { source: 'gregoiredavid/france-geojson, regions-version-simplifiee.geojson', url: 'https://github.com/gregoiredavid/france-geojson', licence: 'Licence Ouverte / Open Licence (Etalab)', date: '2026-11-04' }],
  projection: { type: 'mercator', largeur: LARGEUR, latMax: LAT_MAX },
  viewBox: `0 0 ${LARGEUR} ${LARGEUR}`,
  cadrages: { france: marge(metro, 0.12), europe: marge(metro, 1.6), monde: { x: 0, y: Math.round(LARGEUR * 0.12), w: LARGEUR, h: Math.round(LARGEUR * 0.62) } },
  france: { id: 'fr', nom: 'France', d: chemin(france.geometry) },
  pays: paysOut,
  regions: regionsOut,
  drom,
};
const chemin_sortie = new URL('../src/data/carte-monde.json', import.meta.url);
writeFileSync(chemin_sortie, JSON.stringify(sortie));
console.log(`carte-monde.json : ${paysOut.length} pays, ${regionsOut.length} régions, ${drom.length} DROM, ${Math.round(JSON.stringify(sortie).length / 1024)} Ko ; cadrage France`, sortie.cadrages.france);
