// Onglet « Décisions » : un seul endroit pour toutes les actions du joueur (lois, programmes, projets, négociations, 49.3…).
import { esc, fmt } from '../util.js';
import { reactionProbable } from './relations.js';
import { catalogueDecisions, filtrerDecisions, compterDecisions, CATEGORIES, SECTEURS_DECISION, ficheDecision } from '../../engine/index.js';
import { blocFiche } from './fiche.js';

export const STATUTS = [['disponible', 'Disponibles'], ['en_cours', 'En cours'], ['bloque', 'Bloquées'], ['fait', 'Faites']];
/** Au-delà, une catégorie se replie derrière « Afficher les N autres » (lisibilité sur mobile). */
const LIMITE_PAR_CATEGORIE = 6;
const STATUT_LIB = { disponible: 'Disponible', en_cours: 'En cours', bloque: 'Bloquée', fait: 'Faite', urgent: 'Urgent' };
const STATUT_CLS = {
  disponible: 'bg-[#DDF3E6] text-[#157A48] border-[#157A48]', en_cours: 'bg-[#DEE8FB] text-bleu border-bleu',
  bloque: 'bg-[#FBE4E4] text-rouge border-rouge', fait: 'bg-[#EAEEF5] text-doux border-bord', urgent: 'bg-bordeaux text-white border-bordeaux',
};
const BOUTONS = { loi: 'Proposer', programme: 'Engager', investissement: 'Lancer', accord: 'Négocier', '493': '49.3', dissolution: 'Dissolution', evenement: 'Répondre', gouvernement: 'Nommer' };
const CONFIRMATIONS = {
  '493': ['Engager le 49.3 ?', 'Le texte est adopté sans vote, mais le gouvernement s’expose à une motion de censure.'],
  dissolution: ['Proposer une dissolution ?', 'Le Président peut refuser (vous perdriez 2 capital). S’il accepte, des législatives anticipées auront lieu dans deux mois et le texte en cours tombera.'],
  gouvernement: ['Nommer ce gouvernement ?', '2 capital. Son parti soutiendra vos textes et ne votera pas la censure. Un parti éloigné de vous coûte en popularité (cohabitation). Sans censure, le prochain changement attendra 12 mois.'],
};

/** Données nécessaires au catalogue, à partir du contexte de l'interface. */
export const donneesCatalogue = (ctx) => ({ lois: ctx.lois, partis: ctx.partis, evenements: ctx.evenements, regions: ctx.regions, projets: ctx.projets, politiques: ctx.politiques, objectifs: ctx.objectifs, economie: ctx.economie });
export const catalogue = (etat, ctx) => catalogueDecisions(etat, donneesCatalogue(ctx));

const filtres = (ctx) => ({ categorie: '', secteur: '', statut: 'disponible', ...(ctx.decisions ?? {}) });

function libelleBouton(x) {
  if (x.type === 'budget') return 'Ouvrir le budget';
  if (x.type === 'projet') return 'Choisir une région';
  return BOUTONS[x.type];
}

function couts(x) {
  const c = x.cout ?? {};
  const l = [];
  if (c.capital) l.push(`${c.capital} capital`);
  if (c.md) l.push(`${fmt(c.md, 2)} Md€`);
  if (c.mdAn) l.push(`${fmt(c.mdAn, 1)} Md€/an`);
  return l.join(' · ');
}

function carte(x, i, etat, ctx) {
  const bouton = libelleBouton(x);
  const afficheBouton = bouton && !(['loi', 'programme', 'accord', 'gouvernement'].includes(x.type) && ['en_cours', 'fait'].includes(x.statut));
  const bloque = !!x.raison;
  const rid = `r-dec-${i}`;
  const meta = [couts(x), x.delai, x.type === 'projet' && x.enCours ? `${x.enCours} en cours` : ''].filter(Boolean);
  const urgent = x.statut === 'urgent';
  return `<li class="rounded-lg p-3 ${urgent ? 'border-2 border-bordeaux bg-[#FCEFEF]' : 'border border-bord bg-carte filet-laiton'}">
    <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
      <h4 class="font-serif font-bold text-base grow min-w-0">${esc(x.titre)}</h4>
      <span class="text-xs font-bold border rounded px-2 py-0.5 ${STATUT_CLS[x.statut] ?? STATUT_CLS.fait}">${esc(STATUT_LIB[x.statut] ?? x.statut)}</span>
    </div>
    ${x.secteur ? `<span class="inline-block text-xs border border-bord bg-[#EAEEF5] rounded-full px-2 py-0.5 mt-1">${esc(SECTEURS_DECISION[x.secteur] ?? x.secteur)}</span>` : ''}
    <p class="text-sm text-doux line-clamp-1 mt-1">${esc(x.resume)}</p>
    ${meta.length ? `<p class="text-xs mt-1">${meta.map(esc).join(' · ')}</p>` : ''}
    ${x.contrepartie ? `<p class="text-xs text-doux mt-1"><strong>Contrepartie :</strong> ${esc(x.contrepartie)}</p>` : ''}
    ${(() => { const f = ficheDecision(etat, x, donneesCatalogue(ctx)); return f ? blocFiche(f, `fiche-${i}`) : ''; })()}
    ${(() => { const r = reactionDe(x, etat, ctx); return r ? `<details class="mt-1 text-xs"><summary class="cursor-pointer text-bleu underline min-h-[32px] flex items-center">Réaction probable des partis</summary>${r}</details>` : ''; })()}
    ${afficheBouton ? `<div class="mt-2"><button type="button" id="dec-${i}" data-decision="${i}" class="btn ${urgent ? 'btn-p' : 'btn-s'}" ${bloque ? `disabled aria-describedby="${rid}"` : ''}>${esc(bouton)}</button>
      ${bloque ? `<p id="${rid}" class="text-xs text-doux mt-1">${esc(x.raison)}</p>` : ''}</div>` : ''}
  </li>`;
}

function reactionDe(x, etat, ctx) {
  const src = x.type === 'loi' ? ctx.lois?.find((l) => `loi:${l.id}` === x.id)
    : x.type === 'programme' ? ctx.politiques?.politiques?.find((p) => `programme:${p.id}` === x.id) : null;
  return src ? reactionProbable(etat, ctx, src.theme, src.orientation) : '';
}

const pastille = (id, libelle, nombre, actif, attr) => `<button type="button" id="${id}" ${attr} aria-pressed="${actif}"
  class="min-h-[44px] px-3 rounded-full border text-sm font-semibold whitespace-nowrap ${actif ? 'bg-encre text-white border-encre' : 'bg-carte text-encre border-bord hover:bg-[#EAEEF5]'}">${esc(libelle)}${nombre != null ? ` <span class="tabular-nums font-normal">(${nombre})</span>` : ''}</button>`;

/** Contenu de l'onglet Décisions. Retourne aussi la liste affichée (pour brancher les boutons). */
export function ongletDecisions(etat, ctx) {
  const f = filtres(ctx);
  const tout = catalogue(etat, ctx);
  const urgentes = tout.filter((x) => x.statut === 'urgent');
  // Filtre par type (posé par une piste du mandat, ex. programmes) : appliqué ici, toujours visible et retirable
  const TYPES = { programme: 'Programmes uniquement', loi: 'Lois uniquement' };
  const type = TYPES[f.type] ? f.type : '';
  const normales = tout.filter((x) => x.statut !== 'urgent' && (!type || x.type === type));
  const parStatut = compterDecisions(filtrerDecisions(normales, { categorie: f.categorie, secteur: f.secteur })).parStatut;
  const baseCat = filtrerDecisions(normales, { secteur: f.secteur, statut: f.statut });
  const cCat = compterDecisions(baseCat);
  const affichees = Object.keys(CATEGORIES).flatMap((c) => filtrerDecisions(normales, f).filter((x) => x.categorie === c));
  ctx.decisionsAffichees = [...urgentes, ...affichees];

  const pCat = [['', 'Toutes', cCat.total], ...Object.entries(CATEGORIES).map(([k, v]) => [k, v, cCat.parCategorie[k] ?? 0])]
    .map(([k, v, n]) => pastille(`f-cat-${k || 'toutes'}`, v, n, f.categorie === k, `data-f-cat="${k}"`)).join('');
  const pStat = STATUTS.map(([k, v]) => pastille(`f-stat-${k}`, v, parStatut[k] ?? 0, f.statut === k, `data-f-stat="${k}"`)).join('');
  const pType = type ? `<div role="group" aria-label="Type"><button type="button" id="f-type" data-f-type class="min-h-[44px] px-3 rounded-full border text-sm font-semibold bg-encre text-white border-encre" aria-label="${esc(TYPES[type])} : retirer ce filtre">${esc(TYPES[type])} <span aria-hidden="true">✕</span></button></div>` : '';
  const options = Object.entries(SECTEURS_DECISION).map(([k, v]) => `<option value="${k}" ${f.secteur === k ? 'selected' : ''}>${esc(v)}</option>`).join('');

  let idx = urgentes.length;
  const groupes = Object.entries(CATEGORIES).map(([cat, titre]) => {
    const liste = affichees.filter((x) => x.categorie === cat);
    if (!liste.length) return '';
    const tout = ctx.decisionsEtendues?.[cat] || liste.length <= LIMITE_PAR_CATEGORIE;
    const visibles = tout ? liste : liste.slice(0, LIMITE_PAR_CATEGORIE);
    const cartes = visibles.map((x) => carte(x, idx++, etat, ctx)).join('');
    idx += liste.length - visibles.length; // décisions masquées : on garde l'alignement des index
    const plus = tout ? '' : `<button type="button" class="btn btn-s mt-3 w-full sm:w-auto" data-etendre="${cat}">Afficher les ${liste.length - visibles.length} autres</button>`;
    return `<section aria-labelledby="h-cat-${cat}" class="mb-6"><h3 id="h-cat-${cat}" class="font-serif font-bold text-lg border-b border-bord pb-1 mb-2">${esc(titre)} <span class="text-sm font-normal text-doux">(${liste.length})</span></h3>
      <ul class="grid md:grid-cols-2 gap-3">${cartes}</ul>${plus}</section>`;
  }).join('');
  const vide = !affichees.length ? '<p class="p-4 border border-bord bg-carte rounded-lg text-doux" role="status">Aucune décision ne correspond à ces filtres.</p>' : '';

  return `<section aria-labelledby="h-dec">
    <h2 id="h-dec" class="font-serif font-bold text-xl mb-1">Décisions</h2>
    <p class="text-sm text-doux mb-3">Toutes vos actions au même endroit : lois, programmes, projets en région, négociations. Capital politique : <strong>${etat.joueur.capital}</strong>/10.</p>
    ${urgentes.length ? `<div role="alert" aria-label="Décision urgente" class="mb-4"><ul class="space-y-3">${urgentes.map((x, i) => carte(x, i, etat, ctx)).join('')}</ul></div>` : ''}
    <div class="mb-4 space-y-2" role="group" aria-label="Filtres des décisions">
      ${pType}
      <div role="group" aria-label="Catégorie" class="flex gap-2 overflow-x-auto sm:flex-wrap pb-1 [&>*]:shrink-0">${pCat}</div>
      <div role="group" aria-label="Statut" class="flex gap-2 items-center overflow-x-auto sm:flex-wrap pb-1 [&>*]:shrink-0">${pStat}</div>
      <div><label for="f-secteur" class="text-sm mr-2">Secteur</label>
        <select id="f-secteur" class="champ !w-auto max-w-full"><option value="">Tous les secteurs</option>${options}</select></div>
    </div>
    ${groupes}${vide}
    <dialog id="dlg-decision" aria-labelledby="dlg-dec-titre" aria-describedby="dlg-dec-desc" class="rounded-lg border border-bord bg-carte p-4 w-[calc(100%-2rem)] max-w-md text-encre">
      <h3 id="dlg-dec-titre" class="font-serif font-bold text-lg"></h3><p id="dlg-dec-desc" class="text-sm mt-2"></p>
      <div class="flex gap-2 justify-end flex-wrap mt-4"><button type="button" class="btn btn-s" id="dlg-dec-annuler">Annuler</button><button type="button" class="btn btn-p" id="dlg-dec-confirmer">Confirmer</button></div></dialog>
  </section>`;
}

export function brancherDecisions(racine, dispatch, ctx) {
  const maj = (patch) => dispatch({ type: 'ui', patch: { decisions: { ...filtres(ctx), ...patch } } });
  racine.querySelectorAll('[data-f-cat]').forEach((b) => b.addEventListener('click', () => maj({ categorie: b.dataset.fCat })));
  racine.querySelectorAll('[data-f-stat]').forEach((b) => b.addEventListener('click', () => maj({ statut: filtres(ctx).statut === b.dataset.fStat ? '' : b.dataset.fStat })));
  racine.querySelector('[data-f-type]')?.addEventListener('click', () => maj({ type: '' }));
  racine.querySelector('#f-secteur').addEventListener('change', (e) => maj({ secteur: e.target.value }));
  racine.querySelectorAll('[data-etendre]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'ui', patch: { decisionsEtendues: { ...(ctx.decisionsEtendues ?? {}), [b.dataset.etendre]: true } } })));
  const dlg = racine.querySelector('#dlg-decision');
  racine.querySelectorAll('[data-decision]').forEach((b) => b.addEventListener('click', () => {
    const x = ctx.decisionsAffichees[Number(b.dataset.decision)];
    if (!x) return;
    const a = x.action;
    const lancer = () => dispatch(a.type === 'onglet' ? { ...a, haut: true } : a.type === 'evenement' ? { type: 'onglet', onglet: 'bureau', haut: true } : a);
    const conf = CONFIRMATIONS[x.type];
    if (!conf) return lancer();
    dlg.querySelector('#dlg-dec-titre').textContent = conf[0];
    dlg.querySelector('#dlg-dec-desc').textContent = conf[1];
    dlg.querySelector('#dlg-dec-confirmer').onclick = () => { dlg.close(); lancer(); };
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.querySelector('#dlg-dec-annuler').focus();
  }));
  dlg.querySelector('#dlg-dec-annuler').addEventListener('click', () => dlg.close());
}
