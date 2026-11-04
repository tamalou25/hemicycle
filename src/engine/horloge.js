// Horloge de simulation (temps continu) : PURE et déterministe, sans règle de jeu.
// Elle décide seulement QUAND un pas mensuel du moteur doit être joué ; le moteur (tourSuivant) reste le seul
// à appliquer les règles. À graine et décisions identiques aux mêmes dates simulées, la vitesse ne change rien :
// un pas = un mois, toujours joué par le même appel, jamais deux fois pour le même mois.
export const VITESSES = { 1: 30_000, 2: 12_000, 3: 5_000 }; // millisecondes réelles par mois simulé
export const JOURS_PAR_MOIS = 30; // calendrier affiché à l'intérieur du mois (présentation)

// `avancement` : fraction du mois simulé déjà écoulée (0 à 1), indépendante de la vitesse : changer de vitesse ne fait
// ni reculer ni avancer la date, seule la vitesse future change.
export const horlogeInitiale = () => ({ marche: false, vitesse: 1, avancement: 0 });

/** Démarre, met en pause, change de vitesse (l'avancement dans le mois est conservé). */
export const demarrer = (h) => ({ ...h, marche: true });
export const pauser = (h) => ({ ...h, marche: false });
export const basculer = (h) => (h.marche ? pauser(h) : demarrer(h));
export const changerVitesse = (h, v) => ({ ...h, vitesse: VITESSES[v] ? v : h.vitesse });
/** Nouveau mois commencé autrement (« Mois suivant » manuel, reprise) : la progression repart de zéro, l'horloge reste en pause ou non. */
export const reinitialiserMois = (h) => ({ ...h, avancement: 0 });

/**
 * Fait avancer l'horloge de `dtMs` millisecondes réelles.
 * Renvoie { horloge, pas } avec pas ∈ {0, 1} : au plus UN mois par appel (aucun rattrapage incontrôlé :
 * un long délai réel, par exemple au retour de l'arrière-plan, ne joue jamais plusieurs mois d'un coup).
 */
export function avancer(h, dtMs) {
  if (!h.marche || !(dtMs > 0)) return { horloge: h, pas: 0 };
  const avancement = Math.min(1, (h.avancement ?? 0) + dtMs / VITESSES[h.vitesse]);
  if (avancement >= 1) return { horloge: { ...h, avancement: 0 }, pas: 1 };
  return { horloge: { ...h, avancement }, pas: 0 };
}

/** Jour affiché dans le mois (1..30) d'après l'avancement (fraction du mois). */
export const jourDuMois = (h) => 1 + Math.min(JOURS_PAR_MOIS - 1, Math.floor((h.avancement ?? 0) * JOURS_PAR_MOIS));

/** Raison d'une pause automatique d'après l'état du jeu, ou null : la décision d'arrêter l'horloge est explicable. */
export function raisonPause(etat) {
  if (!etat) return 'Aucune partie.';
  if (etat.fin) return 'Fin de la campagne.';
  if (etat.evenement) return 'Un événement attend votre réponse.';
  if (etat.diplomatie?.initiative) return 'Une initiative diplomatique attend votre réponse.';
  if (etat.joueur?.role === 'president' && etat.gouvernement?.statut === 'renverse') return 'Le gouvernement est renversé : nommez un Premier ministre.';
  if (etat.scenario?.statut === 'termine' && etat.scenario.bilan?.tour === etat.tour) return 'Conclusion du scénario.';
  return null;
}
