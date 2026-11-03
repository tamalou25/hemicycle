// Constantes du moteur : bornes, valeurs d'équilibre, durée d'une partie.

export const INDICATEURS = ['chomage', 'croissance', 'deficit', 'dette', 'inflation', 'popularite', 'tensions'];

/** Bornes de chaque indicateur (évite les valeurs absurdes). */
export const BORNES = {
  chomage: [2, 25], croissance: [-8, 8], deficit: [-2, 15], dette: [40, 200],
  inflation: [-2, 15], popularite: [0, 100], tensions: [0, 100],
};

/** Valeurs vers lesquelles l'économie revient lentement sans intervention. */
export const EQUILIBRE = { inflation: 2, tensions: 30, croissance: 1 };

export const AXES = ['retraites', 'immigration', 'fiscalite', 'europe', 'ecologie', 'securite'];
export const COMPETENCES = ['charisme', 'negociation', 'economie', 'communication'];

export const DUREE_MANDAT = 60;       // 5 ans
export const SEUIL_DEFAITE = 8;       // popularité sous laquelle la partie s'arrête
export const CAPITAL_MENSUEL = 2;     // capital politique gagné chaque mois
export const CAPITAL_MAX = 10;
export const VERSION_SAUVEGARDE = 1;

export const borner = (ind, v) => {
  const [min, max] = BORNES[ind];
  return Math.round(Math.min(max, Math.max(min, v)) * 100) / 100;
};
