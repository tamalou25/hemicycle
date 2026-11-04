// Fiches comparables des décisions (lois, programmes, projets) : API PURE, aucun effet sur l'état.
// Les effets affichés sont THÉORIQUES (si l'action aboutit), avant conjoncture, autres décisions et bornes.
import { groupesAssemblee, voterChambre, voterCensure } from './parliament.js';
import { risqueConstitutionnel } from './navette.js';
import { evaluerObjectifs } from './objectifs.js';
import { gouverne } from './presidence.js';

/** Sens favorable d'une variation, par indicateur (inflation : proche de 2 %, non tranché ici). */
const SENS = { chomage: -1, croissance: 1, deficit: -1, dette: -1, inflation: 0, popularite: 1, tensions: -1, emploi: 1, sante: 1, transports: 1 };
export const favorable = (indicateur, valeur) => (SENS[indicateur] === 0 ? null : Math.sign(valeur) === SENS[indicateur]);

/** Objectifs sélectionnés auxquels une décision se rattache (par l'indicateur visé ou la nature de l'action). */
function liensObjectifs(etat, donnees, type, indicateurs) {
  return evaluerObjectifs(etat, donnees).filter((o) => {
    const def = donnees.objectifs?.objectifs.find((x) => x.id === o.id);
    if (!def) return false;
    if (def.mesure === 'indicateur') return indicateurs.includes(def.indicateur);
    if (def.mesure === 'lois_adoptees') return type === 'loi';
    if (def.mesure === 'programmes_en_oeuvre') return type === 'programme';
    return type === 'projet'; // satisfaction, indice minimal, confiance régionale
  }).map((o) => o.titre);
}

/**
 * Fiche d'une décision du catalogue (item de catalogueDecisions).
 * Retourne null pour les décisions sans contenu comparable (accords, 49.3, dissolution, événement, budget).
 */
export function ficheDecision(etat, item, donnees) {
  const [type, id] = item.id.split(':');
  if (type === 'loi') {
    const l = donnees.lois?.find((x) => x.id === id);
    if (!l) return null;
    const AN = donnees.partis ? groupesAssemblee(donnees.partis, etat.sieges) : [];
    const v = AN.length ? voterChambre(etat, AN, l.theme, l.orientation) : null;
    const premier = Math.min(...l.effets.map((e) => e.delaiMois));
    return {
      type, titre: l.titre, description: l.description, beneficiaires: null,
      coutImmediatMd: null, coutAnnuelMd: null, capital: l.cout_politique,
      // La loi s'applique à la promulgation (au moins Assemblée puis Sénat, une étape par mois)
      premiersEffets: premier ? `au plus tôt ${2 + premier} mois après le dépôt (navette d’au moins 2 mois, puis ${premier} mois)` : 'dès la promulgation, au plus tôt 2 mois après le dépôt (navette)',
      effets: l.effets.map((e) => ({ indicateur: e.indicateur, valeur: e.valeur, delaiMois: e.delaiMois, duree: e.duree, favorable: favorable(e.indicateur, e.valeur) })),
      contrepartie: null,
      institution: 'Navette : Assemblée, puis Sénat ; en cas de désaccord, commission mixte paritaire et lecture définitive ; contrôle possible du Conseil constitutionnel.',
      risques: [
        v ? `Vote estimé à l’Assemblée aujourd’hui : ${v.pour} pour, ${v.contre} contre (${v.adoptee ? 'adoption probable' : 'rejet probable'}). Estimation, pas un résultat.` : null,
        `Censure par le Conseil constitutionnel : environ ${Math.round(risqueConstitutionnel(l) * 100)} %.`,
        gouverne(etat) && AN.length ? `Le 49.3 évite le vote, mais expose à une motion de censure (${voterCensure(etat, AN).pour} voix estimées sur 289 requises).` : null,
      ].filter(Boolean),
      blocage: item.raison ?? null,
      objectifs: liensObjectifs(etat, donnees, 'loi', l.effets.map((e) => e.indicateur)),
      mission: false,
    };
  }
  if (type === 'programme') {
    const p = donnees.politiques?.politiques.find((x) => x.id === id);
    if (!p) return null;
    return {
      type, titre: p.titre, description: p.description, beneficiaires: null,
      coutImmediatMd: 0, coutAnnuelMd: p.cout_annuel_md, capital: 1,
      premiersEffets: `après ${p.delai_mois} mois de préparation, puis montée en charge sur ${p.montee_mois} mois`,
      effets: [{ indicateur: `secteur:${p.secteur}`, valeur: p.niveau, delaiMois: p.delai_mois, duree: p.montee_mois, favorable: true },
        ...(p.effets ?? []).map((e) => ({ indicateur: e.indicateur, valeur: e.valeur, delaiMois: e.delaiMois, duree: e.duree, favorable: favorable(e.indicateur, e.valeur) }))],
      contrepartie: p.contrepartie ?? null,
      institution: 'Décision du gouvernement : pas de vote, mais un coût annuel inscrit au budget.',
      risques: [],
      blocage: item.raison ?? null,
      objectifs: liensObjectifs(etat, donnees, 'programme', (p.effets ?? []).map((e) => e.indicateur)),
      mission: false,
    };
  }
  if (type === 'projet') {
    const p = donnees.projets?.projets.find((x) => x.id === id);
    if (!p) return null;
    return {
      type, titre: p.titre, description: p.description, beneficiaires: p.beneficiaires ?? null,
      coutImmediatMd: p.cout_md, coutAnnuelMd: p.cout_annuel_md, capital: 0,
      premiersEffets: `après ${p.delai_mois} mois de chantier, puis montée en charge sur ${p.montee_mois} mois`,
      effets: Object.entries(p.effets).map(([indicateur, valeur]) => ({ indicateur, valeur, delaiMois: p.delai_mois, duree: p.montee_mois, favorable: true, regional: true })),
      contrepartie: null,
      institution: 'Financé par l’enveloppe d’investissement : pas de vote. La région se choisit sur la carte ; l’effet est plus fort dans une petite région (×0,5 à ×2).',
      risques: p.risque ? [`${p.risque.texte} (${Math.round(p.risque.proba * 100)} % de probabilité).`] : [],
      blocage: item.raison ?? null,
      objectifs: liensObjectifs(etat, donnees, 'projet', Object.keys(p.effets)),
      mission: etat.mission?.statut === 'en_cours' && !!p.effets[etat.mission.indice],
    };
  }
  return null;
}
