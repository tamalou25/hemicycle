import { esc } from '../util.js';
import { joueurDepuisPoliticien } from '../../engine/index.js';
import { fieldsetObjectifs, brancherObjectifs } from '../components/objectifs.js';
import { avatar } from '../components/avatar.js';

export function render(racine, etat, dispatch, ctx) {
  const { partis, politiciens } = ctx;
  const st = ctx.choixElu ??= { parti: '', id: null, role: 'depute' };
  const utiles = partis.filter((p) => politiciens.some((x) => x.parti === p.id));
  const liste = politiciens.filter((p) => !st.parti || p.parti === st.parti);
  const cartes = liste.map((p) => {
    const parti = partis.find((x) => x.id === p.parti);
    const sel = st.id === p.id;
    return `<li class="min-w-0 bg-carte border-2 ${sel ? 'border-encre' : 'border-bord'} rounded-lg p-3 flex flex-col gap-2">
      <label class="flex items-start gap-3 cursor-pointer">
        <input type="radio" name="elu" value="${esc(p.id)}" class="mt-3 w-5 h-5" ${sel ? 'checked' : ''}>
        ${avatar(p.nom, parti)}
        <span class="min-w-0"><strong class="block">${esc(p.nom)}</strong>
          <span class="text-sm text-doux block">${esc(p.fonction)}</span>
          <span class="text-xs font-semibold">${esc(parti?.sigle ?? '')}</span></span></label>
      <a class="text-sm underline self-start min-h-[24px]" href="${esc(p.fonction_source?.url)}" target="_blank" rel="noopener noreferrer">source<span class="sr-only"> pour ${esc(p.nom)}</span></a>
    </li>`;
  }).join('');
  racine.innerHTML = `<form id="form" class="max-w-3xl mx-auto" novalidate>
    <h1 class="font-serif font-bold text-3xl mb-3">Jouer un élu réel</h1>
    <div class="border-2 border-encre bg-[#FFF4D6] rounded-lg p-3 mb-4" role="note">
      <strong>Mode élu réel :</strong> positions reprises du programme du parti ; tous les événements et réactions sont simulés.</div>
    <div class="mb-4"><label for="fp" class="font-semibold mr-2">Filtrer par parti</label>
      <select id="fp" class="champ !w-auto"><option value="">Tous les partis</option>
      ${utiles.map((p) => `<option value="${esc(p.id)}" ${p.id === st.parti ? 'selected' : ''}>${esc(p.nom)}</option>`).join('')}</select></div>
    <fieldset class="mb-4"><legend class="font-serif font-bold text-xl mb-2">Personnalité</legend>
      <ul class="grid grid-cols-1 sm:grid-cols-2 gap-3">${cartes || '<li class="text-doux">Aucune personnalité pour ce parti.</li>'}</ul></fieldset>
    <fieldset class="bg-carte border border-bord rounded-lg p-4 mb-4"><legend class="font-serif font-bold px-1">Rôle</legend>
      <label class="flex items-start gap-2 mb-3 cursor-pointer"><input type="radio" name="role" value="depute" class="mt-1" ${st.role !== 'premier_ministre' ? 'checked' : ''}>
        <span><strong>Député·e</strong><br><span class="text-sm text-doux">Vous proposez des lois et négociez des accords, sans risquer d’être renversé·e.</span></span></label>
      <label class="flex items-start gap-2 cursor-pointer"><input type="radio" name="role" value="premier_ministre" class="mt-1" ${st.role === 'premier_ministre' ? 'checked' : ''}>
        <span><strong>Premier ministre (fictif)</strong><br><span class="text-sm text-doux">49.3 possible et +1 capital politique par mois, mais vous êtes exposé·e aux motions de censure.</span></span></label>
    </fieldset>
    ${fieldsetObjectifs(ctx.objectifs, st)}
    <div class="flex gap-3 flex-wrap"><button type="submit" class="btn btn-p" id="go" data-elu="1" ${st.id ? '' : 'disabled'}>Commencer</button>
      <button type="button" id="retour" class="btn btn-s">Retour</button></div>
  </form>`;
  racine.querySelector('#fp').addEventListener('change', (e) => { st.parti = e.target.value; dispatch({ type: 'filtre', theme: ctx.filtreTheme }); });
  racine.querySelectorAll('[name=elu]').forEach((el) => el.addEventListener('change', () => {
    st.id = el.value;
    racine.querySelector('#go').disabled = (st.objectifs?.length ?? 0) !== (ctx.objectifs?.nombre_a_choisir ?? 0) && !!ctx.objectifs;
    racine.querySelectorAll('li.border-2').forEach((li) => { const on = li.contains(el); li.classList.toggle('border-encre', on); li.classList.toggle('border-bord', !on); });
  }));
  racine.querySelectorAll('[name=role]').forEach((el) => el.addEventListener('change', () => { if (el.checked) st.role = el.value; }));
  brancherObjectifs(racine, ctx.objectifs, st);
  racine.querySelector('#retour').addEventListener('click', () => dispatch({ type: 'aller', ecran: 'accueil' }));
  racine.querySelector('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    const p = politiciens.find((x) => x.id === st.id);
    if (p) dispatch({ type: 'nouvelle', joueur: { ...joueurDepuisPoliticien(p, partis, st.role), objectifs: [...(st.objectifs ?? [])] } });
  });
}
