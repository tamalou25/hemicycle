// Projets territoriaux : lancement (coût) → chantier (délai, risque) → mise en service
// (coût annuel, effets progressifs sur la montée en charge) → fonctionnement.
import { aleatoire } from './rng.js';
import { planifierEffets } from './effects.js';

/** Facteur d'échelle : un même projet pèse plus dans une petite région (borné 0,5 à 2). */
export const facteurTaille = (population) => Math.min(2, Math.max(0.5, Math.sqrt(5_000_000 / (population || 5_000_000))));

const actif = (p) => p.statut === 'chantier' || p.statut === 'montee';

export function raisonRefusProjet(etat, projet, region) {
  if (etat.fin) return 'La partie est terminée.';
  if (!projet) return 'Projet inconnu.';
  if (!region) return 'Région inconnue.';
  if ((etat.projets ?? []).some((p) => p.projetId === projet.id && p.region === region.id && actif(p))) return 'Ce projet est déjà en cours dans cette région.';
  if ((etat.finances?.enveloppe ?? 0) + 1e-9 < projet.cout_md) return `Enveloppe d’investissement insuffisante (${projet.cout_md} Md€ requis).`;
  return null;
}

/** Lance un projet dans une région : débite l'enveloppe, tire le risque (retard ou efficacité réduite). */
export function lancerProjet(etat, projetId, regionId, { projets, regions }) {
  const projet = projets.projets.find((p) => p.id === projetId);
  const region = regions.regions.find((r) => r.id === regionId);
  const refus = raisonRefusProjet(etat, projet, region);
  if (refus) throw new Error(refus);
  let [r, g] = aleatoire(etat.graine);
  const aleaSurvenu = r < (projet.risque?.proba ?? 0);
  const retard = aleaSurvenu && projet.risque.type === 'retard' ? projet.risque.mois : 0;
  const efficacite = aleaSurvenu && projet.risque.type === 'efficacite' ? projet.risque.facteur : 1;
  const p = {
    uid: `${projetId}@${regionId}#${etat.tour}`, projetId, region: regionId, lance: etat.tour,
    statut: 'chantier', service: etat.tour + projet.delai_mois + retard, retard,
    efficacite, facteur: facteurTaille(region.population), alea: aleaSurvenu ? projet.risque.texte : null,
  };
  return {
    ...etat, graine: g,
    finances: { ...etat.finances, enveloppe: Math.round((etat.finances.enveloppe - projet.cout_md) * 1000) / 1000 },
    projets: [...(etat.projets ?? []), p],
    journal: [...etat.journal, { tour: etat.tour, type: 'projet', texte: `Lancement : ${projet.titre} (${region.nom}), ${projet.cout_md} Md€. Mise en service prévue dans ${p.service - etat.tour} mois.` }],
  };
}

/**
 * Avance tous les projets d'un mois. Renvoie { etat, entrees } :
 * mises en service (coût annuel → déficit, via la file d'effets), montée en charge (indices régionaux).
 */
export function avancerProjets(etat, { projets, regions }, tour) {
  const entrees = [];
  const territoires = { ...etat.territoires };
  let effetsEnCours = etat.effetsEnCours;
  let recurrent = etat.finances?.recurrent ?? 0;
  const journal = [...etat.journal];
  const liste = (etat.projets ?? []).map((p0) => {
    const p = { ...p0 };
    const def = projets.projets.find((x) => x.id === p.projetId);
    const nomRegion = regions.regions.find((r) => r.id === p.region)?.nom ?? p.region;
    if (!def) return p;
    if (p.statut === 'chantier' && tour >= p.service) {
      p.statut = 'montee';
      recurrent += def.cout_annuel_md;
      const source = `projet:${p.projetId}:${p.region}`;
      // Le coût de fonctionnement s'ajoute durablement au déficit (en points de PIB)
      const effets = [{ indicateur: 'deficit', valeur: (def.cout_annuel_md / projets.pib_md) * 100, delaiMois: 0, duree: 1 },
        ...(def.effets_nationaux ?? []).map((e) => ({ ...e, valeur: e.valeur * p.efficacite, delaiMois: 0, duree: def.montee_mois }))];
      effetsEnCours = [...effetsEnCours, ...planifierEffets(effets, tour + 1, source)];
      journal.push({ tour, type: 'projet', texte: `Mise en service : ${def.titre} (${nomRegion})${p.retard ? `, avec ${p.retard} mois de retard` : ''}. Coût de fonctionnement : ${def.cout_annuel_md} Md€/an.` });
    }
    if (p.statut === 'montee') {
      const mois = tour - p.service + 1; // 1..montee
      if (mois >= 1 && mois <= def.montee_mois) {
        const t = { ...territoires[p.region] };
        for (const [indice, total] of Object.entries(def.effets)) {
          const d = (total * p.efficacite * p.facteur) / def.montee_mois;
          const avant = t[indice]; t[indice] = Math.min(100, Math.round((t[indice] + d) * 10) / 10);
          entrees.push({ tour, region: p.region, indicateur: indice, delta: Math.round((t[indice] - avant) * 100) / 100, source: `projet:${p.projetId}`, type: 'projet', nature: 'observe', depuis: mois, duree: def.montee_mois });
        }
        territoires[p.region] = t;
      }
      if (mois >= def.montee_mois) p.statut = 'service';
    }
    return p;
  });
  return { etat: { ...etat, territoires, effetsEnCours, projets: liste, journal, finances: { ...etat.finances, recurrent: Math.round(recurrent * 1000) / 1000 } }, entrees };
}

/** Prévisions des projets (montée en charge à venir). */
export function prevoirProjets(etat, { projets }, horizon = 6) {
  const res = [];
  for (const p of etat.projets ?? []) {
    const def = projets.projets.find((x) => x.id === p.projetId);
    if (!def || p.statut === 'service') continue;
    for (const [indice, total] of Object.entries(def.effets)) {
      const parMois = (total * p.efficacite * p.facteur) / def.montee_mois;
      const de = Math.max(etat.tour + 1, p.service), a = Math.min(etat.tour + horizon, p.service + def.montee_mois - 1);
      if (a >= de) res.push({ region: p.region, indicateur: indice, delta: Math.round(parMois * (a - de + 1) * 100) / 100, source: `projet:${p.projetId}`, type: 'projet', nature: 'prevision', debut: p.service });
    }
  }
  return res;
}
