/** Configuration Tailwind compilée localement (plus de CDN : jeu jouable hors ligne). */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.js'],
  theme: {
    extend: {
      // Direction « Le bureau de la République » : ivoire, encre bleu nuit, bordeaux, laiton.
      colors: {
        creme: '#FAF6EC',   // fond ivoire
        carte: '#FFFDF7',   // papier des dossiers
        encre: '#14213D',   // texte principal (bleu nuit)
        bord: '#D9D2BF',    // filets
        doux: '#4A5568',    // texte secondaire
        bleu: '#1F3A6E',
        rouge: '#B3262B',
        bordeaux: '#7A1F2B', // accent éditorial
        laiton: '#8A6A1F',   // accent (assombri pour contraste AA sur ivoire)
      },
      fontFamily: { serif: ['"Source Serif 4"', 'Georgia', 'serif'] },
    },
  },
  plugins: [],
};
