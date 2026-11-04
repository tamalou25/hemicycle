// Écran « Monde » : carte mondiale zoomable cadrée sur la France, écran principal de la campagne présidentielle.
// La navigation de carte (cadrage, zoom) vit dans ctx.monde, jamais dans l'état de simulation.
// Tout ce qui est affiché vient du moteur (territoires, confiance, objectifs, priorités) ; le fond étranger est purement géographique.
import { esc, fmt, MOIS } from '../util.js';
import { evaluerObjectifs, dateDuTour, gouverne, raisonRefusPLF } from '../../engine/index.js';
import { VUES, vuesDisponibles, vueValide, valeurRegion, legislativesRegions, COULEURS, classe, ficheRegion, tableAccessible, legende, legendeLegis, badgeSimulation } from './carte.js';
import { META } from './jauge.js';
import { texteValeur } from './objectifs.js';
import { COULEURS_RELATION, classeRelation, legendeRelations, panneauPays, brancherPays, tableauPartenaires, libelleRelation } from './diplomatie.js';
import { resumePartenaires } from '../../engine/index.js';

const ZOOM_MIN = 60, ZOOM_MAX = 8192; // largeur de cadrage (unités de la carte) : de ~2° à 360°
const r1 = (v) => Math.round(v * 10) / 10;

/** Cadrage initial : la France et son environnement proche (données du fichier de carte). */
export const cadrageInitial = (monde) => ({ ...monde.cadrages.france });

/** Cadrage centré sur un point avec une largeur donnée, borné à la carte. */
export function cadrer(monde, cx, cy, w, ratio) {
  const largeur = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, w));
  const hauteur = largeur / (ratio || 1.5);
  const L = monde.projection.largeur;
  return { x: r1(Math.max(0, Math.min(L - largeur, cx - largeur / 2))), y: r1(Math.max(0, Math.min(L - hauteur, cy - hauteur / 2))), w: r1(largeur), h: r1(hauteur) };
}

/** Boîte englobante d'un tracé SVG (M/L x y). */
export function boiteChemin(d) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const m of d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)) { const x = +m[1], y = +m[2]; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

/** Cadrage sur une région (métropole : son tracé ; DROM : son repère) avec une marge. */
export function cadrageRegion(monde, regionId, ratio) {
  const r = monde.regions.find((x) => x.id === regionId);
  if (r) { const b = boiteChemin(r.d); return cadrer(monde, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h * (ratio || 1.5)) * 1.6, ratio); }
  const d = monde.drom.find((x) => x.id === regionId);
  return d ? cadrer(monde, d.cx, d.cy, 120, ratio) : cadrageInitial(monde);
}

/** Cadrage sur un pays (boîte englobante de son tracé, zoom plafonné pour les très grands pays). */
export function cadragePays(monde, paysId, ratio) {
  const p = monde.pays.find((x) => x.id === paysId);
  if (!p) return cadrageInitial(monde);
  const b = boiteChemin(p.d);
  return cadrer(monde, b.x + b.w / 2, b.y + b.h / 2, Math.min(2600, Math.max(b.w, b.h * (ratio || 1.5)) * 1.5), ratio);
}

const ratioDe = (ctx) => ctx.monde?.ratio ?? 1.5;

/** Bandeau compact : date, rôle, indicateurs clés (la commande du temps est dans l'en-tête fixe). */
function bandeauIndicateurs(etat, ctx) {
  const i = etat.indicateurs;
  const cle = (k) => `<li class="flex items-baseline gap-1 whitespace-nowrap"><span class="text-xs text-doux">${esc(META[k].label)}</span><strong class="tabular-nums">${fmt(i[k], k === 'tensions' ? 0 : 1)}<span class="text-xs font-normal text-doux">${esc(META[k].unite)}</span></strong></li>`;
  return `<ul class="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Indicateurs essentiels">${['chomage', 'deficit', 'popularite', 'tensions'].map(cle).join('')}
    <li class="flex items-baseline gap-1 whitespace-nowrap"><span class="text-xs text-doux">Capital</span><strong class="tabular-nums">${etat.joueur.capital}<span class="text-xs font-normal text-doux">/10</span></strong></li>
    <li class="flex items-baseline gap-1 whitespace-nowrap"><span class="text-xs text-doux">Enveloppe</span><strong class="tabular-nums">${fmt(etat.finances?.enveloppe ?? 0, 2)}<span class="text-xs font-normal text-doux"> Md€</span></strong></li></ul>`;
}

/** Panneau « Cap » : objectifs du mandat et urgences, toujours visibles (repliable sur mobile). */
function panneauCap(etat, ctx, priorites, veille = null) {
  const objectifs = evaluerObjectifs(etat, { regions: ctx.regions, objectifs: ctx.objectifs });
  const reste = Math.max(0, 60 - etat.tour);
  const lignes = objectifs.map((o) => { const t = texteValeur(o); return `<li class="flex items-center justify-between gap-2 py-0.5 text-sm"><span class="min-w-0 truncate" title="${esc(o.titre)}">${esc(o.titre)}</span><span class="shrink-0 tabular-nums text-xs ${o.atteint ? 'text-succes font-bold' : 'text-doux'}">${esc(t.v)} / ${esc(t.c)}</span></li>`; }).join('');
  const urgences = priorites.filter((p) => p.type === 'urgence');
  return `<section aria-labelledby="h-cap" class="bg-carte border border-bord rounded-xl p-3">
    <h2 id="h-cap" class="font-serif font-bold text-base">Votre cap <span class="font-sans font-normal text-xs text-doux">· ${reste} mois restants</span></h2>
    ${urgences.length ? `<ul class="mt-1 space-y-1" aria-label="Urgences">${urgences.map((p, i) => `<li class="flex items-center justify-between gap-2 text-sm bg-[#FFF4D6] border border-laiton rounded-lg px-2 py-1"><span class="min-w-0"><span aria-hidden="true" class="font-bold text-laiton mr-1">!</span><strong>${esc(p.titre)}</strong></span><button type="button" class="btn btn-s !min-h-[36px] !px-2 text-xs shrink-0" data-prio="${i}">Traiter</button></li>`).join('')}</ul>` : '<p class="text-xs text-succes mt-1">Rien d’urgent ce mois-ci.</p>'}
    ${(() => { const v = veille ?? priorites.filter((p) => p.type === 'territoire').slice(0, 2); return v.length ? `<ul class="mt-1 space-y-1" aria-label="À surveiller">${v.map((p, i) => `<li class="flex items-center justify-between gap-2 text-sm bg-[#EAEEF5] border border-bord rounded-lg px-2 py-1"><span class="min-w-0"><span aria-hidden="true" class="font-bold text-doux mr-1">◎</span>${esc(p.titre)}</span><button type="button" class="btn btn-s !min-h-[36px] !px-2 text-xs shrink-0" data-veille="${i}">${esc(p.bouton ?? 'Voir')}</button></li>`).join('')}</ul>` : ''; })()}
    <ul class="mt-1 divide-y divide-bord" aria-label="Objectifs du mandat">${lignes}</ul>
    <p class="text-xs text-doux mt-1">Détail et pistes : Bureau.</p>
  </section>`;
}

/** Liens vers les autres écrans (gouvernement, décisions, Parlement, budget, journal, Bureau). */
function liensEcrans(etat) {
  const gouv = etat.gouvernement ? (etat.gouvernement.statut === 'en_place' ? 'Gouvernement en place' : 'Gouvernement renversé !') : null;
  const l = [['bureau', 'Bureau', 'synthèse'], ['decisions', 'Décisions', 'lois, programmes, accords'], ['parlement', 'Parlement', 'majorité, textes'], ['budget', 'Budget', 'finances'], ['economie', 'Économie', 'filières, commerce'], ['chronologie', 'Journal', 'historique']];
  return `<nav aria-label="Écrans" class="grid grid-cols-3 gap-1.5">${gouv ? `<button type="button" class="col-span-3 btn ${etat.gouvernement.statut === 'renverse' ? 'btn-ambre' : 'btn-s'} !justify-between text-sm" data-monde-aller="bureau" data-cible="gouvernement"><span>${esc(gouv)}</span><span class="text-xs font-normal">${etat.gouvernement.statut === 'renverse' ? 'nommer un Premier ministre' : 'voir'} →</span></button>` : ''}${l.map(([id, nom, aide]) => `<button type="button" class="btn btn-s !min-h-[48px] !px-1 flex-col !gap-0 leading-tight min-w-0" data-monde-aller="${id}"><span class="text-xs font-bold truncate max-w-full">${esc(nom)}</span><span class="text-[0.6rem] font-normal text-doux truncate max-w-full">${esc(aide)}</span></button>`).join('')}</nav>`;
}

/** Encarts des DROM : tracés existants, dans un coin de la carte, cliquables comme les régions. */
function encartsDrom(monde, etat, vue, selection) {
  return `<div class="absolute left-1 bottom-1 flex gap-1 bg-white/85 rounded-lg p-1 border border-bord" aria-label="Outre-mer (encarts)">${monde.drom.map((d) => {
    const val = valeurRegion(etat, d.id, vue === 'legislatives' ? 'satisfaction' : vue);
    const e = d.encart, sel = d.id === selection;
    return `<svg viewBox="${e.x} ${e.y} ${e.w} ${e.h}" width="34" height="34" role="button" tabindex="0" aria-pressed="${sel}" data-region="${esc(d.id)}" aria-label="${esc(d.id)}, ${Math.round(val ?? 0)} sur 100" class="rounded ${sel ? 'ring-2 ring-laiton' : ''}"><title>${esc(d.id)}</title><path d="${esc(d.d)}" fill="${COULEURS[classe(val)]}" stroke="${sel ? '#9A6700' : '#fff'}" stroke-width="${sel ? 3 : 1}"/></svg>`;
  }).join('')}</div>`;
}

function svgMonde(etat, ctx, vue, selection) {
  const monde = ctx.monde.donnees, vb = ctx.monde.cadrage;
  // Partenaires simulés (lot 3) : colorés par relation en mode « Partenaires », toujours sélectionnables
  const partenaires = Object.fromEntries(resumePartenaires(etat, { pays: ctx.pays }).map((p) => [p.id, p]));
  const modePays = ctx.modeMonde === 'partenaires';
  const paysSel = ctx.paysSel ?? null;
  const noms = Object.fromEntries(ctx.regions.regions.map((r) => [r.id, r.nom]));
  const legis = vue === 'legislatives' ? legislativesRegions(etat) : null;
  const epaisseur = Math.max(0.3, vb.w / 1500);
  const pays = monde.pays.map((p) => {
    const r = partenaires[p.id];
    if (!r) return `<path d="${p.d}" class="pays" fill="${modePays ? '#EDF0F5' : '#F7F9FC'}" stroke="#AEB8CC" stroke-width="${epaisseur}" vector-effect="non-scaling-stroke"><title>${esc(p.nom)}</title></path>`;
    const sel = p.id === paysSel;
    const fill = modePays ? COULEURS_RELATION[classeRelation(r.relation)] : '#F7F9FC';
    const lib = `relation ${Math.round(r.relation)} sur 100, ${libelleRelation(r.relation)}${r.sanctions ? ', sous sanctions' : ''}${r.tension ? ', différend en cours' : ''}`;
    return `<path id="pays-${esc(p.id)}" d="${p.d}" class="pays partenaire" fill="${fill}" stroke="${sel ? '#9A6700' : modePays ? '#8A96AD' : '#AEB8CC'}" stroke-width="${sel ? 3 : epaisseur}" vector-effect="non-scaling-stroke" tabindex="0" role="button" aria-pressed="${sel}" data-pays="${esc(p.id)}" aria-label="${esc(p.nom)}, ${esc(lib)}"><title>${esc(p.nom)} : ${esc(lib)}</title></path>`;
  }).join('');
  const chemin = (r) => {
    const sel = r.id === selection;
    let fill, lib;
    if (legis) { const s = legis.parRegion[r.id] ?? {}; const t = Object.entries(s).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]; const p = t && ctx.partis.find((x) => x.id === t[0]); fill = p?.couleur ?? '#E3E8F0'; lib = t ? `${p?.sigle ?? t[0]} en tête, ${t[1]} sièges` : 'pas de résultat'; }
    else { const val = valeurRegion(etat, r.id, vue); fill = COULEURS[classe(val)]; lib = `${VUES.find((x) => x.id === vue)?.court ?? vue} ${Math.round(val ?? 0)} sur 100`; }
    return `<path id="monde-${esc(r.id)}" d="${esc(r.d)}" fill="${fill}" stroke="${sel ? '#9A6700' : '#FFFFFF'}" stroke-width="${sel ? 3 : 1}" vector-effect="non-scaling-stroke" stroke-linejoin="round" tabindex="0" role="button" aria-pressed="${sel}" data-region="${esc(r.id)}" aria-label="${esc(noms[r.id] ?? r.id)}, ${esc(lib)}"><title>${esc(noms[r.id] ?? r.id)} : ${esc(lib)}</title></path>`;
  };
  const ordre = [...monde.regions.filter((r) => r.id !== selection), ...monde.regions.filter((r) => r.id === selection)];
  const reperes = monde.drom.map((d) => `<g aria-hidden="true"><circle cx="${d.cx}" cy="${d.cy}" r="${Math.max(3, vb.w / 120)}" fill="#F5B51C" stroke="#111C33" stroke-width="${epaisseur}" vector-effect="non-scaling-stroke"/></g>`).join('');
  return `<svg id="svg-monde" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" preserveAspectRatio="xMidYMid slice" class="w-full h-full touch-none select-none" role="group" aria-label="Carte du monde cadrée sur la France ; régions françaises sélectionnables, vue ${esc(VUES.find((x) => x.id === vue)?.court ?? vue)}" style="background:#D6E2F0">
    <g class="fond">${pays}</g>
    <path d="${monde.france.d}" fill="#E3E8F0" stroke="none" aria-hidden="true"/>
    <g class="regions">${ordre.map(chemin).join('')}</g>
    ${reperes}</svg>`;
}

/** Écran complet. `priorites` : liste du Bureau (événement, gouvernement, première décision…) pour le panneau Cap. */
export function ecranMonde(etat, ctx, priorites = [], veille = null) {
  const vue = vueValide(ctx.vue, etat);
  const sel = ctx.region ?? null;
  const monde = ctx.monde.donnees;
  const legis = vue === 'legislatives' ? legislativesRegions(etat) : null;
  const tableau = !!ctx.tableauCarte;
  const modePays = ctx.modeMonde === 'partenaires' && !!ctx.pays;
  const d = dateDuTour(etat);
  const vues = vuesDisponibles(etat).map((x) => `<button type="button" data-vue="${x.id}" aria-pressed="${x.id === vue}" class="min-h-[36px] px-2.5 rounded-full border text-xs font-semibold ${x.id === vue ? 'bg-encre text-white border-encre' : 'bg-white border-bord text-encre'}">${esc(x.nom)}</button>`).join('');
  const outils = `<div class="absolute right-1 top-1 flex flex-col gap-1" role="group" aria-label="Zoom et recentrage">
      <button type="button" class="btn btn-s !min-w-[44px] !px-0" data-zoom="in" aria-label="Zoom avant">+</button>
      <button type="button" class="btn btn-s !min-w-[44px] !px-0" data-zoom="out" aria-label="Zoom arrière">−</button>
      <button type="button" class="btn btn-s !min-w-[44px] !px-1 text-xs" data-cadrage="france" title="Recentrer sur la France">FR</button>
      <button type="button" class="btn btn-s !min-w-[44px] !px-1 text-xs" data-cadrage="europe" title="Europe">EU</button>
      <button type="button" class="btn btn-s !min-w-[44px] !px-1 text-xs" data-cadrage="monde" title="Monde entier">🌍<span class="sr-only">Monde entier</span></button>
    </div>`;
  const carte = tableau
    ? `<div class="bg-carte border border-bord rounded-xl p-3 overflow-auto max-h-[60vh]">${modePays ? tableauPartenaires(etat, ctx) : tableAccessible(etat, ctx)}</div>`
    : `<div id="cadre-monde" class="relative bg-[#D6E2F0] rounded-xl border border-bord overflow-hidden h-[52vh] sm:h-[min(70vh,46rem)]" tabindex="0" aria-label="Carte navigable : glisser pour déplacer, molette ou pincement pour zoomer, flèches pour déplacer, + et − pour zoomer">
        ${svgMonde(etat, ctx, vue, sel)}${outils}${encartsDrom(monde, etat, vue, sel)}
        <p class="absolute right-1 bottom-1 text-[0.65rem] text-doux bg-white/80 rounded px-1" aria-hidden="true">Seule la France est jouable</p>
      </div>`;
  const legendes = modePays ? `<p class="text-xs mt-1">Relations avec les partenaires simulés ${badgeSimulation()}</p>${legendeRelations()}` : legis ? `<p class="text-xs mt-1">Parti en tête en sièges par région ${badgeSimulation()}</p>${legendeLegis(legis, ctx)}` : legende();
  const modes = ctx.pays ? `<div role="group" aria-label="Mode de la carte" class="flex gap-1 mr-2">${[['territoires', 'Territoires'], ['partenaires', 'Partenaires']].map(([id, nom]) => `<button type="button" data-mode-monde="${id}" aria-pressed="${(ctx.modeMonde ?? 'territoires') === id}" class="min-h-[44px] px-3 rounded-full border text-xs font-semibold ${(ctx.modeMonde ?? 'territoires') === id ? 'bg-bleu text-white border-bleu' : 'bg-white border-bord text-encre'}">${nom}</button>`).join('')}</div>` : '';
  return `<div id="monde" class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">
    <section aria-labelledby="h-monde" class="min-w-0">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 id="h-monde" class="font-serif font-bold text-lg"><span class="capitalize">${esc(MOIS[d.mois - 1])}</span> ${d.annee} <span class="font-sans font-normal text-sm text-doux">· ${esc(etat.joueur.nom)}, ${etat.joueur.role === 'president' ? 'président·e (fictif)' : etat.joueur.role === 'premier_ministre' ? 'Premier ministre (fictif)' : 'député·e'}</span></h2>
        ${bandeauIndicateurs(etat, ctx)}
      </div>
      <div class="flex flex-wrap items-center gap-1.5 mb-2">${modes}<div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Vue de la carte">${modePays ? '' : vues}</div>
        <button type="button" id="bascule-tableau" class="min-h-[36px] px-2.5 rounded-full border border-bord bg-white text-xs font-semibold ml-auto" aria-pressed="${tableau}">${tableau ? 'Afficher la carte' : 'Afficher en tableau'}</button></div>
      ${carte}
      <div class="flex flex-wrap items-center justify-between gap-2">${legendes}<span class="text-[0.65rem] text-doux">${esc(monde.attribution)}</span></div>
    </section>
    <aside class="grid gap-3 min-w-0" aria-label="Panneaux">
      ${panneauCap(etat, ctx, priorites, veille)}
      ${liensEcrans(etat)}
      ${ctx.pays ? `<details id="panneau-pays" class="bg-carte border border-bord rounded-xl" ${ctx.paysSel ? 'open' : ''}>
        <summary class="min-h-[44px] flex items-center justify-between px-3 cursor-pointer font-semibold text-sm">${ctx.paysSel ? `Pays : ${esc(monde.pays.find((p) => p.id === ctx.paysSel)?.nom ?? ctx.paysSel)}` : 'Pays : aucune sélection'}<span class="text-xs text-doux font-normal">${ctx.paysSel ? 'relation et actions' : 'touchez un partenaire'}</span></summary>
        ${panneauPays(etat, ctx, ctx.paysSel)}
      </details>` : ''}
      <details id="panneau-region" class="bg-carte border border-bord rounded-xl" ${sel ? 'open' : ''}>
        <summary class="min-h-[44px] flex items-center justify-between px-3 cursor-pointer font-semibold text-sm">${sel ? `Région : ${esc(ctx.regions.regions.find((r) => r.id === sel)?.nom ?? sel)}` : 'Région : aucune sélection'}<span class="text-xs text-doux font-normal">${sel ? 'fiche et projets' : 'touchez une région'}</span></summary>
        <div class="px-1 pb-1 [&>section]:border-0 [&>section]:shadow-none">${ficheRegion(etat, ctx, sel)}</div>
      </details>
    </aside>
  </div>`;
}

/** Branche la navigation de carte (pure présentation) : déplacement, zoom, sélection, raccourcis clavier, liens. */
export function brancherMonde(racine, dispatch, ctx, priorites = [], etat = null, veille = null) {
  const cadre = racine.querySelector('#cadre-monde');
  const svg = racine.querySelector('#svg-monde');
  const monde = ctx.monde.donnees;
  const ratio = () => (cadre ? cadre.clientWidth / Math.max(1, cadre.clientHeight) : 1.5);
  ctx.monde.ratio = ratio();
  const appliquer = (vb, memoriser = true) => { ctx.monde.cadrage = vb; svg?.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); if (memoriser) ctx.monde.cadrageVu = vb; };
  const zoomer = (facteur, px = null, py = null) => {
    const vb = ctx.monde.cadrage; const w = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, vb.w * facteur));
    // Zoom autour du point (px, py) en fraction du cadre, sinon au centre
    const fx = px ?? 0.5, fy = py ?? 0.5;
    const cx = vb.x + vb.w * fx, cy = vb.y + vb.h * fy;
    const h = w / ratio();
    appliquer({ x: r1(cx - w * fx), y: r1(cy - h * fy), w: r1(w), h: r1(h) });
  };
  if (svg && cadre) {
    // Cadrage recalculé selon le ratio réel du cadre (le viewBox utilise « slice » : la carte remplit toujours le cadre)
    appliquer(cadrer(monde, ctx.monde.cadrage.x + ctx.monde.cadrage.w / 2, ctx.monde.cadrage.y + ctx.monde.cadrage.h / 2, ctx.monde.cadrage.w, ratio()), false);
    // Déplacement à la souris et au tactile (pointer events) ; pincement à deux doigts
    const pointeurs = new Map(); let depart = null, distance0 = null, glisse = false, cible = null, ciblePays = null;
    const echelle = () => ctx.monde.cadrage.w / cadre.clientWidth;
    // La capture du pointeur redirige les événements vers le cadre : la région visée est mémorisée au pointerdown
    cadre.addEventListener('pointerdown', (e) => { if ((e.button !== 0 && e.pointerType === 'mouse') || e.target.closest('button')) return; pointeurs.set(e.pointerId, [e.clientX, e.clientY]); if (pointeurs.size === 1) { depart = { x: e.clientX, y: e.clientY, vb: { ...ctx.monde.cadrage } }; glisse = false; cible = e.target.closest?.('[data-region]')?.dataset.region ?? null; ciblePays = e.target.closest?.('[data-pays]')?.dataset.pays ?? null; } cadre.setPointerCapture?.(e.pointerId); });
    cadre.addEventListener('pointermove', (e) => {
      if (!pointeurs.has(e.pointerId)) return;
      pointeurs.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointeurs.size === 2) {
        const [a, b] = [...pointeurs.values()]; const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (distance0) { const rect = cadre.getBoundingClientRect(); zoomer(distance0 / dist, ((a[0] + b[0]) / 2 - rect.left) / rect.width, ((a[1] + b[1]) / 2 - rect.top) / rect.height); }
        distance0 = dist; glisse = true; return;
      }
      if (!depart) return;
      const dx = (e.clientX - depart.x) * echelle(), dy = (e.clientY - depart.y) * echelle();
      if (Math.abs(e.clientX - depart.x) + Math.abs(e.clientY - depart.y) > 4) glisse = true;
      appliquer({ ...depart.vb, x: r1(depart.vb.x - dx), y: r1(depart.vb.y - dy) }, false);
    });
    const fin = (e, choisir) => { pointeurs.delete(e.pointerId); if (!pointeurs.size) { ctx.monde.cadrageVu = ctx.monde.cadrage; const id = cible, idPays = ciblePays; depart = null; distance0 = null; cible = null; ciblePays = null; if (choisir && !glisse && id) { dispatch({ type: 'region', id }); if (window.innerWidth < 1024) document.getElementById('panneau-region')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); } else if (choisir && !glisse && idPays) { dispatch({ type: 'pays', id: idPays }); if (window.innerWidth < 1024) document.getElementById('panneau-pays')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); } } };
    cadre.addEventListener('pointerup', (e) => fin(e, true)); cadre.addEventListener('pointercancel', (e) => fin(e, false));
    cadre.addEventListener('wheel', (e) => { e.preventDefault(); const rect = cadre.getBoundingClientRect(); zoomer(e.deltaY > 0 ? 1.2 : 1 / 1.2, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height); }, { passive: false });
    cadre.addEventListener('keydown', (e) => {
      if (e.target !== cadre) return;
      const vb = ctx.monde.cadrage, pas = vb.w * 0.1;
      const k = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] }[e.key];
      if (k) { e.preventDefault(); appliquer({ ...vb, x: r1(vb.x + k[0]), y: r1(vb.y + k[1]) }); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomer(1 / 1.3); } else if (e.key === '-') { e.preventDefault(); zoomer(1.3); }
    });
    // Sélection d'une région au clavier (la sélection au pointeur est faite au pointerup, sans glissement)
    racine.querySelectorAll('#cadre-monde [data-region]').forEach((el) => {
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dispatch({ type: 'region', id: el.dataset.region }); } });
    });
    racine.querySelectorAll('#cadre-monde [data-pays]').forEach((el) => {
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dispatch({ type: 'pays', id: el.dataset.pays }); } });
    });
  }
  racine.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => zoomer(b.dataset.zoom === 'in' ? 1 / 1.5 : 1.5)));
  racine.querySelectorAll('[data-cadrage]').forEach((b) => b.addEventListener('click', () => { const c = monde.cadrages[b.dataset.cadrage]; appliquer(cadrer(monde, c.x + c.w / 2, c.y + c.h / 2, c.w, ratio())); }));
  racine.querySelectorAll('[data-vue]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'ui', patch: { vue: b.dataset.vue } })));
  // Mode Partenaires : recadrage sur l'Europe (les partenaires colorés deviennent visibles) ; retour aux territoires : France
  racine.querySelectorAll('[data-mode-monde]').forEach((b) => b.addEventListener('click', () => { const c = monde.cadrages[b.dataset.modeMonde === 'partenaires' ? 'europe' : 'france']; ctx.monde.cadrage = cadrer(monde, c.x + c.w / 2, c.y + c.h / 2, c.w, ratio()); dispatch({ type: 'ui', patch: { modeMonde: b.dataset.modeMonde } }); }));
  racine.querySelectorAll('[data-pays-ligne]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'pays', id: b.dataset.paysLigne })));
  brancherPays(racine, dispatch, ctx);
  racine.querySelector('#bascule-tableau')?.addEventListener('click', () => dispatch({ type: 'ui', patch: { tableauCarte: !ctx.tableauCarte } }));
  racine.querySelectorAll('[data-lancer]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'projet', projetId: b.dataset.lancer, regionId: ctx.region })));
  racine.querySelectorAll('[data-monde-aller]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'onglet', onglet: b.dataset.mondeAller, haut: true, cible: b.dataset.cible })));
  racine.querySelectorAll('#monde [data-veille]').forEach((b) => b.addEventListener('click', () => {
    const p = (veille ?? priorites.filter((x) => x.type === 'territoire'))[Number(b.dataset.veille)];
    if (p?.aller) dispatch({ type: 'onglet', haut: true, ...p.aller });
  }));
  racine.querySelectorAll('#monde [data-prio]').forEach((b) => b.addEventListener('click', () => {
    const p = priorites.filter((x) => x.type === 'urgence')[Number(b.dataset.prio)];
    if (!p) return;
    dispatch({ type: 'onglet', onglet: 'bureau', haut: true, cible: p.aller?.cible ?? 'evenement' });
  }));
}
