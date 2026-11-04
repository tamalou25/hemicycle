import { RESULTATS_MISSION, RESULTATS_SCENARIO, ETATS_ENGAGEMENT } from '../../engine/index.js';
import { esc, fmt, MOIS } from '../util.js';
import { boutonPartage, zonePartage, brancherPartage } from '../components/partage.js';
import { dateDuTour, evaluerFin, POINTS_PAR_OBJECTIF } from '../../engine/index.js';
import { texteValeur } from '../components/objectifs.js';

const evo = (etat, id, unite) => {
  const h = etat.historique;
  const a = h[0]?.[id] ?? etat.indicateurs[id];
  const b = etat.indicateurs[id];
  return `<dt>${id === 'chomage' ? 'Chômage' : id === 'croissance' ? 'Croissance' : 'Déficit'}</dt><dd class="text-right font-semibold tabular-nums">${fmt(a)} → ${fmt(b)}${unite}</dd>`;
};

export function render(racine, etat, dispatch, ctx) {
  const d = dateDuTour(etat);
  const i = etat.indicateurs;
  const f = evaluerFin(etat, { regions: ctx?.regions, objectifs: ctx?.objectifs });
  const nbAtteints = (f.objectifs ?? []).filter((o) => o.atteint).length;
  const sectionObj = (f.objectifs ?? []).length ? `<section aria-labelledby="h-obj" class="bg-carte border border-bord rounded-lg p-4 mt-4">
      <h2 id="h-obj" class="font-serif font-bold text-xl mb-2">Objectifs du mandat</h2>
      <ul>${f.objectifs.map((o) => { const t = texteValeur(o); return `<li class="py-1.5 border-b border-bord last:border-0 flex items-baseline justify-between gap-2"><span class="min-w-0"><strong class="text-sm">${esc(o.titre)}</strong><br><span class="text-xs text-doux">Valeur finale : ${esc(t.v)} · cible ${esc(t.c)}</span></span><span class="shrink-0 text-xs font-bold border rounded px-2 py-0.5 ${o.atteint ? 'border-[#1F6E43] text-[#1F6E43]' : 'border-bord text-doux'}">${o.atteint ? 'Atteint' : 'Non atteint'}</span></li>`; }).join('')}</ul>
      <p class="text-sm mt-2">${nbAtteints} sur ${f.objectifs.length} atteint${nbAtteints > 1 ? 's' : ''} : <strong>+${nbAtteints * POINTS_PAR_OBJECTIF} points au bilan</strong> (${POINTS_PAR_OBJECTIF} par objectif).</p>
    </section>` : '';
  const elu = etat.fin.type === 'victoire';
  const president = etat.joueur.role === 'president';
  const nbElections = (etat.resultatsElections ?? []).length;
  const couleur = f.score >= 55 ? '#1F6E43' : f.score >= 35 ? '#8A5A00' : '#B3262B';
  racine.innerHTML = `<section class="max-w-xl mx-auto py-4">
    <h1 class="font-serif font-bold text-3xl">${esc(f.titre)}</h1>
    ${elu ? '<p class="mt-2"><span class="inline-block text-xs font-bold uppercase border-2 border-encre bg-[#FFF3C4] rounded px-2 py-0.5">Simulation</span></p>' : ''}
    <p class="mt-2 text-lg">${esc(f.texte)}</p>
    ${etat.fin.texte ? `<p class="mt-1 text-doux">${esc(etat.fin.texte)}</p>` : ''}
    ${elu ? '<p class="mt-2 text-sm text-doux">Résultat issu d’un scrutin simulé, sans lien avec une élection réelle.</p>' : ''}
    ${etat.mission?.debrief ? `<p class="mt-3 text-sm border-l-4 border-laiton bg-carte p-2" id="fin-mission"><strong>Mission d’initiation :</strong> ${esc(RESULTATS_MISSION[etat.mission.debrief.resultat])}. Elle n’entre pas dans le score de bilan.</p>` : ''}
    ${etat.scenario?.bilan ? `<section class="mt-3 text-sm border-l-4 border-laiton bg-carte p-2" id="fin-scenario" aria-labelledby="h-fin-scenario"><h2 id="h-fin-scenario" class="font-semibold">Scénario « Douze mois pour convaincre » : ${esc(RESULTATS_SCENARIO[etat.scenario.bilan.resultat])}</h2>
      <p class="text-doux">${etat.scenario.bilan.tour < etat.scenario.echeance ? `Partie arrêtée au mois ${etat.scenario.bilan.tour}, avant l’échéance : conclusion sur ce qui a été fait.` : `Scénario conclu au mois ${etat.scenario.bilan.tour}.`} Le scénario n’entre pas dans le score de bilan.</p>
      <ul class="mt-1">${etat.scenario.bilan.engagements.map((e) => `<li class="py-0.5"><span class="text-xs font-bold border rounded px-1.5 mr-1">${esc(ETATS_ENGAGEMENT[e.etat])}</span>${esc(e.titre)} <span class="text-doux">— ${esc(e.detail)}</span></li>`).join('')}</ul>
      ${etat.scenario.bilan.roleChange ? '<p class="mt-1">Vous aviez quitté Matignon après la présidentielle.</p>' : ''}</section>` : ''}
    <div class="bg-carte border border-bord rounded-lg p-4 mt-4">
      <div class="flex justify-between items-baseline"><h2 class="font-serif font-bold text-xl">Score de bilan</h2><span class="text-2xl font-bold tabular-nums">${f.score}<span class="text-sm text-doux"> /100</span></span></div>
      <div class="h-3 bg-[#E8E1CD] rounded mt-2" role="meter" aria-label="Score de bilan" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${f.score}" aria-valuetext="${f.score} sur 100"><div class="h-3 rounded" style="width:${f.score}%;background:${couleur}"></div></div>
    </div>
    <div class="bg-carte border border-bord rounded-lg p-4 mt-4">
      <h2 class="font-serif font-bold text-xl mb-1">Bilan de ${esc(etat.joueur.nom)}${president ? ', président·e (fictif)' : ''}</h2>${president && etat.gouvernement ? `<p class="text-sm text-doux">${etat.gouvernement.renversements} gouvernement${etat.gouvernement.renversements > 1 ? 's' : ''} renversé${etat.gouvernement.renversements > 1 ? 's' : ''}, ${etat.gouvernement.nominations} nomination${etat.gouvernement.nominations > 1 ? 's' : ''}.</p>` : ''}
      <p class="text-sm text-doux mb-3">${esc(MOIS[d.mois - 1])} ${d.annee}, après ${etat.tour} mois</p>
      <dl class="grid grid-cols-2 gap-y-1 text-sm">
        <dt>Lois adoptées</dt><dd class="text-right font-semibold">${etat.loisAdoptees.length}</dd>
        <dt>Lois rejetées</dt><dd class="text-right font-semibold">${etat.loisRejetees.length}</dd>
        <dt>Élections disputées</dt><dd class="text-right font-semibold">${nbElections}</dd>
        ${evo(etat, 'chomage', ' %')}${evo(etat, 'croissance', ' %')}${evo(etat, 'deficit', ' % du PIB')}
        <dt>Popularité finale</dt><dd class="text-right font-semibold">${fmt(i.popularite)} %</dd>
        <dt>Dette</dt><dd class="text-right font-semibold">${fmt(i.dette)} % du PIB</dd>
      </dl>
      <p class="text-xs text-doux mt-2">Évolution : début de mandat → fin.</p>
    </div>
    ${sectionObj}
    <div class="mt-6 flex gap-3 flex-wrap">
      <button type="button" id="rejouer" class="btn btn-p">Rejouer</button>
      ${etat.scenario ? '<button type="button" id="rejouer-scenario" class="btn btn-s">Rejouer ce scénario (même graine)</button>' : ''}
      <button type="button" id="export" class="btn btn-s">Exporter la partie</button>
      ${boutonPartage(etat)}
    </div>
    ${zonePartage(etat)}
  </section>`;
  brancherPartage(racine, etat);
  racine.querySelector('#rejouer').addEventListener('click', () => dispatch({ type: 'rejouer' }));
  racine.querySelector('#rejouer-scenario')?.addEventListener('click', () => dispatch({ type: 'rejouer-scenario' }));
  racine.querySelector('#export').addEventListener('click', () => dispatch({ type: 'exporter' }));
}
