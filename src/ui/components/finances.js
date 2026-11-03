// Volet « Budget » : enveloppe d'investissement, coûts récurrents, projets lancés.
import { esc, fmt } from '../util.js';
import { statutProjet } from './carte.js';

export function sectionFinances(etat, ctx) {
  const f = etat.finances ?? { enveloppe: 0, recurrent: 0 };
  const liste = (etat.projets ?? []).map((p) => {
    const def = ctx.projets.projets.find((x) => x.id === p.projetId);
    const reg = ctx.regions.regions.find((r) => r.id === p.region);
    return `<li class="py-2 border-b border-bord last:border-0 text-sm"><strong>${esc(def?.titre ?? p.projetId)}</strong> · ${esc(reg?.nom ?? p.region)}<br><span class="text-doux">${esc(def ? statutProjet(p, etat, def) : p.statut)}</span>${p.alea ? `<br><span class="text-bordeaux">Aléa : ${esc(p.alea)}</span>` : ''}</li>`;
  }).join('');
  return `<section aria-labelledby="h-fin" class="mb-6 bg-carte border border-bord rounded-lg p-4 filet-laiton">
    <h2 id="h-fin" class="font-serif font-bold text-xl mb-2">Investissements territoriaux</h2>
    <dl class="grid sm:grid-cols-2 gap-3 mb-3">
      <div class="border border-bord rounded p-3 bg-white"><dt class="text-sm text-doux">Enveloppe d’investissement disponible</dt><dd class="font-serif font-bold text-2xl">${fmt(f.enveloppe, 2)} Md€</dd></div>
      <div class="border border-bord rounded p-3 bg-white"><dt class="text-sm text-doux">Coûts de fonctionnement récurrents</dt><dd class="font-serif font-bold text-2xl">${fmt(f.recurrent, 2)} Md€/an</dd><dd class="text-xs text-doux">Ils pèsent sur le déficit.</dd></div>
    </dl>
    <h3 class="font-serif font-bold text-lg">Projets lancés</h3>
    ${liste ? `<ul>${liste}</ul>` : '<p class="text-sm text-doux">Aucun projet lancé. Choisissez une région dans l’onglet Carte.</p>'}
  </section>`;
}
