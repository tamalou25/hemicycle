import { esc } from '../util.js';
import { fieldsetObjectifs, brancherObjectifs } from '../components/objectifs.js';
import { AXES, COMPETENCES } from '../../engine/index.js';

const AXE_LIBELLES = {
  retraites: ['Retraites', 'Réforme, âge de départ reculé', 'Protection, âge de départ abaissé'],
  immigration: ['Immigration', 'Ouverture, régularisation', 'Restriction, contrôle strict'],
  fiscalite: ['Fiscalité', 'Redistribution, impôts sur les plus aisés', 'Baisse des impôts, allègement pour les entreprises'],
  europe: ['Europe', 'Souveraineté nationale', 'Intégration européenne'],
  ecologie: ['Écologie', 'Transition pragmatique, nucléaire, croissance', 'Priorité à la transition écologique'],
  securite: ['Sécurité', 'Prévention, approche sociale', 'Fermeté, répression'],
};
const COMP_LIBELLES = {
  charisme: 'Charisme', negociation: 'Négociation', economie: 'Économie', communication: 'Communication',
};
const BUDGET = 200;

export function render(racine, etat, dispatch, ctx) {
  const partis = ctx.partis;
  const brouillon = ctx.brouillon ??= {
    nom: '', age: 40, role: 'depute', parti: partis[0].id,
    ideologie: Object.fromEntries(AXES.map((a) => [a, 0])),
    competences: Object.fromEntries(COMPETENCES.map((c) => [c, 50])),
  };
  const axes = AXES.map((a) => {
    const [titre, neg, pos] = AXE_LIBELLES[a];
    return `<div class="mb-4"><label for="ax-${a}" class="font-semibold block">${esc(titre)} : <output id="o-ax-${a}" for="ax-${a}">${brouillon.ideologie[a]}</output></label>
      <input type="range" id="ax-${a}" min="-100" max="100" step="5" value="${brouillon.ideologie[a]}" data-axe="${a}" aria-describedby="d-ax-${a}">
      <div id="d-ax-${a}" class="flex justify-between gap-4 text-xs text-doux"><span>−100 : ${esc(neg)}</span><span class="text-right">+100 : ${esc(pos)}</span></div></div>`;
  }).join('');
  const comps = COMPETENCES.map((c) => `<div class="mb-3"><label for="cp-${c}" class="font-semibold block">${COMP_LIBELLES[c]} : <output id="o-cp-${c}" for="cp-${c}">${brouillon.competences[c]}</output></label>
      <input type="range" id="cp-${c}" min="0" max="100" step="1" value="${brouillon.competences[c]}" data-comp="${c}"></div>`).join('');

  racine.innerHTML = `<form id="form" class="max-w-xl mx-auto" novalidate>
    <h1 class="font-serif font-bold text-3xl mb-4">Votre personnage</h1>
    <fieldset class="bg-carte border border-bord rounded-lg p-4 mb-4"><legend class="font-serif font-bold px-1">Identité</legend>
      <label for="nom" class="font-semibold block">Nom</label>
      <input id="nom" class="champ mb-3" type="text" maxlength="40" required autocomplete="off" value="${esc(brouillon.nom)}">
      <label for="age" class="font-semibold block">Âge</label>
      <input id="age" class="champ mb-3" type="number" min="18" max="99" value="${esc(brouillon.age)}">
      <label for="parti" class="font-semibold block">Parti</label>
      <select id="parti" class="champ">${partis.map((p) => `<option value="${esc(p.id)}" ${p.id === brouillon.parti ? 'selected' : ''}>${esc(p.nom)}</option>`).join('')}</select>
    </fieldset>
    <fieldset class="bg-carte border border-bord rounded-lg p-4 mb-4"><legend class="font-serif font-bold px-1">Rôle</legend>
      <label class="flex items-start gap-2 mb-3 cursor-pointer"><input type="radio" name="role" value="depute" class="mt-1" ${brouillon.role !== 'premier_ministre' ? 'checked' : ''}>
        <span><strong>Député·e</strong><br><span class="text-sm text-doux">Vous proposez des lois et négociez des accords, sans risquer d’être renversé·e.</span></span></label>
      <label class="flex items-start gap-2 cursor-pointer"><input type="radio" name="role" value="premier_ministre" class="mt-1" ${brouillon.role === 'premier_ministre' ? 'checked' : ''}>
        <span><strong>Premier ministre (fictif)</strong><br><span class="text-sm text-doux">49.3 possible et +1 capital politique par mois, mais vous êtes exposé·e aux motions de censure.</span></span></label>
    </fieldset>
    <fieldset class="bg-carte border border-bord rounded-lg p-4 mb-4"><legend class="font-serif font-bold px-1">Idéologie</legend>
      <p class="text-sm text-doux mb-3">Positions de −100 à +100 sur six axes, comme pour les partis.</p>${axes}</fieldset>
    <fieldset class="bg-carte border border-bord rounded-lg p-4 mb-4"><legend class="font-serif font-bold px-1">Compétences</legend>
      <p class="text-sm mb-3" aria-live="polite">Points restants : <strong id="reste"></strong> sur ${BUDGET}</p>${comps}</fieldset>
    ${fieldsetObjectifs(ctx.objectifs, brouillon)}
    <div class="flex gap-3 flex-wrap"><button type="submit" id="go" class="btn btn-p">Commencer</button>
      <button type="button" id="retour" class="btn btn-s">Retour</button></div>
  </form>`;

  const reste = () => BUDGET - COMPETENCES.reduce((s, c) => s + brouillon.competences[c], 0);
  const maj = () => { racine.querySelector('#reste').textContent = reste(); };
  maj();
  racine.querySelector('#nom').addEventListener('input', (e) => { brouillon.nom = e.target.value; });
  racine.querySelector('#age').addEventListener('input', (e) => { brouillon.age = e.target.value; });
  racine.querySelector('#parti').addEventListener('change', (e) => { brouillon.parti = e.target.value; });
  racine.querySelectorAll('[name=role]').forEach((el) => el.addEventListener('change', () => { if (el.checked) brouillon.role = el.value; }));
  racine.querySelectorAll('[data-axe]').forEach((el) => el.addEventListener('input', () => {
    brouillon.ideologie[el.dataset.axe] = Number(el.value);
    racine.querySelector(`#o-ax-${el.dataset.axe}`).textContent = el.value;
  }));
  racine.querySelectorAll('[data-comp]').forEach((el) => el.addEventListener('input', () => {
    const c = el.dataset.comp;
    const autres = COMPETENCES.reduce((s, k) => s + (k === c ? 0 : brouillon.competences[k]), 0);
    const v = Math.min(Number(el.value), BUDGET - autres);
    el.value = v; brouillon.competences[c] = v;
    racine.querySelector(`#o-cp-${c}`).textContent = v; maj();
  }));
  brancherObjectifs(racine, ctx.objectifs, brouillon);
  racine.querySelector('#retour').addEventListener('click', () => dispatch({ type: 'aller', ecran: 'accueil' }));
  racine.querySelector('#form').addEventListener('submit', (e) => {
    e.preventDefault();
    dispatch({ type: 'nouvelle', joueur: structuredClone(brouillon) });
  });
}
