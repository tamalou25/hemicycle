import { esc, fmt, MOIS } from '../util.js';
import { dateDuTour, evaluerFin } from '../../engine/index.js';

const evo = (etat, id, unite) => {
  const h = etat.historique;
  const a = h[0]?.[id] ?? etat.indicateurs[id];
  const b = etat.indicateurs[id];
  return `<dt>${id === 'chomage' ? 'Chômage' : id === 'croissance' ? 'Croissance' : 'Déficit'}</dt><dd class="text-right font-semibold tabular-nums">${fmt(a)} → ${fmt(b)}${unite}</dd>`;
};

export function render(racine, etat, dispatch) {
  const d = dateDuTour(etat);
  const i = etat.indicateurs;
  const f = evaluerFin(etat);
  const elu = etat.fin.type === 'victoire';
  const nbElections = (etat.resultatsElections ?? []).length;
  const couleur = f.score >= 55 ? '#1F6E43' : f.score >= 35 ? '#8A5A00' : '#B3262B';
  racine.innerHTML = `<section class="max-w-xl mx-auto py-4">
    <h1 class="font-serif font-bold text-3xl">${esc(f.titre)}</h1>
    ${elu ? '<p class="mt-2"><span class="inline-block text-xs font-bold uppercase border-2 border-encre bg-[#FFF3C4] rounded px-2 py-0.5">Simulation</span></p>' : ''}
    <p class="mt-2 text-lg">${esc(f.texte)}</p>
    ${etat.fin.texte ? `<p class="mt-1 text-doux">${esc(etat.fin.texte)}</p>` : ''}
    ${elu ? '<p class="mt-2 text-sm text-doux">Résultat issu d’un scrutin simulé, sans lien avec une élection réelle.</p>' : ''}
    <div class="bg-carte border border-bord rounded-lg p-4 mt-4">
      <div class="flex justify-between items-baseline"><h2 class="font-serif font-bold text-xl">Score de bilan</h2><span class="text-2xl font-bold tabular-nums">${f.score}<span class="text-sm text-doux"> /100</span></span></div>
      <div class="h-3 bg-[#E8E1CD] rounded mt-2" role="meter" aria-label="Score de bilan" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${f.score}" aria-valuetext="${f.score} sur 100"><div class="h-3 rounded" style="width:${f.score}%;background:${couleur}"></div></div>
    </div>
    <div class="bg-carte border border-bord rounded-lg p-4 mt-4">
      <h2 class="font-serif font-bold text-xl mb-1">Bilan de ${esc(etat.joueur.nom)}</h2>
      <p class="text-sm text-doux mb-3">${esc(MOIS[d.mois - 1])} ${d.annee}, après ${etat.tour} mois</p>
      <dl class="grid grid-cols-2 gap-y-1 text-sm">
        <dt>Lois adoptées</dt><dd class="text-right font-semibold">${etat.loisAdoptees.length}</dd>
        <dt>Lois rejetées</dt><dd class="text-right font-semibold">${etat.loisRejetees.length}</dd>
        <dt>Élections disputées</dt><dd class="text-right font-semibold">${nbElections}</dd>
        ${evo(etat, 'chomage', ' %')}${evo(etat, 'croissance', ' %')}${evo(etat, 'deficit', ' % du PIB')}
        <dt>Popularité finale</dt><dd class="text-right font-semibold">${fmt(i.popularite)} %</dd>
        <dt>Dette</dt><dd class="text-right font-semibold">${fmt(i.dette)} % du PIB</dd>
      </dl>
      <p class="text-xs text-doux mt-2">Évolution : début de mandat → fin.</p>
    </div>
    <div class="mt-6 flex gap-3 flex-wrap">
      <button type="button" id="rejouer" class="btn btn-p">Rejouer</button>
      <button type="button" id="export" class="btn btn-s">Exporter la partie</button>
    </div>
  </section>`;
  racine.querySelector('#rejouer').addEventListener('click', () => dispatch({ type: 'rejouer' }));
  racine.querySelector('#export').addEventListener('click', () => dispatch({ type: 'exporter' }));
}
