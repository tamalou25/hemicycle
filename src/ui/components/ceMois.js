// « Ce mois-ci » : bonnes nouvelles et points de vigilance, avec détail et prévisions repliables.
import { esc } from '../util.js';
import { principales, prevoir, phraseExplication } from '../../engine/index.js';
import { SEUIL_AFFICHAGE } from './etatPays.js';

const SENS = { chomage: -1, croissance: 1, deficit: -1, dette: -1, popularite: 1, tensions: -1, emploi: 1, sante: 1, transports: 1 };
const MAX = 3; // sur mobile, 2 par liste (le détail complet reste dans « Détail complet et prévisions »)

/** +1 favorable, -1 défavorable, pour une variation d'un indicateur (l'inflation vise 2 %). */
function qualite(e, etat) {
  // Inflation : mieux si la variation la rapproche de la cible de 2 % (comparer la distance avant / après)
  if (e.indicateur === 'inflation') { const apres = etat.indicateurs.inflation, avant = apres - e.delta; return Math.sign(Math.abs(avant - 2) - Math.abs(apres - 2)); }
  if (e.indicateur?.startsWith('secteur:')) return Math.sign(e.delta);
  return (SENS[e.indicateur] ?? 0) * Math.sign(e.delta);
}
// 2 décimales : une variation affichée (≥ 0,05) ne doit jamais apparaître comme « −0 »
const arrondi = (e) => ({ ...e, delta: Math.round(e.delta * 100) / 100 });

export function sectionCeMois(etat, donnees, avant = '') {
  if (etat.tour === 0) return '';
  const tous = principales(etat.explications, etat.tour, 50);
  // L'usure lente (secteurs, services) revient chaque mois : elle reste dans le détail, pas dans les points saillants
  const visibles = tous.filter((e) => Math.abs(e.delta) >= SEUIL_AFFICHAGE && e.type !== 'usure');
  const bonnes = visibles.filter((e) => qualite(e, etat) > 0).slice(0, MAX);
  const vigilance = visibles.filter((e) => qualite(e, etat) < 0).slice(0, MAX);
  const prevus = prevoir(etat, 6).filter((e) => Math.abs(e.delta) >= SEUIL_AFFICHAGE).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5);
  const phrase = (e) => esc(phraseExplication(arrondi(e), donnees));
  const liste = (l, signe) => (l.length ? `<ul class="text-[0.8125rem] leading-snug space-y-1 max-sm:[&>li:nth-child(n+3)]:hidden">${l.map((e) => `<li class="flex gap-1.5"><span aria-hidden="true" class="font-bold shrink-0">${signe}</span><span>${phrase(e)}</span></li>`).join('')}</ul>` : '<p class="text-sm text-doux">Rien de notable.</p>');
  const li = (e) => `<li class="py-1 border-b border-bord last:border-0">${phrase(e)}</li>`;
  return `<section aria-labelledby="h-bilan" class="mb-3">
    <h3 id="h-bilan" class="font-serif font-bold text-lg mb-1">Ce mois-ci</h3>${avant}
    <div class="grid sm:grid-cols-2 gap-3">
      <div class="bg-carte border border-bord border-l-4 border-l-[#1F6E43] rounded-lg px-3 py-2 ${bonnes.length ? '' : 'max-sm:py-1 max-sm:flex max-sm:items-baseline max-sm:gap-2'}"><h3 class="font-semibold text-[#1F6E43] mb-1"><span aria-hidden="true">✓ </span>Bonnes nouvelles</h3>${liste(bonnes, '↑')}</div>
      <div class="bg-carte border border-bord border-l-4 border-l-rouge rounded-lg px-3 py-2 ${vigilance.length ? '' : 'max-sm:py-1 max-sm:flex max-sm:items-baseline max-sm:gap-2'}"><h3 class="font-semibold text-rouge mb-1"><span aria-hidden="true">! </span>Points de vigilance</h3>${liste(vigilance, '↓')}</div>
    </div>
    <details class="mt-2"><summary class="min-h-[44px] flex items-center cursor-pointer underline text-bleu font-semibold">Détail complet et prévisions</summary>
      <div class="bg-carte border border-bord rounded-lg p-3">
        <p class="text-xs uppercase tracking-wide text-doux mb-1">Observé</p>
        ${tous.length ? `<ul class="text-sm mb-3">${tous.map(li).join('')}</ul>` : '<p class="text-sm text-doux mb-3">Aucune variation.</p>'}
        <p class="text-xs uppercase tracking-wide text-doux mb-1">Prévu (effets déjà programmés, hors aléas)</p>
        ${prevus.length ? `<ul class="text-sm">${prevus.map(li).join('')}</ul>` : '<p class="text-sm text-doux">Aucun effet programmé notable.</p>'}
      </div></details></section>`;
}
