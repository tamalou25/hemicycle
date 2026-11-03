// Finances (tranche E1) : enveloppe d'investissement annuelle en Md€.
// Le détail recettes/dépenses par secteur arrive en E2.

/**
 * Renouvellement de l'enveloppe chaque mois de janvier (le reliquat n'est pas reporté).
 * Les coûts de fonctionnement des projets en service sont prélevés dessus : investir aujourd'hui
 * réduit la marge de manœuvre des années suivantes.
 */
export function renouvelerEnveloppe(finances, moisCalendaire, enveloppeAnnuelle) {
  if (moisCalendaire !== 1) return finances;
  const enveloppe = Math.max(0, Math.round((enveloppeAnnuelle - (finances.recurrent ?? 0)) * 1000) / 1000);
  return { ...finances, enveloppe, annee: (finances.annee ?? 0) + 1 };
}

export const financesInitiales = (projetsData) => ({ enveloppe: projetsData?.enveloppe_initiale_md ?? 1.5, recurrent: 0, annee: 0 });
