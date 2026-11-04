// « Campagne présidentielle » : présidence d'un mandat de 5 ans en temps continu (pause et vitesses), un seul choix politique.
import { esc } from '../util.js';

export const NOM_PRESIDENCE = 'Camille Morel';

export function render(racine, etat, dispatch, ctx) {
  const st = ctx.presidence ??= { nom: NOM_PRESIDENCE, parti: '', remplacer: false };
  const partis = [...ctx.partis].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const options = partis.map((p) => `<li><label class="flex items-start gap-3 min-h-[44px] py-1 cursor-pointer">
      <input type="radio" name="parti" value="${esc(p.id)}" class="mt-1 w-5 h-5 shrink-0" ${st.parti === p.id ? 'checked' : ''}>
      <span class="min-w-0"><strong>${esc(p.sigle)}</strong> · ${esc(p.nom)}</span></label></li>`).join('');
  const sauv = ctx.sauvegardeExiste;
  racine.innerHTML = `<form id="form-pres" class="max-w-xl mx-auto" novalidate>
    <h1 class="font-serif font-bold text-3xl mb-2">Campagne présidentielle</h1>
    <p class="mb-4">Vous êtes élu·e président·e de la République en mai 2027 (scrutin simulé hors jeu). Un mandat de <strong>cinq ans</strong> en temps continu :
      le calendrier avance seul, vous mettez en pause, vous réglez la vitesse, vous sauvegardez. Durée visée : 30 à 90 minutes, selon vos pauses.</p>
    <section class="bg-carte border border-bord rounded-lg p-4 mb-4" aria-labelledby="h-role">
      <h2 id="h-role" class="font-serif font-bold text-lg">Votre rôle : président·e (personnage fictif)</h2>
      <ul class="list-disc pl-5 text-sm mt-1 space-y-0.5">
        <li><strong>Vous nommez le gouvernement</strong> (Premier ministre fictif issu d’un parti) et vous agissez <strong>par lui</strong> : projets de loi, programmes nationaux, budget de l’État, 49.3. Sans gouvernement en place, ces mesures sont impossibles.</li>
        <li><strong>Le Parlement garde le dernier mot</strong> : lois et budgets suivent leurs procédures (Assemblée, Sénat, Conseil constitutionnel). Une motion de censure renverse <em>le gouvernement</em>, pas la présidence : il faut en nommer un autre, parfois d’un autre parti (cohabitation).</li>
        <li><strong>Vous dissolvez l’Assemblée</strong> si vous le décidez (art. 12), au risque d’une majorité hostile. Législatives en juin 2029 ; européennes en juin 2029.</li>
        <li><strong>Limites</strong> : capital politique (+3 par mois, plafond 10), enveloppe d’investissement pour les régions, ressources du pays (déficit, dette), opinion. Fin anticipée si la popularité passe sous 8 % (démission : simplification du jeu).</li>
      </ul>
      <p class="text-xs text-doux mt-2">Simplifications : le gouvernement est représenté par le parti de son Premier ministre ; il soutient vos textes et ne vote pas la censure ; la diplomatie, l’économie internationale et la défense détaillées arriveront dans les lots suivants (voir docs/VISION-CAMPAGNE.md).</p>
      <label for="pres-nom" class="font-semibold block mt-3">Nom du personnage (fictif)</label>
      <input id="pres-nom" class="champ" type="text" maxlength="40" autocomplete="off" value="${esc(st.nom)}">
    </section>
    <fieldset class="bg-carte border border-bord rounded-lg p-4 mb-4" aria-describedby="pres-parti-aide">
      <legend class="font-serif font-bold px-1">Votre famille politique</legend>
      <p id="pres-parti-aide" class="text-sm text-doux mb-2">Choix obligatoire, aucun n’est proposé par défaut (ordre alphabétique). Votre premier gouvernement en est issu ; vos positions reprennent celles du parti (programmes publics).</p>
      <ul>${options}</ul>
    </fieldset>
    <p class="text-sm mb-4">Objectifs de mandat par défaut : chômage, déficit et territoires (modifiables en partie personnalisée). La campagne se conclut à la fin du mandat (60 mois) avec le bilan.</p>
    ${sauv ? `<div class="border-l-4 border-laiton bg-[#FFF3C4] p-3 mb-4" role="note">
      <p class="font-semibold">Une partie est déjà sauvegardée sur cet appareil.</p>
      <p class="text-sm">Lancer la campagne la remplacera. Vous pouvez d’abord l’exporter dans un fichier.</p>
      <div class="flex flex-wrap gap-2 mt-2"><button type="button" class="btn btn-s" id="pres-exporter">Exporter ma partie</button></div>
      <label class="flex items-start gap-3 mt-3 cursor-pointer min-h-[44px]"><input type="checkbox" id="pres-remplacer" class="mt-1 w-5 h-5" ${st.remplacer ? 'checked' : ''}><span>Je remplace ma partie sauvegardée.</span></label>
    </div>` : ''}
    <p id="pres-erreur" class="text-rouge font-semibold mb-2" role="alert"></p>
    <div class="flex flex-wrap gap-3">
      <button type="submit" class="btn btn-p" id="pres-go">Commencer le mandat</button>
      <button type="button" class="btn btn-s" id="pres-retour">Retour</button>
    </div>
  </form>`;
  const f = racine.querySelector('#form-pres');
  f.querySelector('#pres-nom').addEventListener('input', (e) => { st.nom = e.target.value; });
  f.querySelectorAll('[name=parti]').forEach((r) => r.addEventListener('change', () => { st.parti = r.value; }));
  f.querySelector('#pres-remplacer')?.addEventListener('change', (e) => { st.remplacer = e.target.checked; });
  f.querySelector('#pres-exporter')?.addEventListener('click', () => dispatch({ type: 'exporterSauvegarde' }));
  f.querySelector('#pres-retour').addEventListener('click', () => dispatch({ type: 'aller', ecran: 'accueil' }));
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = f.querySelector('#pres-erreur');
    if (!st.nom.trim()) { err.textContent = 'Indiquez un nom.'; f.querySelector('#pres-nom').focus(); return; }
    if (!st.parti) { err.textContent = 'Choisissez une famille politique.'; f.querySelector('[name=parti]').focus(); return; }
    if (sauv && !st.remplacer) { err.textContent = 'Cochez « Je remplace ma partie sauvegardée », ou exportez-la d’abord.'; f.querySelector('#pres-remplacer').focus(); return; }
    dispatch({ type: 'presidence', nom: st.nom.trim(), parti: st.parti });
  });
}
