/** Configuration Tailwind compilée localement (plus de CDN : jeu jouable hors ligne). */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.js'],
  theme: {
    extend: {
      // Direction « Salle des cartes » (refonte 11/2026) : fond gris-bleu clair, surfaces blanches, encre bleu nuit,
      // bleu d'action, ambre pour les alertes et le temps, vert pour les réussites, rouge pour les dangers.
      // Les noms historiques (creme, carte, encre, bord, doux, bleu, rouge, bordeaux, laiton) sont conservés pour ne rien casser.
      colors: {
        creme: '#F3F5F9',   // fond de page
        carte: '#FFFFFF',   // surfaces (cartes, panneaux)
        encre: '#111C33',   // texte principal, bandeaux
        bord: '#D5DBE7',    // filets
        doux: '#4B5565',    // texte secondaire (AA sur blanc et sur fond)
        bleu: '#1E4ED8',    // action principale, liens
        rouge: '#C0262B',   // danger, points de vigilance
        bordeaux: '#7A1F2B', // accent éditorial discret
        laiton: '#9A6700',  // ambre foncé (texte AA) : alertes, temps, échéances
        ambre: '#F5B51C',   // ambre vif : boutons importants sur bandeau sombre
        succes: '#157A48',
        succesFond: '#DDF3E6',
        alerteFond: '#FFF4D6',
        surface2: '#EAEEF5',
      },
      fontFamily: { serif: ['"Source Serif 4"', 'Georgia', 'serif'] },
    },
  },
  plugins: [],
};
