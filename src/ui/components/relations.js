// Politique reliée (E5) : relations avec les partis et réactions du mois. Tout est simulé, jamais de propos prêtés.
import { esc, fmt } from '../util.js';
import { attitudeCensure, RELATION_NEUTRE, phraseExplication, reactionParti } from '../../engine/index.js';

const ATTITUDES = {
  protege: ['Soutien', 'bg-[#DCEBDD] text-[#1F6E43] border-[#1F6E43]', 'ne votera pas la censure'],
  hostile: ['Hostile', 'bg-[#F3E4E4] text-rouge border-rouge', 'censure facilitée'],
  neutre: ['Neutre', 'bg-[#EFE9D6] text-doux border-bord', ''],
};

function ligne(p, etat) {
  const r = etat.relations?.[p.id] ?? RELATION_NEUTRE;
  const [lib, cls, aide] = ATTITUDES[attitudeCensure(etat, p.id)];
  const pct = Math.max(0, Math.min(100, r));
  const gauche = Math.min(pct, 50), largeur = Math.abs(pct - 50);
  return `<li class="grid grid-cols-[4.5rem_1fr_auto] sm:grid-cols-[5rem_1fr_3rem_auto] items-center gap-x-3 gap-y-1 py-1.5 border-b border-bord last:border-0">
    <span class="font-semibold text-sm flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-sm shrink-0" style="background:${esc(p.couleur)}" aria-hidden="true"></span>${esc(p.sigle)}</span>
    <div class="relative h-3 bg-[#E8E1CD] rounded" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${esc(Math.round(r))}" aria-label="Relation avec ${esc(p.sigle)}">
      <span class="absolute top-0 bottom-0 left-1/2 w-px bg-encre" aria-hidden="true"></span>
      <span class="absolute top-0 bottom-0 rounded" style="left:${gauche}%;width:${largeur}%;background:${esc(p.couleur)}" aria-hidden="true"></span></div>
    <span class="hidden sm:block text-sm tabular-nums text-right">${fmt(r, 0)}</span>
    <span class="text-xs font-bold border rounded px-2 py-0.5 whitespace-nowrap ${cls}" ${aide ? `title="${esc(aide)}"` : ''}>${esc(lib)}<span class="sm:hidden font-normal tabular-nums"> ${fmt(r, 0)}</span></span></li>`;
}

/** Réactions du dernier mois où des partis ont réagi : { tour, approuvent, desapprouvent, details }. */
export function reactionsDuMois(etat) {
  const rel = (etat.explications ?? []).filter((x) => x.type === 'relation');
  if (!rel.length) return null;
  const tour = Math.max(...rel.map((x) => x.tour));
  const recentes = rel.filter((x) => x.tour === tour);
  const net = {};
  for (const x of recentes) net[x.parti] = (net[x.parti] ?? 0) + x.delta;
  return {
    tour, details: recentes,
    approuvent: Object.keys(net).filter((k) => net[k] > 0), desapprouvent: Object.keys(net).filter((k) => net[k] < 0),
  };
}

export function sectionRelations(etat, ctx) {
  if (!etat.relations) return '';
  const partis = ctx.partis.filter((p) => p.id !== etat.joueur.parti && etat.relations[p.id] !== undefined);
  const sigle = (id) => ctx.partis.find((p) => p.id === id)?.sigle ?? id;
  const rx = reactionsDuMois(etat);
  const liste = (titre, ids) => `<div><h4 class="font-semibold text-sm">${esc(titre)}</h4><p class="text-sm">${ids.length ? ids.map(sigle).map(esc).join(', ') : '<span class="text-doux">Aucun</span>'}</p></div>`;
  const reactions = rx ? `<div class="grid sm:grid-cols-2 gap-3">${liste('Approuvent', rx.approuvent)}${liste('Désapprouvent', rx.desapprouvent)}</div>
      <details class="mt-2 text-sm"><summary class="cursor-pointer min-h-[44px] flex items-center font-semibold underline text-bleu">Détail des réactions</summary>
        <ul class="list-disc pl-5 space-y-1">${rx.details.map((x) => `<li>${esc(phraseExplication(x, ctx))}</li>`).join('')}</ul></details>`
    : '<p class="text-sm text-doux">Aucune réaction ce mois-ci. Engagez un programme ou faites adopter une loi.</p>';
  return `<section aria-labelledby="h-rel" class="bg-carte border border-bord rounded-lg p-4 mb-6">
    <h2 id="h-rel" class="font-serif font-bold text-xl">Relations avec les partis</h2>
    <p class="text-xs mb-2"><span class="font-bold uppercase border-2 border-encre bg-[#FFF3C4] rounded px-1.5 py-0.5">Simulation</span> Calculé à partir des positions publiques des partis — SIMULATION</p>
    <p class="text-xs text-doux mb-1">Barre de 0 à 100, centrée sur 50. Soutien à 75 ou plus (pas de vote de censure), Hostile à 25 ou moins (censure facilitée).</p>
    <ul>${partis.map((p) => ligne(p, etat)).join('')}</ul>
    <h3 class="font-serif font-bold text-lg mt-4 mb-1" id="h-rel-mois">Réactions du mois${rx ? ` <span class="text-sm font-normal text-doux">(mois ${rx.tour})</span>` : ''}</h3>
    <div aria-labelledby="h-rel-mois">${reactions}</div></section>`;
}

/** Ligne compacte « Réaction probable » d'une décision (theme, orientation) : estimation, hors parti du joueur. */
export function reactionProbable(etat, ctx, theme, orientation) {
  if (theme == null || orientation == null || !etat.relations) return '';
  const avec = ctx.partis.filter((p) => p.sieges_assemblee && p.id !== etat.joueur.parti);
  const noms = (f) => avec.filter((p) => f(reactionParti(p, theme, orientation))).map((p) => esc(p.sigle)).join(', ');
  const ok = noms((d) => d > 1), ko = noms((d) => d < -1);
  if (!ok && !ko) return '';
  return `<p class="text-xs text-doux mt-1"><strong>Réaction probable</strong> (estimation) : ${ok ? `approuvent ${ok}` : ''}${ok && ko ? ' · ' : ''}${ko ? `désapprouvent ${ko}` : ''}</p>`;
}
