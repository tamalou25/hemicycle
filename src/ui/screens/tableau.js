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
import { briefMandat } from '../components/objectifs.js';
import { sectionMission, brancherMission } from '../components/mission.js';
import { sectionScenario, sectionPriorites, brancherScenario } from '../components/scenario.js';
import { sectionGouvernement, brancherGouvernement } from '../components/gouvernement.js';
import { gouverne } from '../../engine/index.js';
import { sectionBilanMois, sectionEngagements } from '../components/bilanMois.js';
import { panneauSecteurs } from '../components/secteurs.js';
import { ongletCarte, brancherCarte, vueValide } from '../components/carte.js';
import { ecranMonde, brancherMonde } from '../components/carteMonde.js';
import { ongletEconomie, brancherEconomie } from '../components/economie.js';
import { alertesEconomie } from '../../engine/index.js';
import { raisonRefusPLF, DUREE_MANDAT, SEUIL_DEFAITE, POINTS_PAR_OBJECTIF } from '../../engine/index.js';

const PASTILLES = { evenement: ['!', 'Événement', 'bg-[#FFF4D6] border-encre'], budget: ['€', 'Budget', 'bg-[#DEE8FB] border-bleu'] };
const pastille = (t) => { const p = PASTILLES[t]; return p ? `<span class="inline-flex items-center justify-center w-5 h-5 text-xs font-bold border rounded-full mr-1 ${p[2]}" title="${p[1]}"><span aria-hidden="true">${p[0]}</span><span class="sr-only">${p[1]} :</span></span>` : ''; };
const LIB = { chomage: 'chômage', croissance: 'croissance', deficit: 'déficit', dette: 'dette', inflation: 'inflation', popularite: 'popularité', tensions: 'tensions' };


export { ONGLETS };
const LIEN_SOURCES = 'https://github.com/tamalou25/hemicycle/blob/main/docs/SOURCES.md';

function enteteBureau(etat, d, parti) {
  // Mobile : la date est déjà dans la barre fixe du bas ; le titre reste lisible par les lecteurs d'écran
  return `<header class="mb-3 sm:mb-4">
      <h1 class="sr-only sm:not-sr-only font-serif font-bold text-2xl sm:text-3xl capitalize">${esc(MOIS[d.mois - 1])} ${d.annee}</h1>
      ${etat.joueur.politicienId ? '<p class="inline-block text-xs font-bold uppercase border-2 border-encre bg-[#FFF4D6] rounded px-2 py-0.5 mb-1">Mode élu réel (simulation)</p>' : ''}
      <p class="text-sm sm:text-base text-doux">${esc(etat.joueur.nom)}, ${esc(parti?.sigle ?? '')} · ${esc(libelleRole(etat.joueur.role))}<span class="hidden sm:inline"> · mois ${etat.tour} sur 60</span></p>
    </header>`;
}

const ACTIONS_BRIEFING = { evenement: 'Répondre', territoire: 'Voir sur la carte', projet: 'Suivre le projet', budget: 'Ouvrir le budget' };

/** Pourquoi ce point est proposé : lien avec la mission ou un objectif sélectionné (jamais une orientation politique). */
function raisonPoint(pt, etat) {
  if (pt.type === 'evenement') return 'Une réponse est attendue ce mois-ci ; sans réponse, l’option par défaut s’applique.';
  if (pt.type === 'territoire' && etat.mission?.statut === 'en_cours' && pt.region === etat.mission.region && pt.indice === etat.mission.indice) return 'Région et indice de votre mission.';
  if (pt.type === 'territoire' && (etat.objectifs ?? []).some((o) => ['territoires', 'aucun-abandon', 'confiance'].includes(o))) return 'Lié à un de vos objectifs territoriaux.';
  if (pt.type === 'projet') return 'Un de vos engagements arrive à échéance.';
  return '';
}

function carteBriefing(pt, i, etat, vus = new Set()) {
  const icone = { evenement: '!', territoire: '◎', projet: '⚙', budget: '€' }[pt.type] ?? '•';
  // Une même raison n'est pas répétée sur chaque carte
  let pourquoi = etat ? raisonPoint(pt, etat) : '';
  if (vus.has(pourquoi)) pourquoi = ''; else vus.add(pourquoi);
  return `<li class="bg-carte border border-bord rounded-lg p-2 pl-3 filet-laiton flex items-center justify-between gap-2">
    <p class="min-w-0 text-sm leading-snug"><span class="font-semibold"><span aria-hidden="true" class="text-laiton mr-1">${icone}</span>${esc(pt.titre)}.</span> <span class="text-doux">${esc(pt.texte)}</span>${pourquoi ? `<br><span class="text-xs">${esc(pourquoi)}</span>` : ''}</p>
    <button type="button" id="brief-${i}" data-brief="${i}" class="btn btn-s shrink-0 !px-3 text-sm">${ACTIONS_BRIEFING[pt.type] ?? 'Ouvrir'}<span class="sr-only"> : ${esc(pt.titre)}</span></button></li>`;
}

// Sur mobile, la barre du bas mène déjà à Décisions et le brief du mandat propose des accès ciblés : ligne réservée à l’ordinateur
function lienDecisions(etat, ctx) {
  const c = compterDecisions(catalogue(etat, ctx)).parStatut;
  const dispo = (c.disponible ?? 0) + (c.urgent ?? 0), cours = c.en_cours ?? 0;
  return `<p class="hidden sm:block text-sm"><strong>${dispo}</strong> décision${dispo > 1 ? 's' : ''} disponible${dispo > 1 ? 's' : ''} · <strong>${cours}</strong> en cours
    <button type="button" class="underline text-bleu min-h-[44px] px-2 font-semibold" data-aller-decisions>→ Décisions</button></p>`;
}

/** Campagne présidentielle : au plus 3 priorités avec leur raison (événement, gouvernement, première décision, budget). Présentation seulement. */
function prioritesCampagne(etat, ctx) {
  if (etat.joueur.role !== 'president' || etat.scenario) return null;
  const liste = [];
  if (etat.evenement) { const ev = ctx.evenements?.find((e) => e.id === etat.evenement); liste.push({ type: 'urgence', titre: ev?.titre ?? 'Événement', raison: 'Le temps est en pause jusqu’à votre réponse ; sans réponse au passage du mois, l’option par défaut s’applique.', aller: { onglet: 'bureau', cible: 'evenement' } }); }
  if (etat.gouvernement?.statut === 'renverse') liste.push({ type: 'urgence', titre: 'Nommer un Premier ministre', raison: 'Sans gouvernement : ni loi du gouvernement, ni programme, ni budget, ni 49.3.', aller: { onglet: 'bureau', cible: 'gouvernement' } });
  const rienEngage = !etat.texte && !(etat.politiques ?? []).length && !(etat.projets ?? []).length && !etat.loisAdoptees.length;
  if (rienEngage && gouverne(etat)) {
    liste.push({ type: 'engagement', titre: 'Première décision : un projet de loi', raison: `Capital politique ${etat.joueur.capital}/10. Vote à l’Assemblée en fin de mois ; la fiche donne le vote estimé.`, aller: { onglet: 'decisions', decisions: { categorie: 'nationale', secteur: '', statut: '', type: 'loi' } } });
    liste.push({ type: 'engagement', titre: 'Ou un projet dans une région', raison: `Enveloppe ${(etat.finances?.enveloppe ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Md€, sans vote ; effets locaux visibles sur la carte.`, aller: { onglet: 'carte', vue: 'satisfaction' } });
  }
  if (gouverne(etat) && etat.budget && !etat.plf && !raisonRefusPLF(etat)) liste.push({ type: 'decision', titre: 'Budget de l’État à déposer', raison: 'Fenêtre ouverte jusqu’en décembre ; sans budget voté, une loi spéciale reconduit les crédits.', aller: { onglet: 'budget' } });
  // Alertes économiques : une pénurie est une urgence ; une dépendance se traite après les territoires (Économie : investissements)
  const alertesEco = alertesEconomie(etat, { economie: ctx.economie });
  for (const a of alertesEco.filter((x) => x.type === 'penurie').slice(0, 1)) liste.push({ type: 'urgence', titre: a.titre, raison: `${a.texte} Un investissement renforce la filière (plusieurs années).`, aller: { onglet: 'economie' } });
  // Alertes territoriales (indice sous le seuil critique) : rejoindre directement le territoire sur la carte
  for (const pt of briefing(etat, { regions: ctx.regions, projets: ctx.projets, evenements: ctx.evenements }).filter((p) => p.type === 'territoire').slice(0, 2)) liste.push({ type: 'territoire', titre: pt.titre, raison: `${pt.texte} Un projet dans la région peut l’améliorer.`, aller: { onglet: 'monde', region: pt.region, vue: pt.indice } });
  for (const a of alertesEco.filter((x) => x.type === 'dependance').slice(0, 1)) liste.push({ type: 'territoire', titre: a.titre, raison: `${a.texte} Un investissement renforce la filière (plusieurs années).`, aller: { onglet: 'economie' } });
  if (!liste.length) liste.push({ type: 'echeance', titre: 'Laisser le temps courir', raison: 'Vos décisions produisent leurs effets mois après mois ; le temps s’arrête de lui-même quand une réponse est attendue.', aller: { onglet: 'bureau', cible: 'temps' } });
  const ICONE = { urgence: '!', engagement: '◎', echeance: '⏱', decision: '€', territoire: '◎' };
  const BOUTON = { urgence: 'Répondre', engagement: 'Ouvrir', echeance: 'Voir', decision: 'Ouvrir', territoire: 'Voir sur la carte' };
  for (const p of liste) if (p.aller?.onglet === 'economie') p.bouton = p.type === 'urgence' ? 'Traiter' : 'Voir l’économie';
  const l = liste.slice(0, 3);
  // Carte : « À surveiller » reçoit toutes les veilles (territoires, dépendances), pas seulement celles du trio du Bureau
  const veille = liste.filter((p) => p.type === 'territoire').slice(0, 3);
  return { liste: l, veille, html: `<ul class="grid md:grid-cols-3 gap-2 mb-2" id="priorites">${l.map((p, i) => `<li class="bg-carte border border-bord rounded-lg p-2 pl-3 filet-laiton flex items-center justify-between gap-2" data-priorite="${esc(p.type)}">
      <p class="min-w-0 text-sm leading-snug"><span class="font-semibold"><span aria-hidden="true" class="text-laiton mr-1">${ICONE[p.type]}</span>${esc(p.titre)}.</span> <span class="text-doux">${esc(p.raison)}</span></p>
      <button type="button" id="prio-${i}" data-prio="${i}" class="btn btn-s shrink-0 !px-3 text-sm">${p.bouton ?? BOUTON[p.type]}<span class="sr-only"> : ${esc(p.titre)}</span></button></li>`).join('')}</ul>` };
}

function ongletBureau(etat, ctx, donnees, points, brief, prio) {
  const sat = etat.territoires ? satisfactionNationale(etat.territoires, ctx.regions.regions) : null;
  const scenario = !!etat.scenario;
  // Scénario : les priorités du mois remplacent le briefing, le budget y figure déjà ; le brief du mandat long se replie
  const plfOuvert = !scenario && etat.budget && etat.joueur.role === 'premier_ministre' && !etat.plf && !raisonRefusPLF(etat);
  const mandat = scenario ? `<details class="mb-3" id="mandat-long"><summary class="min-h-[44px] flex items-center cursor-pointer font-semibold text-sm underline text-bleu">Votre mandat (${DUREE_MANDAT} mois) et ses objectifs</summary>${brief.html}</details>` : brief.html;
  // Premier mois : la prochaine action avant l'état du pays (rien n'a encore bougé) ; ensuite, ce qui s'est passé d'abord
  const blocFaire = `<section aria-labelledby="h-brief" class="mb-4">
      <h2 id="h-brief" class="font-serif font-bold text-xl mb-2">Que puis-je faire ?</h2>
      ${plfOuvert ? '<p class="mb-3 border-l-4 border-laiton bg-[#FFF4D6] p-3" role="status"><strong>Budget à présenter avant décembre.</strong> <button type="button" class="underline text-bleu min-h-[44px]" data-aller-budget>Ouvrir l’onglet Budget</button></p>' : ''}
      ${scenario || prio.liste.length ? prio.html : `<ul class="grid md:grid-cols-3 gap-2 mb-1">${(() => { const vus = new Set(); return points.map((pt, i) => carteBriefing(pt, i, etat, vus)).join(''); })()}</ul>`}
      ${lienDecisions(etat, ctx)}
    </section>`;
  const premierMois = etat.tour === 0 && !etat.evenement;
  return `${sectionGouvernement(etat, ctx)}${scenario ? sectionScenario(etat, ctx) : sectionMission(etat, ctx)}${scenario ? '' : mandat}
    ${premierMois ? blocFaire : ''}
    <section aria-labelledby="h-q1" class="mb-4">
      <h2 id="h-q1" class="font-serif font-bold text-xl mb-2">Que se passe-t-il ?</h2>
      ${sectionEvenement(etat, ctx)}
      ${scenario && etat.tour === etat.scenario.debut && !etat.evenement
        ? `<details class="mb-2"><summary class="min-h-[44px] flex items-center cursor-pointer text-sm underline text-bleu">Premier mois : rien n’a encore bougé. État du pays au départ</summary>${sectionEtatPays(etat, sat)}</details>`
        : `${sectionCeMois(etat, donnees, sectionBilanMois(etat, ctx))}
        ${sectionEtatPays(etat, sat)}`}
    </section>
    ${premierMois ? '' : blocFaire}
    <section aria-labelledby="h-attendu" class="mb-4">
      <h2 id="h-attendu" class="font-serif font-bold text-xl mb-2">Qu’attends-je de mes décisions ?</h2>
      ${sectionEngagements(etat, ctx)}
    </section>
    ${scenario ? mandat : ''}
    <div class="grid grid-cols-2 gap-2 items-start mb-4 [&>*]:!mb-0 [&>*:has([open])]:col-span-2 [&>details[open]]:col-span-2" id="details-bureau">
      ${sectionTousIndicateurs(etat, sat)}
      ${panneauSecteurs(etat, ctx)}
    </div>
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
  const onglet = ONGLETS.some(([id]) => id === ctx.onglet) && !(ctx.onglet === 'monde' && !ctx.monde) ? ctx.onglet : 'bureau';
  // Toutes les définitions nécessaires aux phrases d'explication (programmes, partis…)
  const donnees = { lois: ctx.lois, evenements: ctx.evenements, regions: ctx.regions, projets: ctx.projets, politiques: ctx.politiques, partis: ctx.partis, economie: ctx.economie };
  const points = onglet === 'bureau' ? briefing(etat, donnees) : [];
  ctx.vue = vueValide(ctx.vue, etat);
  const brief = onglet === 'bureau' ? briefMandat(etat, { regions: ctx.regions, objectifs: ctx.objectifs },
    { liste: catalogue(etat, ctx), refusPLF: raisonRefusPLF(etat), dureeMandat: DUREE_MANDAT, seuilDefaite: SEUIL_DEFAITE, points: POINTS_PAR_OBJECTIF }) : null;
  const prio = ['bureau', 'monde'].includes(onglet) && etat.scenario ? sectionPriorites(etat, ctx) : (['bureau', 'monde'].includes(onglet) && prioritesCampagne(etat, ctx)) || { html: '', liste: [] };
  const contenu = onglet === 'monde' && ctx.monde ? ecranMonde(etat, ctx, prio.liste, prio.veille)
    : onglet === 'bureau' ? ongletBureau(etat, ctx, donnees, points, brief, prio)
    : onglet === 'decisions' ? ongletDecisions(etat, ctx)
    : onglet === 'carte' ? ongletCarte(etat, ctx)
    : onglet === 'budget' ? sectionBudget(etat, ctx)
    : onglet === 'economie' ? ongletEconomie(etat, ctx)
    : onglet === 'opinion' ? ongletOpinion(etat, ctx)
    : onglet === 'parlement' ? ongletParlement(etat, ctx) : ongletChronologie(etat, ctx);

  racine.innerHTML = `
    <div class="sm:sticky sm:top-0 z-30 bg-carte -mx-4 px-4 shadow-sm">${enteteCollant(etat, d, ctx.horloge)}${barreOnglets(onglet)}</div>
    ${onglet === 'bureau' ? enteteBureau(etat, d, parti) : ''}
    <div id="panneau" role="tabpanel" aria-labelledby="tab-${onglet}" tabindex="-1">${contenu}</div>
    <p class="text-xs text-doux mt-4"><a class="underline text-bleu" href="${LIEN_SOURCES}" target="_blank" rel="noopener">Sources et méthode</a><span class="hidden sm:inline"> · Indices de jeu dérivés de données Insee/DREES ; transports : paramètre d’équilibrage.</span></p>
    ${navigationMobile(etat, d, onglet, ctx.horloge)}`;

  brancherNavigation(racine, dispatch);
  racine.querySelectorAll('[data-aller-decisions]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'onglet', onglet: 'decisions', haut: true })));
  if (onglet === 'bureau') {
    brancherEvenement(racine, dispatch);
    brancherMission(racine, dispatch, etat);
    brancherScenario(racine, dispatch, etat, prio.liste);
    brancherGouvernement(racine, dispatch);
    // Pistes du mandat : simple navigation (aucune décision exécutée). Le filtre de Décisions est remplacé
    // pour qu'un ancien filtre (statut, secteur) ne masque pas le levier proposé.
    racine.querySelectorAll('[data-piste]').forEach((b) => b.addEventListener('click', () => {
      const { onglet: o, decisions, vue, region } = brief.pistes[Number(b.dataset.piste)].aller;
      if (o === 'decisions') dispatch({ type: 'onglet', onglet: o, decisions: { categorie: '', secteur: '', statut: '', type: '', ...decisions }, haut: true });
      else dispatch({ type: 'onglet', onglet: o, vue, region, haut: true });
    }));
    racine.querySelector('[data-aller-budget]')?.addEventListener('click', () => dispatch({ type: 'onglet', onglet: 'budget', haut: true }));
    racine.querySelectorAll('[data-brief]').forEach((b) => b.addEventListener('click', () => {
      const pt = points[Number(b.dataset.brief)];
      const carte = etat.joueur.role === 'president' && ctx.monde ? 'monde' : 'carte';
      if (pt.type === 'territoire') dispatch({ type: 'onglet', onglet: carte, region: pt.region, vue: pt.indice, haut: true });
      else if (pt.type === 'projet') dispatch({ type: 'onglet', onglet: carte, region: pt.region, haut: true });
      else if (pt.type === 'budget') dispatch({ type: 'onglet', onglet: 'budget', haut: true });
      else { const c = racine.querySelector('[data-evenement]'); c?.scrollIntoView({ block: 'center' }); c?.focus(); }
    }));
  } else if (onglet === 'monde' && ctx.monde) brancherMonde(racine, dispatch, ctx, prio.liste, etat, prio.veille);
  else if (onglet === 'decisions') brancherDecisions(racine, dispatch, ctx);
  else if (onglet === 'carte') brancherCarte(racine, dispatch);
  else if (onglet === 'budget') brancherBudget(racine, dispatch, ctx, etat);
  else if (onglet === 'economie') brancherEconomie(racine, dispatch);
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
