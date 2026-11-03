// Générateur pseudo-aléatoire déterministe (mulberry32).
// La graine vit dans l'état : même graine + mêmes actions = même partie.

/** Renvoie [valeur ∈ [0,1[, nouvelleGraine]. */
export function aleatoire(graine) {
  let t = (graine + 0x6d2b79f5) >>> 0;
  const suivante = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, suivante];
}

/** Bruit centré dans [-amplitude, +amplitude]. */
export function bruit(graine, amplitude) {
  const [v, g] = aleatoire(graine);
  return [(v * 2 - 1) * amplitude, g];
}
