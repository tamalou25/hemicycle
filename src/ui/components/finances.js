// Volet « Budget » : tableau de bord des finances publiques, puis enveloppe d'investissement et projets.
import { esc, fmt } from '../util.js';
import { statutProjet } from './carte.js';
import { solde } from '../../engine/index.js';

const LIEN_SOURCES = 'https://github.com/tamalou25/hemicycle/blob/main/docs/SOURCES.md';
export const LIB_DEPENSES = { protection_sociale: 'Protection sociale', sante: 'Santé', education: 'Éducation', defense_securite: 'Défense et sécurité', infrastructures_environnement: 'Infrastructures et environnement', recherche: 'Recherche', administration_autres: 'Administration et autres', interets: 'Intérêts de la dette' };
export const LIB_RECETTES = { impots_menages: 'Impôts des ménages', impots_entreprises: 'Impôts des entreprises', tva_consommation: 'TVA et consommation', cotisations_sociales: 'Cotisations sociales', autres: 'Autres' };
const sg = (n) => (n > 0 ? '+' : n < 0 ? '−' : '');
export const fmtMd = (n, d = 1) => `${sg(n)}${Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })}`;

function barres(titre, id, lib, valeurs, couleur) {
  const max = Math.max(...Object.values(valeurs), 1);
  const total = Object.values(valeurs).reduce((a, v) => a + v, 0);
  return `<div><h3 id="${id}" class="font-serif font-bold text-lg mb-1">${titre} <span class="font-sans font-normal text-sm text-doux">· ${fmt(total, 0)} Md€</span></h3>
    <ul aria-labelledby="${id}" class="space-y-1">${Object.entries(lib).filter(([k]) => valeurs[k] != null).map(([k, nom]) => `<li class="text-sm">
      <div class="flex justify-between gap-2"><span>${nom}</span><span class="tabular-nums font-semibold">${fmt(valeurs[k], 0)} Md€</span></div>
      <div class="h-2 bg-[#E8E1CD] rounded-sm overflow-hidden" aria-hidden="true"><div class="h-full ${couleur}" style="width:${Math.max(1, Math.round(valeurs[k] / max * 100))}%"></div></div></li>`).join('')}</ul></div>`;
}

export function tableauDeBord(etat) {
  const b = etat.budget;
  if (!b) return '';
  const s = solde(b);
  const neg = s < 0;
  const detteMd = etat.indicateurs.dette / 100 * b.pib;
  const tuile = (nom, val, extra = '') => `<div class="border border-bord rounded p-3 bg-white"><dt class="text-sm text-doux">${nom}</dt><dd class="font-serif font-bold text-2xl">${val}</dd>${extra ? `<dd class="text-xs text-doux">${extra}</dd>` : ''}</div>`;
  return `<section aria-labelledby="h-tdb" class="mb-6 bg-carte border border-bord rounded-lg p-4 filet-laiton">
    <h2 id="h-tdb" class="font-serif font-bold text-xl mb-2">Finances publiques</h2>
    <dl class="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
      <div class="border-2 rounded p-3 bg-white ${neg ? 'border-rouge' : 'border-bleu'}"><dt class="text-sm text-doux">Solde annuel</dt>
        <dd class="font-serif font-bold text-2xl ${neg ? 'text-rouge' : 'text-bleu'}">${fmtMd(s)} Md€</dd><dd class="text-xs font-semibold ${neg ? 'text-rouge' : 'text-bleu'}">${neg ? 'Déficit' : 'Excédent'}</dd></div>
      ${tuile('Déficit', `${fmt(etat.indicateurs.deficit)} % du PIB`, 'Indicateur national')}
      ${tuile('Dette', `${fmt(etat.indicateurs.dette)} % du PIB`, `${fmt(detteMd, 0)} Md€`)}
      ${tuile('Charge d’intérêts', `${fmt(b.depenses.interets)} Md€/an`)}
      ${tuile('PIB', `${fmt(b.pib, 0)} Md€`)}
    </dl>
    <div class="grid md:grid-cols-2 gap-6">${barres('Recettes', 'h-rec', LIB_RECETTES, b.recettes, 'bg-bleu')}${barres('Dépenses', 'h-dep', LIB_DEPENSES, b.depenses, 'bg-bordeaux')}</div>
    <p class="text-xs text-doux mt-3">Données Insee 2025 ; répartition par fonction estimée. <a class="underline text-bleu" href="${LIEN_SOURCES}" target="_blank" rel="noopener">Sources</a></p>
  </section>`;
}

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
