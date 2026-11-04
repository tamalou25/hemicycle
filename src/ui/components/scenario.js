// Partie courte « Douze mois pour convaincre » (présentation) : feuille de route, priorités du mois, conclusion.
// Toute la logique (région, engagements, crises, résultat) vient du moteur ; cette vue ne fait que l'afficher.
import { esc, fmt } from '../util.js';
import { apercuProjet, evaluerEngagements, priorites, gardeFou, RESULTATS_SCENARIO, ETATS_ENGAGEMENT, DUREE_MANDAT, SEUIL_DEFAITE } from '../../engine/index.js';
import { moisDe } from './mission.js';

const NOM_INDICE = { sante: 'accès aux soins', emploi: 'emploi', transports: 'transports' };
const md = (n) => `${fmt(n, 2)} Md€`;
/** Libellé d'état pendant la partie (le bilan final utilise ETATS_ENGAGEMENT). */
const LIB_COURS = { atteint: 'Tenu', partiel: 'En cours', manque: 'À commencer' };
const CLS_ETAT = { atteint: 'text-[#1F6E43] border-[#1F6E43] bg-[#DCEBDD]', partiel: 'text-[#8A5A00] border-[#8A5A00] bg-[#FFF3C4]', manque: 'text-doux border-bord bg-carte' };
const CLS_RESULTAT = { complet: 'border-[#1F6E43]', partiel: 'border-[#8A5A00]', echec: 'border-rouge' };
const LEVIER = { soins: ['Carte', 'carte'], parlement: ['Décisions', 'decisions'], avenir: ['Décisions', 'decisions'] };
const ETAPE_LIB = { assemblee: 'Assemblée', senat: 'Sénat', cmp: 'commission mixte', lecture_definitive: 'lecture définitive', conseil: 'Conseil constitutionnel' };

/** Carte compacte d'une réponse pour l'engagement « soins » : intention, coût, délai, contrepartie ; détails techniques repliés. */
function carteOption(etat, opt, a, i) {
  const dansScenario = a.effetsDansMission?.[0]?.total ?? 0;
  const eff = a.effets[0];
  return `<li class="border border-bord rounded-lg p-2.5 bg-white flex flex-col" data-option="${esc(opt.projetId)}">
    <p class="text-xs font-bold uppercase text-doux">${esc(opt.libelle)}</p>
    <h4 class="font-serif font-bold text-base leading-tight" id="opt-${i}">${esc(a.titre)}</h4>
    <ul class="text-sm mt-1 space-y-0.5">
      <li><strong>${md(a.coutMd)}</strong> maintenant, puis ${md(a.coutAnnuelMd)}/an · premiers effets : <strong>${esc(moisDe(etat, a.premiersEffetsTour))}</strong></li>
      <li>D’ici l’échéance : <strong>${dansScenario > 0 ? `jusqu’à +${fmt(dansScenario, 1)} pts` : 'aucun effet (résultats après)'}</strong> sur +${fmt(eff.total, 1)} au total${a.risque ? ` · risque ${Math.round(a.risque.proba * 100)} %` : ''}</li>
    </ul>
    <details class="text-xs text-doux"><summary class="min-h-[32px] flex items-center cursor-pointer underline">Détails et contrepartie</summary>
      <p>${esc(opt.resume)}${a.risque ? ` Risque : ${esc(a.risque.texte)} (${Math.round(a.risque.proba * 100)} % de probabilité).` : ''} Montée en charge sur ${a.monteeMois} mois après la mise en service. Effets théoriques si le projet va à son terme, avant les autres variations (usure, événements, bornes). Financé par l’enveloppe d’investissement, sans vote ; le coût annuel réduit l’enveloppe des années suivantes. Les projets se cumulent.</p></details>
    <div class="mt-auto pt-2">${a.refus ? `<p class="text-sm text-rouge" id="refus-${i}">${esc(a.refus)}</p>` : ''}
      <button type="button" class="btn btn-p w-full" data-scenario-lancer="${esc(opt.projetId)}" aria-describedby="opt-${i}${a.refus ? ` refus-${i}` : ''}" ${a.refus ? 'disabled' : ''}>Choisir : ${esc(a.titre)}</button></div>
  </li>`;
}

/** Les deux réponses de l'engagement « soins » (tant qu'aucun projet n'est lancé). */
function reponsesSoins(etat, ctx, def, eng) {
  const s = etat.scenario;
  const donnees = { projets: ctx.projets, regions: ctx.regions };
  const nomRegion = ctx.regions.regions.find((r) => r.id === s.region)?.nom ?? s.region;
  const valeur = etat.territoires?.[s.region]?.[s.indice];
  // L'aperçu « d'ici l'échéance » du moteur se fonde sur la mission ; on lui donne le cadre du scénario (même règle)
  const base = { ...etat, mission: { statut: 'en_cours', echeance: s.echeance } };
  const options = (eng.options ?? def.engagements.find((e) => e.id === 'soins')?.options ?? []).map((o, i) => carteOption(etat, o, apercuProjet(base, o.projetId, s.region, donnees), i)).join('');
  return `<div class="mt-1" id="reponses-soins">
    <p class="text-sm">${esc(def.acteur?.nom ?? '')}, ${esc(def.acteur?.fonction ?? '')} <span class="text-xs border border-encre rounded px-1">personnage fictif</span> :
      l’${NOM_INDICE[s.indice]} de <strong>${esc(nomRegion)}</strong> est le plus faible du pays dans le jeu (indice <strong>${fmt(valeur, 1)}/100</strong>). Enveloppe disponible : <strong>${md(etat.finances?.enveloppe ?? 0)}</strong>.</p>
    <details class="text-xs text-doux"><summary class="min-h-[32px] flex items-center cursor-pointer underline">Que mesure cet indice ?</summary><p class="pb-1">${esc(def.avertissement_indice ?? '')}</p></details>
    <ul class="grid sm:grid-cols-2 gap-2 mt-1.5">${options}</ul>
  </div>`;
}

function ligneEngagement(etat, ctx, def, e, i, enCours) {
  const [nomOnglet] = LEVIER[e.id] ?? ['Décisions'];
  const lib = enCours ? LIB_COURS[e.etat] : ETATS_ENGAGEMENT[e.etat];
  // Un engagement commencé garde son levier (cumuler un projet, déposer une autre loi) ; non commencé, « À faire maintenant » le propose
  const bouton = enCours && e.etat === 'partiel' ? `<button type="button" class="btn btn-s !min-h-[44px] !py-1 text-sm shrink-0" data-scenario-levier="${esc(e.id)}" aria-label="${esc(`Ouvrir ${nomOnglet} : ${e.titre}`)}">${nomOnglet} →</button>` : '';
  const reponses = enCours && e.id === 'soins' && e.etat === 'manque' ? reponsesSoins(etat, ctx, def, e) : '';
  return `<li class="py-1.5 border-b border-bord last:border-0" data-engagement="${esc(e.id)}" data-etat="${e.etat}">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 text-sm leading-5"><span class="inline-block text-xs font-bold border rounded px-1.5 mr-1 ${CLS_ETAT[e.etat]}">${lib}</span><strong>${i + 1}. ${esc(e.titre)}</strong>
        <span class="block text-xs leading-4 text-doux">${esc(e.detail)}${enCours && e.etat === 'manque' && e.id !== 'soins' ? ` ${esc(e.lever)}` : ''}</span></div>${bouton}</div>
    ${reponses}</li>`;
}

/** Qui je suis, mes pouvoirs, l'échéance et les conditions exactes : repliés, lus quand c'est utile. */
function cadre(etat, ctx, def) {
  const s = etat.scenario;
  const parti = ctx.partis.find((p) => p.id === etat.joueur.parti);
  const pm = etat.joueur.role === 'premier_ministre';
  const conditions = def.engagements.map((e) => {
    const r = e.type === 'indice_region' ? [`effet attribué à vos projets ≥ ${e.cible} pts`, 'effet > 0, ou projet lancé dont les effets sont encore attendus', 'aucun projet lancé dans la région']
      : e.type === 'loi_promulguee' ? ['une loi déposée pendant le scénario est promulguée', 'texte adopté à l’Assemblée ou encore en navette', 'aucun texte adopté']
        : ['programme engagé dont les premiers effets ont commencé', 'programme engagé encore en préparation', 'aucun programme engagé'];
    return `<tr><th scope="row" class="text-left font-semibold pr-2 py-0.5 align-top">${esc(e.titre)}</th><td class="pr-2 py-0.5 align-top">${esc(r[0])}</td><td class="pr-2 py-0.5 align-top">${esc(r[1])}</td><td class="py-0.5 align-top">${esc(r[2])}</td></tr>`;
  }).join('');
  return `<details class="mt-1 text-sm" id="cadre-scenario"><summary class="min-h-[44px] flex items-center cursor-pointer underline text-bleu font-semibold">Qui suis-je, quels pouvoirs, quelles conditions ?</summary>
    <div class="space-y-2 pb-1">
      <p><strong>${esc(etat.joueur.nom)}</strong>, ${pm ? 'Premier ministre' : 'député·e'} (personnage fictif), ${esc(parti?.nom ?? '')}. ${esc(def.situation ?? '')}</p>
      <ul class="list-disc pl-5 space-y-0.5">
        <li>${pm ? 'Vous dirigez le gouvernement : lois (1 action parlementaire par mois), programmes nationaux, budget de l’État (dépôt de septembre à décembre), 49.3.' : 'Vous êtes député·e : propositions de loi et projets en région ; les programmes nationaux et le 49.3 relèvent du gouvernement.'}</li>
        <li>Une négociation d’accord par mois (2 capital). Capital politique : +${pm ? 3 : 2} par mois, plafonné à 10.</li>
        <li>Enveloppe d’investissement pour les projets en région (renouvelée en janvier, moins le fonctionnement des projets en service).</li>
        <li>Échéance : <strong>${esc(moisDe(etat, s.echeance))}</strong> (mois ${s.echeance}). Présidentielle en avril 2027 : selon le vainqueur, vous pouvez redevenir député·e ; vous pouvez aussi être candidat·e (Parlement).</li>
        <li>Fins anticipées : popularité sous ${SEUIL_DEFAITE} %, motion de censure (Premier ministre), victoire à la présidentielle. Le scénario se conclut alors avec ce qui a été fait.</li>
      </ul>
      <div class="overflow-x-auto"><table class="text-xs min-w-[36rem]"><caption class="text-left font-semibold mb-1">Conditions exactes à l’échéance</caption>
        <thead><tr><th scope="col" class="text-left pr-2">Engagement</th><th scope="col" class="text-left pr-2 text-[#1F6E43]">Tenu</th><th scope="col" class="text-left pr-2 text-[#8A5A00]">En partie</th><th scope="col" class="text-left text-rouge">Non tenu</th></tr></thead><tbody>${conditions}</tbody></table></div>
      ${def.garde_fou ? `<p id="garde-fou"><strong>Garde-fou</strong> : ${esc(def.garde_fou.texte)} Aujourd’hui : ${fmt(s.deficit)} → ${fmt(etat.indicateurs.deficit)} % du PIB (${gardeFou(etat, def)?.respecte ? 'dans la limite' : 'limite dépassée'}).</p>` : ''}
      <p><strong>Résultat</strong> : complet si les trois sont tenus et le garde-fou respecté ; partiel si un ou deux le sont (ou si les trois sont en partie) ; échec sinon. Il est distinct du score de bilan du mandat (${DUREE_MANDAT} mois) et des conditions de fin.</p>
    </div></details>`;
}

/** Conclusion à l'échéance (ou à la fin anticipée) : engagements, causes, attendu, compromis, conséquences politiques. */
function conclusion(etat, ctx, def) {
  const s = etat.scenario, b = s.bilan;
  const nomRegion = ctx.regions.regions.find((r) => r.id === s.region)?.nom ?? s.region;
  const eng = b.engagements.map((e) => {
    const lignes = [];
    if (e.id === 'soins') {
      for (const p of e.projets ?? []) lignes.push(`${esc(p.titre)} lancé au mois ${p.lance} (${md(p.cout)}), ${p.statut === 'chantier' ? `en chantier jusqu’au mois ${p.service}` : 'en service'}${p.alea ? ` ; aléa : ${esc(p.alea)}` : ''}.`);
      if (e.valeur > 0) lignes.push(`Effet observé, attribué à vos projets : <strong>+${fmt(e.valeur, 1)} pts</strong> d’${NOM_INDICE[s.indice]} (cible ${e.cible}).`);
      if (e.restantAttendu > 0) lignes.push(`Encore attendu : environ +${fmt(e.restantAttendu, 1)} pts d’ici ${esc(moisDe(etat, e.finMontee))}, si rien ne vient le contrarier.`);
      lignes.push(`Indice de ${esc(nomRegion)} : ${fmt(b.indice.debut, 1)} au départ, ${fmt(b.indice.fin, 1)} à la conclusion (toutes causes confondues : vos projets, événements, usure).`);
    } else if (e.id === 'parlement') {
      if (e.lois?.length) lignes.push(`Promulguée : <strong>${esc(e.lois.join(', '))}</strong>.`);
      if (e.enNavette) lignes.push(`« ${esc(e.enNavette)} » encore en navette (${esc(ETAPE_LIB[e.etape] ?? e.etape)}) : son sort se jouera après la conclusion.`);
      if (e.rejets) lignes.push(`${e.rejets} texte(s) rejeté(s) : la majorité de sièges n’y était pas ; un accord, un amendement ou un autre texte auraient pu changer le vote.`);
      if (!e.engage) lignes.push('Aucune loi déposée.');
    } else {
      for (const p of e.programmes ?? []) lignes.push(`${esc(p.titre)} : ${p.statut === 'preparation' ? `en préparation jusqu’au mois ${p.enService}` : 'premiers effets commencés'}, ${fmt(p.coutAnnuel, 1)} Md€/an inscrits au déficit${p.contrepartie ? ` ; contrepartie : ${esc(p.contrepartie.replace(/\.$/, ''))}` : ''}.`);
      if (!e.programmes?.length) lignes.push(b.roleChange ? 'Aucun programme : ils relèvent du gouvernement, que vous avez quitté en cours de route.' : 'Aucun programme engagé.');
    }
    return `<li class="py-1.5 border-b border-bord last:border-0" data-engagement="${esc(e.id)}" data-etat="${e.etat}"><span class="inline-block text-xs font-bold border rounded px-1.5 mr-1 ${CLS_ETAT[e.etat]}">${ETATS_ENGAGEMENT[e.etat]}</span><strong class="text-sm">${esc(e.titre)}</strong>
      <ul class="list-disc pl-5 text-sm mt-0.5">${lignes.map((l) => `<li>${l}</li>`).join('')}</ul></li>`;
  }).join('');
  const crises = b.crises.length ? `<ul class="list-disc pl-5 text-sm">${b.crises.map((c) => `<li><strong>${esc(c.titre)}</strong> (mois ${c.tour}) : ${c.libelle ? `${esc(c.libelle)}${c.parDefaut ? ' (réponse par défaut, faute de choix)' : ''}` : 'en attente de réponse'}.</li>`).join('')}</ul>` : '<p class="text-sm text-doux">Aucune crise programmée rencontrée.</p>';
  const c = b.compromis;
  const politique = [
    c.accords ? `${c.accords} accord${c.accords > 1 ? 's' : ''} de soutien conclu${c.accords > 1 ? 's' : ''}` : null, c.accordsRefuses ? `${c.accordsRefuses} accord${c.accordsRefuses > 1 ? 's' : ''} refusé${c.accordsRefuses > 1 ? 's' : ''} (positions trop éloignées)` : null,
    c.amendements ? `${c.amendements} amendement${c.amendements > 1 ? 's' : ''} de compromis (texte plus modéré, effets réduits)` : null, c.recours493 ? `${c.recours493} recours au 49.3` : null,
    c.censures ? `${c.censures} motion${c.censures > 1 ? 's' : ''} de censure` : null,
    c.budget === 'adopte' ? 'budget de l’État adopté' : c.budget === 'loi_speciale' ? 'budget rejeté : loi spéciale' : 'aucun budget voté',
  ].filter(Boolean);
  if (!c.accords && !c.accordsRefuses && !c.amendements && !c.recours493) politique.unshift('aucun accord négocié ni amendement : vos textes ont été votés tels quels');
  const sens = (a, z, bon) => (z === a ? 'stable' : `${a > z ? 'en baisse' : 'en hausse'} (${(z > a) === bon ? 'mieux' : 'moins bien'})`);
  const elections = b.elections.map((e) => `${e.type === 'presidentielle' ? 'présidentielle' : e.type} au mois ${e.tour}${e.vainqueur ? ` : victoire ${esc(ctx.partis.find((p) => p.id === e.vainqueur)?.sigle ?? e.vainqueur)} (simulation)` : ''}`).join(' ; ');
  const ouvert = etat.tour === b.tour && !ctx.scenarioReplie ? ' open' : '';
  return `<details id="conclusion-scenario" class="mt-1 border-l-4 ${CLS_RESULTAT[b.resultat]} pl-2"${ouvert}><summary class="min-h-[44px] flex items-center cursor-pointer font-semibold">Conclusion : ${esc(RESULTATS_SCENARIO[b.resultat])}</summary>
    ${b.fin ? '<p class="text-sm mt-1"><strong>La partie s’est arrêtée avant l’échéance</strong> : la conclusion porte sur ce qui a été fait jusque-là.</p>' : ''}
    <h3 class="font-semibold text-sm mt-1">Vos engagements</h3><ol class="mb-2">${eng}</ol>
    <h3 class="font-semibold text-sm">Crises rencontrées et vos choix</h3>${crises}
    <h3 class="font-semibold text-sm mt-2">Compromis et conséquences politiques</h3>
    <ul class="list-disc pl-5 text-sm">
      <li>${esc(politique.join(' · '))}.</li>
      ${b.roleChange ? '<li><strong>Vous avez quitté Matignon</strong> après la présidentielle : programmes, budget et 49.3 ne vous étaient plus accessibles ; projets et propositions de loi le restaient.</li>' : ''}
      ${elections ? `<li>Élections : ${elections}.</li>` : ''}
      <li>Popularité : ${fmt(b.popularite.debut)} → ${fmt(b.popularite.fin)} % (${sens(b.popularite.debut, b.popularite.fin, true)}). Déficit : ${fmt(b.deficit.debut)} → ${fmt(b.deficit.fin)} % du PIB (${sens(b.deficit.debut, b.deficit.fin, false)}).</li>
      ${b.gardeFou ? `<li data-garde-fou="${b.gardeFou.respecte}">Garde-fou financier (${b.gardeFou.hausse > 0 ? '+' : ''}${fmt(b.gardeFou.hausse, 2)} pt, limite +${b.gardeFou.hausseMax}) : <strong>${b.gardeFou.respecte ? 'respecté' : 'dépassé'}</strong>${!b.gardeFou.respecte && b.engagements.every((e) => e.etat === 'atteint') ? ' : les trois engagements sont tenus, mais au prix des finances publiques ; le résultat reste partiel' : ''}.</li>` : ''}
    </ul>
    <p class="text-sm mt-2"><strong>Scénario</strong> ≠ <strong>score de bilan</strong> ≠ <strong>fin de partie</strong> : ce résultat n’ajoute pas de points ; le mandat de ${DUREE_MANDAT} mois continue avec ses objectifs${etat.fin ? '' : ' (« Votre mandat », plus bas)'}.</p>
    ${etat.fin ? '' : `<div class="flex flex-wrap gap-2 mt-2"><button type="button" class="btn btn-p" id="scenario-rejouer">Rejouer avec d’autres choix</button><button type="button" class="btn btn-s" id="scenario-poursuivre">Poursuivre la simulation</button></div>
    <p class="text-xs text-doux mt-1">Rejouer recommence le même scénario avec la même graine (mêmes aléas) : vous pourrez comparer vos choix. Poursuivre garde cette partie.</p>`}
  </details>`;
}

/** Bloc du scénario en tête du Bureau (rien si la partie n'a pas de scénario). */
export function sectionScenario(etat, ctx) {
  const s = etat.scenario;
  const def = ctx.scenario;
  if (!s || !def) return '';
  const donnees = { lois: ctx.lois, projets: ctx.projets, regions: ctx.regions, politiques: ctx.politiques, evenements: ctx.evenements, scenario: def };
  const enCours = s.statut === 'en_cours';
  const restant = Math.max(0, s.echeance - etat.tour);
  const engagements = evaluerEngagements(etat, donnees);
  const corps = enCours
    ? `<ol class="mt-1">${engagements.map((e, i) => ligneEngagement(etat, ctx, def, e, i, true)).join('')}</ol>${cadre(etat, ctx, def)}`
    : `${conclusion(etat, ctx, def)}<details class="mt-1 text-sm"><summary class="min-h-[44px] flex items-center cursor-pointer text-bleu underline">Rappel du cadre</summary>${cadre(etat, ctx, def)}</details>`;
  return `<section id="scenario" aria-labelledby="h-scenario" class="bg-carte border-2 border-encre rounded-lg p-3 mb-3">
    <div class="flex flex-wrap items-baseline justify-between gap-x-2"><h2 id="h-scenario" class="font-serif font-bold text-lg">${esc(def.titre)}</h2>
      <span class="text-sm text-doux" id="scenario-echeance">${enCours ? `${restant} mois restant${restant > 1 ? 's' : ''} · échéance ${esc(moisDe(etat, s.echeance))}` : `Conclu au mois ${s.bilan?.tour ?? s.echeance}`}</span></div>
    ${enCours && etat.tour === s.debut ? `<p class="text-sm mt-1">Trois engagements publics, jugés sur l’état réel du pays dans ${restant} mois. Chaque mois : une ou deux décisions, puis « Mois suivant ».</p>` : ''}
    ${corps}</section>`;
}

/** « À faire maintenant » : au plus trois priorités, chacune avec sa raison. Retourne { html, liste } pour brancher les boutons. */
export function sectionPriorites(etat, ctx) {
  const donnees = { lois: ctx.lois, evenements: ctx.evenements, projets: ctx.projets, regions: ctx.regions, politiques: ctx.politiques, scenario: ctx.scenario };
  const liste = priorites(etat, donnees);
  const ICONE = { urgence: '!', engagement: '◎', echeance: '⏱', decision: '€' };
  const BOUTON = { urgence: 'Répondre', engagement: 'Ouvrir', echeance: 'Voir', decision: 'Ouvrir' };
  const html = liste.length
    ? `<ul class="grid md:grid-cols-3 gap-2 mb-2" id="priorites">${liste.map((p, i) => `<li class="bg-carte border border-bord rounded-lg p-2 pl-3 filet-laiton flex items-center justify-between gap-2" data-priorite="${esc(p.type)}">
        <p class="min-w-0 text-sm leading-snug"><span class="font-semibold"><span aria-hidden="true" class="text-laiton mr-1">${ICONE[p.type] ?? '•'}</span>${esc(p.titre)}.</span> <span class="text-doux">${esc(p.raison)}</span></p>
        <button type="button" id="prio-${i}" data-prio="${i}" class="btn btn-s shrink-0 !px-3 text-sm">${BOUTON[p.type] ?? 'Ouvrir'}<span class="sr-only"> : ${esc(p.titre)}</span></button></li>`).join('')}</ul>`
    : '<p class="text-sm text-doux mb-2" id="priorites">Rien d’urgent : vos engagements sont lancés. Vous pouvez passer au mois suivant, ou négocier, amender, investir.</p>';
  return { html, liste };
}

export function brancherScenario(racine, dispatch, etat, prioritesListe = []) {
  racine.querySelectorAll('[data-scenario-lancer]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'projet', projetId: b.dataset.scenarioLancer, regionId: etat.scenario.region })));
  const ALLER = { soins: { onglet: 'carte', region: etat.scenario?.region, vue: etat.scenario?.indice }, parlement: { onglet: 'decisions', decisions: { categorie: 'nationale', secteur: '', statut: '', type: 'loi' } }, avenir: { onglet: 'decisions', decisions: { categorie: 'nationale', secteur: '', statut: '', type: 'programme' } } };
  racine.querySelectorAll('[data-scenario-levier]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'onglet', haut: true, ...(ALLER[b.dataset.scenarioLevier] ?? { onglet: 'decisions' }) })));
  racine.querySelector('#scenario-rejouer')?.addEventListener('click', () => dispatch({ type: 'rejouer-scenario' }));
  racine.querySelector('#scenario-poursuivre')?.addEventListener('click', () => dispatch({ type: 'ui', patch: { scenarioReplie: true, focusApres: 'h-q1' } }));
  racine.querySelectorAll('[data-prio]').forEach((b) => b.addEventListener('click', () => {
    const p = prioritesListe[Number(b.dataset.prio)];
    if (!p) return;
    if (p.aller.onglet === 'bureau') {
      const c = racine.querySelector(p.aller.cible === 'evenement' ? '[data-evenement]' : '#scenario');
      c?.scrollIntoView({ block: 'center' }); c?.focus();
    } else dispatch({ type: 'onglet', haut: true, ...p.aller, ...(p.aller.decisions ? { decisions: { categorie: '', secteur: '', statut: '', type: '', ...p.aller.decisions } } : {}) });
  }));
}

