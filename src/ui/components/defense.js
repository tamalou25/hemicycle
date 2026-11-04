// Onglet « Défense » (lot 4) : disponibilité des forces expliquée, équipement, préparation, engagement OTAN, programmes et engagements.
// Niveau stratégique seulement. Présentation : tout vient du moteur (bilanDefense, raisons de refus).
import { esc, fmt, MOIS } from '../util.js';
import { bilanDefense, dateDuTour, raisonRefusProgrammeDefense, raisonRefusEngagement, coutAnnuelProgramme } from '../../engine/index.js';

const STATUT = { chantier: 'En commande', montee: 'Livraisons en cours', service: 'Livré' };
const jauge = (label, v, aide = '') => `<li class="text-sm"><div class="flex justify-between"><span>${esc(label)}${aide ? ` <span class="text-xs text-doux">${esc(aide)}</span>` : ''}</span><strong class="tabular-nums">${Math.round(v)}</strong></div>
  <div class="h-2.5 bg-[#E3E8F0] rounded overflow-hidden" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v)}"><div class="h-full bg-bleu" style="width:${Math.max(0, Math.min(100, v))}%"></div></div></li>`;

export function ongletDefense(etat, ctx) {
  const d = ctx.defense;
  const b = etat.defense && d ? bilanDefense(etat, { defense: d }) : null;
  if (!b) return '<p class="p-4 border border-bord bg-carte rounded-lg text-doux" role="status">Défense indisponible pour cette partie.</p>';
  const date = (t) => { const x = dateDuTour({ ...etat, tour: t }); return `${MOIS[x.mois - 1]} ${x.annee}`; };
  const facteurs = b.disponibilite.facteurs.map((f) => `<li class="flex justify-between gap-2"><span>${esc(f.libelle)}</span><span class="tabular-nums ${f.valeur < 0 ? 'text-rouge' : ''}">${f.valeur > 0 ? '+' : ''}${fmt(f.valeur, 0)}</span></li>`).join('');
  const progs = b.programmes.map((x) => { const p = d.programmes.find((y) => y.id === x.id); return `<li class="text-sm py-1 border-b border-bord last:border-0"><strong>${esc(x.titre)}</strong> <span class="text-xs text-doux">· ${esc(STATUT[x.statut] ?? x.statut)}${x.statut === 'chantier' ? ` · livraisons à partir de ${date(x.enService)} · ${fmt(coutAnnuelProgramme(p), 1)} Md€/an` : x.statut === 'service' ? ` · entretien ${fmt(p?.entretien_md ?? 0, 1)} Md€/an` : ''}</span></li>`; }).join('');
  const engs = b.engagements.map((x) => `<li class="text-sm py-1 border-b border-bord last:border-0"><strong>${esc(d.engagements.find((y) => y.id === x.id)?.titre ?? (x.type === 'operation' ? `Opération extérieure${x.pays ? ` (${ctx.pays?.pays?.find((p) => p.id === x.pays)?.nom ?? x.pays})` : ''}` : x.id.replaceAll('-', ' ')))}</strong> <span class="text-xs text-doux">· jusqu’en ${date(x.fin)} · disponibilité ${x.disponibilite} · ${fmt(x.coutAnnuelMd, 1)} Md€/an</span></li>`).join('');
  const dispoProg = d.programmes.filter((p) => !b.programmes.some((x) => x.id === p.id));
  const cartesProg = dispoProg.map((p, i) => { const r = raisonRefusProgrammeDefense(etat, p, d); return `<li class="bg-carte border border-bord rounded-lg p-3 filet-laiton">
      <h4 class="font-serif font-bold text-base">${esc(p.titre)}</h4><p class="text-sm text-doux mt-1">${esc(p.description)}</p>
      <p class="text-xs mt-1">${fmt(p.cout_total_md, 1)} Md€ sur ${p.delai_mois} mois (${fmt(coutAnnuelProgramme(p), 1)} Md€/an) · puis ${fmt(p.entretien_md ?? 0, 1)} Md€/an${p.gain_equipement ? ` · équipement +${p.gain_equipement}` : ''}${p.gain_preparation ? ` · préparation +${p.gain_preparation}` : ''}${p.otan ? ` · OTAN +${p.otan}` : ''} · 1 capital</p>
      <p class="text-xs text-doux mt-1"><strong>Contrepartie :</strong> ${esc(p.contrepartie)}</p>
      <div class="mt-2"><button type="button" class="btn btn-s" data-programme-defense="${esc(p.id)}" ${r ? `disabled aria-describedby="r-pdef-${i}"` : ''}>Lancer</button>${r ? `<p id="r-pdef-${i}" class="text-xs text-doux mt-1">${esc(r)}</p>` : ''}</div></li>`; }).join('');
  const cartesEng = d.engagements.filter((e) => !b.engagements.some((x) => x.id === e.id)).map((e, i) => { const r = raisonRefusEngagement(etat, e, d); return `<li class="bg-carte border border-bord rounded-lg p-3">
      <h4 class="font-serif font-bold text-base">${esc(e.titre)}</h4><p class="text-sm text-doux mt-1">${esc(e.description)}</p>
      <p class="text-xs mt-1">${e.duree_mois} mois · ${fmt(e.cout_annuel_md, 1)} Md€/an · disponibilité ${e.disponibilite}${e.otan ? ` · OTAN +${e.otan}` : ''}${e.ue ? ` · Union européenne +${e.ue}` : ''}${e.relation_allies ? ` · alliés +${e.relation_allies}` : ''} · 1 capital</p>
      <p class="text-xs text-doux mt-1"><strong>Contrepartie :</strong> ${esc(e.contrepartie)}</p>
      <div class="mt-2"><button type="button" class="btn btn-s" data-engagement="${esc(e.id)}" ${r ? `disabled aria-describedby="r-eng-${i}"` : ''}>Engager</button>${r ? `<p id="r-eng-${i}" class="text-xs text-doux mt-1">${esc(r)}</p>` : ''}</div></li>`; }).join('');
  return `<section aria-labelledby="h-def">
    <h2 id="h-def" class="font-serif font-bold text-xl mb-1">Défense stratégique</h2>
    <p class="text-sm text-doux mb-3">Moyens, préparation et alliances, sans opération détaillée. La disponibilité des forces conditionne vos options en cas de crise internationale.</p>
    ${b.alerte ? `<p class="text-sm border-l-4 border-rouge bg-[#FBE4E4] p-2 rounded-r mb-3" role="status"><strong>Disponibilité critique (${Math.round(b.disponibilite.valeur)} &lt; ${b.seuil}).</strong> Les options militaires d’une crise seront bloquées tant qu’elle n’est pas rétablie.</p>` : ''}
    <div class="grid md:grid-cols-2 gap-3 mb-4">
      <div class="bg-carte border border-bord rounded-lg p-3">
        <p class="text-sm">Disponibilité des forces <strong class="tabular-nums text-xl font-serif">${Math.round(b.disponibilite.valeur)}</strong>/100</p>
        <details class="text-xs mt-1"><summary class="cursor-pointer text-bleu underline min-h-[44px] flex items-center">D’où vient ce chiffre ?</summary><ul class="mt-1 space-y-0.5">${facteurs}</ul></details>
        <ul class="space-y-2 mt-2">${jauge('Équipement', b.equipement, '(budget, programmes, usure)')}${b.preparation != null ? jauge('Préparation', b.preparation, '(secteur Défense, programmes nationaux)') : ''}${jauge('Engagement dans l’OTAN', b.engagementOtan, '(effort budgétaire, accords, exercices)')}</ul>
        <p class="text-xs mt-2">Effort de défense : <strong class="tabular-nums">${fmt(b.partPib, 2)} %</strong> du PIB (cible ${b.cible} %${b.partPib < b.cible ? ' : l’engagement OTAN recule tant que la cible n’est pas atteinte ou qu’aucune hausse n’est engagée au budget' : ' : atteinte'}).</p>
      </div>
      <div class="bg-carte border border-bord rounded-lg p-3">
        <h3 class="font-semibold text-sm">Programmes en cours</h3><ul aria-label="Programmes de défense engagés">${progs || '<li class="text-sm text-doux">Aucun programme lancé.</li>'}</ul>
        <h3 class="font-semibold text-sm mt-2">Engagements en cours</h3><ul aria-label="Engagements en cours">${engs || '<li class="text-sm text-doux">Aucun engagement : toutes les forces sont disponibles.</li>'}</ul>
      </div>
    </div>
    <h3 class="font-serif font-bold text-lg border-b border-bord pb-1 mb-2">Programmes d’équipement</h3>
    <ul class="grid md:grid-cols-2 gap-3 mb-4" aria-label="Programmes de défense possibles">${cartesProg || '<li class="text-sm text-doux">Tous les programmes sont lancés.</li>'}</ul>
    <h3 class="font-serif font-bold text-lg border-b border-bord pb-1 mb-2">Engagements et alliances</h3>
    <ul class="grid md:grid-cols-2 gap-3 mb-4" aria-label="Engagements possibles">${cartesEng || '<li class="text-sm text-doux">Tous les engagements sont en cours.</li>'}</ul>
    <p class="text-xs text-doux">Les accords de défense se négocient pays par pays sur la carte (Partenaires). Ordres de grandeur : LPM 2024-2030, cible OTAN de 2 % ; indices et sensibilités : paramètres d’équilibrage.</p>
  </section>`;
}

export function brancherDefense(racine, dispatch) {
  racine.querySelectorAll('[data-programme-defense]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'programme-defense', id: b.dataset.programmeDefense })));
  racine.querySelectorAll('[data-engagement]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'engagement', id: b.dataset.engagement })));
}
