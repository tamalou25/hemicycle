// Section « Budget de l'État » (Premier ministre) : deux curseurs et aperçu en direct.
import { esc, fmt } from '../util.js';
import { LEVIERS, effetsBudget, raisonRefusBudget } from '../../engine/index.js';

const LIB = { chomage: 'Chômage', croissance: 'Croissance', deficit: 'Déficit', popularite: 'Popularité', tensions: 'Tensions' };
const signe = (n) => (n > 0 ? '+' : n < 0 ? '−' : '');
const fmtPt = (n) => `${signe(n)}${fmt(Math.abs(n), 1)}`;

function apercu(d, i) {
  const l = effetsBudget({ depenses: d, impots: i });
  if (!l.length) return '<li class="text-doux">Aucun effet (budget neutre).</li>';
  return l.map((e) => `<li>${esc(LIB[e.indicateur] ?? e.indicateur)} : <strong>${e.valeur > 0 ? '↑' : '↓'} ${signe(e.valeur)}${fmt(Math.abs(e.valeur), 2)}</strong>
    <span class="text-doux">(dans ${e.delaiMois} mois, sur ${e.duree} mois)</span></li>`).join('');
}

export function sectionBudget(etat, ctx) {
  if (etat.joueur.role !== 'premier_ministre') return '';
  const refus = raisonRefusBudget(etat);
  const b = ctx.brouillonBudget ?? { depenses: 0, impots: 0 };
  const curseur = (k, label) => {
    const [min, max] = LEVIERS[k];
    return `<div><label for="bud-${k}" class="font-semibold">${label} : <output id="val-${k}" for="bud-${k}">${fmtPt(b[k])}</output> pt de PIB</label>
      <input type="range" id="bud-${k}" data-levier="${k}" min="${min}" max="${max}" step="0.5" value="${b[k]}" class="w-full mt-1" aria-valuetext="${fmtPt(b[k])} point de PIB">
      <div class="flex justify-between text-xs text-doux" aria-hidden="true"><span>${min}</span><span>0</span><span>+${max}</span></div></div>`;
  };
  return `<section aria-labelledby="h-bud" class="mb-6 bg-carte border border-bord rounded-lg p-4">
    <h2 id="h-bud" class="font-serif font-bold text-xl mb-2">Budget de l’État</h2>
    <div class="grid md:grid-cols-2 gap-4">${curseur('depenses', 'Dépenses publiques')}${curseur('impots', 'Impôts')}</div>
    <h3 class="font-semibold mt-3 text-sm">Effets attendus</h3>
    <ul id="bud-apercu" aria-live="polite" class="text-sm">${apercu(b.depenses, b.impots)}</ul>
    <button type="button" id="bud-voter" class="btn btn-p mt-3" ${refus ? 'disabled aria-describedby="bud-raison"' : ''}>Faire voter le budget</button>
    ${refus ? `<p id="bud-raison" class="text-sm text-doux mt-1">${esc(refus)}</p>` : ''}
  </section>`;
}

export function brancherBudget(racine, dispatch, ctx) {
  const b = ctx.brouillonBudget ?? (ctx.brouillonBudget = { depenses: 0, impots: 0 });
  racine.querySelectorAll('[data-levier]').forEach((inp) => inp.addEventListener('input', () => {
    b[inp.dataset.levier] = Number(inp.value);
    racine.querySelector(`#val-${inp.dataset.levier}`).textContent = fmtPt(b[inp.dataset.levier]);
    inp.setAttribute('aria-valuetext', `${fmtPt(b[inp.dataset.levier])} point de PIB`);
    racine.querySelector('#bud-apercu').innerHTML = apercu(b.depenses, b.impots);
  }));
  racine.querySelector('#bud-voter')?.addEventListener('click', () => dispatch({ type: 'budget', depenses: b.depenses, impots: b.impots }));
}
