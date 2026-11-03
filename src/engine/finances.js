// Finances (tranche E1) : enveloppe d'investissement annuelle en Md€.
// Le détail recettes/dépenses par secteur arrive en E2.

/** Renouvellement de l'enveloppe chaque mois de janvier (le reliquat n'est pas reporté). */
export function renouvelerEnveloppe(finances, moisCalendaire, enveloppeAnnuelle) {
  if (moisCalendaire !== 1) return finances;
  return { ...finances, enveloppe: enveloppeAnnuelle, annee: (finances.annee ?? 0) + 1 };
}

export const financesInitiales = (projetsData) => ({ enveloppe: projetsData?.enveloppe_initiale_md ?? 1.5, recurrent: 0, annee: 0 });
