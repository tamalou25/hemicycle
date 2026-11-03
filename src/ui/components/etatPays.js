// « Où en est le pays ? » : phrase de synthèse, indicateurs clés et grille compacte.
// Les seules règles propres à l'interface sont de présentation : sens « meilleur » et seuil d'affichage.
import { esc, fmt } from '../util.js';
import { META, INDICATEURS_JAUGE, sparkline } from './jauge.js';
import { BORNES } from '../../engine/index.js';

export const SEUIL_AFFICHAGE = 0.05;
const CIBLE_INFLATION = 2;
export const CLES = ['chomage', 'deficit', 'popularite', 'tensions'];
const SENS = { chomage: -1, croissance: 1, deficit: -1, popularite: 1, tensions: -1 };

/**
 * Valeurs du mois précédent. Pour le premier mois joué, l'historique ne contient pas le départ :
 * on le reconstitue avec le registre des causes du moteur, dont la somme des explications
 * d'un mois égale la variation réelle de chaque indicateur (garanti par les tests du moteur).
 */
function moisPrecedent(etat) {
  const h = etat.historique ?? [];
  if (h.length >= 2) return h[h.length - 2];
  if (h.length !== 1) return null;
  const fin = h[0];
  const depart = { ...fin };
  for (const e of etat.explications ?? []) {
    if (e.tour === fin.tour && !e.region && e.indicateur in depart) depart[e.indicateur] -= e.delta;
  }
  return depart;
}

/** Variation du dernier mois par indicateur, ou null avant le premier mois joué. qualite : 1 mieux, -1 moins bien, 0 stable. */
export function evolutions(etat) {
  const h = etat.historique ?? [];
  const a = moisPrecedent(etat);
  if (!a) return null;
  const b = h[h.length - 1];
  const res = {};
  for (const id of INDICATEURS_JAUGE) {
    const delta = b[id] - a[id];
    let qualite = 0;
    if (Math.abs(delta) >= SEUIL_AFFICHAGE) {
      qualite = id === 'inflation' ? (Math.abs(b[id] - CIBLE_INFLATION) < Math.abs(a[id] - CIBLE_INFLATION) ? 1 : -1) : Math.sign(delta) * SENS[id];
    }
    res[id] = { delta, qualite };
  }
  return res;
}

export function phraseSynthese(evo) {
  if (!evo) return 'Premier mois : aucune évolution encore';
  const v = Object.values(evo);
  const mieux = v.filter((x) => x.qualite > 0).length, pire = v.filter((x) => x.qualite < 0).length;
  if (!mieux && !pire) return 'Situation stable ce mois-ci';
  const parties = [];
  if (mieux) parties.push(`${mieux} indicateur${mieux > 1 ? 's s’améliorent' : ' s’améliore'}`);
  if (pire) parties.push(mieux ? `${pire} ${pire > 1 ? 'se dégradent' : 'se dégrade'}` : `${pire} indicateur${pire > 1 ? 's se dégradent' : ' se dégrade'}`);
  return `${parties.join(', ')} ce mois-ci`;
}

const LIB_Q = { 1: 'mieux', '-1': 'moins bien', 0: 'stable' };
const CLS_Q = { 1: 'text-[#1F6E43]', '-1': 'text-rouge', 0: 'text-doux' };

/** Variation : flèche, valeur signée et libellé texte (jamais la couleur seule). */
export function variation(id, evo) {
  if (!evo) return '<span class="text-xs text-doux">pas encore de variation</span>';
  const { delta, qualite } = evo[id];
  const fleche = qualite === 0 ? '→' : delta > 0 ? '↑' : '↓';
  const signe = Math.abs(delta) < SEUIL_AFFICHAGE ? '' : delta > 0 ? '+' : '−';
  return `<span class="text-xs font-semibold leading-tight ${CLS_Q[qualite]}"><span aria-hidden="true">${fleche}</span> ${signe}${fmt(Math.abs(delta), 1)} pt · ${LIB_Q[qualite]}</span>`;
}

const coulSpark = (id, etat) => {
  const [min, max] = BORNES[id], pct = (etat.indicateurs[id] - min) / (max - min);
  const haut = id === 'inflation' ? Math.abs(etat.indicateurs[id] - CIBLE_INFLATION) < 2 : SENS[id] > 0 ? pct >= 0.5 : pct <= 0.5;
  return haut ? '#1F6E43' : '#B3262B';
};

export function sectionEtatPays(etat) {
  const evo = evolutions(etat);
  const kpi = CLES.map((id) => `<li class="bg-carte border border-bord rounded-lg px-3 py-1.5 filet-laiton">
      <p class="text-sm text-doux">${esc(META[id].label)}</p>
      <p class="font-serif font-bold text-xl tabular-nums leading-tight">${fmt(etat.indicateurs[id])}<span class="text-sm font-sans font-normal">${esc(META[id].unite)}</span></p>
      <p>${variation(id, evo)}</p></li>`).join('');
  return `<section aria-labelledby="h-pays" class="mb-4">
    <h2 id="h-pays" class="font-serif font-bold text-xl mb-1">État du pays</h2>
    <p class="mb-1.5 font-semibold text-encre leading-snug" role="status">${esc(phraseSynthese(evo))}</p>
    <ul class="grid grid-cols-2 lg:grid-cols-4 gap-2">${kpi}</ul></section>`;
}

/** Grille compacte (2 colonnes) de tous les indicateurs. */
export function sectionTousIndicateurs(etat, sat) {
  const evo = evolutions(etat);
  const hist = (id) => etat.historique.map((h) => h[id]);
  const cases = INDICATEURS_JAUGE.map((id) => `<li class="bg-carte border border-bord rounded-lg px-2 py-1.5">
      <div class="flex justify-between items-baseline gap-1"><span class="text-sm text-doux">${esc(META[id].label)}</span><span class="font-semibold tabular-nums text-sm">${fmt(etat.indicateurs[id])}${esc(META[id].unite)}</span></div>
      <p>${variation(id, evo)}</p><div class="[&_svg]:h-3 mt-0.5">${sparkline(hist(id), coulSpark(id, etat))}</div></li>`).join('');
  // Mobile : la grille complète est repliée (4 des 6 indicateurs sont déjà dans « État du pays ») ; ouverte sur ordinateur
  const ouvert = globalThis.matchMedia?.('(min-width: 640px)').matches ? ' open' : '';
  return `<section aria-labelledby="h-ind" class="mb-4">
    <details id="tous-indicateurs"${ouvert}>
      <summary class="min-h-[44px] flex items-center justify-between gap-2 cursor-pointer"><h2 id="h-ind" class="font-serif font-bold text-xl">Tous les indicateurs</h2><span class="text-sm text-bleu underline">Afficher</span></summary>
      <ul class="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-1">${cases}</ul>
    </details>
    <p class="mt-2 text-sm">Dette publique : <strong>${fmt(etat.indicateurs.dette)} % du PIB</strong> ·
      Capital politique : <strong id="capital">${etat.joueur.capital}</strong>/10${sat != null ? ` · Satisfaction territoriale : <strong>${fmt(sat, 0)}</strong>/100` : ''}</p></section>`;
}
