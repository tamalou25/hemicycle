// « Découvrir en jouant » : configuration préremplie, un seul choix politique, puis la mission d'initiation.
import { esc } from '../util.js';

export const NOM_DECOUVERTE = 'Camille Morel';

export function render(racine, etat, dispatch, ctx) {
  const st = ctx.decouverte ??= { nom: NOM_DECOUVERTE, parti: '', remplacer: false };
  // Ordre alphabétique des noms : aucun parti mis en avant, aucun présélectionné
  const partis = [...ctx.partis].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const options = partis.map((p) => `<li><label class="flex items-start gap-3 min-h-[44px] py-1 cursor-pointer">
      <input type="radio" name="parti" value="${esc(p.id)}" class="mt-1 w-5 h-5 shrink-0" ${st.parti === p.id ? 'checked' : ''}>
      <span class="min-w-0"><strong>${esc(p.sigle)}</strong> · ${esc(p.nom)}</span></label></li>`).join('');
  const sauv = ctx.sauvegardeExiste;
  racine.innerHTML = `<form id="form-dec" class="max-w-xl mx-auto" novalidate>
    <h1 class="font-serif font-bold text-3xl mb-2">Découvrir en jouant</h1>
    <p class="mb-4">Une vraie partie, courte : <strong>douze mois</strong> (environ 15 minutes) pour tenir trois engagements publics. Tout le reste se règle par défaut ; la partie personnalisée et le mandat complet restent disponibles à l’accueil.</p>
    <section class="bg-carte border border-bord rounded-lg p-4 mb-4" aria-labelledby="h-role">
      <h2 id="h-role" class="font-serif font-bold text-lg">Vous : Premier ministre (personnage fictif), nommé·e en novembre 2026</h2>
      <ul class="list-disc pl-5 text-sm mt-1 space-y-0.5">
        <li><strong>Vos pouvoirs</strong> : lois (navette de 3 mois au moins), programmes nationaux, budget de l’État, 49.3, accords avec les groupes ; une enveloppe pour des projets en région, sans vote.</li>
        <li><strong>Le problème</strong> : ${esc(ctx.scenario?.situation ?? '')}</li>
        <li><strong>Trois engagements</strong>, jugés en novembre 2027 : ${(ctx.scenario?.engagements ?? []).map((e) => `<em>${esc(e.titre.toLowerCase())}</em>`).join(' ; ')}. Chacun est <em>tenu</em>, <em>en partie</em> ou <em>non tenu</em> ; les conditions exactes sont au Bureau.</li>
        <li><strong>Garde-fou</strong> : ${esc(ctx.scenario?.garde_fou?.texte ?? '')}</li>
        <li><strong>Risques</strong> : motion de censure, présidentielle d’avril 2027 (vous pouvez perdre Matignon), crises à traiter en cours de route.</li>
      </ul>
      <label for="dec-nom" class="font-semibold block mt-3">Nom du personnage (fictif)</label>
      <input id="dec-nom" class="champ" type="text" maxlength="40" autocomplete="off" value="${esc(st.nom)}">
    </section>
    <fieldset class="bg-carte border border-bord rounded-lg p-4 mb-4" aria-describedby="dec-parti-aide">
      <legend class="font-serif font-bold px-1">Votre famille politique</legend>
      <p id="dec-parti-aide" class="text-sm text-doux mb-2">Choix obligatoire, aucun n’est proposé par défaut (ordre alphabétique). Vos positions reprendront celles du parti, tirées de ses programmes publics. Cela change vos alliés et les réactions, pas la mission : elle est réalisable quel que soit le parti.</p>
      <ul>${options}</ul>
    </fieldset>
    <p class="text-sm mb-4">À l’échéance, vous pourrez rejouer avec d’autres choix ou poursuivre le mandat (60 mois, objectifs par défaut : chômage, déficit, territoires).</p>
    ${sauv ? `<div class="border-l-4 border-laiton bg-[#FFF3C4] p-3 mb-4" role="note">
      <p class="font-semibold">Une partie est déjà sauvegardée sur cet appareil.</p>
      <p class="text-sm">Lancer la découverte la remplacera. Vous pouvez d’abord l’exporter dans un fichier.</p>
      <div class="flex flex-wrap gap-2 mt-2"><button type="button" class="btn btn-s" id="dec-exporter">Exporter ma partie</button></div>
      <label class="flex items-start gap-3 mt-3 cursor-pointer min-h-[44px]"><input type="checkbox" id="dec-remplacer" class="mt-1 w-5 h-5" ${st.remplacer ? 'checked' : ''}><span>Je remplace ma partie sauvegardée.</span></label>
    </div>` : ''}
    <p id="dec-erreur" class="text-rouge font-semibold mb-2" role="alert"></p>
    <div class="flex flex-wrap gap-3">
      <button type="submit" class="btn btn-p" id="dec-go">Commencer la découverte</button>
      <button type="button" class="btn btn-s" id="dec-retour">Retour</button>
    </div>
  </form>`;
  const f = racine.querySelector('#form-dec');
  f.querySelector('#dec-nom').addEventListener('input', (e) => { st.nom = e.target.value; });
  f.querySelectorAll('[name=parti]').forEach((r) => r.addEventListener('change', () => { st.parti = r.value; }));
  f.querySelector('#dec-remplacer')?.addEventListener('change', (e) => { st.remplacer = e.target.checked; });
  f.querySelector('#dec-exporter')?.addEventListener('click', () => dispatch({ type: 'exporterSauvegarde' }));
  f.querySelector('#dec-retour').addEventListener('click', () => dispatch({ type: 'aller', ecran: 'accueil' }));
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = f.querySelector('#dec-erreur');
    if (!st.nom.trim()) { err.textContent = 'Indiquez un nom.'; f.querySelector('#dec-nom').focus(); return; }
    if (!st.parti) { err.textContent = 'Choisissez une famille politique.'; f.querySelector('[name=parti]').focus(); return; }
    if (sauv && !st.remplacer) { err.textContent = 'Cochez « Je remplace ma partie sauvegardée », ou exportez-la d’abord.'; f.querySelector('#dec-remplacer').focus(); return; }
    dispatch({ type: 'decouverte', nom: st.nom.trim(), parti: st.parti });
  });
}
