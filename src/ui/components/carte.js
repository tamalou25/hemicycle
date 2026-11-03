// Carte des régions (SVG inline), fiche région, lancement de projets, table accessible.
import { esc, fmt } from '../util.js';
import { raisonRefusProjet, facteurTaille, phraseExplication } from '../../engine/index.js';

export const VUES = [
  { id: 'satisfaction', nom: 'Satisfaction', court: 'satisfaction' },
  { id: 'emploi', nom: 'Emploi', court: 'emploi' },
  { id: 'sante', nom: 'Accès aux soins', court: 'accès aux soins' },
  { id: 'transports', nom: 'Transports', court: 'transports' },
];
// 5 classes séquentielles ivoire → bleu nuit (lisibles aussi en niveaux de gris)
const COULEURS = ['#F3ECD3', '#C9D6E8', '#8DAAD2', '#4C74AE', '#14213D'];
const BORNES = ['0 à 19', '20 à 39', '40 à 59', '60 à 79', '80 à 100'];
const classe = (v) => Math.max(0, Math.min(4, Math.floor((v ?? 0) / 20)));
const LIB_INDICE = { emploi: 'Emploi', sante: 'Accès aux soins', transports: 'Transports' };
const nf = (n) => Number(n).toLocaleString('fr-FR');

export const vueValide = (v) => (VUES.some((x) => x.id === v) ? v : 'satisfaction');

export function legende() {
  return `<ul class="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-2" aria-label="Légende : valeur de 0 à 100">${COULEURS.map((c, i) =>
    `<li class="flex items-center gap-1"><span class="inline-block w-4 h-4 border border-encre" style="background:${c}" aria-hidden="true"></span>${BORNES[i]}</li>`).join('')}</ul>`;
}

export function svgCarte(etat, ctx, vue, selection) {
  const { carte, regions } = ctx;
  const noms = Object.fromEntries(regions.regions.map((r) => [r.id, r.nom]));
  const v = VUES.find((x) => x.id === vue);
  const chemin = (r) => {
    const val = etat.territoires?.[r.id]?.[vue];
    const sel = r.id === selection;
    return `<path id="reg-${esc(r.id)}" d="${esc(r.d)}" fill="${COULEURS[classe(val)]}" stroke="${sel ? '#8A6A1F' : '#FFFDF7'}" stroke-width="${sel ? 4 : 0.8}" stroke-linejoin="round"
      tabindex="0" role="button" aria-pressed="${sel}" data-region="${esc(r.id)}" aria-label="${esc(noms[r.id] ?? r.nom)}, ${esc(v.court)} ${Math.round(val ?? 0)} sur 100"><title>${esc(noms[r.id] ?? r.nom)} : ${Math.round(val ?? 0)}</title></path>`;
  };
  const tous = carte.regions;
  const ordre = [...tous.filter((r) => r.id !== selection), ...tous.filter((r) => r.id === selection)];
  return `<svg viewBox="${esc(carte.viewBox)}" class="w-full h-auto max-h-[70vh]" role="group" aria-label="Carte des régions de France, vue ${esc(v.court)}">
    ${(carte.encarts ?? []).map((e) => `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="none" stroke="#8A6A1F" stroke-width="1" aria-hidden="true"/>`).join('')}
    ${ordre.map(chemin).join('')}</svg>`;
}

function tableAccessible(etat, ctx) {
  const lignes = ctx.regions.regions.map((r) => {
    const t = etat.territoires?.[r.id] ?? {};
    return `<tr class="border-b border-bord"><th scope="row" class="text-left py-1 pr-2 font-semibold">${esc(r.nom)}</th>
      <td class="py-1 pr-2 tabular-nums">${nf(r.population)}</td>
      <td class="py-1 pr-2 tabular-nums">${fmt(t.emploi, 0)}</td><td class="py-1 pr-2 tabular-nums">${fmt(t.sante, 0)}</td><td class="py-1 pr-2 tabular-nums">${fmt(t.transports, 0)}</td>
      <td class="py-1 tabular-nums font-semibold">${fmt(t.satisfaction, 0)}</td></tr>`;
  }).join('');
  return `<div class="overflow-x-auto"><table class="w-full text-sm"><caption class="text-left text-doux text-xs mb-1">Indices de jeu de 0 à 100, par région</caption>
    <thead><tr class="border-b-2 border-encre text-left"><th scope="col" class="py-1 pr-2">Région</th><th scope="col" class="pr-2">Population</th><th scope="col" class="pr-2">Emploi</th><th scope="col" class="pr-2">Soins</th><th scope="col" class="pr-2">Transp.</th><th scope="col">Satisf.</th></tr></thead>
    <tbody>${lignes}</tbody></table></div>`;
}

const barre = (label, v, gras = false) => `<div class="mb-2"><div class="flex justify-between text-sm"><span class="${gras ? 'font-bold' : ''}">${esc(label)}</span><span class="font-semibold tabular-nums">${fmt(v, 0)}<span class="text-doux font-normal">/100</span></span></div>
  <div class="h-2.5 bg-[#E8E1CD] rounded" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v ?? 0)}"><div class="h-2.5 rounded bg-encre" style="width:${Math.max(0, Math.min(100, v ?? 0))}%"></div></div></div>`;

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
  const donnees = { lois: ctx.lois, evenements: ctx.evenements, regions: ctx.regions, projets: ctx.projets };
  const expl = (etat.explications ?? []).filter((e) => e.region === r.id && e.tour === etat.tour);
  return `<section id="fiche" aria-labelledby="h-fiche" class="bg-carte border border-bord rounded-lg p-4 filet-laiton">
    <h2 id="h-fiche" class="font-serif font-bold text-2xl">${esc(r.nom)}</h2>
    <p class="text-sm text-doux">Population : ${nf(r.population)} habitants (Insee, 2026)<br>
    ${r.chomage != null ? `Chômage observé : ${fmt(r.chomage)} % (Insee, T2 2026)` : 'Chômage observé : non disponible (Insee)'}</p>
    <div class="mt-3">${barre('Satisfaction', t.satisfaction, true)}${barre('Emploi', t.emploi)}${barre('Accès aux soins', t.sante)}${barre('Transports', t.transports)}</div>
    <h3 class="font-serif font-bold text-lg mt-3">Projets de la région</h3>${projetsRegion(etat, ctx, r)}
    <h3 class="font-serif font-bold text-lg mt-3">Ce qui a changé ce mois-ci</h3>
    ${expl.length ? `<ul class="text-sm">${expl.map((e) => `<li class="py-1 border-b border-bord last:border-0">${esc(phraseExplication(e, donnees))}</li>`).join('')}</ul>` : '<p class="text-sm text-doux">Aucune variation attribuée ce mois-ci.</p>'}
    <h3 class="font-serif font-bold text-lg mt-4">Lancer un projet</h3>
    <p class="text-sm text-doux mb-2">Enveloppe disponible : ${fmt(etat.finances?.enveloppe ?? 0, 2)} Md€.</p>
    ${lancement(etat, ctx, r)}
  </section>`;
}

export function ongletCarte(etat, ctx) {
  const vue = vueValide(ctx.vue);
  const sel = ctx.region ?? null;
  const tableau = !!ctx.tableauCarte;
  return `<div class="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] gap-4 items-start">
    <section aria-labelledby="h-carte" class="min-w-0">
      <h2 id="h-carte" class="font-serif font-bold text-xl mb-2">Carte des territoires</h2>
      <div role="group" aria-label="Vue de la carte" class="flex flex-wrap gap-2 mb-2">${VUES.map((x) => `<button type="button" id="vue-${x.id}" data-vue="${x.id}" aria-pressed="${x.id === vue}" class="btn ${x.id === vue ? 'btn-p' : 'btn-s'} text-sm">${x.nom}</button>`).join('')}</div>
      ${tableau ? tableAccessible(etat, ctx) : `<div class="bg-carte border border-bord rounded-lg p-2">${svgCarte(etat, ctx, vue, sel)}</div>${legende()}`}
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
