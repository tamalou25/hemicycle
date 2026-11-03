// Navigation du tableau de bord : barre du bas (mobile), panneau « Plus », barre d'action fixe.
import { esc, MOIS } from '../util.js';

export const ONGLETS_PRINCIPAUX = [['bureau', 'Bureau'], ['decisions', 'Décisions'], ['carte', 'Carte'], ['budget', 'Budget']];
export const ONGLETS_PLUS = [['opinion', 'Opinion'], ['parlement', 'Parlement'], ['chronologie', 'Chronologie']];
export const ONGLETS = [...ONGLETS_PRINCIPAUX, ...ONGLETS_PLUS];

const ICONES = {
  bureau: '<path d="M3 10l9-6 9 6v10H3z"/><path d="M9 20v-6h6v6"/>',
  decisions: '<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  carte: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  budget: '<circle cx="12" cy="12" r="8"/><path d="M15 9.5a3.5 3 0 0 0-3-1.5c-2 0-3 1.5-3 4s1 4 3 4a3.5 3 0 0 0 3-1.5M7.5 11h6M7.5 13.5h6"/>',
  plus: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
};
const icone = (id) => `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONES[id]}</svg>`;

/** Onglets du haut (ordinateur). */
export function barreOnglets(actif) {
  return `<div class="hidden sm:block overflow-x-auto -mx-4 px-4 mb-3 border-b-2 border-encre" id="barre-onglets">
    <div role="tablist" aria-label="Sections du tableau de bord" class="flex gap-1 min-w-max">${ONGLETS.map(([id, nom]) =>
      `<button type="button" role="tab" id="tab-${id}" data-onglet="${id}" aria-selected="${id === actif}" aria-controls="panneau" tabindex="${id === actif ? 0 : -1}"
        class="min-h-[44px] px-4 font-serif font-bold text-base whitespace-nowrap border-x border-t rounded-t-md ${id === actif ? 'bg-carte border-encre border-b-0 text-bordeaux -mb-0.5 pb-0.5 shadow-[inset_0_3px_0_#8A6A1F]' : 'bg-[#EFE9D6] border-bord text-encre'}">${nom}</button>`).join('')}</div></div>`;
}

const pastilleEvenement = '<span class="inline-flex items-center gap-1 text-xs font-bold border border-encre bg-[#FFF3C4] rounded-full px-2 py-0.5"><span aria-hidden="true">!</span>Événement à traiter</span>';

/** En-tête collant (ordinateur) : date et « Mois suivant ». */
export function enteteCollant(etat, d) {
  return `<div class="hidden sm:flex items-center justify-between gap-3 py-2">
    <p class="font-serif font-bold text-lg"><span class="capitalize">${esc(MOIS[d.mois - 1])}</span> ${d.annee} <span class="font-sans font-normal text-doux text-sm">· mois ${etat.tour} sur 60</span></p>
    <span class="flex items-center gap-3">${etat.evenement ? pastilleEvenement : ''}<button type="button" id="suivant" class="btn btn-p">Mois suivant</button></span></div>`;
}

/** Mobile : barre d'action fixe (date + Mois suivant) et barre de navigation du bas. */
export function navigationMobile(etat, d, actif) {
  const dansPlus = ONGLETS_PLUS.some(([id]) => id === actif);
  const entree = ([id, nom]) => `<li><button type="button" data-nav="${id}" ${id === actif ? 'aria-current="page"' : ''} class="nav-item">${icone(id)}<span>${nom}</span></button></li>`;
  return `<div id="nav-mobile" class="sm:hidden">
    <div class="barre-action" role="region" aria-label="Mois en cours">
      <p class="min-w-0 leading-tight"><span class="block font-serif font-bold capitalize truncate">${esc(MOIS[d.mois - 1])} ${d.annee}</span><span class="block text-xs text-doux">mois ${etat.tour} sur 60</span></p>
      <span class="flex items-center gap-2">${etat.evenement ? '<span class="inline-flex items-center gap-1 text-xs font-bold border border-encre bg-[#FFF3C4] rounded-full px-2 py-1"><span aria-hidden="true">!</span>Événement</span>' : ''}<button type="button" id="suivant-mobile" class="btn btn-p">Mois suivant</button></span>
    </div>
    <button type="button" id="nav-scrim" class="nav-scrim" tabindex="-1" aria-hidden="true" hidden></button>
    <div id="panneau-plus" class="panneau-plus" role="group" aria-label="Autres sections" hidden>
      <ul>${ONGLETS_PLUS.map(([id, nom]) => `<li><button type="button" data-nav="${id}" ${id === actif ? 'aria-current="page"' : ''} class="plus-item">${nom}</button></li>`).join('')}</ul>
    </div>
    <nav aria-label="Sections principales" class="barre-nav"><ul class="grid grid-cols-5">
      ${ONGLETS_PRINCIPAUX.map(entree).join('')}
      <li><button type="button" id="nav-plus" aria-expanded="false" aria-controls="panneau-plus" ${dansPlus ? 'aria-current="page"' : ''} class="nav-item">${icone('plus')}<span>Plus</span></button></li>
    </ul></nav>
  </div>`;
}

/** Branche les onglets du haut, la barre du bas, le panneau « Plus » et « Mois suivant ». */
export function brancherNavigation(racine, dispatch) {
  const aller = (onglet) => dispatch({ type: 'onglet', onglet, haut: true });
  const tabs = [...racine.querySelectorAll('[role=tab]')];
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => dispatch({ type: 'onglet', onglet: t.dataset.onglet }));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (k === undefined) return;
      e.preventDefault();
      dispatch({ type: 'onglet', onglet: tabs[(k + tabs.length) % tabs.length].dataset.onglet });
    });
  });
  const barre = racine.querySelector('#barre-onglets');
  const actif = racine.querySelector('[role=tab][aria-selected=true]');
  if (barre && actif) barre.scrollLeft = Math.max(0, actif.offsetLeft - 16);

  racine.querySelectorAll('#suivant, #suivant-mobile').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'suivant' })));

  const nav = racine.querySelector('#nav-mobile');
  if (!nav) return;
  nav.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => aller(b.dataset.nav)));
  const plus = nav.querySelector('#nav-plus'), panneau = nav.querySelector('#panneau-plus'), scrim = nav.querySelector('#nav-scrim');
  const basculer = (ouvert, rendreFocus = true) => {
    plus.setAttribute('aria-expanded', String(ouvert));
    panneau.hidden = !ouvert; scrim.hidden = !ouvert;
    if (ouvert) panneau.querySelector('button').focus();
    else if (rendreFocus) plus.focus();
  };
  plus.addEventListener('click', () => basculer(plus.getAttribute('aria-expanded') !== 'true'));
  scrim.addEventListener('click', () => basculer(false, false));
  nav.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && plus.getAttribute('aria-expanded') === 'true') { e.preventDefault(); basculer(false); }
  });
  // Le focus quitte le panneau (Tab) : on le referme sans voler le focus.
  panneau.addEventListener('focusout', (e) => {
    if (!panneau.hidden && e.relatedTarget && !panneau.contains(e.relatedTarget) && e.relatedTarget !== plus) basculer(false, false);
  });
}
