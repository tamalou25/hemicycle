import { GROUPES_SOCIAUX, resumePopulation, resumeRegion, intentionsRegionales, agregerRegions } from '../../engine/index.js';
import { esc, fmt } from '../util.js';

function tableauGroupes(groupes) {
  return `<ul class="grid sm:grid-cols-2 gap-3 mt-3">${GROUPES_SOCIAUX.map((g) => `<li class="border border-bord rounded-lg p-3 bg-carte">
    <h3 class="font-serif font-bold text-lg">${esc(g.nom)}</h3>
    <p class="text-xs text-doux">${Math.round(g.part * 100)} % du modèle · ${esc(g.priorite)}</p>
    <dl class="mt-2 text-sm"><div class="flex justify-between gap-2"><dt>Conditions de vie</dt><dd class="font-bold">${fmt(groupes[g.id].satisfaction)}/100</dd></div>
    <div class="flex justify-between gap-2"><dt>Confiance</dt><dd class="font-bold">${fmt(groupes[g.id].confiance)}/100</dd></div></dl>
  </li>`).join('')}</ul>`;
}

export function populationRegion(etat, regionId) {
  const groupes = etat.population?.[regionId];
  if (!groupes) return '';
  return `<details class="mt-3"><summary class="cursor-pointer font-semibold py-2">Habitants : besoins et confiance</summary>${tableauGroupes(groupes)}
    <p class="text-xs text-doux mt-2">Profils et proportions de jeu, identiques dans chaque région ; pas de données démographiques observées.</p></details>`;
}

export function ongletPopulation(etat, ctx) {
  const regions = ctx.regions?.regions ?? [];
  const resume = resumePopulation(etat, regions);
  if (!resume) return '<p>Les données de population ne sont pas disponibles pour cette partie.</p>';
  const intentions = intentionsRegionales(etat, ctx.partis);
  const national = agregerRegions(intentions, regions);
  const j = etat.joueur.parti;
  const total = regions.filter((r) => etat.population[r.id]).reduce((s, r) => s + r.population, 0);
  const groupes = Object.fromEntries(GROUPES_SOCIAUX.map((g) => [g.id, Object.fromEntries(['satisfaction', 'confiance'].map((i) => [i,
    regions.reduce((s, r) => s + (etat.population[r.id]?.[g.id]?.[i] ?? 0) * r.population, 0) / total,
  ]))]));
  const territoires = regions.filter((r) => etat.population[r.id])
    .sort((a, b) => resumeRegion(etat.population[a.id]).satisfaction - resumeRegion(etat.population[b.id]).satisfaction);
  const carteRegion = (r) => {
    const p = resumeRegion(etat.population[r.id]);
    return `<li class="bg-carte border border-bord rounded-lg p-3"><h4 class="font-semibold">${esc(r.nom)}</h4>
      <p class="text-sm mt-1">Conditions de vie <strong>${fmt(p.satisfaction)}/100</strong><br>Confiance <strong>${fmt(p.confiance)}/100</strong><br>Vote pour votre parti <strong>${fmt(intentions[r.id]?.[j] ?? 0)} %</strong> <span class="text-xs text-doux">(estimation)</span></p>
      <button type="button" data-pop-region="${esc(r.id)}" class="btn btn-s text-sm mt-2">Voir les besoins et projets</button></li>`;
  };
  return `<section aria-labelledby="h-population" class="min-w-0">
    <p class="uppercase tracking-wide text-xs text-bordeaux font-bold">Le pays vécu · simulation</p>
    <h2 id="h-population" class="font-serif font-bold text-2xl mt-1">Prendre le pouls du pays</h2>
    <p class="text-sm text-doux mt-2">Les conditions de vie reflètent les services, l’emploi et le pouvoir d’achat. La confiance réagit progressivement au bilan du gouvernement. Le vote conserve une base partisane : une population satisfaite ne vous est pas acquise.</p>
    <dl class="grid sm:grid-cols-3 gap-3 mt-4">${[
      ['Conditions de vie', resume.satisfaction, '/100'], ['Confiance dans le gouvernement', resume.confiance, '/100'], ['Vote pour votre parti · estimation', national[j] ?? 0, ' %'],
    ].map(([nom, v, unite]) => `<div class="bg-carte border border-bord rounded-lg p-4 filet-laiton"><dt class="text-sm text-doux">${nom}</dt><dd class="font-serif font-bold text-3xl mt-1">${fmt(v)}<span class="text-base">${unite}</span></dd></div>`).join('')}</dl>
    <h3 class="font-serif font-bold text-xl mt-6">Quatre profils, des priorités différentes</h3>
    ${tableauGroupes(groupes)}
    <p class="text-xs text-doux mt-3">Paramètres d’équilibrage, pas un sondage réel. Ces quatre profils simplifiés et leurs proportions ne décrivent pas la démographie française. Leur répartition est identique dans toutes les régions. La population totale sert d’approximation du poids électoral, sans modéliser les inscrits ni l’abstention.</p>
    <h3 class="font-serif font-bold text-xl mt-6">Les conditions de vie les plus fragiles</h3>
    <p class="text-sm text-doux mt-1">Trois territoires à examiner en priorité. La fiche région permet de consulter les besoins et d’investir.</p>
    <ul class="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">${territoires.slice(0, 3).map(carteRegion).join('')}</ul>
    <details class="mt-4"><summary class="cursor-pointer py-2 font-semibold">Comparer les autres régions (${Math.max(0, territoires.length - 3)})</summary>
      <ul class="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">${territoires.slice(3).map(carteRegion).join('')}</ul>
    </details>
  </section>`;
}
