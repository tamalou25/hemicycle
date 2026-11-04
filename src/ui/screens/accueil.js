import { esc } from '../util.js';

export const DISCLAIMER = 'Simulation fictive. Les événements simulés ne reflètent pas les actions ou propos réels des personnes citées.';

export function render(racine, etat, dispatch, ctx) {
  const sauv = ctx.sauvegardeExiste;
  racine.innerHTML = `
    <section class="max-w-xl mx-auto py-6">
      <p class="text-xs font-bold uppercase tracking-widest text-bleu">Simulation politique de la France</p>
      <h1 class="font-serif font-bold text-4xl sm:text-5xl mt-1">Hémicycle</h1>
      <p class="mt-2 text-lg text-doux">Gouvernez la France : décidez, négociez, affrontez les crises, et comprenez chaque conséquence.</p>
      <section aria-labelledby="h-but" class="mt-4 bg-carte border border-bord rounded-xl p-4" id="but-du-jeu">
        <h2 id="h-but" class="font-serif font-bold text-lg">Le but</h2>
        <ul class="list-disc pl-5 mt-1 space-y-0.5">
          <li>Vous tenez un <strong>rôle réel</strong> (président·e, Premier ministre ou député·e) avec ses pouvoirs et ses limites : gouvernement, Parlement, élections, ressources du pays.</li>
          <li>Choisissez vos actions du mois, puis passez au mois suivant (ou laissez le temps courir) ; le Bureau explique ce qui a changé et pourquoi. Chaque décision a un <strong>coût, un délai et une contrepartie</strong>.</li>
          <li>Au bout de <strong>5 ans (60 mois)</strong>, ou des 12 mois de la partie courte, un bilan juge vos objectifs. La partie peut s’arrêter plus tôt : popularité sous 8 %, censure (Premier ministre) ou victoire à la présidentielle.</li>
        </ul>
      </section>
      <div class="mt-6 border-2 border-encre bg-carte rounded-lg p-4" role="note">
        <h2 class="font-serif font-bold text-lg">Avertissement</h2>
        <p class="mt-1">${esc(DISCLAIMER)}</p>
        <label class="flex items-start gap-3 mt-4 cursor-pointer">
          <input type="checkbox" id="accept" class="mt-1 w-5 h-5 accent-[#1E4ED8]" ${ctx.accepte ? 'checked' : ''}>
          <span>J’ai lu et j’accepte cet avertissement.</span>
        </label>
      </div>
      ${sauv ? `<div class="mt-6 bg-carte border border-bord rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"><p><strong>Une partie est sauvegardée</strong> sur cet appareil.</p><button type="button" class="btn btn-p" id="reprendre" ${ctx.accepte ? '' : 'disabled'}>Reprendre</button></div>` : '<button type="button" class="sr-only" id="reprendre" disabled>Reprendre</button>'}
      <h2 class="font-serif font-bold text-lg mt-6">Commencer</h2>
      <ul class="mt-2 grid sm:grid-cols-3 gap-3" aria-label="Modes de jeu">
        <li class="bg-carte border border-bord rounded-xl p-4 flex flex-col gap-2"><h3 class="font-bold">Découvrir en jouant</h3><p id="aide-decouvrir" class="text-sm text-doux grow">Douze mois, trois engagements, 10 à 20 minutes. Prête en un choix.</p><button type="button" class="btn btn-p w-full" id="decouvrir" ${ctx.accepte ? '' : 'disabled'} aria-describedby="aide-decouvrir">Découvrir en jouant</button></li>
        <li class="bg-carte border border-bord rounded-xl p-4 flex flex-col gap-2"><h3 class="font-bold">Campagne présidentielle</h3><p id="aide-presidence" class="text-sm text-doux grow">Un mandat de cinq ans en temps continu (pause, vitesses), 30 à 90 minutes, sauvegardable.</p><button type="button" class="btn btn-p w-full" id="presidence" ${ctx.accepte ? '' : 'disabled'} aria-describedby="aide-presidence">Campagne présidentielle</button></li>
        <li class="bg-carte border border-bord rounded-xl p-4 flex flex-col gap-2"><h3 class="font-bold">Partie personnalisée</h3><p id="aide-nouvelle" class="text-sm text-doux grow">Rôle, positions, compétences et objectifs au choix ; mandat de cinq ans mois par mois.</p><button type="button" class="btn btn-s w-full" id="nouvelle" ${ctx.accepte ? '' : 'disabled'} aria-describedby="aide-nouvelle">Partie personnalisée</button></li>
      </ul>
      <div class="mt-4 flex flex-wrap gap-2 text-sm">
        <button type="button" class="btn btn-s !min-h-[44px]" id="elu" ${ctx.accepte ? '' : 'disabled'}>Jouer un élu réel</button>
        <label class="btn btn-s cursor-pointer ${ctx.accepte ? '' : 'opacity-55'}" for="import">Importer une sauvegarde</label>
        <input type="file" id="import" accept="application/json,.json" class="sr-only" ${ctx.accepte ? '' : 'disabled'}>
        <button type="button" class="btn btn-s" id="classement">Classement</button>
      </div>
    </section>`;
  racine.querySelector('#accept').addEventListener('change', (e) => dispatch({ type: 'accepter', valeur: e.target.checked }));
  racine.querySelector('#decouvrir').addEventListener('click', () => dispatch({ type: 'aller', ecran: 'decouverte' }));
  racine.querySelector('#nouvelle').addEventListener('click', () => dispatch({ type: 'aller', ecran: 'creation' }));
  racine.querySelector('#presidence').addEventListener('click', () => dispatch({ type: 'aller', ecran: 'presidence' }));
  racine.querySelector('#elu').addEventListener('click', () => dispatch({ type: 'aller', ecran: 'choixElu' }));
  racine.querySelector('#classement').addEventListener('click', () => dispatch({ type: 'classement' }));
  racine.querySelector('#reprendre').addEventListener('click', () => dispatch({ type: 'reprendre' }));
  racine.querySelector('#import').addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (f) dispatch({ type: 'importer', texte: await f.text() });
  });
}
