// Registre des causes : chaque variation d'indicateur est rattachée à une cause lisible.
// Le moteur produit des données structurées ; les phrases sont générées par phraseExplication().
// nature : 'observe' (appliqué ce mois-ci) ou 'prevision' (effet programmé, non encore réalisé).

export const MOIS_CONSERVES = 12;

/** Type de cause d'après la source d'un effet planifié. */
export function typeSource(source = '') {
  if (source === 'budget') return 'budget';
  if (source.startsWith('evenement:')) return 'evenement';
  if (source.startsWith('projet:')) return 'projet';
  if (source.startsWith('politique:')) return 'politique';
  if (source === 'interets') return 'interets';
  return 'loi';
}

/**
 * Explications du mois écoulé.
 * @param {number} tour            mois qui vient de s'appliquer
 * @param {Array}  appliques       effets planifiés appliqués ce mois (appliquerEffets)
 * @param {object} apresEffets     indicateurs après les effets des décisions
 * @param {object} final           indicateurs en fin de tour
 */
export function registreDuMois(tour, appliques, apresEffets, final) {
  // Regroupe les effets par (source, indicateur)
  const groupes = new Map();
  for (const e of appliques) {
    const cle = `${e.source}|${e.indicateur}`;
    const g = groupes.get(cle) ?? { tour, indicateur: e.indicateur, delta: 0, source: e.source, type: typeSource(e.source), nature: 'observe', depuis: tour - e.debut + 1, duree: e.fin - e.debut + 1 };
    g.delta += e.parMois;
    groupes.set(cle, g);
  }
  const entrees = [...groupes.values()];
  // Résidu : dynamique de l'économie (retour à l'équilibre, aléas) et de l'opinion
  for (const ind of Object.keys(final)) {
    const d = final[ind] - apresEffets[ind];
    if (Math.abs(d) >= 0.005) entrees.push({ tour, indicateur: ind, delta: d, source: ind === 'popularite' ? 'opinion' : 'conjoncture', type: ind === 'popularite' ? 'opinion' : 'conjoncture', nature: 'observe' });
  }
  return entrees.map((e) => ({ ...e, delta: Math.round(e.delta * 1000) / 1000 })).filter((e) => e.delta !== 0);
}

/** Ajoute les entrées du mois et ne garde que les MOIS_CONSERVES derniers mois. */
export const archiver = (registre, entrees, tour) =>
  [...(registre ?? []), ...entrees].filter((e) => e.tour > tour - MOIS_CONSERVES);

/**
 * Prévisions : effets déjà programmés sur les `horizon` prochains mois (nature 'prevision').
 * Ce sont des engagements du modèle, pas des certitudes : la conjoncture s'y ajoutera.
 */
export function prevoir(etat, horizon = 6) {
  const de = etat.tour + 1, a = etat.tour + horizon;
  const groupes = new Map();
  for (const e of etat.effetsEnCours ?? []) {
    const debut = Math.max(e.debut, de), fin = Math.min(e.fin, a);
    if (fin < debut) continue;
    const cle = `${e.source}|${e.indicateur}`;
    const g = groupes.get(cle) ?? { indicateur: e.indicateur, delta: 0, source: e.source, type: typeSource(e.source), nature: 'prevision', debut: e.debut };
    g.delta += e.parMois * (fin - debut + 1);
    g.debut = Math.min(g.debut, e.debut);
    groupes.set(cle, g);
  }
  return [...groupes.values()].map((g) => ({ ...g, delta: Math.round(g.delta * 1000) / 1000 })).filter((g) => g.delta !== 0);
}

/** Les n explications les plus marquantes d'un mois (hors bruit). */
export const principales = (registre, tour, n = 5) =>
  (registre ?? []).filter((e) => e.tour === tour && (!e.region || e.type === 'projet') && e.type !== 'relation').sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, n);

const LIBELLES = {
  chomage: ['le chômage', 'pt'], croissance: ['la croissance', 'pt'], deficit: ['le déficit', 'pt de PIB'],
  dette: ['la dette', 'pt de PIB'], inflation: ['l’inflation', 'pt'], popularite: ['votre popularité', 'pt'],
  tensions: ['les tensions sociales', 'pt'],
  confiance: ['la confiance envers le gouvernement', 'pt'],
  emploi: ['l’indice emploi', 'pt'], sante: ['l’accès aux soins', 'pt'], transports: ['l’indice transports', 'pt'],
};
const LIBELLES_SECTEURS = { sante: 'santé', infrastructures_environnement: 'infrastructures et environnement' };
const fmt = (v) => `${v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}`;

/** Nom lisible de la cause. */
export function nomCause(entree, { lois = [], evenements = [], projets, politiques } = {}) {
  if (entree.type === 'politique') return `le programme « ${politiques?.politiques?.find((p) => p.id === entree.source.split(':')[1])?.titre ?? 'national'} »`;
  if (entree.type === 'projet') return `le projet « ${projets?.projets?.find((p) => p.id === entree.source.split(':')[1])?.titre ?? 'territorial'} »`;
  if (entree.type === 'mise-en-service') return 'la mise en service d’un projet dans la région';
  if (entree.type === 'choc') return entree.source?.includes('49.3') ? 'le recours au 49.3' : entree.source?.includes('loi-speciale') ? 'l’absence de budget voté (loi spéciale)' : 'un choc politique';
  if (entree.type === 'usure') return 'l’usure des équipements et la hausse des besoins';
  if (entree.type === 'loi') return `la loi « ${lois.find((l) => l.id === entree.source)?.titre ?? entree.source} »`;
  if (entree.type === 'evenement') return `votre réponse à « ${evenements.find((e) => `evenement:${e.id}` === entree.source)?.titre ?? 'un événement'} »`;
  if (entree.type === 'budget') return entree.source?.startsWith('budget:') ? `les crédits « ${LIBELLES_SECTEURS[entree.source.slice(7)] ?? entree.source.slice(7)} » du budget` : 'le budget adopté';
  if (entree.type === 'interets') return 'la charge de la dette';
  if (entree.type === 'opinion') return 'l’évolution de l’opinion';
  return 'la conjoncture économique';
}

/** Phrase explicative, au présent pour l'observé, au futur pour la prévision. */
export function phraseExplication(entree, donnees) {
  if (entree.type === 'relation') {
    const sigle = donnees?.partis?.find((p) => p.id === entree.parti)?.sigle ?? entree.parti;
    return `${sigle} ${entree.delta > 0 ? 'approuve' : 'désapprouve'} ${entree.libelle ? `« ${entree.libelle} »` : 'votre décision'} : relation ${fmt(entree.delta)} pt (simulation).`;
  }
  const [nom, unite] = LIBELLES[entree.indicateur] ?? (entree.indicateur?.startsWith('secteur:') ? [`le niveau « ${donnees?.politiques?.secteurs?.[entree.secteur]?.nom ?? entree.secteur} »`, 'pt'] : [entree.indicateur, '']);
  const cause = nomCause(entree, donnees);
  const nomRegion = entree.region ? (donnees?.regions?.regions?.find((r) => r.id === entree.region)?.nom ?? entree.region) : null;
  const valeur = `${fmt(entree.delta)} ${unite}`.trim() + (nomRegion ? ` (${nomRegion})` : '');
  if (entree.nature === 'prevision') return `Prévu sur les prochains mois : ${cause} devrait faire varier ${nom} de ${valeur}.`;
  if (entree.type === 'conjoncture' || entree.type === 'opinion' || entree.type === 'usure' || entree.type === 'interets' || entree.depuis == null) return `${cause[0].toUpperCase()}${cause.slice(1)} fait varier ${nom} de ${valeur}.`;
  const etape = entree.depuis === 1 ? 'commence à produire ses effets' : entree.depuis >= entree.duree ? 'produit ses derniers effets' : `agit depuis ${entree.depuis} mois`;
  return `${cause[0].toUpperCase()}${cause.slice(1)} ${etape} : ${nom} ${valeur}.`;
}
