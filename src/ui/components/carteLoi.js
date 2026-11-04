import { esc, THEMES } from '../util.js';

/** Carte d'une loi avec bouton Proposer (désactivé + raison si refus). */
export function carteLoi(loi, etat, refus) {
  const adoptee = etat.loisAdoptees.includes(loi.id);
  const rejetee = etat.loisRejetees.includes(loi.id);
  const raisonId = `raison-${esc(loi.id)}`;
  const statut = adoptee ? '<span class="text-xs font-semibold text-[#157A48]">Adoptée</span>'
    : rejetee ? '<span class="text-xs font-semibold text-rouge">Déjà rejetée</span>' : '';
  return `<article class="bg-carte border border-bord rounded-lg p-3 flex flex-col gap-2">
    <div class="flex justify-between gap-2 items-start">
      <h4 class="font-serif font-bold text-lg leading-snug">${esc(loi.titre)}</h4>
      <span class="text-xs bg-[#E3E8F0] rounded px-2 py-1 whitespace-nowrap">${esc(THEMES[loi.theme] ?? loi.theme)}</span>
    </div>
    <p class="text-sm text-doux">${esc(loi.description)}</p>
    <div class="flex justify-between items-center gap-2 flex-wrap">
      <span class="text-sm">Coût : <strong>${esc(loi.cout_politique)}</strong> capital ${statut}</span>
      <button type="button" class="btn btn-p" data-proposer="${esc(loi.id)}" id="btn-${esc(loi.id)}"
        ${refus ? `disabled aria-describedby="${raisonId}"` : ''}>Proposer</button>
    </div>
    ${refus ? `<p id="${raisonId}" class="text-xs text-doux">${esc(refus)}</p>` : ''}
  </article>`;
}
