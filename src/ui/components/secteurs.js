// Panneau « Secteurs » : six niveaux (0-100) et programmes nationaux en cours.
import { esc } from '../util.js';

const STATUT_PROG = { preparation: 'En préparation', montee: 'Montée en charge', en_oeuvre: 'En œuvre' };

export function panneauSecteurs(etat, ctx) {
  const pol = ctx.politiques;
  if (!etat.secteurs || !pol) return '';
  const jauges = Object.entries(pol.secteurs).map(([id, s]) => {
    const v = Math.round(etat.secteurs[id] ?? 0);
    return `<li class="text-sm"><div class="flex justify-between"><span>${esc(s.nom)}</span><strong class="tabular-nums">${v}</strong></div>
      <div class="h-2.5 bg-[#E8E1CD] rounded overflow-hidden" role="meter" aria-label="${esc(s.nom)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}"><div class="h-full bg-bleu" style="width:${v}%"></div></div></li>`;
  }).join('');
  const progs = (etat.politiques ?? []).map((x) => {
    const p = pol.politiques.find((y) => y.id === x.id);
    const reste = Math.max(0, x.enService - etat.tour);
    return `<li class="text-sm py-1 border-b border-bord last:border-0">${esc(p?.titre ?? x.id)} <span class="text-xs text-doux">· ${esc(STATUT_PROG[x.statut] ?? x.statut)}${x.statut === 'preparation' ? ` · effets dans ${reste} mois` : ''}</span></li>`;
  }).join('') || '<li class="text-sm text-doux">Aucun programme engagé. Voir l’onglet Décisions.</li>';
  return `<details class="mb-4 bg-carte border border-bord rounded-lg px-4 pb-3" id="secteurs">
    <summary class="min-h-[44px] flex items-center justify-between gap-2 cursor-pointer"><h2 id="h-sect" class="font-serif font-bold text-xl">Secteurs</h2><span class="text-sm text-bleu underline">Afficher le détail</span></summary>
    <div class="grid md:grid-cols-2 gap-4"><ul class="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-4 gap-y-2 content-start">${jauges}</ul>
    <div><h3 class="font-semibold text-sm mb-1">Programmes en cours</h3><ul>${progs}</ul></div></div></details>`;
}
