// Bilan et fins multiples.

/** Score de bilan (0..100) : évolution des indicateurs depuis le début + popularité finale. */
export function scoreBilan(etat) {
  const d = etat.historique[0] ?? etat.indicateurs;
  const f = etat.indicateurs;
  const delta =
    (d.chomage - f.chomage) * 6 +
    (f.croissance - d.croissance) * 4 +
    (d.deficit - f.deficit) * 4 +
    (d.inflation - f.inflation) * 2 +
    (d.tensions - f.tensions) * 0.5 +
    etat.loisAdoptees.length * 2;
  return Math.max(0, Math.min(100, Math.round(50 + delta + (f.popularite - 30) / 2)));
}

/** Titre de fin selon le type et le bilan. */
export function evaluerFin(etat) {
  const score = scoreBilan(etat);
  const type = etat.fin?.type;
  if (type === 'victoire') return { titre: 'À l’Élysée', score, texte: 'Vous remportez l’élection présidentielle (simulation).' };
  if (type === 'censure') return { titre: 'Renversé·e', score, texte: 'Une motion de censure met fin à votre gouvernement.' };
  if (type === 'defaite') return { titre: 'Désavoué·e', score, texte: 'Votre popularité s’est effondrée.' };
  if (score >= 75) return { titre: 'Réformateur·rice', score, texte: 'Un bilan solide : l’économie et le climat social se sont nettement améliorés.' };
  if (score >= 55) return { titre: 'Bon·ne gestionnaire', score, texte: 'Un mandat sans éclat mais globalement positif.' };
  if (score >= 35) return { titre: 'Mandat en demi-teinte', score, texte: 'Quelques avancées, beaucoup de difficultés.' };
  return { titre: 'Mandat chaotique', score, texte: 'La situation s’est dégradée sur la plupart des fronts.' };
}
