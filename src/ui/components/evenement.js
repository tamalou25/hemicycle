// Carte d'événement mensuel : titre, thème, description et un bouton par choix.
import { esc, fmt } from '../util.js';

const LIB = { chomage: 'Chômage', croissance: 'Croissance', deficit: 'Déficit', inflation: 'Inflation', popularite: 'Popularité', tensions: 'Tensions', dette: 'Dette' };
// sens : +1 si une hausse est favorable
const BON = { chomage: -1, croissance: 1, deficit: -1, inflation: -1, popularite: 1, tensions: -1, dette: -1 };
const THEMES_EV = { social: 'Social', international: 'International', climat: 'Climat', sante: 'Santé', securite: 'Sécurité', scandale: 'Scandale', europe: 'Europe', economie: 'Économie' };

function apercu(e) {
  const hausse = e.valeur >= 0;
  const favorable = (BON[e.indicateur] ?? 1) * (hausse ? 1 : -1) > 0;
  const delai = e.delaiMois > 0 ? `dans ${e.delaiMois} mois` : 'dès le mois prochain';
  return `<li class="${favorable ? 'text-[#1F6E43]' : 'text-rouge'}"><span aria-hidden="true">${hausse ? '↑' : '↓'}</span>
    <span class="font-semibold">${esc(LIB[e.indicateur] ?? e.indicateur)}</span>
    <span class="sr-only">${hausse ? 'en hausse' : 'en baisse'}</span>
    ${hausse ? '+' : '−'}${fmt(Math.abs(e.valeur), 1)} <span class="text-doux">(${delai}, sur ${e.duree} mois)</span></li>`;
}

export function sectionEvenement(etat, ctx) {
  if (!etat.evenement) return '';
  const ev = (ctx.evenements ?? []).find((e) => e.id === etat.evenement);
  if (!ev) return '';
  const choix = ev.choix.map((c, i) => {
    const cout = c.cout_capital ?? 0;
    const manque = etat.joueur.capital < cout;
    return `<li><button type="button" data-evenement="${i}" ${manque ? 'disabled aria-describedby="ev-manque-' + i + '"' : ''}
      class="btn btn-s w-full !text-left !items-start flex-col gap-1 disabled:opacity-60 disabled:cursor-not-allowed">
      <span class="font-semibold">${esc(c.libelle)} <span class="font-normal text-doux">· coût : ${cout} capital</span></span>
      <ul class="text-sm space-y-0.5">${(c.effets ?? []).map(apercu).join('')}</ul>
      ${manque ? `<span id="ev-manque-${i}" class="text-xs text-rouge">Capital politique insuffisant (${etat.joueur.capital}/${cout}).</span>` : ''}
    </button></li>`;
  }).join('');
  return `<section role="alert" aria-labelledby="h-ev" class="mb-6 bg-[#FFF3C4] border-2 border-encre rounded-lg p-4">
    <p class="text-xs font-bold uppercase tracking-wide">Événement · ${esc(THEMES_EV[ev.theme] ?? ev.theme)}</p>
    <h2 id="h-ev" class="font-serif font-bold text-2xl">${esc(ev.titre)}</h2>
    <p class="mt-1">${esc(ev.description)}</p>
    <ul class="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">${choix}</ul>
    <p class="mt-3 text-sm">Sans réponse, la dernière option sera appliquée à la fin du mois.</p>
  </section>`;
}

export function brancherEvenement(racine, dispatch) {
  racine.querySelectorAll('[data-evenement]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'evenement', index: Number(b.dataset.evenement) })));
}
