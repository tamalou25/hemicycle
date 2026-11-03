// Projet de loi de finances (PLF) : curseurs par poste, aperçu en direct, dépôt, 49.3.
import { esc, fmt } from '../util.js';
import { SECTEURS, RECETTES, VARIATION_MAX, chiffrerPLF, orientationPLF, normaliserPLF, raisonRefusPLF, groupesAssemblee, voterBudgetAssemblee } from '../../engine/index.js';
import { LIB_DEPENSES, LIB_RECETTES, fmtMd, tableauDeBord, sectionFinances } from './finances.js';

const sg = (n) => (n > 0 ? '+' : n < 0 ? '−' : '');
const fmtPct = (n) => `${sg(n)}${fmt(Math.abs(n), 1)} %`;

const brouillon = (ctx) => (ctx.brouillonPLF ??= { depenses: {}, recettes: {} });

function libelleOrientation(o) {
  return o <= -15 ? 'plutôt à gauche' : o >= 15 ? 'plutôt à droite' : 'au centre';
}

/** Aperçu en direct : effet sur le solde, orientation, vote probable. */
function apercu(etat, ctx, b) {
  const plf = normaliserPLF(b);
  const c = chiffrerPLF(etat.budget, plf);
  const o = orientationPLF(plf);
  const AN = groupesAssemblee(ctx.partis, etat.sieges);
  const v = voterBudgetAssemblee(etat, AN, plf);
  const liste = (vote) => v.detail.filter((g) => g.vote === vote).map((g) => esc(g.sigle) + (g.opposition ? ' (opposition)' : '')).join(', ') || '—';
  const mieux = c.deltaSolde >= 0;
  return `<dl class="grid min-[420px]:grid-cols-2 gap-3">
      <div class="border border-bord rounded p-3 bg-white"><dt class="text-sm text-doux">Effet sur le solde</dt>
        <dd class="font-serif font-bold text-xl ${mieux ? 'text-bleu' : 'text-rouge'}">${fmtMd(c.deltaSolde, 1)} Md€ <span class="text-sm font-sans">${mieux ? '(amélioration)' : '(dégradation)'}</span></dd>
        <dd class="text-xs text-doux">Déficit : ${fmtMd(c.deltaDeficitPts, 2)} pt de PIB</dd></div>
      <div class="border border-bord rounded p-3 bg-white"><dt class="text-sm text-doux">Orientation politique</dt>
        <dd class="font-serif font-bold text-xl">${libelleOrientation(o)}</dd></div>
    </dl>
    <div class="mt-3 border border-bord rounded p-3 bg-white">
      <p class="font-semibold">Vote probable à l’Assemblée <span class="text-xs uppercase border border-encre rounded px-1.5 py-0.5 ml-1">estimation</span></p>
      <p class="font-serif font-bold text-xl ${v.adoptee ? 'text-bleu' : 'text-rouge'}">${v.pour} pour / ${v.contre} contre</p>
      <p class="text-sm"><strong>Pour :</strong> ${liste('pour')}</p>
      <p class="text-sm"><strong>Contre :</strong> ${liste('contre')}</p>
    </div>`;
}

export function sectionBudget(etat, ctx) {
  const tdb = tableauDeBord(etat);
  const suite = sectionFinances(etat, ctx);
  if (etat.joueur.role !== 'premier_ministre') {
    return `${tdb}<section class="mb-6 bg-carte border border-bord rounded-lg p-4"><h2 class="font-serif font-bold text-xl mb-1">Budget de l’État</h2>
      <p class="text-sm">Le budget est présenté par le gouvernement. En tant que député, vous le votez ou le combattez au Parlement.</p></section>${suite}`;
  }
  if (!etat.budget) return `${tdb}${suite}`;
  const b = brouillon(ctx);
  const refus = raisonRefusPLF(etat);
  const c = chiffrerPLF(etat.budget, normaliserPLF(b));
  const curseur = (type, k, nom, md) => {
    const val = b[type][k] ?? 0;
    const id = `plf-${type}-${k}`;
    return `<div class="py-1"><label for="${id}" class="font-semibold text-sm block">${nom} : <output id="val-${id}" for="${id}">${fmtPct(val)}</output> <span class="text-doux font-normal">(<span id="md-${id}">${fmtMd(md, 1)}</span> Md€)</span></label>
      <input type="range" id="${id}" data-plf="${type}" data-k="${k}" min="${-VARIATION_MAX}" max="${VARIATION_MAX}" step="0.5" value="${val}" aria-valuetext="${fmtPct(val)}, ${fmtMd(md, 1)} milliards d’euros"></div>`;
  };
  const enCours = etat.plf;
  return `${tdb}
  <section aria-labelledby="h-bud" class="mb-6 bg-carte border border-bord rounded-lg p-4">
    <h2 id="h-bud" class="font-serif font-bold text-xl mb-2">Projet de loi de finances</h2>
    ${enCours ? `<div class="border-l-4 border-laiton bg-[#FFF3C4] p-3 mb-3" role="status"><p class="font-semibold">En discussion, vote à la fin du mois.</p>
      ${etat.plf.recours493 ? '<p class="text-sm">49.3 engagé : le budget passera sauf motion de censure adoptée.</p>'
        : ctx.confirm493 ? `<p class="text-sm mt-1">Le 49.3 expose le gouvernement à une motion de censure. Confirmer ?</p>
          <div class="flex flex-wrap gap-2 mt-2"><button type="button" id="plf-493-ok" class="btn btn-p">Oui, engager le 49.3</button><button type="button" id="plf-493-non" class="btn btn-s">Annuler</button></div>`
        : '<button type="button" id="plf-493" class="btn btn-s mt-2">Engager le 49.3 sur le budget</button><p class="text-xs text-doux mt-1">Risque de motion de censure.</p>'}
    </div>` : `<p class="text-sm text-doux mb-3">Variation annuelle de chaque poste, de −${VARIATION_MAX} % à +${VARIATION_MAX} %. Le vote a lieu à la fin du mois du dépôt.</p>
    <div class="grid md:grid-cols-2 gap-x-6 gap-y-3">
      <fieldset><legend class="font-serif font-bold text-lg mb-1">Dépenses</legend>${SECTEURS.map((k) => curseur('depenses', k, LIB_DEPENSES[k], c.dD[k])).join('')}</fieldset>
      <fieldset><legend class="font-serif font-bold text-lg mb-1">Recettes</legend>${RECETTES.map((k) => curseur('recettes', k, LIB_RECETTES[k], c.dR[k])).join('')}</fieldset>
    </div>
    <h3 class="font-serif font-bold text-lg mt-4 mb-1">Aperçu</h3>
    <div id="plf-apercu" aria-live="polite">${apercu(etat, ctx, b)}</div>
    <div class="flex flex-wrap gap-2 mt-3"><button type="button" id="plf-deposer" class="btn btn-p" ${refus ? 'disabled aria-describedby="plf-raison"' : ''}>Déposer le projet de loi de finances</button>
      <button type="button" id="plf-zero" class="btn btn-s">Réinitialiser</button></div>
    ${refus ? `<p id="plf-raison" class="text-sm text-doux mt-1">${esc(refus)}</p>` : ''}`}
  </section>${suite}`;
}

export function brancherBudget(racine, dispatch, ctx, etat) {
  const b = brouillon(ctx);
  racine.querySelectorAll('[data-plf]').forEach((inp) => inp.addEventListener('input', () => {
    b[inp.dataset.plf][inp.dataset.k] = Number(inp.value);
    const c = chiffrerPLF(etat.budget, normaliserPLF(b));
    const id = inp.id, md = (inp.dataset.plf === 'depenses' ? c.dD : c.dR)[inp.dataset.k];
    racine.querySelector(`#val-${id}`).textContent = fmtPct(Number(inp.value));
    racine.querySelector(`#md-${id}`).textContent = fmtMd(md, 1);
    inp.setAttribute('aria-valuetext', `${fmtPct(Number(inp.value))}, ${fmtMd(md, 1)} milliards d’euros`);
    racine.querySelector('#plf-apercu').innerHTML = apercu(etat, ctx, b);
  }));
  racine.querySelector('#plf-deposer')?.addEventListener('click', () => dispatch({ type: 'plf-deposer', plf: b }));
  racine.querySelector('#plf-zero')?.addEventListener('click', () => dispatch({ type: 'ui', patch: { brouillonPLF: null } }));
  racine.querySelector('#plf-493')?.addEventListener('click', () => dispatch({ type: 'ui', patch: { confirm493: true } }));
  racine.querySelector('#plf-493-non')?.addEventListener('click', () => dispatch({ type: 'ui', patch: { confirm493: false } }));
  racine.querySelector('#plf-493-ok')?.addEventListener('click', () => dispatch({ type: 'plf-493' }));
}
