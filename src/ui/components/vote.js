import { esc, fmt } from '../util.js';

/** Résultat du dernier vote avec détail par parti. */
export function blocVote(etat, lois, partis) {
  const v = etat.dernierVote;
  if (!v) return '<p class="text-sm text-doux">Aucun vote ce mois-ci.</p>';
  const loi = lois.find((l) => l.id === v.loi);
  const total = v.pour + v.contre || 1;
  const lignes = [...v.detail].sort((a, b) => b.sieges - a.sieges).map((d) => {
    const p = partis.find((x) => x.id === d.parti);
    return `<li class="flex justify-between gap-2 py-1 border-b border-bord last:border-0 text-sm">
      <span><span class="inline-block w-3 h-3 rounded-sm align-middle mr-1" style="background:${esc(p?.couleur)}" aria-hidden="true"></span>${esc(p?.sigle ?? d.parti)} <span class="text-doux">(${d.sieges} sièges)</span></span>
      <span class="${d.vote === 'pour' ? 'text-[#1F6E43]' : 'text-rouge'} font-semibold">${d.vote === 'pour' ? 'Pour' : 'Contre'}</span></li>`;
  }).join('');
  return `<p class="font-semibold">« ${esc(loi?.titre ?? v.loi)} » : <span class="${v.adoptee ? 'text-[#1F6E43]' : 'text-rouge'}">${v.adoptee ? 'adoptée' : 'rejetée'}</span></p>
    <div class="h-3 flex rounded overflow-hidden my-2" aria-hidden="true"><div style="width:${(v.pour / total) * 100}%;background:#1F6E43"></div><div style="width:${(v.contre / total) * 100}%;background:#B3262B"></div></div>
    <p class="text-sm mb-2">${v.pour} pour, ${v.contre} contre</p>
    <details><summary class="cursor-pointer text-sm underline text-bleu">Détail par parti</summary><ul class="mt-2">${lignes}</ul></details>`;
}

/** Sondage : barres horizontales colorées par parti. */
export function blocSondage(etat, partis) {
  const s = etat.sondage;
  const intentions = s?.intentions ?? null;
  const ref = intentions ?? Object.fromEntries(partis.map((p) => [p.id, null]));
  if (!intentions) return '<p class="text-sm text-doux">Pas encore de sondage : avancez d’un mois.</p>';
  const lignes = partis.map((p) => [p, ref[p.id] ?? 0]).sort((a, b) => b[1] - a[1]).map(([p, v]) =>
    `<li class="grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-2 text-sm">
      <span class="font-semibold">${esc(p.sigle)}${p.id === etat.joueur.parti ? ' <span class="sr-only">(votre parti)</span>★' : ''}</span>
      <span class="h-3 bg-[#E8E1CD] rounded" aria-hidden="true"><span class="block h-3 rounded" style="width:${Math.min(100, v * 3)}%;background:${esc(p.couleur)}"></span></span>
      <span class="text-right tabular-nums">${fmt(v)} %</span></li>`).join('');
  return `<ul class="space-y-1">${lignes}</ul><p class="text-xs text-doux mt-2">Estimation simulée, à partir des sièges à l’Assemblée.</p>`;
}
