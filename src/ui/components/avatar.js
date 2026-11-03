import { esc } from '../util.js';

/** Initiales d'un nom (jamais de photo : règle de contenu). */
export function initiales(nom) {
  const mots = String(nom ?? '').replace(/[-’']/g, ' ').split(/\s+/).filter(Boolean);
  return ((mots[0]?.[0] ?? '') + (mots.length > 1 ? mots[mots.length - 1][0] : '')).toUpperCase();
}

/** Couleur de texte lisible (contraste) sur une pastille de couleur donnée. */
function texteSur(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return l > 0.35 ? '#14213D' : '#FFFFFF';
}

/** Pastille d'initiales aux couleurs du parti (décorative, le nom est toujours à côté). */
export function avatar(nom, parti) {
  const c = parti?.couleur ?? '#555555';
  return `<span aria-hidden="true" class="inline-flex shrink-0 items-center justify-center w-11 h-11 rounded-full font-bold text-sm" style="background:${esc(c)};color:${texteSur(c)}">${esc(initiales(nom))}</span>`;
}
