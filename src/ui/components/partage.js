/** Adresse publique du jeu (GitHub Pages), utilisée pour les liens partagés depuis l'application mobile. */
export const URL_PUBLIQUE = 'https://tamalou25.github.io/hemicycle/';
// Partage d'un défi (graine + personnage) par lien, sans serveur.
import { encoderDefi } from '../../engine/index.js';
import { esc } from '../util.js';
import { toast } from './toast.js';

export const TEXTE_PARTAGE = 'Même départ, même hasard : saurez-vous faire mieux ?';

/** URL du défi, ou null si la partie n'a pas de graine initiale (vieille sauvegarde). */
export function lienDefi(etat) {
  if (!etat || etat.graineInitiale == null) return null;
  try {
    // Dans l'application mobile (Capacitor), l'adresse locale n'est pas partageable : on renvoie vers le site public
    const natif = globalThis.Capacitor?.isNativePlatform?.() === true;
    const base = natif ? URL_PUBLIQUE : `${location.origin}${location.pathname}`;
    return `${base}#defi=${encoderDefi({ graine: etat.graineInitiale, joueur: { ...etat.joueur, objectifs: etat.objectifs, mission: !!etat.mission, scenario: !!etat.scenario } })}`;
  } catch { return null; }
}

/** Bouton « Partager ce défi » et zone de repli (vide si le partage est impossible). */
export function boutonPartage(etat, cls = 'btn btn-s') {
  if (!lienDefi(etat)) return '';
  return `<button type="button" class="${cls}" data-partage aria-controls="zone-partage">Partager ce défi</button>`;
}
export const zonePartage = (etat) => (lienDefi(etat) ? '<div id="zone-partage" class="w-full" aria-live="polite"></div>' : '');

/** Branche tous les boutons de partage de la racine. */
export function brancherPartage(racine, etat) {
  const url = lienDefi(etat);
  racine.querySelectorAll('[data-partage]').forEach((b) => b.addEventListener('click', async () => {
    if (!url) return;
    let copie = false;
    try { await navigator.clipboard.writeText(`${TEXTE_PARTAGE} ${url}`); copie = true; } catch { /* repli : champ texte */ }
    const zone = racine.querySelector('#zone-partage');
    if (zone) {
      zone.innerHTML = `<label for="lien-defi" class="block text-sm font-semibold mt-2">Lien du défi${copie ? ' (copié dans le presse-papiers)' : ' : copiez-le manuellement'}</label>
        <input id="lien-defi" class="champ text-sm" type="text" readonly value="${esc(url)}">`;
      const champ = zone.querySelector('#lien-defi');
      champ.focus(); champ.select();
    }
    if (copie) toast('Lien du défi copié.', 'info');
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'Hémicycle', text: TEXTE_PARTAGE, url }); } catch { /* annulé par l'utilisateur */ }
    }
  }));
}
