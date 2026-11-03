// « Le mois écoulé » : ce que vous avez décidé, ce qui en est résulté, ce qui a changé et pourquoi.
// Présentation de bilanMois (moteur) ; se relit à volonté au Bureau, sans fenêtre bloquante.
import { esc } from '../util.js';
import { bilanMois, engagements, phraseExplication } from '../../engine/index.js';
import { moisDe } from './mission.js';

const MAX = 3;
const liste = (l, vide) => (l.length ? `<ul class="list-disc pl-5 text-sm space-y-0.5">${l.map((x) => `<li>${x}</li>`).join('')}</ul>` : `<p class="text-sm text-doux">${vide}</p>`);

export function sectionBilanMois(etat, ctx) {
  const donnees = { lois: ctx.lois, partis: ctx.partis, regions: ctx.regions, projets: ctx.projets, politiques: ctx.politiques };
  const b = bilanMois(etat, donnees);
  if (!b) return '';
  const ph = (e) => esc(phraseExplication({ ...e, delta: Math.round(e.delta * 100) / 100 }, donnees));
  const tri = (l) => [...l].sort((a, c) => Math.abs(c.delta) - Math.abs(a.delta));
  const vos = [...tri(b.locaux.filter((e) => e.type === 'projet')), ...tri(b.vosEffets)];
  const autres = [...tri(b.evenements), ...tri(b.locaux.filter((e) => e.type === 'evenement')), ...tri(b.conjoncture)];
  const suites = [...b.decisions, ...b.resultats];
  // Intégré en tête de « Ce mois-ci » : vos décisions d'abord, puis bonnes nouvelles et vigilance (toutes causes)
  return `<div id="bilan-mois" class="mb-2" aria-label="Vos décisions de ${esc(moisDe(etat, b.tour - 1))} et leurs effets" role="group">
    ${suites.length || vos.length ? `<div class="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-1">
      <div><h4 class="font-semibold text-sm">Vos décisions et leurs suites</h4>${liste(suites.slice(0, MAX).map(esc), 'Aucune décision ni résultat ce mois-là.')}</div>
      <div><h4 class="font-semibold text-sm">Ce que vos décisions ont changé</h4>${liste(vos.slice(0, MAX).map(ph), 'Pas encore d’effet observé (délais en cours ?).')}</div>
    </div>` : '<p class="text-sm mt-1">Aucune décision ni effet de vos décisions ce mois-là. Les variations viennent de la conjoncture et des événements (ci-dessous).</p>'}
    ${b.mission ? `<p class="text-sm mt-2"><strong>Mission :</strong> prochaine étape, ${esc(b.mission.detail)}</p>` : ''}
    ${suites.length > MAX || vos.length > MAX ? `<details class="mt-1"><summary class="min-h-[44px] flex items-center cursor-pointer text-sm text-bleu underline">Tout le mois écoulé</summary>
      ${liste(suites.map(esc), '')}${liste(vos.map(ph), '')}</details>` : ''}
  </div>`;
}

/** Engagements en cours et leur prochaine échéance. */
export function sectionEngagements(etat, ctx) {
  const l = engagements(etat, { lois: ctx.lois, partis: ctx.partis, regions: ctx.regions, projets: ctx.projets, politiques: ctx.politiques });
  const quand = (t) => (t <= etat.tour ? 'fin de ce mois' : `${moisDe(etat, t)} (dans ${t - etat.tour} mois)`);
  return `<div id="engagements" class="mb-3">${l.length
    ? `<ul class="divide-y divide-bord bg-carte border border-bord rounded-lg">${l.slice(0, 5).map((x) => `<li class="px-3 py-1.5 text-sm flex flex-wrap justify-between gap-x-2"><span class="min-w-0"><strong>${esc(x.titre)}</strong> · ${esc(x.detail)}</span><span class="text-doux">${esc(quand(x.echeance))}</span></li>`).join('')}</ul>${l.length > 5 ? `<p class="text-xs text-doux mt-1">Et ${l.length - 5} autre(s) : voir Décisions (« En cours »).</p>` : ''}`
    : '<p class="text-sm text-doux">Aucun engagement en cours : vos décisions apparaîtront ici avec leur prochaine échéance.</p>'}</div>`;
}
