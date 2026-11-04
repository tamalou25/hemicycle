// Objectifs du mandat : sélection à la création (3 cases à cocher) et suivi au Bureau.
import { esc, fmt } from '../util.js';
import { evaluerObjectifs, objectifPossible, INDICES } from '../../engine/index.js';

/** Fieldset de sélection : exactement `nombre_a_choisir` objectifs. `st.objectifs` = ids cochés (modifié sur place). */
export function fieldsetObjectifs(catalogue, st) {
  if (!catalogue) return '';
  const n = catalogue.nombre_a_choisir;
  st.objectifs ??= [...catalogue.defaut];
  const plein = st.objectifs.length >= n;
  const cases = catalogue.objectifs.map((o) => {
    const coche = st.objectifs.includes(o.id);
    return `<li><label class="flex items-start gap-3 min-h-[44px] py-1 cursor-pointer">
      <input type="checkbox" name="objectif" value="${esc(o.id)}" data-role="${esc(o.role ?? '')}" class="mt-1 w-5 h-5 shrink-0" ${coche ? 'checked' : ''} ${plein && !coche ? 'disabled' : ''}>
      <span class="min-w-0"><strong>${esc(o.titre)}</strong><br><span class="text-sm text-doux">${esc(o.description)}</span>${o.role === 'premier_ministre' ? '<br><span class="text-xs text-doux">Réservé au chef du gouvernement.</span>' : ''}</span></label></li>`;
  }).join('');
  return `<fieldset class="bg-carte border border-bord rounded-lg p-4 mb-4" id="fs-objectifs"><legend class="font-serif font-bold px-1">Objectifs du mandat</legend>
    <p class="text-sm mb-2" aria-live="polite">Choisissez exactement ${n} objectifs : <strong id="nb-objectifs">${st.objectifs.length}/${n}</strong>. Ils sont évalués en fin de mandat.</p>
    <ul>${cases}</ul></fieldset>`;
}

/** Branche les cases : met à jour le compteur, désactive les autres cases à n, bloque la validation si le compte est faux. */
export function brancherObjectifs(racine, catalogue, st) {
  if (!catalogue) return;
  const n = catalogue.nombre_a_choisir;
  const cases = [...racine.querySelectorAll('[name=objectif]')];
  const roleChoisi = () => racine.querySelector('[name=role]:checked')?.value ?? 'depute';
  const maj = () => {
    // Un objectif réservé à un autre rôle est décoché et désactivé
    const role = roleChoisi();
    const incompatible = (c) => c.dataset.role && c.dataset.role !== role;
    cases.forEach((c) => { if (incompatible(c)) c.checked = false; });
    st.objectifs = cases.filter((c) => c.checked).map((c) => c.value);
    cases.forEach((c) => { c.disabled = incompatible(c) || (st.objectifs.length >= n && !c.checked); });
    racine.querySelector('#nb-objectifs').textContent = `${st.objectifs.length}/${n}`;
    const go = racine.querySelector('#go');
    if (go) go.disabled = st.objectifs.length !== n || (go.dataset.elu === '1' && !racine.querySelector('[name=elu]:checked'));
  };
  cases.forEach((c) => c.addEventListener('change', maj));
  racine.querySelectorAll('[name=role]').forEach((r) => r.addEventListener('change', maj));
  maj(); // à chaque rendu : l'état du bouton « Commencer » reflète toujours le choix réel
}

const UNITES = { chomage: ' %', deficit: ' %', dette: ' %', popularite: ' %', reformes: ' lois', programmes: ' programmes' };
const unite = (o) => UNITES[o.id] ?? '/100';

/** Texte « valeur / cible » avec unité adaptée. */
export function texteValeur(o) {
  const u = unite(o);
  const v = o.valeur == null ? 'n.d.' : `${fmt(o.valeur, Number.isInteger(o.valeur) ? 0 : 1)}${u}`;
  return { v, c: `${o.sens === 'max' ? '≤' : '≥'} ${fmt(o.cible, 0)}${u}` };
}

/**
 * Piste d'action par objectif (présentation uniquement) : levier existant le plus direct.
 * `aller` : onglet cible, avec filtre de Décisions ou vue de Carte. Aucune action n'est exécutée.
 */
function piste(id, etat) {
  const pm = etat.joueur.role === 'premier_ministre';
  const finances = pm
    ? { texte: 'Dépenses et recettes de l’année.', aller: { onglet: 'budget' } }
    : { texte: 'Budget du gouvernement ; vous, par les lois.', aller: { onglet: 'decisions', decisions: { secteur: 'finances' } } };
  // Région et indice les plus faibles. Égalités départagées de façon déterministe :
  // ordre des indices (emploi, santé, transports), puis identifiant de région (ordre alphabétique).
  const plusFaible = () => {
    let min = null;
    for (const id of Object.keys(etat.territoires ?? {}).sort()) {
      for (const i of INDICES) {
        const v = etat.territoires[id][i];
        if (min == null || v < min.v) min = { region: id, vue: i, v };
      }
    }
    return min ?? { region: null, vue: 'satisfaction' };
  };
  switch (id) {
    case 'chomage': return { texte: 'Secteur Emploi et économie.', aller: { onglet: 'decisions', decisions: { secteur: 'emploi' } } };
    case 'deficit': case 'dette': return finances;
    case 'popularite': return { texte: 'Vos décisions et réponses aux événements.', aller: { onglet: 'decisions', decisions: {} } };
    case 'apaisement': return { texte: 'Secteur Social ; réponses aux événements.', aller: { onglet: 'decisions', decisions: { secteur: 'social' } } };
    case 'territoires': return { texte: 'Un projet en service améliore sa région.', aller: { onglet: 'carte', vue: 'satisfaction' } };
    case 'aucun-abandon': { const m = plusFaible(); return { texte: 'Ciblez la région la plus faible.', aller: { onglet: 'carte', vue: m.vue, region: m.region } }; }
    case 'confiance': return { texte: 'Un projet mis en service la renforce.', aller: { onglet: 'carte', vue: 'confiance' } };
    case 'reformes': return { texte: 'Déposez une loi (une étape par mois).', aller: { onglet: 'decisions', decisions: { categorie: 'nationale', type: 'loi' } }, quoi: 'loi' };
    case 'programmes': return { texte: 'Engagez des programmes nationaux.', aller: { onglet: 'decisions', decisions: { categorie: 'nationale', type: 'programme' } }, quoi: 'programme' };
    default: return { texte: 'Consultez les décisions disponibles.', aller: { onglet: 'decisions', decisions: {} } };
  }
}

const NOM_ONGLET = { decisions: 'Décisions', carte: 'Carte', budget: 'Budget' };

/** Disponibilité réelle du levier ce mois-ci (statuts du catalogue du moteur ; refus du PLF). */
function disponibilite(aller, liste, etat, refusPLF) {
  if (aller.onglet === 'budget') return refusPLF ? refusPLF : 'Budget modifiable ce mois-ci.';
  const filtre = aller.onglet === 'carte' ? { categorie: 'territoriale' } : aller.decisions;
  const n = liste.filter((x) => x.statut === 'disponible' && (!filtre.categorie || x.categorie === filtre.categorie) && (!filtre.secteur || x.secteur === filtre.secteur) && (!filtre.type || x.type === filtre.type)).length;
  const quoi = aller.onglet === 'carte' ? 'projet' : filtre.type ?? 'décision';
  const fem = quoi === 'décision' || quoi === 'loi';
  return n ? `${n} ${quoi}${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}.` : `Aucun${fem ? 'e' : ''} ${quoi} disponible ce mois-ci.`;
}

/**
 * Brief du mandat, en tête du Bureau : but, durée, fins anticipées, objectifs choisis avec leur levier.
 * `leviers` = { liste (catalogue des décisions), refusPLF, dureeMandat, seuilDefaite, points }.
 * Retourne { html, pistes } ; `pistes[i].aller` sert à brancher les boutons.
 */
export function briefMandat(etat, donnees, leviers) {
  const { liste, refusPLF, dureeMandat, seuilDefaite, points } = leviers;
  const reste = Math.max(0, dureeMandat - etat.tour);
  const pm = etat.joueur.role === 'premier_ministre';
  const objectifs = evaluerObjectifs(etat, donnees);
  const pistes = [];
  const bouton = (aller, nom) => {
    pistes.push({ aller });
    return `<button type="button" class="btn btn-s !min-h-[44px] !py-1 text-sm shrink-0" data-piste="${pistes.length - 1}" aria-label="${esc(`Ouvrir ${NOM_ONGLET[aller.onglet]} : ${nom}`)}">${NOM_ONGLET[aller.onglet]} →</button>`;
  };
  const fins = `<li>La partie s’arrête si la popularité passe sous ${seuilDefaite} %${pm ? ', ou si une motion de censure est adoptée' : ''}.</li>
      <li>Si vous êtes candidat·e, une victoire à la présidentielle termine aussi la partie.</li>`;
  const deroule = `<details class="ml-auto open:basis-full"><summary class="min-h-[44px] flex items-center justify-end cursor-pointer text-sm font-semibold text-bleu underline">Comment jouer un mois</summary>
      <ol class="list-decimal pl-5 text-sm space-y-0.5 pb-1">
        <li>Lisez une piste ci-dessous et ouvrez le levier proposé.</li>
        <li>Choisissez vos actions du mois (loi, projet, budget, accord…).</li>
        <li>Passez au mois suivant.</li>
        <li>Lisez « Ce mois-ci » au Bureau : ce qui a bougé et pourquoi.</li>
      </ol>
      <ul class="list-disc pl-5 text-sm text-doux pb-1">${fins}<li class="sm:hidden">Seule la valeur au bilan compte : une cible atteinte aujourd’hui peut encore se perdre.</li></ul>
      ${objectifs.length ? `<p class="sm:hidden text-sm font-semibold">Pistes</p><ul class="sm:hidden list-disc pl-5 text-sm pb-1">${objectifs.map((o) => `<li><strong>${esc(o.titre)}</strong> : ${esc(piste(o.id, etat).texte)} <span class="text-doux">${esc(disponibilite(piste(o.id, etat).aller, liste, etat, refusPLF))}</span></li>`).join('')}</ul>` : ''}
      <div class="border-b border-bord mb-1"></div></details>`;

  const restants = `<strong id="mois-restants">${reste} mois restants sur ${dureeMandat}.</strong>`;
  let corps;
  if (!objectifs.length) {
    // Ancienne partie (ou catalogue absent) : rien n'est attribué ni modifié, on donne seulement des repères
    const reperes = [
      ['Décisions', 'lois, programmes, accords', { onglet: 'decisions', decisions: {} }],
      ['Carte', 'régions et projets territoriaux', { onglet: 'carte', vue: 'satisfaction' }],
      ...(pm ? [['Budget', 'dépenses et recettes', { onglet: 'budget' }]] : []),
    ];
    corps = `<p class="text-sm">${restants}</p><p class="text-sm" id="sans-objectifs">Cette partie a commencé avant les objectifs de mandat : aucun objectif n’est suivi et le bilan se calcule sans bonus. Une nouvelle partie permet d’en choisir trois.</p>
      <p class="text-sm mt-1">Repères : visez un chômage, un déficit et des tensions en baisse, et une popularité en hausse.</p>
      <ul class="mt-1">${reperes.map(([n, d, a]) => `<li class="flex items-center justify-between gap-2 py-0.5 text-sm"><span class="min-w-0"><strong>${n}</strong> : ${d}</span>${bouton(a, d)}</li>`).join('')}</ul>`;
  } else {
    const lignes = objectifs.map((o) => {
      const t = texteValeur(o);
      const pct = Math.round(o.progression * 100);
      const p = piste(o.id, etat);
      return `<li class="py-1 border-b border-bord last:border-0" data-objectif="${esc(o.id)}">
      <div class="flex items-center justify-between gap-2"><div class="min-w-0 text-sm leading-5"><strong>${esc(o.titre)}</strong>
        <span class="block text-xs leading-4"><span class="tabular-nums">${o.depart != null ? `départ ${esc(texteValeur({ ...o, valeur: o.depart }).v)} → ` : ''}${esc(t.v)} / ${esc(t.c)}</span> · <span class="font-bold ${o.atteint ? 'text-[#157A48]' : 'text-doux'}">${o.atteint ? 'Atteinte pour l’instant' : 'Pas encore atteinte'}</span></span></div>${bouton(p.aller, o.titre)}</div>
      <div class="hidden sm:block h-1.5 my-0.5 bg-[#E3E8F0] rounded" role="meter" aria-label="Rapport à la cible (pas un progrès depuis le départ) : ${esc(o.titre)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-valuetext="${pct} %"><div class="h-1.5 rounded" style="width:${pct}%;background:${o.atteint ? '#157A48' : '#8A5A00'}"></div></div>
      <p class="hidden sm:block text-xs leading-4">${esc(p.texte)} <span class="text-doux">${esc(disponibilite(p.aller, liste, etat, refusPLF))}</span></p></li>`;
    }).join('');
    corps = `<p class="text-sm">${restants} Au bilan : +${points} points par objectif atteint.</p>
      <p class="hidden sm:block text-xs text-doux">Seule la valeur au bilan compte : une cible atteinte aujourd’hui peut encore se perdre.</p>
      <ul>${lignes}</ul>`;
  }
  const html = `<section aria-labelledby="h-obj" class="bg-carte border border-bord rounded-lg px-3 py-1.5 mb-3" id="brief-mandat">
    <div class="flex flex-wrap items-center gap-x-2"><h2 id="h-obj" class="font-serif font-bold text-lg">Votre mandat</h2>${deroule}</div>${corps}</section>`;
  return { html, pistes };
}
