import { esc } from '../util.js';
import { DISCLAIMER } from './accueil.js';
import { libelleRole } from '../components/parlement.js';

/** Écran d'accueil d'un défi reçu par lien (ctx.defi = { graine, joueur }). */
export function render(racine, etat, dispatch, ctx) {
  const j = ctx.defi.joueur;
  const parti = ctx.partis.find((p) => p.id === j.parti);
  racine.innerHTML = `<section class="max-w-xl mx-auto py-6" aria-labelledby="h-defi">
    <h1 id="h-defi" class="font-serif font-bold text-3xl sm:text-4xl">Un défi vous attend</h1>
    <p class="mt-2 text-lg text-doux">Même départ, même hasard : saurez-vous faire mieux ?</p>
    <dl class="mt-4 bg-carte border border-bord rounded-lg p-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      <dt class="text-doux">Personnage</dt><dd class="font-semibold break-words">${esc(j.nom)}</dd>
      <dt class="text-doux">Parti</dt><dd class="font-semibold">${esc(parti?.nom ?? j.parti)}</dd>
      <dt class="text-doux">Rôle</dt><dd class="font-semibold">${esc(libelleRole(j.role))}</dd>
    </dl>
    <div class="mt-6 border-2 border-encre bg-carte rounded-lg p-4" role="note">
      <h2 class="font-serif font-bold text-lg">Avertissement</h2>
      <p class="mt-1">${esc(DISCLAIMER)}</p>
      <label class="flex items-start gap-3 mt-4 cursor-pointer">
        <input type="checkbox" id="accept" class="mt-1 w-5 h-5 accent-[#1E4ED8]" ${ctx.accepte ? 'checked' : ''}>
        <span>J’ai lu et j’accepte cet avertissement.</span>
      </label>
    </div>
    <div class="mt-6 flex flex-col sm:flex-row gap-3">
      <button type="button" class="btn btn-p" id="relever" ${ctx.accepte ? '' : 'disabled'}>Relever le défi</button>
      <button type="button" class="btn btn-s" id="annuler">Retour à l’accueil</button>
    </div>
  </section>`;
  racine.querySelector('#accept').addEventListener('change', (e) => dispatch({ type: 'accepter', valeur: e.target.checked }));
  racine.querySelector('#relever').addEventListener('click', () => dispatch({ type: 'relever' }));
  racine.querySelector('#annuler').addEventListener('click', () => dispatch({ type: 'abandonnerDefi' }));
}
