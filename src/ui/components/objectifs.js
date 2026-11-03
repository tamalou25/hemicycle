// Objectifs du mandat : sélection à la création (3 cases à cocher) et suivi au Bureau.
import { esc, fmt } from '../util.js';
import { evaluerObjectifs } from '../../engine/index.js';

/** Fieldset de sélection : exactement `nombre_a_choisir` objectifs. `st.objectifs` = ids cochés (modifié sur place). */
export function fieldsetObjectifs(catalogue, st) {
  if (!catalogue) return '';
  const n = catalogue.nombre_a_choisir;
  st.objectifs ??= [...catalogue.defaut];
  const plein = st.objectifs.length >= n;
  const cases = catalogue.objectifs.map((o) => {
    const coche = st.objectifs.includes(o.id);
    return `<li><label class="flex items-start gap-3 min-h-[44px] py-1 cursor-pointer">
      <input type="checkbox" name="objectif" value="${esc(o.id)}" class="mt-1 w-5 h-5 shrink-0" ${coche ? 'checked' : ''} ${plein && !coche ? 'disabled' : ''}>
      <span class="min-w-0"><strong>${esc(o.titre)}</strong><br><span class="text-sm text-doux">${esc(o.description)}</span></span></label></li>`;
  }).join('');
  return `<fieldset class="bg-carte border border-bord rounded-lg p-4 mb-4" id="fs-objectifs"><legend class="font-serif font-bold px-1">Objectifs du mandat</legend>
    <p class="text-sm mb-2" aria-live="polite">Choisissez exactement ${n} objectifs : <strong id="nb-objectifs">${st.objectifs.length}/${n}</strong>. Ils sont évalués en fin de mandat.</p>
    <ul>${cases}</ul></fieldset>`;
}

/** Branche les cases : met à jour le compteur, désactive les autres cases à n, bloque la validation si le compte est faux. */
export function brancherObjectifs(racine, catalogue, st) {
  if (!catalogue) return;
  const n = catalogue.nombre_a_choisir;
  const cases = [...racine.querySelectorAll('[name=objectif]')];
  const maj = () => {
    st.objectifs = cases.filter((c) => c.checked).map((c) => c.value);
    cases.forEach((c) => { c.disabled = st.objectifs.length >= n && !c.checked; });
    racine.querySelector('#nb-objectifs').textContent = `${st.objectifs.length}/${n}`;
    const go = racine.querySelector('#go');
    if (go) go.disabled = st.objectifs.length !== n || (go.dataset.elu === '1' && !racine.querySelector('[name=elu]:checked'));
  };
  cases.forEach((c) => c.addEventListener('change', maj));
}

const UNITES = { chomage: ' %', deficit: ' %', dette: ' %', popularite: ' %', reformes: ' lois', programmes: ' programmes' };
const unite = (o) => UNITES[o.id] ?? '/100';

/** Texte « valeur / cible » avec unité adaptée. */
export function texteValeur(o) {
  const u = unite(o);
  const v = o.valeur == null ? 'n.d.' : `${fmt(o.valeur, Number.isInteger(o.valeur) ? 0 : 1)}${u}`;
  return { v, c: `${o.sens === 'max' ? '≤' : '≥'} ${fmt(o.cible, 0)}${u}` };
}

/** Bloc compact du Bureau. */
export function sectionObjectifs(etat, donnees) {
  const liste = evaluerObjectifs(etat, donnees);
  if (!liste.length) return '';
  const lignes = liste.map((o) => {
    const t = texteValeur(o);
    const pct = Math.round(o.progression * 100);
    return `<li class="py-0.5 border-b border-bord last:border-0">
      <div class="flex items-baseline justify-between gap-2 text-sm leading-5"><strong class="min-w-0">${esc(o.titre)}</strong>
        <span class="shrink-0 text-xs font-bold border rounded px-1.5 ${o.atteint ? 'border-[#1F6E43] text-[#1F6E43]' : 'border-bord text-doux'}">${o.atteint ? 'Atteint' : 'En cours'}</span></div>
      <div class="flex items-center gap-2"><div class="h-1.5 flex-1 bg-[#E8E1CD] rounded" role="meter" aria-label="Progression : ${esc(o.titre)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-valuetext="${pct} %"><div class="h-1.5 rounded" style="width:${pct}%;background:${o.atteint ? '#1F6E43' : '#8A5A00'}"></div></div>
        <span class="text-xs leading-4 text-doux tabular-nums whitespace-nowrap">${esc(t.v)} / ${esc(t.c)}</span></div></li>`;
  }).join('');
  return `<section aria-labelledby="h-obj" class="bg-carte border border-bord rounded-lg px-3 py-1.5 mb-2">
    <div class="flex items-baseline justify-between gap-2"><h2 id="h-obj" class="font-serif font-bold text-base">Objectifs du mandat</h2><span class="text-xs text-doux">Évalués en fin de mandat</span></div>
    <ul>${lignes}</ul></section>`;
}
