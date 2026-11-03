import { esc } from '../util.js';

/** Affiche un message dans la région aria-live. */
export function toast(message, type = 'erreur') {
  const zone = document.getElementById('toasts');
  if (!zone) return;
  const el = document.createElement('div');
  const couleur = type === 'erreur' ? 'border-rouge' : 'border-bleu';
  el.className = `bg-white border-l-4 ${couleur} shadow-lg rounded p-3 mb-2 text-sm`;
  el.innerHTML = `<span class="font-semibold">${type === 'erreur' ? 'Action impossible : ' : ''}</span>${esc(message)}`;
  zone.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}
