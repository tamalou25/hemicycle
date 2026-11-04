// Choix du niveau de difficulté (lot 5) : trois niveaux, différences explicites, Facile conseillé pour débuter.
import { esc } from '../util.js';
import { NIVEAUX, comparerNiveaux } from '../../engine/index.js';

const fmtVal = (cle, v) => (cle === 'capital_bonus' ? `${v > 0 ? '+' : ''}${v}` : `× ${String(v).replace('.', ',')}`);

/** Fieldset des niveaux (radios) avec tableau comparatif repliable. `choisi` : niveau coché. */
export function fieldsetDifficulte(ctx, choisi, { nom = 'difficulte', aide = '' } = {}) {
  const d = ctx.difficulte;
  if (!d) return '';
  const lignes = comparerNiveaux({ difficulte: d }).map((l) => `<tr class="border-t border-bord"><th scope="row" class="font-normal text-left py-1 pr-2">${esc(l.libelle)}</th>${NIVEAUX.map((n) => `<td class="tabular-nums text-center">${esc(fmtVal(l.cle, l.valeurs[n]))}</td>`).join('')}</tr>`).join('');
  return `<fieldset class="bg-carte border border-bord rounded-lg p-4 mb-4" aria-describedby="${esc(nom)}-aide">
    <legend class="font-serif font-bold px-1">Difficulté</legend>
    <p id="${esc(nom)}-aide" class="text-sm text-doux mb-2">${esc(aide || 'Elle règle des paramètres explicites (capital, aléas, crises, enveloppe, usure), pas les règles du jeu. Modifiable seulement en commençant une partie ; conservée par la sauvegarde et les défis.')}</p>
    <ul class="grid sm:grid-cols-3 gap-2">${NIVEAUX.map((n) => `<li><label class="flex items-start gap-3 min-h-[44px] p-2 rounded-lg border ${choisi === n ? 'border-bleu bg-[#E8F1FB]' : 'border-bord'} cursor-pointer">
      <input type="radio" name="${esc(nom)}" value="${n}" class="mt-1 w-5 h-5 shrink-0" ${choisi === n ? 'checked' : ''}>
      <span class="min-w-0"><strong>${esc(d.niveaux[n].nom)}</strong>${n === d.conseille_debutant ? ' <span class="text-xs font-bold text-bleu">· conseillé pour débuter</span>' : ''}<br><span class="text-xs text-doux">${esc(d.niveaux[n].description)}</span></span></label></li>`).join('')}</ul>
    <details class="mt-2 text-xs"><summary class="cursor-pointer text-bleu underline min-h-[44px] flex items-center">Comparer les trois niveaux</summary>
      <table class="w-full mt-1"><caption class="sr-only">Paramètres par niveau</caption><thead><tr><th scope="col" class="text-left font-normal text-doux">Paramètre</th>${NIVEAUX.map((n) => `<th scope="col" class="font-semibold">${esc(d.niveaux[n].nom)}</th>`).join('')}</tr></thead><tbody>${lignes}</tbody></table></details>
  </fieldset>`;
}
