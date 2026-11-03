// Utilitaires d'affichage.
const ECH = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Échappe tout texte injecté dans du HTML. */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ECH[c]);

export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const THEMES = {
  retraites: 'Retraites', immigration: 'Immigration', fiscalite: 'Fiscalité',
  europe: 'Europe', ecologie: 'Écologie', securite: 'Sécurité',
};
export const fmt = (n, d = 1) => (n == null ? '—' : Number(n).toFixed(d).replace('.', ','));
