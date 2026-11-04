import { esc, fmt } from '../util.js';
import { BORNES } from '../../engine/index.js';

// sens : +1 si une valeur haute est bonne, -1 si mauvaise.
export const META = {
  chomage: { label: 'Chômage', unite: ' %', sens: -1 },
  croissance: { label: 'Croissance', unite: ' %', sens: 1 },
  deficit: { label: 'Déficit', unite: ' % du PIB', sens: -1 },
  inflation: { label: 'Inflation', unite: ' %', sens: -1 },
  popularite: { label: 'Popularité', unite: ' %', sens: 1 },
  tensions: { label: 'Tensions', unite: ' /100', sens: -1 },
};
export const INDICATEURS_JAUGE = Object.keys(META);

/** Sparkline SVG simple. */
export function sparkline(valeurs, couleur = '#1E4ED8') {
  if (valeurs.length < 2) return '<span class="text-xs text-doux">—</span>';
  const w = 100, h = 24;
  const min = Math.min(...valeurs), max = Math.max(...valeurs), pas = max - min || 1;
  const pts = valeurs.map((v, i) => `${((i / (valeurs.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / pas) * (h - 4)).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" class="w-full h-6" role="img" aria-label="Évolution sur ${valeurs.length} mois" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${couleur}" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}

/** Jauge d'un indicateur avec valeur, barre et sparkline. */
export function jauge(id, etat) {
  const m = META[id];
  const v = etat.indicateurs[id];
  const [min, max] = BORNES[id];
  const pct = Math.round(((v - min) / (max - min)) * 100);
  const bon = m.sens > 0 ? pct >= 50 : pct <= 50;
  const couleur = bon ? '#157A48' : '#C0262B';
  const hist = etat.historique.map((h) => h[id]);
  return `<div class="bg-carte border border-bord rounded-lg p-3">
    <div class="flex justify-between items-baseline gap-2">
      <span class="text-sm text-doux">${esc(m.label)}</span>
      <span class="font-semibold tabular-nums">${fmt(v)}${esc(m.unite)}</span>
    </div>
    <div class="h-2 bg-[#E3E8F0] rounded mt-2" role="meter" aria-label="${esc(m.label)}" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${v}" aria-valuetext="${fmt(v)}${esc(m.unite)}">
      <div class="h-2 rounded" style="width:${pct}%;background:${couleur}"></div>
    </div>
    <div class="mt-2">${sparkline(hist, couleur)}</div>
  </div>`;
}
