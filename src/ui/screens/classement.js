import { esc, MOIS } from '../util.js';

export function render(racine, etat, dispatch, ctx) {
  const liste = ctx.classement ?? [];
  const nomParti = (id) => ctx.partis.find((p) => p.id === id)?.sigle ?? id;
  const lignes = liste.map((e, i) => `<tr class="border-t border-bord">
      <th scope="row" class="px-2 py-2 text-left tabular-nums">${i + 1}</th>
      <td class="px-2 py-2 break-words">${esc(e.nom)}</td>
      <td class="px-2 py-2">${esc(nomParti(e.parti))}</td>
      <td class="px-2 py-2">${esc(e.titre)}</td>
      <td class="px-2 py-2 text-right font-semibold tabular-nums">${esc(e.score)}</td>
      <td class="px-2 py-2 text-right tabular-nums">${esc(e.mois)}</td>
      <td class="px-2 py-2 whitespace-nowrap">${esc(e.date)}</td></tr>`).join('');
  racine.innerHTML = `<section class="max-w-3xl mx-auto py-4" aria-labelledby="h-cl">
    <h1 id="h-cl" class="font-serif font-bold text-3xl">Classement</h1>
    <p class="mt-1 text-sm text-doux">Classement enregistré sur cet appareil uniquement.</p>
    ${liste.length ? `<div class="mt-4 bg-carte border border-bord rounded-lg overflow-x-auto"><table class="w-full text-sm">
      <caption class="sr-only">Meilleures parties sur cet appareil, classées par score de bilan</caption>
      <thead class="bg-[#EFE9D6]"><tr>
        <th scope="col" class="px-2 py-2 text-left">Rang</th><th scope="col" class="px-2 py-2 text-left">Nom</th>
        <th scope="col" class="px-2 py-2 text-left">Parti</th><th scope="col" class="px-2 py-2 text-left">Titre de fin</th>
        <th scope="col" class="px-2 py-2 text-right">Score</th><th scope="col" class="px-2 py-2 text-right">Mois</th>
        <th scope="col" class="px-2 py-2 text-left">Date</th></tr></thead><tbody>${lignes}</tbody></table></div>`
    : '<p class="mt-4 bg-carte border border-bord rounded-lg p-4">Aucune partie terminée pour le moment.</p>'}
    <div class="mt-6 flex gap-3 flex-wrap items-center">
      <button type="button" id="retour" class="btn btn-p">Retour à l’accueil</button>
      ${liste.length && !ctx.confirmEffacer ? '<button type="button" id="effacer" class="btn btn-s">Effacer</button>' : ''}
    </div>
    ${ctx.confirmEffacer ? `<div role="alertdialog" aria-labelledby="t-conf" class="mt-4 border-2 border-rouge bg-white rounded-lg p-4">
      <p id="t-conf" class="font-semibold">Effacer définitivement le classement de cet appareil ?</p>
      <div class="mt-3 flex gap-3 flex-wrap"><button type="button" id="confirmer" class="btn btn-p">Oui, effacer</button><button type="button" id="annuler" class="btn btn-s">Annuler</button></div></div>` : ''}
  </section>`;
  const $ = (s) => racine.querySelector(s);
  $('#retour').addEventListener('click', () => dispatch({ type: 'aller', ecran: 'accueil' }));
  $('#effacer')?.addEventListener('click', () => dispatch({ type: 'effacerClassement', etape: 'demande' }));
  $('#confirmer')?.addEventListener('click', () => dispatch({ type: 'effacerClassement', etape: 'confirme' }));
  $('#annuler')?.addEventListener('click', () => dispatch({ type: 'effacerClassement', etape: 'annule' }));
  if (ctx.confirmEffacer) $('#annuler').focus();
}
