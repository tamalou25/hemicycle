// Diplomatie (lot 3) : initiative étrangère en attente (Bureau), fiche pays (carte du monde), liste des partenaires.
// Présentation seulement : tout vient du moteur (initiativeEnCours, fichePays, resumePartenaires).
import { esc, fmt } from '../util.js';
import { initiativeEnCours, fichePays, resumePartenaires, dateDuTour } from '../../engine/index.js';
import { MOIS } from '../util.js';

/** Couleurs des relations (5 classes, du froid au chaleureux), lisibles avec la légende textuelle. */
export const COULEURS_RELATION = ['#F3D2D2', '#F6E3C3', '#EEF0E6', '#BFE0CF', '#5FB28A'];
export const classeRelation = (r) => (r < 35 ? 0 : r < 50 ? 1 : r < 60 ? 2 : r < 75 ? 3 : 4);
const LIB_RELATION = ['tendue', 'froide', 'neutre', 'bonne', 'étroite'];
export const libelleRelation = (r) => LIB_RELATION[classeRelation(r)];
const INTERETS = { commerce: 'commerce', energie: 'énergie', securite: 'sécurité', europe: 'Europe', immigration: 'migrations', technologie: 'technologies' };
const TYPES = { proposition: 'Proposition', tension: 'Tension', demande: 'Demande', crise: 'Crise', ue: 'Union européenne' };

export function legendeRelations() {
  return `<ul class="flex flex-wrap gap-x-3 gap-y-1 text-xs mt-2" aria-label="Légende : relation avec la France">${COULEURS_RELATION.map((c, i) => `<li class="flex items-center gap-1"><span class="inline-block w-4 h-4 border border-encre" style="background:${c}" aria-hidden="true"></span>${LIB_RELATION[i]}</li>`).join('')}<li class="text-doux">· pays sans fiche : gris</li></ul>`;
}

/** Initiative étrangère en attente : carte à choix, comme un événement. */
export function sectionInitiative(etat, ctx) {
  if (!ctx.pays) return '';
  const i = initiativeEnCours(etat, { pays: ctx.pays });
  if (!i) return '';
  const choix = i.choix.map((c, k) => {
    const couts = [`${c.cout_capital ?? 0} capital`, c.cout_md ? `${fmt(c.cout_md, 2)} Md€` : '', c.engagement ? `${fmt(c.engagement.cout_annuel_md, 1)} Md€/an pendant ${c.engagement.duree_mois} mois` : ''].filter(Boolean).join(' · ');
    const effets = [c.relation ? `relation ${c.relation > 0 ? '+' : ''}${c.relation}` : '', c.ue ? `Union européenne ${c.ue > 0 ? '+' : ''}${c.ue}` : '', c.allies ? `alliés ${c.allies > 0 ? '+' : ''}${c.allies}` : '', c.autres ? `autres partenaires ${c.autres}` : '', c.annule ? 'met fin à la mesure' : '', c.accepter ? 'crée l’accord' : '', c.disponibilite_min != null ? `forces disponibles ≥ ${c.disponibilite_min}` : ''].filter(Boolean);
    return `<li><button type="button" data-initiative="${k}" ${c.raison ? `disabled aria-describedby="init-refus-${k}"` : ''} class="btn btn-s w-full !text-left !items-start flex-col gap-0.5 py-1.5 disabled:opacity-60 disabled:cursor-not-allowed">
      <span class="font-semibold leading-snug">${esc(c.libelle)} <span class="font-normal text-doux text-sm">· ${esc(couts)}</span></span>
      ${effets.length ? `<span class="text-xs">${esc(effets.join(' · '))}</span>` : ''}
      ${c.raison ? `<span id="init-refus-${k}" class="text-xs text-rouge">${esc(c.raison)}</span>` : ''}</button></li>`;
  }).join('');
  return `<section role="alert" aria-labelledby="h-init" id="initiative" class="mb-4 bg-[#E8F1FB] border-2 border-bleu rounded-lg p-3 sm:p-4">
    <p class="text-xs font-bold uppercase tracking-wide">Diplomatie · ${esc(TYPES[i.type] ?? i.type)} · ${esc(i.nomPays)} <span class="font-normal normal-case">(simulation)</span></p>
    <h2 id="h-init" class="font-serif font-bold text-xl sm:text-2xl leading-tight">${esc(i.titre)}</h2>
    <p class="mt-0.5 text-sm sm:text-base leading-snug">${esc(i.texte)}</p>
    ${i.pays !== 'ue' ? `<button type="button" class="underline text-bleu text-sm min-h-[44px]" data-init-pays="${esc(i.pays)}">Voir ${esc(i.nomPays)} sur la carte</button>` : ''}
    <ul class="mt-1.5 grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">${choix}</ul>
    <p class="mt-1.5 text-xs">Sans réponse, la dernière option s’applique à la fin du mois. Les comportements étrangers sont des paramètres de simulation.</p>
  </section>`;
}

export function brancherInitiative(racine, dispatch) {
  racine.querySelectorAll('[data-initiative]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'initiative', index: Number(b.dataset.initiative) })));
  racine.querySelectorAll('[data-init-pays]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'onglet', onglet: 'monde', pays: b.dataset.initPays, haut: true })));
}

/** Fiche d'un pays sélectionné sur la carte : relation et ses facteurs, échanges, accords, actions. */
export function panneauPays(etat, ctx, id) {
  if (!id || !ctx.pays) return '<p class="text-sm text-doux p-3">Touchez un pays coloré pour voir sa fiche.</p>';
  const f = fichePays(etat, id, { pays: ctx.pays, economie: ctx.economie });
  if (!f) return `<p class="text-sm text-doux p-3">${esc(ctx.monde?.donnees?.pays?.find((p) => p.id === id)?.nom ?? id)} : pas de relation simulée avec ce pays (fond géographique).</p>`;
  const facteurs = f.cible.facteurs.map((x) => `<li class="flex justify-between gap-2"><span>${esc(x.libelle)}</span><span class="tabular-nums ${x.valeur < 0 ? 'text-rouge' : x.valeur > 0 && x.source !== 'base' ? 'text-succes' : ''}">${x.source === 'base' ? '' : x.valeur > 0 ? '+' : ''}${fmt(x.valeur, 0)}</span></li>`).join('');
  const accords = f.accords.map((a) => { const d = dateDuTour({ ...etat, tour: a.fin }); return `<li>${esc(a.titre)} <span class="text-doux">· jusqu’en ${MOIS[d.mois - 1]} ${d.annee}</span></li>`; }).join('');
  const mesures = f.mesures.map((m) => { const d = dateDuTour({ ...etat, tour: m.fin }); return `<li class="text-rouge">Différend en cours (${m.debouches ? `débouchés ${Math.round(m.debouches * 100)} %` : ''}${m.disponibilite ? ` importations ${Math.round(m.disponibilite * 100)} %` : ''}) <span class="text-doux">· jusqu’en ${MOIS[d.mois - 1]} ${d.annee}</span></li>`; }).join('');
  const actions = f.actions.map((a, i) => `<li class="border border-bord rounded-lg p-2">
      <div class="flex items-start justify-between gap-2"><span class="font-semibold text-sm">${esc(a.titre)}</span>${a.cout?.capital ? `<span class="text-xs text-doux shrink-0">${a.cout.capital} capital${a.cout.mdAn ? ` · ${fmt(a.cout.mdAn, 1)} Md€/an` : ''}${a.duree ? ` · ${a.duree} mois` : ''}</span>` : ''}</div>
      <p class="text-xs text-doux">${esc(a.description)}${a.relationMin ? ` Relation requise : ${a.relationMin}.` : ''}</p>
      ${a.contrepartie ? `<p class="text-xs"><strong>Contrepartie :</strong> ${esc(a.contrepartie)}</p>` : ''}
      <button type="button" class="btn btn-s mt-1 !min-h-[40px]" data-action-pays="${i}" ${a.raison ? `disabled aria-describedby="r-pays-${i}"` : ''}>${esc(a.id === 'sanction' ? 'Sanctionner' : a.id === 'levee' ? 'Lever' : 'Proposer')}</button>
      ${a.raison ? `<p id="r-pays-${i}" class="text-xs text-doux mt-1">${esc(a.raison)}</p>` : ''}</li>`).join('');
  ctx.actionsPays = f.actions;
  return `<section aria-labelledby="h-pays" class="p-3">
    <h3 id="h-pays" class="font-serif font-bold text-lg">${esc(f.nom)} <span class="font-sans font-normal text-xs text-doux">${f.ue ? '· UE ' : ''}${f.otan ? '· OTAN' : ''}</span></h3>
    <p class="text-sm">Relation <strong class="tabular-nums">${fmt(f.relation, 0)}</strong>/100 (${esc(libelleRelation(f.relation))}) · tend vers <strong class="tabular-nums">${fmt(f.cible.valeur, 0)}</strong>${f.sanctions ? ' · <span class="text-rouge font-bold">sous vos sanctions</span>' : ''}</p>
    <details class="text-xs mt-1"><summary class="cursor-pointer text-bleu underline min-h-[44px] flex items-center">Pourquoi cette tendance ?</summary><ul class="mt-1 space-y-0.5">${facteurs}</ul></details>
    <p class="text-xs mt-1"><span class="text-doux">Intérêts :</span> ${esc(f.interets.map((x) => INTERETS[x] ?? x).join(', ') || '—')}</p>
    ${f.echanges ? `<p class="text-xs mt-1"><span class="text-doux">Échanges :</span> vous exportez ${fmt(f.echanges.exportations, 0)} Md€/an, importez ${fmt(f.echanges.importations, 0)} Md€/an (solde ${f.echanges.solde > 0 ? '+' : ''}${fmt(f.echanges.solde, 0)})${f.echanges.disponibilite !== 1 ? ` · importations disponibles ${Math.round(f.echanges.disponibilite * 100)} %` : ''}${f.echanges.debouches !== 1 ? ` · débouchés ${Math.round(f.echanges.debouches * 100)} %` : ''}</p>` : ''}
    ${accords || mesures ? `<ul class="text-xs mt-1 space-y-0.5" aria-label="Accords et différends">${accords}${mesures}</ul>` : '<p class="text-xs text-doux mt-1">Aucun accord en vigueur.</p>'}
    <h4 class="font-semibold text-sm mt-2">Actions</h4>
    <ul class="space-y-1.5 mt-1" aria-label="Actions diplomatiques">${actions}</ul>
    <p class="text-xs text-doux mt-2">Une action diplomatique par mois. Les réponses du partenaire suivent des règles de simulation.</p>
  </section>`;
}

export function brancherPays(racine, dispatch, ctx) {
  racine.querySelectorAll('[data-action-pays]').forEach((b) => b.addEventListener('click', () => { const a = ctx.actionsPays?.[Number(b.dataset.actionPays)]; if (a) dispatch(a.action); }));
}

/** Tableau des partenaires (lecture sans carte, et onglet Carte). */
export function tableauPartenaires(etat, ctx) {
  const l = resumePartenaires(etat, { pays: ctx.pays });
  if (!l.length) return '';
  return `<table class="w-full text-sm"><caption class="sr-only">Partenaires et relations</caption><thead><tr class="text-left text-xs text-doux"><th scope="col">Pays</th><th scope="col">Relation</th><th scope="col">État</th></tr></thead><tbody>${l.map((p) => `<tr class="border-t border-bord"><th scope="row" class="font-normal py-1"><button type="button" class="underline text-bleu min-h-[32px]" data-pays-ligne="${esc(p.id)}">${esc(p.nom)}</button></th><td class="tabular-nums">${fmt(p.relation, 0)} (${esc(libelleRelation(p.relation))})</td><td class="text-xs">${[p.ue ? 'UE' : '', p.otan ? 'OTAN' : '', p.accords ? `${p.accords} accord${p.accords > 1 ? 's' : ''}` : '', p.sanctions ? 'sanctions' : '', p.tension ? 'différend' : ''].filter(Boolean).join(' · ')}</td></tr>`).join('')}</tbody></table>`;
}
