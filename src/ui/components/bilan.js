// « Ce qui a changé ce mois-ci » : causes observées (registre du moteur) et effets programmés.
import { esc } from '../util.js';
import { principales, prevoir, phraseExplication } from '../../engine/index.js';

export function sectionBilan(etat, donnees) {
  if (etat.tour === 0) return '';
  const observes = principales(etat.explications, etat.tour, 5);
  const prevus = prevoir(etat, 6).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3);
  const li = (e) => `<li class="py-1 border-b border-bord last:border-0">${esc(phraseExplication(e, donnees))}</li>`;
  return `
  <section aria-labelledby="h-bilan" class="mb-6 bg-carte border border-bord rounded-lg p-4 filet-laiton">
    <h2 id="h-bilan" class="font-serif font-bold text-xl mb-2">Ce qui a changé ce mois-ci</h2>
    ${observes.length ? `<p class="text-xs uppercase tracking-wide text-doux mb-1">Observé</p><ul class="text-sm mb-3">${observes.map(li).join('')}</ul>` : '<p class="text-sm text-doux mb-3">Aucune variation notable.</p>'}
    ${prevus.length ? `<p class="text-xs uppercase tracking-wide text-doux mb-1">Prévu (effets déjà programmés, hors aléas)</p><ul class="text-sm">${prevus.map(li).join('')}</ul>` : ''}
  </section>`;
}
