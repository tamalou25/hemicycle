// Carte des régions (SVG inline), fiche région, lancement de projets, table accessible.
import { esc, fmt } from '../util.js';
import { raisonRefusProjet, facteurTaille, phraseExplication } from '../../engine/index.js';

export const VUES = [
  { id: 'satisfaction', nom: 'Satisfaction', court: 'satisfaction' },
  { id: 'emploi', nom: 'Emploi', court: 'emploi' },
  { id: 'sante', nom: 'Accès aux soins', court: 'accès aux soins' },
  { id: 'transports', nom: 'Transports', court: 'transports' },
  { id: 'confiance', nom: 'Confiance', court: 'confiance envers le gouvernement' },
];

/** Valeur d'une région pour une vue : la confiance vient de etat.confianceRegions, le reste des territoires. */
export const valeurRegion = (etat, id, vue) => (vue === 'confiance' ? etat.confianceRegions?.[id] : etat.territoires?.[id]?.[vue]);
// 5 classes séquentielles ivoire → bleu nuit (lisibles aussi en niveaux de gris)
export const COULEURS = ['#E8ECF3', '#B9C9E6', '#7F9FD6', '#3F66B8', '#111C33'];
const BORNES = ['0 à 19', '20 à 39', '40 à 59', '60 à 79', '80 à 100'];
export const classe = (v) => Math.max(0, Math.min(4, Math.floor((v ?? 0) / 20)));
const LIB_INDICE = { emploi: 'Emploi', sante: 'Accès aux soins', transports: 'Transports' };
const nf = (n) => Number(n).toLocaleString('fr-FR');

const VUE_LEGIS = { id: 'legislatives', nom: 'Législatives', court: 'législatives' };
// Motifs superposés à la couleur du parti (lisibles sans la couleur)
const MOTIFS = [null, 'diag', 'points', 'croix', 'horiz', 'vert'];

/** Dernier résultat de législatives détaillé par région, ou null. */
export const legislativesRegions = (etat) => [...(etat?.resultatsElections ?? [])].reverse().find((r) => r.type === 'legislatives' && r.parRegion) ?? null;
export const vuesDisponibles = (etat) => (legislativesRegions(etat) ? [...VUES, VUE_LEGIS] : VUES);
export const vueValide = (v, etat) => (vuesDisponibles(etat).some((x) => x.id === v) ? v : 'satisfaction');

/** Parti arrivé en tête en sièges dans une région (égalité : ordre alphabétique, déterministe). */
const enTete = (sieges) => Object.entries(sieges ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? null;
function partiDe(ctx, id) { return ctx.partis.find((p) => p.id === id) ?? { id, sigle: id, nom: id, couleur: '#8A94A6' }; }
function motifsLegis(res, ctx) {
  const ids = [...new Set(Object.values(res.parRegion).map((s) => enTete(s)?.[0]).filter(Boolean))].sort();
  return ids.map((id, i) => ({ p: partiDe(ctx, id), motif: MOTIFS[i % MOTIFS.length], i }));
}
const defMotif = (m, id) => ({
  diag: `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="8" fill="#fff" fill-opacity=".55"/></pattern>`,
  points: `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6" fill="#fff" fill-opacity=".7"/></pattern>`,
  croix: `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0L8 8M8 0L0 8" stroke="#fff" stroke-opacity=".6" stroke-width="1.2"/></pattern>`,
  horiz: `<pattern id="${id}" width="8" height="6" patternUnits="userSpaceOnUse"><rect width="8" height="2" fill="#fff" fill-opacity=".55"/></pattern>`,
  vert: `<pattern id="${id}" width="6" height="8" patternUnits="userSpaceOnUse"><rect width="2" height="8" fill="#fff" fill-opacity=".55"/></pattern>`,
}[m] ?? '');

export function badgeSimulation() {
  return '<span class="inline-block text-xs font-bold uppercase border-2 border-encre bg-[#FFF4D6] rounded px-2 py-0.5 ml-2 align-middle">Simulation</span>';
}

export function legendeLegis(res, ctx) {
  return `<ul class="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-2" aria-label="Légende : parti en tête en sièges">${motifsLegis(res, ctx).map(({ p, motif, i }) =>
    `<li class="flex items-center gap-1"><svg width="16" height="16" class="border border-encre" aria-hidden="true"><defs>${defMotif(motif, `lg-${i}`)}</defs><rect width="16" height="16" fill="${esc(p.couleur)}"/>${motif ? `<rect width="16" height="16" fill="url(#lg-${i})"/>` : ''}</svg>${esc(p.sigle)}</li>`).join('')}</ul>`;
}

function svgLegislatives(etat, ctx, res, selection) {
  const { carte, regions } = ctx;
  const noms = Object.fromEntries(regions.regions.map((r) => [r.id, r.nom]));
  const motifs = motifsLegis(res, ctx);
  const chemin = (r) => {
    const t = enTete(res.parRegion[r.id]);
    const m = motifs.find((x) => x.p.id === t?.[0]);
    const sel = r.id === selection;
    const lib = t ? `${partiDe(ctx, t[0]).sigle} en tête, ${t[1]} sièges` : 'pas de résultat';
    return `<path id="reg-${esc(r.id)}" d="${esc(r.d)}" fill="${esc(m?.p.couleur ?? '#E3E8F0')}" stroke="${sel ? '#9A6700' : '#FFFFFF'}" stroke-width="${sel ? 4 : 0.8}" stroke-linejoin="round"
      tabindex="0" role="button" aria-pressed="${sel}" data-region="${esc(r.id)}" aria-label="${esc(noms[r.id] ?? r.nom)}, législatives : ${esc(lib)}"><title>${esc(noms[r.id] ?? r.nom)} : ${esc(lib)}</title></path>
      ${m?.motif ? `<path d="${esc(r.d)}" fill="url(#lg-${m.i})" stroke="none" pointer-events="none" aria-hidden="true"/>` : ''}`;
  };
  const ordre = [...carte.regions.filter((r) => r.id !== selection), ...carte.regions.filter((r) => r.id === selection)];
  return `<svg viewBox="${esc(carte.viewBox)}" class="w-full h-auto max-h-[70vh]" role="group" aria-label="Carte des régions de France, parti en tête aux législatives simulées">
    <defs>${motifs.map(({ motif, i }) => defMotif(motif, `lg-${i}`)).join('')}</defs>
    ${(carte.encarts ?? []).map((e) => `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="none" stroke="#9A6700" stroke-width="1" aria-hidden="true"/>`).join('')}
    ${ordre.map(chemin).join('')}</svg>`;
}

function tableLegislatives(res, ctx) {
  const lignes = ctx.regions.regions.map((r) => {
    const s = res.parRegion[r.id] ?? {};
    const tri = Object.entries(s).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return `<tr class="border-b border-bord"><th scope="row" class="text-left py-1 pr-2 font-semibold">${esc(r.nom)}</th>
      <td class="py-1 pr-2">${esc(tri[0] ? partiDe(ctx, tri[0][0]).sigle : '—')}</td>
      <td class="py-1 text-xs">${esc(tri.map(([id, v]) => `${partiDe(ctx, id).sigle} ${v}`).join(', '))}</td></tr>`;
  }).join('');
  return `<div class="overflow-x-auto"><table class="w-full text-sm"><caption class="text-left text-doux text-xs mb-1">Législatives simulées : sièges par région</caption>
    <thead><tr class="border-b-2 border-encre text-left"><th scope="col" class="py-1 pr-2">Région</th><th scope="col" class="pr-2">En tête</th><th scope="col">Sièges</th></tr></thead><tbody>${lignes}</tbody></table></div>`;
}

function siegesRegion(res, ctx, r) {
  const s = Object.entries(res.parRegion[r.id] ?? {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!s.length) return '';
  const total = s.reduce((t, [, v]) => t + v, 0);
  return `<h3 class="font-serif font-bold text-lg mt-3">Législatives simulées${badgeSimulation()}</h3>
    <div class="h-3 flex rounded overflow-hidden mt-1 bg-[#E3E8F0]" aria-hidden="true">${s.map(([id, v]) => `<div style="width:${(v / total) * 100}%;background:${esc(partiDe(ctx, id).couleur)}"></div>`).join('')}</div>
    <ul class="text-sm mt-1">${s.map(([id, v]) => `<li class="flex justify-between gap-2 py-0.5 border-b border-bord last:border-0"><span><span class="inline-block w-3 h-3 rounded-sm align-middle mr-1" style="background:${esc(partiDe(ctx, id).couleur)}" aria-hidden="true"></span>${esc(partiDe(ctx, id).sigle)}</span><span class="tabular-nums font-semibold">${v} sièges</span></li>`).join('')}</ul>`;
}

export function legende() {
  return `<ul class="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-2" aria-label="Légende : valeur de 0 à 100">${COULEURS.map((c, i) =>
    `<li class="flex items-center gap-1"><span class="inline-block w-4 h-4 border border-encre" style="background:${c}" aria-hidden="true"></span>${BORNES[i]}</li>`).join('')}</ul>`;
}

export function svgCarte(etat, ctx, vue, selection) {
  if (vue === 'legislatives') { const res = legislativesRegions(etat); if (res) return svgLegislatives(etat, ctx, res, selection); }
  const { carte, regions } = ctx;
  const noms = Object.fromEntries(regions.regions.map((r) => [r.id, r.nom]));
  const v = VUES.find((x) => x.id === vue);
  const chemin = (r) => {
    const val = valeurRegion(etat, r.id, vue);
    const sel = r.id === selection;
    return `<path id="reg-${esc(r.id)}" d="${esc(r.d)}" fill="${COULEURS[classe(val)]}" stroke="${sel ? '#9A6700' : '#FFFFFF'}" stroke-width="${sel ? 4 : 0.8}" stroke-linejoin="round"
      tabindex="0" role="button" aria-pressed="${sel}" data-region="${esc(r.id)}" aria-label="${esc(noms[r.id] ?? r.nom)}, ${esc(v.court)} ${Math.round(val ?? 0)} sur 100"><title>${esc(noms[r.id] ?? r.nom)} : ${Math.round(val ?? 0)}</title></path>`;
  };
  const tous = carte.regions;
  const ordre = [...tous.filter((r) => r.id !== selection), ...tous.filter((r) => r.id === selection)];
  return `<svg viewBox="${esc(carte.viewBox)}" class="w-full h-auto max-h-[70vh]" role="group" aria-label="Carte des régions de France, vue ${esc(v.court)}">
    ${(carte.encarts ?? []).map((e) => `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="none" stroke="#9A6700" stroke-width="1" aria-hidden="true"/>`).join('')}
    ${ordre.map(chemin).join('')}</svg>`;
}

export function tableAccessible(etat, ctx) {
  const lignes = ctx.regions.regions.map((r) => {
    const t = etat.territoires?.[r.id] ?? {};
    return `<tr class="border-b border-bord"><th scope="row" class="text-left py-1 pr-2 font-semibold">${esc(r.nom)}</th>
      <td class="py-1 pr-2 tabular-nums">${nf(r.population)}</td>
      <td class="py-1 pr-2 tabular-nums">${fmt(t.emploi, 0)}</td><td class="py-1 pr-2 tabular-nums">${fmt(t.sante, 0)}</td><td class="py-1 pr-2 tabular-nums">${fmt(t.transports, 0)}</td>
      <td class="py-1 pr-2 tabular-nums font-semibold">${fmt(t.satisfaction, 0)}</td><td class="py-1 tabular-nums">${fmt(etat.confianceRegions?.[r.id], 0)}</td></tr>`;
  }).join('');
  return `<div class="overflow-x-auto"><table class="w-full text-sm"><caption class="text-left text-doux text-xs mb-1">Indices de jeu de 0 à 100, par région</caption>
    <thead><tr class="border-b-2 border-encre text-left"><th scope="col" class="py-1 pr-2">Région</th><th scope="col" class="pr-2">Population</th><th scope="col" class="pr-2">Emploi</th><th scope="col" class="pr-2">Soins</th><th scope="col" class="pr-2">Transp.</th><th scope="col" class="pr-2">Satisf.</th><th scope="col">Confiance</th></tr></thead>
    <tbody>${lignes}</tbody></table></div>`;
}

const barre = (label, v, gras = false) => `<div class="mb-2"><div class="flex justify-between text-sm"><span class="${gras ? 'font-bold' : ''}">${esc(label)}</span><span class="font-semibold tabular-nums">${fmt(v, 0)}<span class="text-doux font-normal">/100</span></span></div>
  <div class="h-2.5 bg-[#E3E8F0] rounded" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v ?? 0)}"><div class="h-2.5 rounded bg-encre" style="width:${Math.max(0, Math.min(100, v ?? 0))}%"></div></div></div>`;

export function statutProjet(p, etat, def) {
  if (p.statut === 'chantier') { const n = Math.max(0, p.service - etat.tour); return `Chantier : mise en service dans ${n} mois${p.retard ? ` (dont ${p.retard} mois de retard)` : ''}`; }
  if (p.statut === 'montee') return `Montée en charge (mois ${Math.min(def.montee_mois, etat.tour - p.service + 1)} sur ${def.montee_mois})`;
  return 'En service';
}

function projetsRegion(etat, ctx, r) {
  const liste = (etat.projets ?? []).filter((p) => p.region === r.id);
  if (!liste.length) return '<p class="text-sm text-doux">Aucun projet lancé dans cette région.</p>';
  return `<ul class="text-sm">${liste.map((p) => {
    const def = ctx.projets.projets.find((x) => x.id === p.projetId);
    return `<li class="py-1 border-b border-bord last:border-0"><strong>${esc(def?.titre ?? p.projetId)}</strong> · ${esc(def ? statutProjet(p, etat, def) : p.statut)}
      ${p.alea ? `<br><span class="text-bordeaux">Aléa : ${esc(p.alea)}${p.retard ? '' : ' (effet réduit)'}.</span>` : ''}</li>`;
  }).join('')}</ul>`;
}

function lancement(etat, ctx, r) {
  const fac = facteurTaille(r.population);
  return `<ul class="grid gap-3">${ctx.projets.projets.map((p) => {
    const refus = raisonRefusProjet(etat, p, r);
    const effets = Object.entries(p.effets).map(([i, v]) => `+${Math.round(v * fac)} ${(LIB_INDICE[i] ?? i).toLowerCase()}`).join(', ');
    const nat = (p.effets_nationaux ?? []).map((e) => `chômage national ${e.valeur > 0 ? '+' : '−'}${fmt(Math.abs(e.valeur), 2)} pt`).join(', ');
    return `<li class="border border-bord rounded-lg p-3 bg-white">
      <h4 class="font-semibold">${esc(p.titre)}</h4>
      <p class="text-sm text-doux">${esc(p.description)}</p>
      <dl class="text-sm mt-1 grid grid-cols-[auto_1fr] gap-x-2">
        <dt class="text-doux">Coût</dt><dd>${fmt(p.cout_md, 2)} Md€ puis ${fmt(p.cout_annuel_md, 2)} Md€/an</dd>
        <dt class="text-doux">Délai</dt><dd>${p.delai_mois} mois, puis montée en charge sur ${p.montee_mois} mois</dd>
        <dt class="text-doux">Effet attendu</dt><dd>${esc(effets)}${nat ? ` ; ${esc(nat)}` : ''}</dd>
        <dt class="text-doux">Bénéficiaires</dt><dd>${esc(p.beneficiaires)}</dd>
        <dt class="text-doux">Risque</dt><dd>${esc(p.risque.texte)} (${Math.round(p.risque.proba * 100)} % de probabilité)</dd></dl>
      <button type="button" id="lancer-${esc(p.id)}" class="btn btn-p mt-2" data-lancer="${esc(p.id)}" ${refus ? `disabled aria-describedby="rf-${esc(p.id)}"` : ''}>Lancer</button>
      ${refus ? `<p id="rf-${esc(p.id)}" class="text-xs text-doux mt-1">${esc(refus)}</p>` : ''}
    </li>`;
  }).join('')}</ul>`;
}

export function ficheRegion(etat, ctx, regionId) {
  const r = ctx.regions.regions.find((x) => x.id === regionId);
  if (!r) return '<section class="bg-carte border border-bord rounded-lg p-4 filet-laiton" aria-label="Fiche région"><p class="text-doux">Sélectionnez une région sur la carte pour voir sa fiche et lancer des projets.</p></section>';
  const t = etat.territoires?.[r.id] ?? {};
  const donnees = { lois: ctx.lois, evenements: ctx.evenements, regions: ctx.regions, projets: ctx.projets, politiques: ctx.politiques, partis: ctx.partis };
  const expl = (etat.explications ?? []).filter((e) => e.region === r.id && e.tour === etat.tour);
  return `<section id="fiche" aria-labelledby="h-fiche" class="bg-carte border border-bord rounded-lg p-4 filet-laiton">
    <h2 id="h-fiche" class="font-serif font-bold text-2xl">${esc(r.nom)}</h2>
    <p class="text-sm text-doux">Population : ${nf(r.population)} habitants (Insee, 2026)<br>
    ${r.chomage != null ? `Chômage observé : ${fmt(r.chomage)} % (Insee, T2 2026)` : 'Chômage observé : non disponible (Insee)'}</p>
    <div class="mt-3">${barre('Satisfaction', t.satisfaction, true)}${etat.confianceRegions ? barre('Confiance envers le gouvernement', etat.confianceRegions[r.id]) : ''}${barre('Emploi', t.emploi)}${barre('Accès aux soins', t.sante)}${barre('Transports', t.transports)}</div>
    <p class="text-xs text-doux mt-1">La satisfaction mesure la situation vécue ; la confiance, le jugement sur le gouvernement : c'est elle qui pèse aux législatives.</p>
    ${legislativesRegions(etat) && ctx.vue === 'legislatives' ? siegesRegion(legislativesRegions(etat), ctx, r) : ''}
    <h3 class="font-serif font-bold text-lg mt-3">Projets de la région</h3>${projetsRegion(etat, ctx, r)}
    <h3 class="font-serif font-bold text-lg mt-3">Ce qui a changé ce mois-ci</h3>
    ${expl.length ? `<ul class="text-sm">${expl.map((e) => `<li class="py-1 border-b border-bord last:border-0">${esc(phraseExplication(e, donnees))}</li>`).join('')}</ul>` : '<p class="text-sm text-doux">Aucune variation attribuée ce mois-ci.</p>'}
    <h3 class="font-serif font-bold text-lg mt-4">Lancer un projet</h3>
    <p class="text-sm text-doux mb-2">Enveloppe disponible : ${fmt(etat.finances?.enveloppe ?? 0, 2)} Md€.</p>
    ${lancement(etat, ctx, r)}
  </section>`;
}

export function ongletCarte(etat, ctx) {
  const vue = vueValide(ctx.vue, etat);
  const legis = vue === 'legislatives' ? legislativesRegions(etat) : null;
  const sel = ctx.region ?? null;
  const tableau = !!ctx.tableauCarte;
  return `<div class="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] gap-4 items-start">
    <section aria-labelledby="h-carte" class="min-w-0">
      <h2 id="h-carte" class="font-serif font-bold text-xl mb-2">Carte des territoires</h2>
      <div role="group" aria-label="Vue de la carte" class="flex flex-wrap gap-2 mb-2">${vuesDisponibles(etat).map((x) => `<button type="button" id="vue-${x.id}" data-vue="${x.id}" aria-pressed="${x.id === vue}" class="btn ${x.id === vue ? 'btn-p' : 'btn-s'} text-sm">${x.nom}</button>`).join('')}</div>
      ${legis ? `<p class="text-sm mb-2">Parti arrivé en tête en sièges dans chaque région${badgeSimulation()}</p>` : ''}
      ${tableau ? (legis ? tableLegislatives(legis, ctx) : tableAccessible(etat, ctx)) : `<div class="bg-carte border border-bord rounded-lg p-2">${svgCarte(etat, ctx, vue, sel)}</div>${legis ? legendeLegis(legis, ctx) : legende()}`}
      <button type="button" id="bascule-tableau" class="btn btn-s text-sm mt-2" aria-pressed="${tableau}">${tableau ? 'Afficher la carte' : 'Afficher en tableau'}</button>
      <p class="text-xs text-doux mt-2">${esc(ctx.carte.attribution)}</p>
    </section>
    ${ficheRegion(etat, ctx, sel)}
  </div>`;
}

export function brancherCarte(racine, dispatch) {
  racine.querySelectorAll('[data-vue]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'ui', patch: { vue: b.dataset.vue } })));
  racine.querySelector('#bascule-tableau')?.addEventListener('click', () => dispatch({ type: 'ui', patch: { tableauCarte: !racine.querySelector('table') } }));
  racine.querySelectorAll('[data-region]').forEach((el) => {
    const choisir = () => dispatch({ type: 'region', id: el.dataset.region });
    el.addEventListener('click', choisir);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choisir(); } });
  });
  racine.querySelectorAll('[data-lancer]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'projet', projetId: b.dataset.lancer, regionId: racine.querySelector('[data-region][aria-pressed="true"]')?.dataset.region })));
}
