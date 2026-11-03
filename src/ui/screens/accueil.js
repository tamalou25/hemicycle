import { esc } from '../util.js';

export const DISCLAIMER = 'Simulation fictive. Les événements simulés ne reflètent pas les actions ou propos réels des personnes citées.';

export function render(racine, etat, dispatch, ctx) {
  const sauv = ctx.sauvegardeExiste;
  racine.innerHTML = `
    <section class="max-w-xl mx-auto py-6">
      <h1 class="font-serif font-bold text-4xl sm:text-5xl">Hémicycle</h1>
      <p class="mt-2 text-lg text-doux">Simulation politique de la France, tour par tour : un mois, une décision.</p>
      <div class="mt-6 border-2 border-encre bg-carte rounded-lg p-4" role="note">
        <h2 class="font-serif font-bold text-lg">Avertissement</h2>
        <p class="mt-1">${esc(DISCLAIMER)}</p>
        <label class="flex items-start gap-3 mt-4 cursor-pointer">
          <input type="checkbox" id="accept" class="mt-1 w-5 h-5 accent-[#1F3A6E]" ${ctx.accepte ? 'checked' : ''}>
          <span>J’ai lu et j’accepte cet avertissement.</span>
        </label>
      </div>
      <div class="mt-6 flex flex-col sm:flex-row gap-3">
        <button type="button" class="btn btn-p" id="nouvelle" ${ctx.accepte ? '' : 'disabled'}>Créer mon personnage</button>
        <button type="button" class="btn btn-p" id="elu" ${ctx.accepte ? '' : 'disabled'}>Jouer un élu réel</button>
        <button type="button" class="btn btn-s" id="reprendre" ${ctx.accepte && sauv ? '' : 'disabled'}>Reprendre</button>
        <label class="btn btn-s cursor-pointer ${ctx.accepte ? '' : 'opacity-55'}" for="import">Importer une sauvegarde</label>
        <input type="file" id="import" accept="application/json,.json" class="sr-only" ${ctx.accepte ? '' : 'disabled'}>
      </div>
      ${sauv ? '' : '<p class="text-sm text-doux mt-2">Aucune partie sauvegardée sur cet appareil.</p>'}
    </section>`;
  racine.querySelector('#accept').addEventListener('change', (e) => dispatch({ type: 'accepter', valeur: e.target.checked }));
  racine.querySelector('#nouvelle').addEventListener('click', () => dispatch({ type: 'aller', ecran: 'creation' }));
  racine.querySelector('#elu').addEventListener('click', () => dispatch({ type: 'aller', ecran: 'choixElu' }));
  racine.querySelector('#reprendre').addEventListener('click', () => dispatch({ type: 'reprendre' }));
  racine.querySelector('#import').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (f) dispatch({ type: 'importer', texte: await f.text() });
  });
}
