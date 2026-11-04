// Mission d'initiation (présentation) : situation, comparaison des réponses, suivi, débrief.
// Toute la logique (région, étapes, résultat) vient du moteur ; cette vue ne fait que l'afficher.
import { esc, fmt, MOIS } from '../util.js';
import { apercuProjet, etapesMission, projetMission, dateDuTour, RESULTATS_MISSION } from '../../engine/index.js';

const NOM_INDICE = { sante: 'accès aux soins', emploi: 'emploi', transports: 'transports' };
const NOM_ETAPE = {
  comprendre: 'Comprendre la situation', choisir: 'Choisir une réponse (ou différer)', chantier: 'Engager les moyens',
  service: 'Mise en service', effet: 'Premiers effets observés', debrief: 'Débrief',
};
const LIB_ETAT = { fait: 'Fait', en_cours: 'En cours', a_faire: 'À faire', impossible: 'Non réalisé' };
const CLS_ETAT = { fait: 'text-[#157A48] border-[#157A48]', en_cours: 'text-[#8A5A00] border-[#8A5A00]', a_faire: 'text-doux border-bord', impossible: 'text-rouge border-rouge' };

/** « mars 2027 » pour un numéro de mois de jeu. */
export const moisDe = (etat, tour) => { const d = dateDuTour({ ...etat, tour }); return `${MOIS[d.mois - 1]} ${d.annee}`; };
const md = (n) => `${fmt(n, 2)} Md€`;

function carteOption(etat, opt, a, i, def) {
  const dansMission = a.effetsDansMission?.[0]?.total ?? 0;
  const eff = a.effets[0];
  return `<li class="border border-bord rounded-lg p-3 bg-white flex flex-col" data-option="${esc(opt.projetId)}">
    <p class="text-xs font-bold uppercase text-doux">${esc(opt.libelle)}</p>
    <h4 class="font-serif font-bold text-lg leading-tight" id="opt-${i}">${esc(a.titre)}</h4>
    <p class="text-sm mt-1">${esc(opt.resume)}</p>
    <dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm mt-2">
      <dt class="text-doux">Coût immédiat</dt><dd class="font-semibold">${md(a.coutMd)}</dd>
      <dt class="text-doux">Coût chaque année</dt><dd class="font-semibold">${md(a.coutAnnuelMd)} <span class="font-normal text-doux">(dès la mise en service)</span></dd>
      <dt class="text-doux">Premiers effets</dt><dd class="font-semibold">${esc(moisDe(etat, a.premiersEffetsTour))}</dd>
      <dt class="text-doux">Montée en charge</dt><dd class="font-semibold">${a.monteeMois} mois</dd>
      <dt class="text-doux">Effet total visé</dt><dd class="font-semibold">+${fmt(eff.total, 1)} pts d’${esc(NOM_INDICE[eff.indice])}</dd>
      <dt class="text-doux">D’ici la fin de la mission</dt><dd class="font-semibold">${dansMission > 0 ? `+${fmt(dansMission, 1)} pts au plus` : 'aucun effet : résultats après la mission'}</dd>
    </dl>
    ${a.risque ? `<p class="text-sm mt-2"><strong>Risque :</strong> ${esc(a.risque.texte)} (${Math.round(a.risque.proba * 100)} % de probabilité).</p>` : ''}
    <p class="text-xs text-doux mt-1">Effets théoriques si le projet va à son terme, avant les autres variations (usure, événements, bornes de l’indice). Pas de vote : financé par l’enveloppe d’investissement.</p>
    <div class="mt-auto pt-3">${a.refus ? `<p class="text-sm text-rouge" id="refus-${i}">${esc(a.refus)}</p>` : ''}
      <button type="button" class="btn btn-p w-full" data-mission-lancer="${esc(opt.projetId)}" aria-describedby="opt-${i}${a.refus ? ` refus-${i}` : ''}" ${a.refus ? 'disabled' : ''}>Choisir : ${esc(a.titre)}</button></div>
  </li>`;
}

function etapes(etat, donnees) {
  return `<ol class="space-y-1" aria-label="Étapes de la mission">${etapesMission(etat, donnees).map((e) => `<li class="flex items-start justify-between gap-2 text-sm border-b border-bord last:border-0 py-1" data-etape="${e.id}" data-etat="${e.etat}">
      <span class="min-w-0"><strong>${NOM_ETAPE[e.id]}</strong><br><span class="text-doux">${esc(e.detail)}</span></span>
      <span class="shrink-0 text-xs font-bold border rounded px-1.5 ${CLS_ETAT[e.etat]}">${LIB_ETAT[e.etat]}</span></li>`).join('')}</ol>`;
}

function debrief(etat, donnees, nomRegion) {
  const m = etat.mission, d = m.debrief;
  const def = donnees.projets.projets.find((p) => p.id === d.projetId);
  const lignes = [];
  if (def) lignes.push(`Vous avez lancé <strong>${esc(def.titre)}</strong> (${md(d.coutEngage)}) au mois ${d.lance}${d.alea ? ` ; aléa : ${esc(d.alea)}` : ''}.`);
  else lignes.push(d.differe != null ? `Vous avez différé la réponse au mois ${d.differe}, sans engager de moyens ensuite.` : 'Aucun moyen n’a été engagé pendant la mission.');
  if (d.effetObserve > 0) lignes.push(`Effet observé, attribué au projet : <strong>+${fmt(d.effetObserve, 1)} pts</strong> d’${NOM_INDICE[m.indice]} dans la région.`);
  if (d.restantAttendu > 0) lignes.push(`Encore attendu : environ +${fmt(d.restantAttendu, 1)} pts d’ici ${esc(moisDe(etat, d.finMontee))}, si rien ne vient le contrarier.`);
  lignes.push(`Indice ${NOM_INDICE[m.indice]} de ${esc(nomRegion)} : ${fmt(d.valeurInitiale, 1)} au départ, ${fmt(d.valeurFinale, 1)} à la fin de la mission (toutes causes confondues).`);
  if (d.roleChange) lignes.push('Votre rôle a changé pendant la mission (élection présidentielle) : les projets en région restent accessibles.');
  if (d.fin) lignes.push('La partie s’est arrêtée avant l’échéance : le débrief porte sur ce qui a été fait jusque-là.');
  const ouvert = etat.tour === d.tour ? ' open' : '';
  return `<details id="debrief-mission" class="mt-1"${ouvert}><summary class="min-h-[44px] flex items-center cursor-pointer font-semibold">Débrief : ${esc(RESULTATS_MISSION[d.resultat])}</summary>
    <ul class="list-disc pl-5 text-sm space-y-1">${lignes.map((l) => `<li>${l}</li>`).join('')}</ul>
    <p class="text-sm mt-2"><strong>Mission</strong> ≠ <strong>score de bilan</strong> : la mission n’ajoute pas de points. Le mandat continue, avec vos objectifs de fin de mandat${etat.fin ? '' : ' (ci-dessous)'}.</p>
  </details>`;
}

/** Bloc de la mission en tête du Bureau (rien si la partie n'a pas de mission). */
export function sectionMission(etat, ctx) {
  const m = etat.mission;
  if (!m) return '';
  const donnees = { projets: ctx.projets, regions: ctx.regions };
  const def = ctx.mission;
  const region = ctx.regions.regions.find((r) => r.id === m.region);
  const nomRegion = region?.nom ?? m.region;
  const valeur = etat.territoires?.[m.region]?.[m.indice];
  const p = projetMission(etat, donnees);
  const enCours = m.statut === 'en_cours';
  const restant = Math.max(0, m.echeance - etat.tour);
  let corps;
  if (!enCours) corps = debrief(etat, donnees, nomRegion) + `<details class="mt-1"><summary class="min-h-[44px] flex items-center cursor-pointer text-sm text-bleu underline">Étapes de la mission</summary>${etapes(etat, donnees)}</details>`;
  else if (!p) {
    const options = (def?.options ?? []).map((o, i) => carteOption(etat, o, apercuProjet(etat, o.projetId, m.region, donnees), i)).join('');
    corps = `<p class="text-sm mt-1">${esc(def?.acteur?.nom ?? '')}, ${esc(def?.acteur?.fonction ?? '')} <span class="text-xs border border-encre rounded px-1">personnage fictif</span> :
        l’${NOM_INDICE[m.indice]} de <strong>${esc(nomRegion)}</strong> est le plus faible du pays dans le jeu (indice <strong>${fmt(valeur, 1)}/100</strong>).
        Enveloppe d’investissement disponible : <strong>${md(etat.finances?.enveloppe ?? 0)}</strong>.</p>
      <details class="text-xs text-doux"><summary class="min-h-[44px] flex items-center cursor-pointer underline">Que mesure cet indice ?</summary><p class="pb-1">${esc(def?.avertissement_indice ?? '')}</p></details>
      <h3 class="font-serif font-bold text-base mt-1">Deux réponses possibles</h3>
      <ul class="grid md:grid-cols-2 gap-3 mt-1">${options}</ul>
      <div class="mt-3 border-t border-bord pt-2">
        ${m.differe != null ? `<p class="text-sm" role="status">Décision différée au mois ${m.differe}. Vous pouvez encore choisir jusqu’au mois ${m.echeance - 1}.</p>`
          : `<button type="button" class="btn btn-s" id="mission-differer" aria-describedby="mission-differer-aide">Différer pour l’instant</button>
        <p id="mission-differer-aide" class="text-xs text-doux mt-1">Aucune dépense. L’indice continue d’évoluer sans vous. Sans réponse engagée avant le mois ${m.echeance}, la mission se termine en occasion manquée.</p>`}
      </div>`;
  } else corps = `<p class="text-sm mt-1">Réponse engagée dans <strong>${esc(nomRegion)}</strong> : ${esc(p.def.titre)}. Indice actuel : <strong>${fmt(valeur, 1)}/100</strong> (départ ${fmt(m.valeurInitiale, 1)}).</p>${etapes(etat, donnees)}`;
  return `<section id="mission" aria-labelledby="h-mission" class="bg-carte border-2 border-encre rounded-lg p-3 mb-3">
    <div class="flex flex-wrap items-baseline justify-between gap-x-2"><h2 id="h-mission" class="font-serif font-bold text-lg">Mission : ${esc(def?.titre ?? 'initiation')}</h2>
      <span class="text-sm text-doux" id="mission-echeance">${enCours ? `${restant} mois restant${restant > 1 ? 's' : ''} (échéance : ${esc(moisDe(etat, m.echeance))})` : 'Terminée'}</span></div>
    ${corps}</section>`;
}

export function brancherMission(racine, dispatch, etat) {
  racine.querySelectorAll('[data-mission-lancer]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'projet', projetId: b.dataset.missionLancer, regionId: etat.mission.region })));
  racine.querySelector('#mission-differer')?.addEventListener('click', () => dispatch({ type: 'mission-differer' }));
}
