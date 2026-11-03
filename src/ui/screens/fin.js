import { esc, fmt, MOIS } from '../util.js';
import { dateDuTour } from '../../engine/index.js';

export function render(racine, etat, dispatch, ctx) {
  const d = dateDuTour(etat);
  const i = etat.indicateurs;
  const victoire = etat.fin.type === 'mandat';
  racine.innerHTML = `<section class="max-w-xl mx-auto py-4">
    <h1 class="font-serif font-bold text-3xl">${victoire ? 'Fin de la législature' : 'Fin de partie'}</h1>
    <p class="mt-2 text-lg">${esc(etat.fin.texte)}</p>
    <div class="bg-carte border border-bord rounded-lg p-4 mt-4">
      <h2 class="font-serif font-bold text-xl mb-2">Bilan de ${esc(etat.joueur.nom)}</h2>
      <p class="text-sm text-doux mb-3">${esc(MOIS[d.mois - 1])} ${d.annee}, après ${etat.tour} mois</p>
      <dl class="grid grid-cols-2 gap-y-1 text-sm">
        <dt>Popularité</dt><dd class="text-right font-semibold">${fmt(i.popularite)} %</dd>
        <dt>Chômage</dt><dd class="text-right font-semibold">${fmt(i.chomage)} %</dd>
        <dt>Croissance</dt><dd class="text-right font-semibold">${fmt(i.croissance)} %</dd>
        <dt>Déficit</dt><dd class="text-right font-semibold">${fmt(i.deficit)} % du PIB</dd>
        <dt>Inflation</dt><dd class="text-right font-semibold">${fmt(i.inflation)} %</dd>
        <dt>Tensions</dt><dd class="text-right font-semibold">${fmt(i.tensions, 0)} /100</dd>
        <dt>Dette</dt><dd class="text-right font-semibold">${fmt(i.dette)} % du PIB</dd>
        <dt>Lois adoptées</dt><dd class="text-right font-semibold">${etat.loisAdoptees.length}</dd>
        <dt>Lois rejetées</dt><dd class="text-right font-semibold">${etat.loisRejetees.length}</dd>
      </dl>
    </div>
    <div class="mt-6 flex gap-3 flex-wrap">
      <button type="button" id="rejouer" class="btn btn-p">Rejouer</button>
      <button type="button" id="export" class="btn btn-s">Exporter la partie</button>
    </div>
  </section>`;
  racine.querySelector('#rejouer').addEventListener('click', () => dispatch({ type: 'rejouer' }));
  racine.querySelector('#export').addEventListener('click', () => dispatch({ type: 'exporter' }));
}
