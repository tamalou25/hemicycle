// Onglet Opinion (E3) : groupes sociaux, résultats perçus, chocs de confiance, intentions de vote.
import { esc, fmt } from '../util.js';
import { resultats, RESULTATS } from '../../engine/index.js';
import { blocSondage } from './vote.js';

const LIEN_SOURCES = 'https://github.com/tamalou25/hemicycle/blob/main/docs/SOURCES.md';
export const LIB_RESULTATS = { emploi: 'Emploi', pouvoir_achat: 'Pouvoir d’achat', sante: 'Santé', transports: 'Transports', securite: 'Sécurité', avenir: 'Avenir' };
const CHOCS = {
  '49.3': (v) => `Le 49.3 fait perdre ${fmt(Math.abs(v), v % 1 ? 1 : 0)} points de confiance à tous les groupes.`,
  'loi-speciale': (v) => `La loi spéciale (budget rejeté) fait perdre ${fmt(Math.abs(v), v % 1 ? 1 : 0)} points de confiance à tous les groupes.`,
};

const prioritesDe = (eq, id) => Object.entries(eq?.priorites?.[id] ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => LIB_RESULTATS[k] ?? k);

function tendance(avant, apres) {
  if (avant == null || apres == null) return '';
  const d = apres - avant;
  if (Math.abs(d) < 0.05) return '<span class="text-doux" title="Stable"><span aria-hidden="true">→</span><span class="sr-only">stable</span></span>';
  const hausse = d > 0;
  return `<span class="${hausse ? 'text-[#1F6E43]' : 'text-rouge'}" title="${hausse ? 'En hausse' : 'En baisse'} depuis le mois précédent"><span aria-hidden="true">${hausse ? '↑' : '↓'}</span><span class="sr-only">${hausse ? 'en hausse' : 'en baisse'} de ${fmt(Math.abs(d))} depuis le mois précédent</span></span>`;
}

function barre(libelle, v, couleur, trend = '') {
  const x = Math.max(0, Math.min(100, v ?? 0));
  return `<div class="mb-1.5"><div class="flex justify-between gap-2 text-sm"><span>${esc(libelle)}</span><span class="font-semibold tabular-nums">${fmt(v, 0)}<span class="text-doux font-normal">/100</span> ${trend}</span></div>
    <div class="h-2.5 bg-[#E8E1CD] rounded" role="meter" aria-label="${esc(libelle)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(x)}" aria-valuetext="${Math.round(x)} sur 100"><div class="h-2.5 rounded" style="width:${x}%;background:${couleur}"></div></div></div>`;
}

function carteGroupe(g, etat, ctx) {
  const x = etat.groupes[g.id];
  const av = ctx.groupesAvant?.[g.id];
  const vote = etat.sondage?.parGroupe?.[g.id];
  return `<li class="bg-carte border border-bord rounded-lg p-3 filet-laiton min-w-0">
    <h3 class="font-serif font-bold text-lg leading-tight">${esc(g.nom)}</h3>
    <p class="text-sm text-doux mb-2">${fmt(g.part)} % de la population de 15 ans ou plus</p>
    ${barre('Satisfaction', x.satisfaction, '#1F3A6E', tendance(av?.satisfaction, x.satisfaction))}
    ${barre('Confiance', x.confiance, '#8A6A1F', tendance(av?.confiance, x.confiance))}
    <p class="text-sm mt-2">Intention de vote pour votre parti : <strong class="tabular-nums">${vote != null ? `${fmt(vote)} %` : '—'}</strong></p>
    <p class="text-sm text-doux">Priorités : ${esc(prioritesDe(ctx.groupesEquilibrage, g.id).join(', '))}</p></li>`;
}

function blocResultats(etat, ctx) {
  const res = resultats(etat, { regions: ctx.regions, finances: ctx.finances });
  return `<ul class="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">${RESULTATS.map((k) => `<li>${barre(LIB_RESULTATS[k], res[k], '#14213D')}</li>`).join('')}</ul>`;
}

function blocChocs(etat) {
  const chocs = new Map();
  for (const e of etat.explications ?? []) if (e.type === 'choc' && !e.region && e.tour === etat.tour && !chocs.has(e.source)) chocs.set(e.source, e.delta);
  if (!chocs.size) return '<p class="text-sm text-doux">Aucun choc de confiance ce mois-ci.</p>';
  return `<ul class="text-sm">${[...chocs].map(([src, v]) => `<li class="py-1 border-b border-bord last:border-0">${esc(CHOCS[src] ? CHOCS[src](v) : `Un événement (${src}) fait varier la confiance de tous les groupes de ${fmt(v)} point.`)}</li>`).join('')}</ul>`;
}

export function ongletOpinion(etat, ctx) {
  const G = ctx.groupes?.groupes ?? [];
  if (!etat.groupes || !G.length) return '<p class="text-doux">Les données de population ne sont pas disponibles pour cette partie.</p>';
  return `<p class="mb-4 border-l-4 border-laiton bg-white p-3"><strong>Satisfaction</strong> (situation vécue), <strong>confiance</strong> (jugement sur le gouvernement) et <strong>intention de vote</strong> sont trois choses différentes.</p>
    <section aria-labelledby="h-grp" class="mb-6">
      <h2 id="h-grp" class="font-serif font-bold text-xl mb-2">Les groupes de population</h2>
      <ul class="grid md:grid-cols-2 xl:grid-cols-3 gap-3">${G.map((g) => carteGroupe(g, etat, ctx)).join('')}</ul>
      ${ctx.groupesAvant ? '' : '<p class="text-xs text-doux mt-1">Les flèches de tendance apparaissent après le premier mois joué.</p>'}
    </section>
    <div class="grid lg:grid-cols-2 gap-6 mb-6">
      <section aria-labelledby="h-res" class="bg-carte border border-bord rounded-lg p-4 self-start">
        <h2 id="h-res" class="font-serif font-bold text-xl mb-2">Résultats perçus</h2>
        <p class="text-sm text-doux mb-2">Résultats concrets (0-100), communs à tous les groupes ; chacun les pondère selon ses priorités.</p>${blocResultats(etat, ctx)}</section>
      <section aria-labelledby="h-choc" class="bg-carte border border-bord rounded-lg p-4 self-start">
        <h2 id="h-choc" class="font-serif font-bold text-xl mb-2">Chocs de confiance du dernier mois</h2>${blocChocs(etat)}</section>
    </div>
    <section aria-labelledby="h-son" class="bg-carte border border-bord rounded-lg p-4 mb-6">
      <h2 id="h-son" class="font-serif font-bold text-xl mb-2">Sondage, intentions de vote</h2>${blocSondage(etat, ctx.partis)}</section>
    <p class="text-xs text-doux">Parts de population : Insee, recensement 2023. Priorités : paramètres de jeu, aucun groupe n’a d’orientation politique attribuée. <a class="underline text-bleu" href="${LIEN_SOURCES}" target="_blank" rel="noopener">Sources et méthode</a></p>`;
}
