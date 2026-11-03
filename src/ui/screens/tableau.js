import { esc, fmt, MOIS, THEMES } from '../util.js';
import { dateDuTour, raisonRefus } from '../../engine/index.js';
import { jauge, INDICATEURS_JAUGE } from '../components/jauge.js';
import { carteLoi } from '../components/carteLoi.js';
import { blocVote, blocSondage } from '../components/vote.js';
import { sectionReactions } from '../components/reactions.js';
import { sectionElections, brancherElections } from '../components/elections.js';
import { sectionEvenement, brancherEvenement } from '../components/evenement.js';
import { sectionBudget, brancherBudget } from '../components/budget.js';
import { boutonPartage, zonePartage, brancherPartage } from '../components/partage.js';
import { sectionParlement, libelleRole } from '../components/parlement.js';

const PASTILLES = { evenement: ['!', 'Événement', 'bg-[#FFF3C4] border-encre'], budget: ['€', 'Budget', 'bg-[#DDE7F7] border-bleu'] };
const pastille = (t) => { const p = PASTILLES[t]; return p ? `<span class="inline-flex items-center justify-center w-5 h-5 text-xs font-bold border rounded-full mr-1 ${p[2]}" title="${p[1]}"><span aria-hidden="true">${p[0]}</span><span class="sr-only">${p[1]} :</span></span>` : ''; };
const LIB = { chomage: 'chômage', croissance: 'croissance', deficit: 'déficit', dette: 'dette', inflation: 'inflation', popularite: 'popularité', tensions: 'tensions' };

export function render(racine, etat, dispatch, ctx) {
  const { lois, partis, situation } = ctx;
  const d = dateDuTour(etat);
  const filtre = ctx.filtreTheme ?? '';
  const parti = partis.find((p) => p.id === etat.joueur.parti);
  const loisAff = lois.filter((l) => !filtre || l.theme === filtre);
  const effets = etat.effetsEnCours.map((e) => {
    const sens = e.parMois >= 0 ? '+' : '−';
    const loi = lois.find((l) => l.id === e.source);
    const statut = etat.tour + 1 < e.debut ? `débute au mois ${e.debut}` : `jusqu’au mois ${e.fin}`;
    return `<li class="text-sm py-1 border-b border-bord last:border-0">${esc(LIB[e.indicateur] ?? e.indicateur)} ${sens}${fmt(Math.abs(e.parMois), 2)}/mois <span class="text-doux">(${esc(loi?.titre ?? e.source)}, ${statut})</span></li>`;
  }).join('') || '<li class="text-sm text-doux">Aucun effet en cours.</li>';
  const journal = [...etat.journal].reverse().slice(0, 30).map((j) =>
    `<li class="text-sm py-1 border-b border-bord last:border-0">${pastille(j.type)}<span class="text-doux">Mois ${j.tour} :</span> ${esc(j.texte)}</li>`).join('');

  racine.innerHTML = `
    ${sectionEvenement(etat, ctx)}
    <p class="text-xs text-doux mb-3">Situation de départ au ${esc(situation.date_collecte)} : Président ${esc(situation.president)}, Premier ministre ${esc(situation.premier_ministre)}.</p>
    <header class="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h1 class="font-serif font-bold text-3xl capitalize">${esc(MOIS[d.mois - 1])} ${d.annee}</h1>
        ${etat.joueur.politicienId ? '<p class="inline-block text-xs font-bold uppercase border-2 border-encre bg-[#FFF3C4] rounded px-2 py-0.5 mb-1">Mode élu réel (simulation)</p>' : ''}
        <p class="text-doux">${esc(etat.joueur.nom)}, ${esc(parti?.sigle ?? '')} · ${esc(libelleRole(etat.joueur.role))} · mois ${etat.tour} sur 60</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button type="button" id="suivant" class="btn btn-p">Mois suivant</button>
        <button type="button" id="export" class="btn btn-s">Exporter</button>
        <label for="import" class="btn btn-s cursor-pointer">Importer</label>
        <input type="file" id="import" accept="application/json,.json" class="sr-only">
        ${boutonPartage(etat, 'btn btn-s text-sm')}
      </div>
      ${zonePartage(etat)}
    </header>

    <section aria-labelledby="h-ind" class="mb-6">
      <h2 id="h-ind" class="font-serif font-bold text-xl mb-2">Indicateurs</h2>
      <div class="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3">${INDICATEURS_JAUGE.map((i) => jauge(i, etat)).join('')}</div>
      <p class="mt-3 text-sm">Dette publique : <strong>${fmt(etat.indicateurs.dette)} % du PIB</strong> ·
        Capital politique : <strong id="capital">${etat.joueur.capital}</strong>/10</p>
    </section>

    ${sectionBudget(etat, ctx)}

    ${sectionElections(etat, ctx)}

    ${sectionParlement(etat, ctx)}

    ${sectionReactions(etat, ctx)}

    <div class="grid lg:grid-cols-2 gap-6 mb-6">
      <section aria-labelledby="h-son" class="bg-carte border border-bord rounded-lg p-4">
        <h2 id="h-son" class="font-serif font-bold text-xl mb-2">Sondage, intentions de vote</h2>${blocSondage(etat, partis)}</section>
      <section aria-labelledby="h-vote" class="bg-carte border border-bord rounded-lg p-4">
        <h2 id="h-vote" class="font-serif font-bold text-xl mb-2">Dernier vote</h2>${blocVote(etat, lois, partis, ctx.senat)}</section>
    </div>

    <section aria-labelledby="h-lois" class="mb-6">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 id="h-lois" class="font-serif font-bold text-xl">Lois</h2>
        <div><label for="theme" class="text-sm mr-2">Thème</label>
          <select id="theme" class="champ !w-auto"><option value="">Tous</option>
          ${Object.entries(THEMES).map(([k, v]) => `<option value="${k}" ${k === filtre ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      </div>
      <p class="text-sm text-doux mb-2">Un seul texte à la fois en navette ; une action au Parlement par mois.</p>
      <div class="grid md:grid-cols-2 gap-3">${loisAff.map((l) => carteLoi(l, etat, raisonRefus(etat, l))).join('')}</div>
    </section>

    <div class="grid lg:grid-cols-2 gap-6">
      <section aria-labelledby="h-eff" class="bg-carte border border-bord rounded-lg p-4"><h2 id="h-eff" class="font-serif font-bold text-xl mb-2">Effets en cours</h2><ul>${effets}</ul></section>
      <section aria-labelledby="h-jou" class="bg-carte border border-bord rounded-lg p-4"><h2 id="h-jou" class="font-serif font-bold text-xl mb-2">Journal</h2><ul>${journal}</ul></section>
    </div>`;

  brancherPartage(racine, etat);
  racine.querySelector('#suivant').addEventListener('click', () => dispatch({ type: 'suivant' }));
  racine.querySelector('#export').addEventListener('click', () => dispatch({ type: 'exporter' }));
  racine.querySelector('#import').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (f) dispatch({ type: 'importer', texte: await f.text() });
  });
  brancherEvenement(racine, dispatch);
  brancherBudget(racine, dispatch, ctx);
  brancherElections(racine, dispatch);
  racine.querySelector('#theme').addEventListener('change', (e) => dispatch({ type: 'filtre', theme: e.target.value }));
  racine.querySelector('[data-amender]')?.addEventListener('click', () => dispatch({ type: 'amender' }));
  racine.querySelector('[data-493]')?.addEventListener('click', () => dispatch({ type: '493' }));
  racine.querySelectorAll('[data-negocier]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'negocier', parti: b.dataset.negocier })));
  racine.querySelectorAll('[data-proposer]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'proposer', loi: b.dataset.proposer })));
}
