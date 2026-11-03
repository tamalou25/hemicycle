import { esc, fmt } from '../util.js';

const CHAMBRES = { assemblee: 'Assemblée nationale', senat: 'Sénat', censure: 'Motion de censure (49.3)' };

/** Résultat du dernier vote avec détail par groupe (Assemblée, Sénat ou censure) et motion spontanée. */
export function blocVote(etat, lois, partis, senat) {
  const motion = etat.motion ? blocMotion(etat.motion) : '';
  const v = etat.dernierVote;
  if (!v) return `${motion}<p class="text-sm text-doux">Aucun vote ce mois-ci.</p>`;
  const loi = lois.find((l) => l.id === v.loi);
  const censure = v.chambre === 'censure';
  const total = censure ? (v.requis || 1) : (v.pour + v.contre || 1);
  const couleurDe = (id) => {
    const p = partis.find((x) => x.id === id) ?? partis.find((x) => x.id === senat?.groupes?.find((g) => g.id === id)?.partis?.[0]);
    return p?.couleur ?? '#8A8A8A';
  };
  const lignes = [...v.detail].sort((a, b) => b.sieges - a.sieges).map((d) => {
    const pour = d.vote === 'pour';
    const lib = censure ? (pour ? 'Censure' : 'Ne censure pas') : (pour ? 'Pour' : 'Contre');
    const bon = censure ? !pour : pour;
    return `<li class="flex justify-between gap-2 py-1 border-b border-bord last:border-0 text-sm">
      <span><span class="inline-block w-3 h-3 rounded-sm align-middle mr-1" style="background:${esc(couleurDe(d.groupe))}" aria-hidden="true"></span>${esc(d.sigle ?? d.groupe)} <span class="text-doux">(${d.sieges} sièges)</span></span>
      <span class="${bon ? 'text-[#1F6E43]' : 'text-rouge'} font-semibold">${lib}</span></li>`;
  }).join('');
  const titre = censure
    ? `<span class="${v.adoptee ? 'text-rouge' : 'text-[#1F6E43]'}">motion de censure ${v.adoptee ? 'adoptée' : 'rejetée'}</span>`
    : `<span class="${v.adoptee ? 'text-[#1F6E43]' : 'text-rouge'}">${v.adoptee ? 'adoptée' : 'rejetée'}</span>`;
  const barre = censure
    ? `<div style="width:${Math.min(100, (v.pour / total) * 100)}%;background:#B3262B"></div>`
    : `<div style="width:${(v.pour / total) * 100}%;background:#1F6E43"></div><div style="width:${(v.contre / total) * 100}%;background:#B3262B"></div>`;
  const chiffres = censure ? `${v.pour} voix pour la censure, ${v.requis} requises` : `${v.pour} pour, ${v.contre} contre`;
  return `${motion}<p class="text-xs text-doux">${esc(CHAMBRES[v.chambre] ?? v.chambre)}</p>
    <p class="font-semibold">« ${esc(loi?.titre ?? v.loi)} » : ${titre}</p>
    <div class="h-3 flex rounded overflow-hidden my-2 bg-[#E8E1CD]" aria-hidden="true">${barre}</div>
    <p class="text-sm mb-2">${chiffres}</p>
    <details><summary class="cursor-pointer text-sm underline text-bleu">Détail par groupe</summary><ul class="mt-2">${lignes}</ul></details>`;
}

function blocMotion(m) {
  return `<p class="text-sm mb-2 p-2 border-l-4 border-rouge bg-[#F6EDEB]"><strong>Motion de censure spontanée :</strong> ${m.pour} voix pour, ${m.requis} requises. ${m.adoptee ? 'Adoptée.' : 'Rejetée.'}</p>`;
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
