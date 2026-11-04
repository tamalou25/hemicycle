// Navigation du tableau de bord : barre du bas (mobile), panneau « Plus », barre d'action fixe.
import { esc, MOIS } from '../util.js';
import { jourDuMois, VITESSES } from '../../engine/index.js';

// « Monde » : carte mondiale cadrée sur la France, écran principal ; l'ancienne carte des régions reste dans « Plus »
export const ONGLETS_PRINCIPAUX = [['monde', 'Monde'], ['bureau', 'Bureau'], ['decisions', 'Décisions'], ['budget', 'Budget']];
export const ONGLETS_PLUS = [['economie', 'Économie'], ['defense', 'Défense'], ['carte', 'Carte'], ['opinion', 'Opinion'], ['parlement', 'Parlement'], ['chronologie', 'Chronologie']];
export const ONGLETS = [...ONGLETS_PRINCIPAUX, ...ONGLETS_PLUS];

const ICONES = {
  monde: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  bureau: '<path d="M3 10l9-6 9 6v10H3z"/><path d="M9 20v-6h6v6"/>',
  decisions: '<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  carte: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  budget: '<circle cx="12" cy="12" r="8"/><path d="M15 9.5a3.5 3 0 0 0-3-1.5c-2 0-3 1.5-3 4s1 4 3 4a3.5 3 0 0 0 3-1.5M7.5 11h6M7.5 13.5h6"/>',
  plus: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
};
const icone = (id) => `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONES[id]}</svg>`;

/** Onglets du haut (ordinateur). */
export function barreOnglets(actif) {
  return `<div class="hidden sm:block overflow-x-auto -mx-4 px-4 mb-3 border-b border-bord bg-carte" id="barre-onglets">
    <div role="tablist" aria-label="Sections du tableau de bord" class="flex gap-1 min-w-max">${ONGLETS.map(([id, nom]) =>
      `<button type="button" role="tab" id="tab-${id}" data-onglet="${id}" aria-selected="${id === actif}" aria-controls="panneau" tabindex="${id === actif ? 0 : -1}"
        class="min-h-[44px] px-4 font-semibold text-base whitespace-nowrap border-b-[3px] ${id === actif ? 'border-bleu text-bleu' : 'border-transparent text-doux hover:text-encre'}">${nom}</button>`).join('')}</div></div>`;
}

const pastilleEvenement = '<span class="inline-flex items-center gap-1 text-xs font-bold bg-ambre text-encre rounded-full px-2 py-0.5"><span aria-hidden="true">!</span>Événement à traiter</span>';

/**
 * Commandes du temps continu : pause / lecture, vitesses, jour du mois. `h` = horloge (ctx.horloge) ; rien sans horloge.
 * Accessibles au clavier (boutons) ; raccourcis : Espace (pause/lecture), + et − (vitesse), gérés par main.js.
 */
export function commandesTemps(h, suffixe = '') {
  if (!h) return '';
  // sombre = sur le bandeau encre (ordinateur) ; sinon sur fond clair (barre mobile)
  const sombre = suffixe === '';
  const vitesses = Object.keys(VITESSES).map((v) => `<button type="button" data-vitesse="${v}" aria-pressed="${Number(v) === h.vitesse}" class="min-w-[44px] min-h-[44px] px-2 text-sm font-bold rounded-md border ${Number(v) === h.vitesse ? (sombre ? 'bg-ambre text-encre border-ambre' : 'bg-encre text-white border-encre') : (sombre ? 'text-white border-white/50 hover:bg-white/10' : 'bg-carte border-bord text-encre')}" aria-label="Vitesse ${v}">×${v}</button>`).join('');
  return `<div class="flex items-center gap-1.5" role="group" aria-label="Temps" id="temps${suffixe}">
    <button type="button" data-horloge="basculer" id="horloge-bascule${suffixe}" class="btn ${h.marche ? (sombre ? 'btn-fantome' : 'btn-s') : 'btn-ambre pulse'} !px-3" aria-pressed="${h.marche}" aria-label="${h.marche ? 'Pause du temps' : 'Lecture du temps'}"><span aria-hidden="true">${h.marche ? '❚❚' : '▶'}</span><span class="text-sm">${h.marche ? 'Pause' : 'Lecture'}</span></button>
    ${vitesses}
    <span class="text-xs ${sombre ? 'text-white/80' : 'text-doux'} tabular-nums ml-1 whitespace-nowrap" aria-live="off"><span class="sr-only">État du temps : ${h.marche ? 'en marche' : 'en pause'}, </span><span data-jour>jour ${jourDuMois(h)}</span></span>
  </div>`;
}

/** En-tête collant (ordinateur) : date, commandes du temps (si horloge) et « Mois suivant ». */
export function enteteCollant(etat, d, h = null) {
  return `<div class="hidden sm:flex items-center justify-between gap-3 py-2 bandeau -mx-4 px-4">
    <p class="font-serif font-bold text-lg"><span class="capitalize">${esc(MOIS[d.mois - 1])}</span> ${d.annee} <span class="font-sans font-normal text-doux text-sm">· mois ${etat.tour} sur 60${h ? (h.marche ? ' · temps en marche' : ' · en pause') : ''}</span></p>
    <span class="flex items-center gap-3">${etat.evenement ? pastilleEvenement : ''}${commandesTemps(h)}<button type="button" id="suivant" class="btn ${h ? 'btn-fantome' : 'btn-ambre'}">Mois suivant</button></span></div>`;
}

/** Mobile : barre d'action fixe (date + Mois suivant) et barre de navigation du bas. */
export function navigationMobile(etat, d, actif, h = null) {
  const dansPlus = ONGLETS_PLUS.some(([id]) => id === actif);
  const entree = ([id, nom]) => `<li><button type="button" data-nav="${id}" ${id === actif ? 'aria-current="page"' : ''} class="nav-item">${icone(id)}<span>${nom}</span></button></li>`;
  return `<div id="nav-mobile" class="sm:hidden">
    <div class="barre-action" role="region" aria-label="Mois en cours">
      <p class="min-w-0 leading-tight"><span class="block font-serif font-bold capitalize truncate">${esc(MOIS[d.mois - 1])} ${d.annee}</span><span class="block text-xs text-doux">mois ${etat.tour} sur 60${h ? (h.marche ? ' · en marche' : ' · en pause') : ''}</span></p>
      <span class="flex items-center gap-2">${etat.evenement ? '<span class="inline-flex items-center gap-1 text-xs font-bold bg-ambre text-encre rounded-full px-2 py-1"><span aria-hidden="true">!</span>Événement</span>' : ''}<button type="button" id="suivant-mobile" class="btn ${h ? 'btn-fantome' : 'btn-ambre'}">Mois suivant</button></span>
    </div>
    ${h ? `<div class="barre-temps" role="region" aria-label="Vitesse du temps">${commandesTemps(h, '-mobile')}</div>` : ''}
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
  racine.querySelectorAll('[data-horloge=basculer]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'horloge', action: 'basculer' })));
  racine.querySelectorAll('[data-vitesse]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'horloge', action: 'vitesse', vitesse: Number(b.dataset.vitesse) })));

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
