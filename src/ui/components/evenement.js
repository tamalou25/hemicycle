// Carte d'événement mensuel : titre, thème, description et un bouton par choix.
import { esc, fmt } from '../util.js';

const LIB = { chomage: 'Chômage', croissance: 'Croissance', deficit: 'Déficit', inflation: 'Inflation', popularite: 'Popularité', tensions: 'Tensions', dette: 'Dette' };
// sens : +1 si une hausse est favorable
const BON = { chomage: -1, croissance: 1, deficit: -1, inflation: -1, popularite: 1, tensions: -1, dette: -1 };
const THEMES_EV = { social: 'Social', international: 'International', climat: 'Climat', sante: 'Santé', securite: 'Sécurité', scandale: 'Scandale', insolite: 'Insolite', europe: 'Europe', economie: 'Économie' };

import { raisonRefusChoix } from '../../engine/index.js';

const LIB_REGION = { emploi: 'Emploi', sante: 'Accès aux soins', transports: 'Transports', confiance: 'Confiance' };

/** Pastille compacte d'effet : flèche + libellé + valeur + délai, couleur ET texte (« favorable » lisible sans couleur). */
function pastille(libelle, valeur, favorable, detail = '') {
  return `<li class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs ${favorable ? 'border-[#157A48] text-[#157A48]' : 'border-rouge text-rouge'}">
    <span aria-hidden="true">${valeur >= 0 ? '↑' : '↓'}</span><span class="font-semibold">${esc(libelle)}</span>
    ${valeur >= 0 ? '+' : '−'}${fmt(Math.abs(valeur), 1)}${detail ? ` <span class="text-doux">${esc(detail)}</span>` : ''}
    <span class="sr-only">${favorable ? '(favorable)' : '(défavorable)'}</span></li>`;
}
const apercu = (e) => pastille(LIB[e.indicateur] ?? e.indicateur, e.valeur, (BON[e.indicateur] ?? 1) * Math.sign(e.valeur) > 0, e.delaiMois > 0 ? `dans ${e.delaiMois} mois` : '');
const apercuLocal = (e, nom) => pastille(`${LIB_REGION[e.indice] ?? e.indice} (${nom})`, e.valeur, e.valeur > 0, 'immédiat');

export function sectionEvenement(etat, ctx) {
  if (!etat.evenement) return '';
  const ev = (ctx.evenements ?? []).find((e) => e.id === etat.evenement);
  if (!ev) return '';
  const region = etat.evenementRegion ? ctx.regions?.regions?.find((r) => r.id === etat.evenementRegion) : null;
  const choix = ev.choix.map((c, i) => {
    const refus = raisonRefusChoix(etat, c);
    const couts = [`${c.cout_capital ?? 0} capital`, c.cout_md ? `${fmt(c.cout_md, 2)} Md€` : ''].filter(Boolean).join(' · ');
    const effets = [...(c.effets ?? []).map(apercu), ...(region ? (c.effets_region ?? []).map((e) => apercuLocal(e, region.nom)) : [])].join('');
    return `<li><button type="button" data-evenement="${i}" ${refus ? `disabled aria-describedby="ev-refus-${i}"` : ''}
      class="btn btn-s w-full !text-left !items-start flex-col gap-0.5 py-1.5 disabled:opacity-60 disabled:cursor-not-allowed">
      <span class="font-semibold leading-snug">${esc(c.libelle)} <span class="font-normal text-doux text-sm">· ${esc(couts)}</span></span>
      ${effets ? `<ul class="flex flex-wrap gap-1">${effets}</ul>` : ''}
      ${refus ? `<span id="ev-refus-${i}" class="text-xs text-rouge">${esc(refus)}</span>` : ''}
    </button></li>`;
  }).join('');
  const lienCarte = region ? `<button type="button" class="underline text-bleu text-sm min-h-[44px]" data-ev-carte="${esc(region.id)}" data-ev-indice="${esc(ev.region_cible?.indice ?? 'satisfaction')}">Voir ${esc(region.nom)} sur la carte</button>` : '';
  return `<section role="alert" aria-labelledby="h-ev" class="mb-4 bg-[#FFF4D6] border-2 border-encre rounded-lg p-3 sm:p-4">
    <p class="text-xs font-bold uppercase tracking-wide">Événement · ${esc(THEMES_EV[ev.theme] ?? ev.theme)}${region ? ` · ${esc(region.nom)}` : ''}</p>
    <h2 id="h-ev" class="font-serif font-bold text-xl sm:text-2xl leading-tight">${esc(ev.titre)}</h2>
    <p class="mt-0.5 text-sm sm:text-base leading-snug">${esc(ev.description)}</p>${lienCarte}
    <ul class="mt-1.5 grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">${choix}</ul>
    <p class="mt-1.5 text-xs">Sans réponse, la dernière option s'applique à la fin du mois.</p>
  </section>`;
}

export function brancherEvenement(racine, dispatch) {
  racine.querySelectorAll('[data-evenement]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'evenement', index: Number(b.dataset.evenement) })));
  racine.querySelectorAll('[data-ev-carte]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'onglet', onglet: 'carte', region: b.dataset.evCarte, vue: b.dataset.evIndice, haut: true })));
}
