import { esc, fmt, MOIS } from '../util.js';
import { dateDuTour } from '../../engine/index.js';
import { blocVote, blocSondage } from '../components/vote.js';
import { sectionRelations } from '../components/relations.js';
import { sectionReactions } from '../components/reactions.js';
import { sectionElections, brancherElections } from '../components/elections.js';
import { sectionEvenement, brancherEvenement } from '../components/evenement.js';
import { sectionBudget, brancherBudget } from '../components/budget.js';
import { boutonPartage, zonePartage, brancherPartage } from '../components/partage.js';
import { sectionParlement, libelleRole } from '../components/parlement.js';
import { ongletOpinion } from '../components/opinion.js';
import { ONGLETS, barreOnglets, enteteCollant, navigationMobile, brancherNavigation } from '../components/navigation.js';
import { sectionEtatPays, sectionTousIndicateurs } from '../components/etatPays.js';
import { sectionCeMois } from '../components/ceMois.js';
import { briefing, satisfactionNationale, compterDecisions } from '../../engine/index.js';
import { ongletDecisions, brancherDecisions, catalogue } from '../components/decisions.js';
import { panneauSecteurs } from '../components/secteurs.js';
import { ongletCarte, brancherCarte, vueValide } from '../components/carte.js';
import { raisonRefusPLF } from '../../engine/index.js';

const PASTILLES = { evenement: ['!', 'Événement', 'bg-[#FFF3C4] border-encre'], budget: ['€', 'Budget', 'bg-[#DDE7F7] border-bleu'] };
const pastille = (t) => { const p = PASTILLES[t]; return p ? `<span class="inline-flex items-center justify-center w-5 h-5 text-xs font-bold border rounded-full mr-1 ${p[2]}" title="${p[1]}"><span aria-hidden="true">${p[0]}</span><span class="sr-only">${p[1]} :</span></span>` : ''; };
const LIB = { chomage: 'chômage', croissance: 'croissance', deficit: 'déficit', dette: 'dette', inflation: 'inflation', popularite: 'popularité', tensions: 'tensions' };


export { ONGLETS };
const LIEN_SOURCES = 'https://github.com/tamalou25/hemicycle/blob/main/docs/SOURCES.md';

function enteteBureau(etat, d, parti) {
  return `<header class="mb-4">
      <h1 class="font-serif font-bold text-2xl sm:text-3xl capitalize">${esc(MOIS[d.mois - 1])} ${d.annee}</h1>
      ${etat.joueur.politicienId ? '<p class="inline-block text-xs font-bold uppercase border-2 border-encre bg-[#FFF3C4] rounded px-2 py-0.5 mb-1">Mode élu réel (simulation)</p>' : ''}
      <p class="text-doux">${esc(etat.joueur.nom)}, ${esc(parti?.sigle ?? '')} · ${esc(libelleRole(etat.joueur.role))} · mois ${etat.tour} sur 60</p>
    </header>`;
}

const ACTIONS_BRIEFING = { evenement: 'Répondre', territoire: 'Voir sur la carte', projet: 'Suivre le projet', budget: 'Ouvrir le budget' };

function carteBriefing(pt, i) {
  const icone = { evenement: '!', territoire: '◎', projet: '⚙', budget: '€' }[pt.type] ?? '•';
  return `<li class="bg-carte border border-bord rounded-lg p-2 pl-3 filet-laiton flex items-center justify-between gap-2">
    <p class="min-w-0 text-sm leading-snug"><span class="font-semibold"><span aria-hidden="true" class="text-laiton mr-1">${icone}</span>${esc(pt.titre)}.</span> <span class="text-doux">${esc(pt.texte)}</span></p>
    <button type="button" id="brief-${i}" data-brief="${i}" class="btn btn-s shrink-0 !px-3 text-sm">${ACTIONS_BRIEFING[pt.type] ?? 'Ouvrir'}<span class="sr-only"> : ${esc(pt.titre)}</span></button></li>`;
}

function lienDecisions(etat, ctx) {
  const c = compterDecisions(catalogue(etat, ctx)).parStatut;
  const dispo = (c.disponible ?? 0) + (c.urgent ?? 0), cours = c.en_cours ?? 0;
  return `<p class="text-sm"><strong>${dispo}</strong> décision${dispo > 1 ? 's' : ''} disponible${dispo > 1 ? 's' : ''} · <strong>${cours}</strong> en cours
    <button type="button" class="underline text-bleu min-h-[44px] px-2 font-semibold" data-aller-decisions>→ Décisions</button></p>`;
}

function ongletBureau(etat, ctx, donnees, points) {
  const sat = etat.territoires ? satisfactionNationale(etat.territoires, ctx.regions.regions) : null;
  const plfOuvert = etat.budget && etat.joueur.role === 'premier_ministre' && !etat.plf && !raisonRefusPLF(etat);
  return `${sectionEtatPays(etat)}
    <section aria-labelledby="h-brief" class="mb-5">
      <h2 id="h-brief" class="font-serif font-bold text-xl mb-2">À traiter</h2>
      ${sectionEvenement(etat, ctx)}
      ${plfOuvert ? '<p class="mb-3 border-l-4 border-laiton bg-[#FFF3C4] p-3" role="status"><strong>Budget à présenter avant décembre.</strong> <button type="button" class="underline text-bleu min-h-[44px]" data-aller-budget>Ouvrir l’onglet Budget</button></p>' : ''}
      <ul class="grid md:grid-cols-3 gap-2 mb-1">${points.map(carteBriefing).join('')}</ul>
      ${lienDecisions(etat, ctx)}
    </section>
    ${sectionCeMois(etat, donnees)}
    ${sectionTousIndicateurs(etat, sat)}
    ${panneauSecteurs(etat, ctx)}
    <p class="hidden sm:block text-xs text-doux">Situation de départ au ${esc(ctx.situation.date_collecte)} : Président ${esc(ctx.situation.president)}, Premier ministre ${esc(ctx.situation.premier_ministre)}.</p>`;
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
    <div class="sm:sticky sm:top-0 z-30 bg-creme -mx-4 px-4 sm:border-b sm:border-bord">${enteteCollant(etat, d)}${barreOnglets(onglet)}</div>
    ${onglet === 'bureau' ? enteteBureau(etat, d, parti) : ''}
    <div id="panneau" role="tabpanel" aria-labelledby="tab-${onglet}" tabindex="-1">${contenu}</div>
    <p class="text-xs text-doux mt-4">Indices de jeu dérivés de données Insee/DREES ; transports : paramètre d’équilibrage. <a class="underline text-bleu" href="${LIEN_SOURCES}" target="_blank" rel="noopener">Sources et méthode</a></p>
    ${navigationMobile(etat, d, onglet)}`;

  brancherNavigation(racine, dispatch);
  racine.querySelectorAll('[data-aller-decisions]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'onglet', onglet: 'decisions', haut: true })));
  if (onglet === 'bureau') {
    brancherEvenement(racine, dispatch);
    racine.querySelector('[data-aller-budget]')?.addEventListener('click', () => dispatch({ type: 'onglet', onglet: 'budget', haut: true }));
    racine.querySelectorAll('[data-brief]').forEach((b) => b.addEventListener('click', () => {
      const pt = points[Number(b.dataset.brief)];
      if (pt.type === 'territoire') dispatch({ type: 'onglet', onglet: 'carte', region: pt.region, vue: pt.indice, haut: true });
      else if (pt.type === 'projet') dispatch({ type: 'onglet', onglet: 'carte', region: pt.region, haut: true });
      else if (pt.type === 'budget') dispatch({ type: 'onglet', onglet: 'budget', haut: true });
      else { const c = racine.querySelector('[data-evenement]'); c?.scrollIntoView({ block: 'center' }); c?.focus(); }
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
