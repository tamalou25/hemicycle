// Présidence : situation du gouvernement au Bureau (qui gouverne, cohabitation, gouvernement renversé → nomination).
import { esc } from '../util.js';
import { situationGouvernement, raisonRefusNommer, groupesAssemblee, voterCensure, ecartIdeologique } from '../../engine/index.js';

/** Bloc en tête du Bureau pour un·e président·e ; vide pour les autres rôles. */
export function sectionGouvernement(etat, ctx) {
  const s = situationGouvernement(etat, ctx.partis);
  if (!s) return '';
  if (s.statut === 'en_place') {
    const AN = groupesAssemblee(ctx.partis, etat.sieges);
    const c = voterCensure(etat, AN);
    return `<section id="gouvernement" aria-labelledby="h-gouv" class="bg-carte border border-bord rounded-lg px-3 py-2 mb-3">
      <h2 id="h-gouv" class="font-serif font-bold text-base leading-snug">Votre gouvernement : Premier ministre ${esc(s.sigle)} (fictif)${s.cohabitation ? ' · <span class="text-xs font-sans font-bold uppercase border border-encre rounded px-1">cohabitation</span>' : ''}</h2>
      <p class="text-sm text-doux">Depuis le mois ${s.depuis} · censure estimée aujourd’hui : ${c.pour} voix sur ${c.requis} requises${s.renversements ? ` · ${s.renversements} gouvernement${s.renversements > 1 ? 's' : ''} renversé${s.renversements > 1 ? 's' : ''}` : ''}. Vos mesures (lois, programmes, budget, 49.3) passent par lui.</p>
    </section>`;
  }
  // Gouvernement renversé : réponse politique attendue avant toute mesure gouvernementale
  const partis = ctx.partis.filter((p) => (etat.sieges ? etat.sieges[p.id] : p.sieges_assemblee)).map((p) => ({ p, sieges: etat.sieges ? etat.sieges[p.id] : p.sieges_assemblee, ecart: Math.round(ecartIdeologique(etat.joueur.ideologie, p.positions)), refus: raisonRefusNommer(etat, p.id, ctx.partis) }))
    .sort((a, b) => a.ecart - b.ecart);
  const choix = partis.map(({ p, sieges, ecart, refus }, i) => `<li><button type="button" class="btn btn-s w-full !justify-between" data-nommer="${esc(p.id)}" ${refus ? `disabled aria-describedby="r-nommer-${i}"` : ''}>
      <span><strong>${esc(p.sigle)}</strong> <span class="text-doux font-normal">· ${sieges} députés · écart ${ecart}${ecart > 60 ? ' (cohabitation : popularité −3)' : ecart > 30 ? ' (popularité −1)' : ''}</span></span><span>Nommer</span></button>
      ${refus ? `<p id="r-nommer-${i}" class="text-xs text-doux">${esc(refus)}</p>` : ''}</li>`).join('');
  return `<section id="gouvernement" role="alert" aria-labelledby="h-gouv" class="bg-[#FFF4D6] border-2 border-encre rounded-lg p-3 mb-3">
    <h2 id="h-gouv" class="font-serif font-bold text-lg">Le gouvernement est renversé</h2>
    <p class="text-sm">Une motion de censure a fait tomber le gouvernement (mois ${esc(etat.gouvernement?.renverseLe ?? '?')}). Vous restez président·e, mais sans gouvernement, ni loi du gouvernement, ni programme, ni budget, ni 49.3. Nommez un Premier ministre (2 capital) : son parti soutiendra vos textes et ne votera pas la censure. Le temps est en pause.</p>
    <ul class="grid sm:grid-cols-2 gap-2 mt-2">${choix}</ul>
  </section>`;
}

export function brancherGouvernement(racine, dispatch) {
  racine.querySelectorAll('[data-nommer]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'nommer', parti: b.dataset.nommer })));
}
