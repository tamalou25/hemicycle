import { esc, fmt, MOIS } from '../util.js';
import { dateDuTour } from '../../engine/index.js';
import { jauge, INDICATEURS_JAUGE } from '../components/jauge.js';
import { blocVote, blocSondage } from '../components/vote.js';
import { sectionRelations } from '../components/relations.js';
import { sectionReactions } from '../components/reactions.js';
import { sectionElections, brancherElections } from '../components/elections.js';
import { sectionEvenement, brancherEvenement } from '../components/evenement.js';
import { sectionBudget, brancherBudget } from '../components/budget.js';
import { boutonPartage, zonePartage, brancherPartage } from '../components/partage.js';
import { sectionParlement, libelleRole } from '../components/parlement.js';
import { ongletOpinion } from '../components/opinion.js';
import { sectionBilan } from '../components/bilan.js';
import { briefing, satisfactionNationale, compterDecisions } from '../../engine/index.js';
import { ongletDecisions, brancherDecisions, catalogue } from '../components/decisions.js';
import { panneauSecteurs } from '../components/secteurs.js';
import { ongletCarte, brancherCarte, vueValide } from '../components/carte.js';
import { raisonRefusPLF } from '../../engine/index.js';

const PASTILLES = { evenement: ['!', 'Événement', 'bg-[#FFF3C4] border-encre'], budget: ['€', 'Budget', 'bg-[#DDE7F7] border-bleu'] };
const pastille = (t) => { const p = PASTILLES[t]; return p ? `<span class="inline-flex items-center justify-center w-5 h-5 text-xs font-bold border rounded-full mr-1 ${p[2]}" title="${p[1]}"><span aria-hidden="true">${p[0]}</span><span class="sr-only">${p[1]} :</span></span>` : ''; };
const LIB = { chomage: 'chômage', croissance: 'croissance', deficit: 'déficit', dette: 'dette', inflation: 'inflation', popularite: 'popularité', tensions: 'tensions' };


export const ONGLETS = [['bureau', 'Bureau'], ['decisions', 'Décisions'], ['carte', 'Carte'], ['budget', 'Budget'], ['opinion', 'Opinion'], ['parlement', 'Parlement'], ['chronologie', 'Chronologie']];
const LIEN_SOURCES = 'https://github.com/tamalou25/hemicycle/blob/main/docs/SOURCES.md';

function barreOnglets(actif) {
  return `<div class="overflow-x-auto -mx-4 px-4 mb-4 border-b-2 border-encre" id="barre-onglets">
    <div role="tablist" aria-label="Sections du tableau de bord" class="flex gap-1 min-w-max">${ONGLETS.map(([id, nom]) =>
      `<button type="button" role="tab" id="tab-${id}" data-onglet="${id}" aria-selected="${id === actif}" aria-controls="panneau" tabindex="${id === actif ? 0 : -1}"
        class="min-h-[44px] px-4 font-serif font-bold text-base whitespace-nowrap border-x border-t rounded-t-md ${id === actif ? 'bg-carte border-encre border-b-0 text-bordeaux -mb-0.5 pb-0.5 shadow-[inset_0_3px_0_#8A6A1F]' : 'bg-[#EFE9D6] border-bord text-encre'}">${nom}</button>`).join('')}</div></div>`;
}

function entete(etat, ctx, d, parti, complet) {
  const boutons = '<button type="button" id="suivant" class="btn btn-p">Mois suivant</button>';
  if (!complet) return `<div class="flex flex-wrap items-center justify-between gap-2 mb-4"><p class="font-serif font-bold text-lg"><span class="capitalize">${esc(MOIS[d.mois - 1])}</span> ${d.annee} <span class="font-sans font-normal text-doux text-sm">· mois ${etat.tour} sur 60</span></p>${boutons}</div>`;
  return `<header class="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h1 class="font-serif font-bold text-3xl capitalize">${esc(MOIS[d.mois - 1])} ${d.annee}</h1>
        ${etat.joueur.politicienId ? '<p class="inline-block text-xs font-bold uppercase border-2 border-encre bg-[#FFF3C4] rounded px-2 py-0.5 mb-1">Mode élu réel (simulation)</p>' : ''}
        <p class="text-doux">${esc(etat.joueur.nom)}, ${esc(parti?.sigle ?? '')} · ${esc(libelleRole(etat.joueur.role))} · mois ${etat.tour} sur 60</p>
      </div>${boutons}</header>`;
}

function carteBriefing(pt, i) {
  const icone = { evenement: '!', territoire: '◎', projet: '⚙', budget: '€' }[pt.type] ?? '•';
  return `<li><button type="button" id="brief-${i}" data-brief="${i}" class="w-full min-h-[44px] text-left bg-carte border border-bord rounded-lg p-3 hover:bg-[#EFE9D6] filet-laiton">
    <span class="font-semibold"><span aria-hidden="true" class="text-laiton mr-1">${icone}</span>${esc(pt.titre)}</span>
    <span class="block text-sm text-doux">${esc(pt.texte)}</span></button></li>`;
}

function lienDecisions(etat, ctx) {
  const c = compterDecisions(catalogue(etat, ctx)).parStatut;
  const dispo = (c.disponible ?? 0) + (c.urgent ?? 0), cours = c.en_cours ?? 0;
  return `<p class="mb-4 text-sm"><strong>${dispo}</strong> décision${dispo > 1 ? 's' : ''} disponible${dispo > 1 ? 's' : ''} · <strong>${cours}</strong> en cours
    <button type="button" class="underline text-bleu min-h-[44px] px-2 font-semibold" data-aller-decisions>→ Décisions</button></p>`;
}

function ongletBureau(etat, ctx, donnees, points) {
  const sat = etat.territoires ? satisfactionNationale(etat.territoires, ctx.regions.regions) : null;
  const plfOuvert = etat.budget && etat.joueur.role === 'premier_ministre' && !etat.plf && !raisonRefusPLF(etat);
  return `${sectionEvenement(etat, ctx)}
    ${plfOuvert ? '<p class="mb-4 border-l-4 border-laiton bg-[#FFF3C4] p-3" role="status"><strong>Budget à présenter avant décembre.</strong> <button type="button" class="underline text-bleu min-h-[44px]" data-aller-budget>Ouvrir l’onglet Budget</button></p>' : ''}
    <section aria-labelledby="h-brief" class="mb-6">
      <h2 id="h-brief" class="font-serif font-bold text-xl mb-2">Briefing du mois</h2>
      <ul class="grid md:grid-cols-3 gap-3">${points.map(carteBriefing).join('')}</ul>
    </section>
    ${lienDecisions(etat, ctx)}
    ${sectionBilan(etat, donnees)}
    <section aria-labelledby="h-ind" class="mb-6">
      <h2 id="h-ind" class="font-serif font-bold text-xl mb-2">Indicateurs nationaux</h2>
      <div class="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-3">${INDICATEURS_JAUGE.map((i) => jauge(i, etat)).join('')}</div>
      <p class="mt-3 text-sm">Dette publique : <strong>${fmt(etat.indicateurs.dette)} % du PIB</strong> ·
        Capital politique : <strong id="capital">${etat.joueur.capital}</strong>/10${sat != null ? ` · Satisfaction territoriale : <strong>${fmt(sat, 0)}</strong>/100` : ''}</p>
    </section>
    ${panneauSecteurs(etat, ctx)}
    <p class="text-xs text-doux">Situation de départ au ${esc(ctx.situation.date_collecte)} : Président ${esc(ctx.situation.president)}, Premier ministre ${esc(ctx.situation.premier_ministre)}.</p>`;
}

function ongletParlement(etat, ctx) {
  const { lois, partis } = ctx;
  return `${sectionRelations(etat, ctx)}
    ${sectionParlement(etat, ctx)}
    ${sectionReactions(etat, ctx)}
    <div class="grid gap-6 mb-6">
      <section aria-labelledby="h-vote" class="bg-carte border border-bord rounded-lg p-4">
        <h2 id="h-vote" class="font-serif font-bold text-xl mb-2">Dernier vote</h2>${blocVote(etat, lois, partis, ctx.senat)}</section>
    </div>
    <p class="mb-6 text-sm"><button type="button" class="underline text-bleu min-h-[44px] font-semibold" data-aller-decisions>Voir les lois dans Décisions</button>
      <span class="text-doux">(lois, 49.3, négociations et dissolution s’y trouvent).</span></p>
    ${sectionElections(etat, ctx)}`;
}

function ongletChronologie(etat, ctx) {
  const { lois } = ctx;
  const effets = etat.effetsEnCours.map((e) => {
    const sens = e.parMois >= 0 ? '+' : '−';
    const loi = lois.find((l) => l.id === e.source);
    const statut = etat.tour + 1 < e.debut ? `débute au mois ${e.debut}` : `jusqu’au mois ${e.fin}`;
    return `<li class="text-sm py-1 border-b border-bord last:border-0">${esc(LIB[e.indicateur] ?? e.indicateur)} ${sens}${fmt(Math.abs(e.parMois), 2)}/mois <span class="text-doux">(${esc(loi?.titre ?? e.source)}, ${statut})</span></li>`;
  }).join('') || '<li class="text-sm text-doux">Aucun effet en cours.</li>';
  const journal = [...etat.journal].reverse().map((j) =>
    `<li class="text-sm py-1 border-b border-bord last:border-0">${pastille(j.type)}<span class="text-doux">Mois ${j.tour} :</span> ${esc(j.texte)}</li>`).join('');
  return `<div class="flex gap-2 flex-wrap mb-4 items-center">
      <button type="button" id="export" class="btn btn-s">Exporter</button>
      <label for="import" class="btn btn-s cursor-pointer">Importer</label>
      <input type="file" id="import" accept="application/json,.json" class="sr-only">
      ${boutonPartage(etat, 'btn btn-s')}
    </div>${zonePartage(etat)}
    <div class="grid lg:grid-cols-2 gap-6">
      <section aria-labelledby="h-jou" class="bg-carte border border-bord rounded-lg p-4"><h2 id="h-jou" class="font-serif font-bold text-xl mb-2">Journal</h2><ul>${journal}</ul></section>
      <section aria-labelledby="h-eff" class="bg-carte border border-bord rounded-lg p-4 self-start"><h2 id="h-eff" class="font-serif font-bold text-xl mb-2">Effets en cours</h2><ul>${effets}</ul></section>
    </div>`;
}

export function render(racine, etat, dispatch, ctx) {
  const { partis } = ctx;
  const d = dateDuTour(etat);
  const parti = partis.find((p) => p.id === etat.joueur.parti);
  const onglet = ONGLETS.some(([id]) => id === ctx.onglet) ? ctx.onglet : 'bureau';
  // Toutes les définitions nécessaires aux phrases d'explication (programmes, partis…)
  const donnees = { lois: ctx.lois, evenements: ctx.evenements, regions: ctx.regions, projets: ctx.projets, politiques: ctx.politiques, partis: ctx.partis };
  const points = onglet === 'bureau' ? briefing(etat, donnees) : [];
  ctx.vue = vueValide(ctx.vue, etat);
  const contenu = onglet === 'bureau' ? ongletBureau(etat, ctx, donnees, points)
    : onglet === 'decisions' ? ongletDecisions(etat, ctx)
    : onglet === 'carte' ? ongletCarte(etat, ctx)
    : onglet === 'budget' ? sectionBudget(etat, ctx)
    : onglet === 'opinion' ? ongletOpinion(etat, ctx)
    : onglet === 'parlement' ? ongletParlement(etat, ctx) : ongletChronologie(etat, ctx);

  racine.innerHTML = `
    ${barreOnglets(onglet)}
    ${entete(etat, ctx, d, parti, onglet === 'bureau')}
    <div id="panneau" role="tabpanel" aria-labelledby="tab-${onglet}" tabindex="-1">${contenu}</div>
    <p class="text-xs text-doux mt-6">Indices de jeu dérivés de données Insee/DREES ; transports : paramètre d’équilibrage. <a class="underline text-bleu" href="${LIEN_SOURCES}" target="_blank" rel="noopener">Sources et méthode</a></p>`;

  const barre = racine.querySelector('#barre-onglets');
  const tabs = [...racine.querySelectorAll('[role=tab]')];
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => dispatch({ type: 'onglet', onglet: t.dataset.onglet }));
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (k === undefined) return;
      e.preventDefault();
      dispatch({ type: 'onglet', onglet: tabs[(k + tabs.length) % tabs.length].dataset.onglet });
    });
  });
  const actif = racine.querySelector('[role=tab][aria-selected=true]');
  if (barre && actif) barre.scrollLeft = Math.max(0, actif.offsetLeft - 16);

  racine.querySelectorAll('[data-aller-decisions]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'onglet', onglet: 'decisions', haut: true })));
  racine.querySelector('#suivant')?.addEventListener('click', () => dispatch({ type: 'suivant' }));
  if (onglet === 'bureau') {
    brancherEvenement(racine, dispatch);
    racine.querySelector('[data-aller-budget]')?.addEventListener('click', () => dispatch({ type: 'onglet', onglet: 'budget', haut: true }));
    racine.querySelectorAll('[data-brief]').forEach((b) => b.addEventListener('click', () => {
      const pt = points[Number(b.dataset.brief)];
      if (pt.type === 'territoire') dispatch({ type: 'onglet', onglet: 'carte', region: pt.region, vue: pt.indice, haut: true });
      else if (pt.type === 'projet') dispatch({ type: 'onglet', onglet: 'carte', region: pt.region, haut: true });
      else if (pt.type === 'budget') dispatch({ type: 'onglet', onglet: 'budget', haut: true });
      else racine.querySelector('[data-evenement]')?.focus();
    }));
  } else if (onglet === 'decisions') brancherDecisions(racine, dispatch, ctx);
  else if (onglet === 'carte') brancherCarte(racine, dispatch);
  else if (onglet === 'budget') brancherBudget(racine, dispatch, ctx, etat);
  else if (onglet === 'opinion') { /* contenu en lecture seule */ }
  else if (onglet === 'parlement') {
    brancherElections(racine, dispatch);
    racine.querySelector('[data-amender]')?.addEventListener('click', () => dispatch({ type: 'amender' }));
  } else {
    brancherPartage(racine, etat);
    racine.querySelector('#export').addEventListener('click', () => dispatch({ type: 'exporter' }));
    racine.querySelector('#import').addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (f) dispatch({ type: 'importer', texte: await f.text() });
    });
  }
}
