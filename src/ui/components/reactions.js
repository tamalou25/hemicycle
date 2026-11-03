import { esc, THEMES } from '../util.js';
import { reactionsAuTexte } from '../../engine/index.js';
import { avatar } from './avatar.js';

// Phrases au conditionnel, SANS guillemets : ce sont des simulations, jamais des propos.
const PHRASES = {
  soutien: (n) => `${n} soutiendrait probablement ce texte.`,
  reserve: (n) => `${n} exprimerait probablement des réserves.`,
  opposition: (n) => `${n} s’opposerait probablement à ce texte.`,
};
const BADGE = '<span class="text-xs font-bold uppercase tracking-wide border-2 border-encre rounded px-2 py-0.5 bg-[#FFF3C4] text-encre whitespace-nowrap">Simulation</span>';

/** Section « Réactions probables (simulation) » + section distincte de citations sourcées. */
export function sectionReactions(etat, ctx) {
  const pol = ctx.politiciens ?? [];
  if (!etat.texte || !pol.length) return '';
  const loi = ctx.lois.find((l) => l.id === etat.texte.loiId);
  const reacs = reactionsAuTexte({ theme: loi?.theme, orientation: etat.texte.orientation }, pol, ctx.partis, etat.joueur.politicienId);
  const items = reacs.map((r) => {
    const p = pol.find((x) => x.id === r.id);
    const parti = ctx.partis.find((x) => x.id === r.parti);
    return `<li class="flex items-start gap-3 py-2 border-b border-bord last:border-0">
      ${avatar(r.nom, parti)}
      <div class="min-w-0"><p class="font-semibold">${esc(r.nom)} <span class="text-xs text-doux font-normal">${esc(parti?.sigle ?? '')}</span></p>
        <p class="text-sm">${esc(PHRASES[r.attitude](r.nom))}</p></div>
      <div class="ml-auto pl-2">${BADGE}</div></li>`;
  }).join('');
  return `<section aria-labelledby="h-reac" class="bg-carte border border-bord rounded-lg p-4 mb-6">
    <h2 id="h-reac" class="font-serif font-bold text-xl">Réactions probables (simulation)</h2>
    <p class="text-sm text-doux mb-2">Thème : ${esc(THEMES[loi?.theme] ?? '')}. Attitudes déduites du programme du parti, sans aucun propos réel.</p>
    <ul>${items}</ul></section>${sectionCitations(pol)}`;
}

/** Citations réelles vérifiées : rien n'est affiché si aucune n'existe. */
export function sectionCitations(politiciens) {
  const items = politiciens.flatMap((p) => (p.citations ?? []).map((c) => ({ p, c })));
  if (!items.length) return '';
  const li = items.map(({ p, c }) => `<li class="py-2 border-b border-bord last:border-0">
      <blockquote class="border-l-4 border-encre pl-3"><p>« ${esc(c.texte ?? c.citation)} »</p>
      <footer class="text-sm text-doux">${esc(p.nom)}, ${esc(c.source)}, ${esc(c.date)} ·
        <a class="underline" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">lien vers la source</a></footer></blockquote></li>`).join('');
  return `<section aria-labelledby="h-cit" class="bg-carte border-2 border-encre rounded-lg p-4 mb-6">
    <h2 id="h-cit" class="font-serif font-bold text-xl mb-2">Déclarations publiques sourcées</h2><ul>${li}</ul></section>`;
}
