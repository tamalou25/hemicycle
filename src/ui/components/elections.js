// Section « Élections » du tableau de bord : échéances, campagne, candidature, dissolution, résultats simulés.
import { esc, fmt, MOIS } from '../util.js';
import {
  prochainesElections, enCampagne, ACTIONS_CAMPAGNE, raisonRefusCampagne,
  dateDuTour,
} from '../../engine/index.js';
import { TOTAL_DEPUTES } from '../../engine/elections.js';

const BADGE_SIM = '<span class="inline-block text-xs font-bold uppercase border-2 border-encre bg-[#FFF3C4] rounded px-2 py-0.5">Simulation</span>';
const TYPES_LIB = { presidentielle: 'Présidentielle', legislatives: 'Législatives', europeennes: 'Européennes' };

const raison = (id, msg) => (msg ? `<p id="${id}" class="text-xs text-doux mt-1">${esc(msg)}</p>` : '');
const moisLib = (n) => (n <= 0 ? 'ce mois-ci' : `dans ${n} mois`);

function dateLib(etat, tour) {
  const d = dateDuTour({ ...etat, tour });
  return `${MOIS[d.mois - 1]} ${d.annee}`;
}

function blocProchaines(etat, ctx) {
  const liste = prochainesElections(etat, ctx.calendrier);
  if (!liste.length) return '<p class="text-sm text-doux">Aucune échéance à venir.</p>';
  const [p, ...suite] = liste;
  const reste = p.tour - etat.tour;
  return `<div aria-live="polite">
    <p class="text-sm text-doux">Prochaine échéance</p>
    <p class="font-serif font-bold text-lg">${esc(p.titre ?? TYPES_LIB[p.type])} <span class="text-doux font-sans font-normal text-base">· ${esc(dateLib(etat, p.tour))}</span></p>
    <p class="text-sm"><strong class="tabular-nums">${reste}</strong> mois restants</p></div>
    ${suite.length ? `<ul class="mt-2 text-sm space-y-0.5">${suite.map((e) => `<li><span class="text-doux">Ensuite :</span> ${esc(e.titre ?? TYPES_LIB[e.type])}, ${esc(dateLib(etat, e.tour))} <span class="text-doux">(${esc(moisLib(e.tour - etat.tour))})</span></li>`).join('')}</ul>` : ''}`;
}

function blocCampagne(etat, ctx) {
  const camp = enCampagne(etat, ctx.calendrier);
  if (!camp) return '';
  const elan = etat.elan ?? 0;
  const boutons = Object.entries(ACTIONS_CAMPAGNE).map(([id, a]) => {
    const refus = raisonRefusCampagne(etat, ctx.calendrier, id);
    return `<div><button type="button" class="btn btn-s" id="btn-camp-${id}" data-campagne="${id}" ${refus ? `disabled aria-describedby="r-camp-${id}"` : ''}>${esc(a.libelle)} (${a.cout} capital)</button>${raison(`r-camp-${id}`, refus)}</div>`;
  }).join('');
  return `<div class="mt-4 border-l-4 border-bleu bg-white rounded p-3">
    <p class="font-bold" role="status">Campagne en cours : ${esc(camp.titre ?? TYPES_LIB[camp.type])}</p>
    <p class="text-sm mt-1">Élan actuel : <strong class="tabular-nums" id="elan">${elan > 0 ? '+' : ''}${fmt(elan)} pt</strong></p>
    <div class="flex flex-wrap gap-3 mt-2">${boutons}</div></div>`;
}

function blocCandidature(etat, ctx) {
  const badge = '<p class="mt-3"><span class="text-xs font-bold uppercase rounded bg-[#DCEBDD] text-[#1F6E43] px-2 py-1">Candidat·e à la présidentielle</span></p>';
  if (etat.candidat) return badge;
  if (etat.joueur.role === 'president') return ''; // déjà à l'Élysée : pas de candidature pendant le mandat
  if (prochainesElections(etat, ctx.calendrier)[0]?.type !== 'presidentielle') return '';
  return `<div class="mt-3"><button type="button" class="btn btn-p" id="btn-candidat" data-candidat>Se déclarer candidat·e</button>
    <p class="text-xs text-doux mt-1">Popularité d’au moins 15 % requise pour réunir les parrainages.</p></div>`;
}

// ---------- Résultats ----------

const sigle = (ctx, id) => ctx.partis.find((p) => p.id === id)?.sigle ?? id;
const couleur = (ctx, id) => ctx.partis.find((p) => p.id === id)?.couleur ?? '#8A8A8A';

function barres(ctx, entrees, max, suffixe = ' %') {
  return `<ul class="space-y-1">${entrees.map(([id, v, marque]) => `<li class="flex items-center gap-2 text-sm">
    <span class="w-12 shrink-0 font-semibold">${esc(sigle(ctx, id))}</span>
    <span class="grow h-4 bg-[#E8E1CD] rounded overflow-hidden"><span class="block h-full" style="width:${Math.min(100, (v / max) * 100)}%;background:${esc(couleur(ctx, id))}"></span></span>
    <span class="w-14 text-right tabular-nums shrink-0">${fmt(v)}${suffixe}</span>${marque ?? ''}</li>`).join('')}</ul>`;
}

function resultatPresidentielle(r, ctx) {
  const tri = Object.entries(r.scores).sort((a, b) => b[1] - a[1]);
  const max = tri[0][1] || 1;
  const [a, b] = r.finalistes;
  return `<h4 class="font-semibold mt-2 mb-1">1er tour</h4>
    ${barres(ctx, tri.map(([id, v]) => [id, v, r.finalistes.includes(id) ? '<span class="sr-only"> (qualifié)</span><span aria-hidden="true">✓</span>' : '']), max)}
    <h4 class="font-semibold mt-3 mb-1">2nd tour</h4>
    ${barres(ctx, [[a, r.secondTour[a]], [b, r.secondTour[b]]], 100)}
    <p class="mt-2 font-semibold">Vainqueur : Candidat·e du parti ${esc(sigle(ctx, r.vainqueur))} (simulation)</p>`;
}

function resultatLegislatives(r, ctx) {
  const tri = Object.entries(r.sieges).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const resume = tri.map(([id, n]) => `${sigle(ctx, id)} ${n}`).join(', ');
  return `<h4 class="font-semibold mt-2 mb-1">Nouvelle composition (${TOTAL_DEPUTES} sièges)</h4>
    <div class="h-5 flex rounded overflow-hidden bg-[#E8E1CD]" role="img" aria-label="Sièges : ${esc(resume)}">${tri.map(([id, n]) => `<div style="width:${(n / TOTAL_DEPUTES) * 100}%;background:${esc(couleur(ctx, id))}" title="${esc(sigle(ctx, id))} : ${n}"></div>`).join('')}</div>
    <ul class="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">${tri.map(([id, n]) => `<li class="flex items-center gap-2 text-sm"><span class="inline-block w-3 h-3 rounded-sm shrink-0" style="background:${esc(couleur(ctx, id))}" aria-hidden="true"></span><span class="grow">${esc(sigle(ctx, id))}</span><span class="tabular-nums">${n}</span></li>`).join('')}</ul>`;
}

function resultatEuropeennes(r, ctx) {
  const tri = Object.entries(r.scores).sort((a, b) => b[1] - a[1]);
  return `<h4 class="font-semibold mt-2 mb-1">Scores par liste de parti</h4>${barres(ctx, tri, tri[0][1] || 1)}`;
}

function blocResultats(etat, ctx) {
  const res = [...(etat.resultatsElections ?? [])].reverse();
  if (!res.length) return '';
  const cartes = res.map((r) => {
    const titre = (ctx.calendrier?.elections ?? []).find((e) => e.id === r.id)?.titre
      ?? (etat.electionsAnticipees ?? []).find((e) => e.id === r.id)?.titre ?? TYPES_LIB[r.type] ?? r.type;
    const corps = r.type === 'presidentielle' ? resultatPresidentielle(r, ctx)
      : r.type === 'legislatives' ? resultatLegislatives(r, ctx) : resultatEuropeennes(r, ctx);
    return `<article class="bg-white border border-bord rounded-lg p-3" aria-label="Résultats : ${esc(titre)}">
      <div class="flex flex-wrap items-center gap-2"><h3 class="font-serif font-bold text-lg">${esc(titre)}</h3>${BADGE_SIM}
        <span class="text-xs text-doux">${esc(dateLib(etat, r.tour))}</span></div>${corps}</article>`;
  }).join('');
  return `<div class="mt-4"><h3 class="font-semibold mb-2">Résultats des scrutins simulés</h3><div class="grid lg:grid-cols-2 gap-3">${cartes}</div></div>`;
}

export function sectionElections(etat, ctx) {
  return `<section aria-labelledby="h-elec" class="mb-6">
    <h2 id="h-elec" class="font-serif font-bold text-xl mb-2">Élections</h2>
    <div class="bg-carte border border-bord rounded-lg p-4">
      ${blocProchaines(etat, ctx)}${blocCampagne(etat, ctx)}${blocCandidature(etat, ctx)}${blocResultats(etat, ctx)}
    </div></section>`;
}

/** Branche les événements de la section (appelé après injection du HTML). */
export function brancherElections(racine, dispatch) {
  racine.querySelectorAll('[data-campagne]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'campagne', action: b.dataset.campagne })));
  racine.querySelector('[data-candidat]')?.addEventListener('click', () => dispatch({ type: 'candidat' }));
}
