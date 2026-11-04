import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { AXES, INDICATEURS } from '../src/engine/constants.js';

const lire = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}`, import.meta.url)));
const partis = lire('parties.json');
const lois = lire('laws.json');
const situation = lire('situation.json');

describe('parties.json', () => {
  it('ids uniques, couleurs hex, positions complètes et bornées', () => {
    expect(new Set(partis.map((p) => p.id)).size).toBe(partis.length);
    for (const p of partis) {
      expect(p.couleur).toMatch(/^#[0-9a-f]{6}$/i);
      for (const a of AXES) {
        expect(p.positions[a]).toBeGreaterThanOrEqual(-100);
        expect(p.positions[a]).toBeLessThanOrEqual(100);
      }
    }
  });
  it('sièges cohérents avec l’Assemblée', () => {
    const total = partis.reduce((s, p) => s + (p.sieges_assemblee ?? 0), 0);
    expect(total).toBeLessThanOrEqual(situation.assemblee_total);
  });
});

describe('laws.json', () => {
  it('schéma valide', () => {
    expect(lois.length).toBeGreaterThanOrEqual(10);
    expect(new Set(lois.map((l) => l.id)).size).toBe(lois.length);
    for (const l of lois) {
      expect(AXES).toContain(l.theme);
      expect(l.titre.length).toBeGreaterThan(0);
      expect(Math.abs(l.orientation)).toBeLessThanOrEqual(100);
      expect(l.cout_politique).toBeGreaterThanOrEqual(1);
      expect(l.cout_politique).toBeLessThanOrEqual(5);
      for (const e of l.effets) {
        expect(INDICATEURS).toContain(e.indicateur);
        expect(typeof e.valeur).toBe('number');
        expect(e.delaiMois).toBeGreaterThanOrEqual(0);
        expect(e.duree).toBeGreaterThanOrEqual(1);
      }
    }
  });
  it('aucune loi purement bénéfique (arbitrages)', () => {
    // valeur « bonne » : baisse de chomage/deficit/dette/inflation/tensions, hausse croissance/popularite
    const sens = { chomage: -1, deficit: -1, dette: -1, inflation: -1, tensions: -1, croissance: 1, popularite: 1 };
    for (const l of lois) {
      expect(l.effets.some((e) => e.valeur * sens[e.indicateur] < 0), l.id).toBe(true);
    }
  });
});

describe('situation.json', () => {
  it('date de collecte et sources présentes', () => {
    expect(situation.date_collecte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(situation.sources.length).toBeGreaterThan(0);
    for (const s of situation.sources) expect(s.url).toMatch(/^https?:\/\//);
  });
});

describe('senat.json', () => {
  const senat = lire('senat.json');
  const ids = new Set(partis.map((p) => p.id));
  it('total cohérent et partis connus', () => {
    expect(senat.groupes.reduce((s, g) => s + g.sieges, 0)).toBe(senat.total);
    for (const g of senat.groupes) for (const p of g.partis) expect(ids.has(p), `${g.id}→${p}`).toBe(true);
    expect(senat.sources.length).toBeGreaterThan(0);
  });
});

describe('politicians.json (règles de contenu)', () => {
  const politiciens = lire('politicians.json');
  const ids = new Set(partis.map((p) => p.id));
  it('ids uniques, partis connus, fonction sourcée', () => {
    expect(new Set(politiciens.map((p) => p.id)).size).toBe(politiciens.length);
    for (const p of politiciens) {
      expect(ids.has(p.parti), p.id).toBe(true);
      expect(p.fonction_source.url).toMatch(/^https?:\/\//);
    }
  });
  it('citations : < 15 mots, source, date et URL obligatoires', () => {
    for (const p of politiciens) for (const c of p.citations) {
      expect(c.texte.trim().split(/\s+/).length, `${p.id}: ${c.texte}`).toBeLessThan(15);
      expect(c.source.length).toBeGreaterThan(0);
      expect(c.date).toMatch(/^\d{4}-\d{2}(-\d{2})?$/);
      expect(c.url).toMatch(/^https?:\/\//);
    }
  });
  it('aucune position ni compétence individuelle (neutralité)', () => {
    for (const p of politiciens) { expect(p.positions).toBeUndefined(); expect(p.competences).toBeUndefined(); }
  });
});

describe('calendrier.json', () => {
  const cal = lire('calendrier.json');
  it('dates AAAA-MM, types connus, sources', () => {
    for (const e of cal.elections) {
      expect(e.date).toMatch(/^\d{4}-\d{2}$/);
      expect(['presidentielle', 'legislatives', 'europeennes']).toContain(e.type);
    }
    expect(cal.sources.length).toBeGreaterThan(0);
  });
});

describe('events.json', () => {
  const evenements = lire('events.json');
  it('schéma valide', () => {
    expect(new Set(evenements.map((e) => e.id)).size).toBe(evenements.length);
    for (const e of evenements) {
      expect(e.titre && e.theme && e.description).toBeTruthy();
      expect(e.choix.length).toBeGreaterThanOrEqual(2);
      for (const c of e.choix) {
        expect(c.libelle).toBeTruthy();
        expect(c.cout_capital ?? 0).toBeGreaterThanOrEqual(0);
        for (const ef of c.effets) {
          expect(INDICATEURS).toContain(ef.indicateur);
          expect(Number.isFinite(ef.valeur)).toBe(true);
        }
      }
    }
  });
});

describe('régions, carte et projets (E1)', () => {
  const regions = lire('regions.json'), carte = lire('carte-regions.json'), projets = lire('projets.json');
  it('18 régions, ids identiques entre données et carte', () => {
    expect(regions.regions).toHaveLength(18);
    expect(new Set(carte.regions.map((r) => r.id))).toEqual(new Set(regions.regions.map((r) => r.id)));
    for (const r of regions.regions) expect(r.population).toBeGreaterThan(100_000);
    for (const c of carte.regions) expect(c.d.length).toBeGreaterThan(20);
    expect(carte.attribution.length).toBeGreaterThan(0);
  });
  it('projets : coûts positifs, effets sur des indices connus, risque borné', () => {
    for (const p of projets.projets) {
      expect(p.cout_md).toBeGreaterThan(0);
      expect(p.delai_mois).toBeGreaterThan(0);
      for (const i of Object.keys(p.effets)) expect(['emploi', 'sante', 'transports']).toContain(i);
      expect(p.risque.proba).toBeLessThan(1);
    }
    for (const id of Object.keys(projets.transports_initial)) expect(regions.regions.some((r) => r.id === id)).toBe(true);
  });
});

describe('finances.json (E2)', () => {
  const f = lire('finances.json');
  it('cohérence : recettes − dépenses ≈ −déficit (écart < 5 %), postes attendus', () => {
    const somme = (o) => Object.values(o).reduce((s, v) => s + v, 0);
    const soldeCalc = somme(f.recettes_md) - somme(f.depenses_md);
    const soldeAttendu = -(f.deficit_pct_pib * f.pib_md) / 100;
    expect(Math.abs(soldeCalc - soldeAttendu) / Math.abs(soldeAttendu)).toBeLessThan(0.05);
    for (const k of ['protection_sociale', 'sante', 'education', 'defense_securite', 'infrastructures_environnement', 'recherche', 'administration_autres', 'interets']) expect(f.depenses_md[k]).toBeGreaterThan(0);
    for (const k of ['impots_menages', 'impots_entreprises', 'tva_consommation', 'cotisations_sociales']) expect(f.recettes_md[k]).toBeGreaterThan(0);
    expect(f.sources.length).toBeGreaterThan(0);
  });
});

describe('objectifs.json', () => {
  const cat = lire('objectifs.json');
  const MESURES = ['indicateur', 'satisfaction_territoriale', 'indice_minimal', 'lois_adoptees', 'programmes_en_oeuvre', 'confiance_regionale'];
  it('champs requis, mesures connues, cibles numériques, défaut valide', () => {
    expect(Number.isInteger(cat.nombre_a_choisir)).toBe(true);
    const ids = new Set();
    for (const o of cat.objectifs) {
      for (const k of ['id', 'titre', 'description', 'mesure', 'sens']) expect(typeof o[k], `${o.id}.${k}`).toBe('string');
      expect(MESURES).toContain(o.mesure);
      expect(['min', 'max']).toContain(o.sens);
      expect(Number.isFinite(o.cible)).toBe(true);
      if (o.mesure === 'indicateur') expect(INDICATEURS).toContain(o.indicateur);
      expect(ids.has(o.id)).toBe(false);
      ids.add(o.id);
    }
    expect(cat.defaut).toHaveLength(cat.nombre_a_choisir);
    for (const id of cat.defaut) expect(ids.has(id)).toBe(true);
  });
});

describe('scenario.json', () => {
  const s = lire('scenario.json');
  const projets = lire('projets.json');
  const evenements = lire('events.json');
  it('cadre, engagements typés, options vers des projets agissant sur l’indice, crises vers des événements connus, acteur fictif', () => {
    expect(s.id && s.titre && s.situation && s.avertissement_indice).toBeTruthy();
    expect(s.duree_mois).toBe(12);
    expect(['emploi', 'sante', 'transports']).toContain(s.indice);
    expect(s.acteur.fictif).toBe(true);
    expect(s.garde_fou.indicateur).toBe('deficit'); expect(s.garde_fou.hausse_max).toBeGreaterThan(0); expect(s.garde_fou.texte).toBeTruthy();
    expect(s.engagements).toHaveLength(3);
    expect(new Set(s.engagements.map((e) => e.id)).size).toBe(3);
    for (const e of s.engagements) {
      expect(['indice_region', 'loi_promulguee', 'programme_effets']).toContain(e.type);
      expect(e.titre && e.resume && e.lever).toBeTruthy();
      if (e.type === 'indice_region') {
        expect(e.cible).toBeGreaterThan(0);
        expect(e.options.length).toBeGreaterThanOrEqual(2);
        for (const o of e.options) expect(projets.projets.find((p) => p.id === o.projetId)?.effets?.[s.indice], o.projetId).toBeGreaterThan(0);
      }
    }
    for (const c of s.crises) {
      expect(Number.isInteger(c.mois) && c.mois > 0 && c.mois < s.duree_mois).toBe(true);
      expect(c.candidats.length).toBeGreaterThan(0);
      for (const id of c.candidats) expect(evenements.some((e) => e.id === id), id).toBe(true);
      if (c.suite) {
        expect(Array.isArray(c.suite.siChoix) && c.suite.delaiMois > 0).toBe(true);
        expect(evenements.find((e) => e.id === c.suite.evenement)?.declenchement).toBe('scenario');
      }
    }
  });
  it('un événement réservé au scénario a un poids nul et des effets locaux typés', () => {
    for (const e of evenements.filter((x) => x.declenchement === 'scenario')) {
      expect(e.poids).toBe(0);
      for (const c of e.choix) for (const r of c.effets_region ?? []) expect(['emploi', 'sante', 'transports', 'confiance']).toContain(r.indice);
    }
  });
});

describe('carte-monde.json', () => {
  const m = lire('carte-monde.json');
  const regions = lire('regions.json').regions;
  it('projection, cadrages, pays géographiques, régions du jeu toutes présentes, DROM en encarts, sources et licences', () => {
    expect(m.projection).toMatchObject({ type: 'mercator', largeur: 8192 });
    expect(m.viewBox).toBe('0 0 8192 8192');
    for (const k of ['france', 'europe', 'monde']) { const c = m.cadrages[k]; expect(c.w).toBeGreaterThan(0); expect(c.h).toBeGreaterThan(0); expect(c.x).toBeGreaterThanOrEqual(0); expect(c.x + c.w).toBeLessThanOrEqual(8192); }
    expect(m.cadrages.france.w).toBeLessThan(m.cadrages.europe.w); expect(m.cadrages.europe.w).toBeLessThan(m.cadrages.monde.w);
    expect(m.pays.length).toBeGreaterThan(150);
    for (const p of m.pays) { expect(p.id && p.nom).toBeTruthy(); expect(p.d).toMatch(/^M[\d.]+ [\d.]+L/); expect(Object.keys(p).sort()).toEqual(['d', 'id', 'nom']); } // aucune donnée de jeu sur les pays étrangers
    const metro = regions.filter((r) => !['guadeloupe', 'martinique', 'guyane', 'la-reunion', 'mayotte'].includes(r.id)).map((r) => r.id).sort();
    expect(m.regions.map((r) => r.id).sort()).toEqual(metro);
    for (const r of m.regions) { expect(r.d).toMatch(/^M/); expect(r.cx).toBeGreaterThan(m.cadrages.france.x); expect(r.cx).toBeLessThan(m.cadrages.france.x + m.cadrages.france.w); }
    expect(m.drom.map((d) => d.id).sort()).toEqual(['guadeloupe', 'guyane', 'la-reunion', 'martinique', 'mayotte']);
    for (const d of m.drom) { expect(d.encart).toMatchObject({ id: d.id }); expect(d.d.length).toBeGreaterThan(10); expect(d.cx).toBeGreaterThan(0); }
    expect(m.france.d).toMatch(/^M/);
    expect(m.sources.length).toBe(2);
    for (const s of m.sources) expect(s.source && s.url && s.licence && s.date).toBeTruthy();
    expect(m.attribution).toMatch(/Natural Earth/);
  });
});

describe('mission.json', () => {
  it('cadre, options vers des projets existants, acteur fictif, avertissement sur l’indice', () => {
    const m = lire('mission.json');
    const projets = lire('projets.json').projets;
    for (const k of ['id', 'titre', 'indice', 'avertissement_indice']) expect(typeof m[k], k).toBe('string');
    expect(['emploi', 'sante', 'transports']).toContain(m.indice);
    expect(Number.isInteger(m.duree_mois) && m.duree_mois > 0).toBe(true);
    expect(m.options.length).toBeGreaterThanOrEqual(2);
    const ids = new Set();
    for (const o of m.options) {
      expect(projets.some((p) => p.id === o.projetId && p.effets?.[m.indice] > 0), o.projetId).toBe(true);
      for (const k of ['libelle', 'resume']) expect(typeof o[k]).toBe('string');
      expect(ids.has(o.projetId)).toBe(false); ids.add(o.projetId);
    }
    expect(m.acteur).toMatchObject({ fictif: true });
    expect(typeof m.acteur.nom).toBe('string');
  });
});

describe('economie.json (lot 2)', () => {
  const eco = lire('economie.json');
  const carte = lire('carte-monde.json');
  it('quatre filières, dépendances vers des filières connues, échanges positifs, paramètres présents', () => {
    expect(Object.keys(eco.filieres)).toEqual(['energie', 'agriculture', 'industrie', 'services']);
    for (const [id, f] of Object.entries(eco.filieres)) {
      expect(f.production_md).toBeGreaterThan(0); expect(f.capacite_initiale).toBeGreaterThanOrEqual(100); expect(f.part_pib).toBeGreaterThan(0);
      expect(eco.commerce.filieres[id].importations_md).toBeGreaterThanOrEqual(0); expect(eco.commerce.filieres[id].exportations_md).toBeGreaterThanOrEqual(0);
    }
    expect(Object.values(eco.filieres).reduce((s, f) => s + f.part_pib, 0)).toBeCloseTo(0.97, 1);
    for (const deps of Object.values(eco.dependances)) for (const [g, c] of Object.entries(deps)) { expect(eco.filieres[g]).toBeTruthy(); expect(c).toBeGreaterThan(0); expect(c).toBeLessThan(1); }
    for (const k of ['croissance_par_point_production', 'chomage_par_point_production', 'inflation_par_penurie', 'seuil_alerte_penurie', 'seuil_dependance']) expect(typeof eco.parametres[k]).toBe('number');
  });
  it('partenaires : identifiants uniques présents sur la carte du monde, parts bornées (somme ≤ 1 par filière)', () => {
    const ids = eco.commerce.partenaires.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(carte.pays.some((p) => p.id === id), id).toBe(true);
    for (const f of Object.keys(eco.filieres)) for (const cle of ['parts_importations', 'parts_exportations']) {
      const total = eco.commerce.partenaires.reduce((s, p) => s + (p[cle][f] ?? 0), 0);
      expect(total, `${cle} ${f}`).toBeLessThanOrEqual(1);
      expect(total).toBeGreaterThan(0.3);
    }
  });
  it('investissements : ids uniques, filière connue, coût, délai et contrepartie', () => {
    expect(new Set(eco.investissements.map((i) => i.id)).size).toBe(eco.investissements.length);
    for (const i of eco.investissements) {
      expect(eco.filieres[i.filiere]).toBeTruthy(); expect(i.cout_total_md).toBeGreaterThan(0); expect(i.delai_mois).toBeGreaterThanOrEqual(6); expect(i.montee_mois).toBeGreaterThanOrEqual(1);
      expect(i.contrepartie.length).toBeGreaterThan(10); expect(i.entretien_md).toBeGreaterThanOrEqual(0);
      expect((i.gain_capacite ?? 0) > 0 || i.amortissement_penurie || i.reduction_dependance, i.id).toBeTruthy();
    }
  });
  it('sources datées avec URL', () => {
    expect(eco.date_collecte).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const s of eco.sources) { expect(s.url).toMatch(/^https?:\/\//); expect(s.date).toMatch(/^\d{4}-\d{2}/); }
  });
});

describe('pays.json (lot 3)', () => {
  const p = lire('pays.json');
  const carte = lire('carte-monde.json');
  const eco = lire('economie.json');
  it('partenaires : ids uniques présents sur la carte et parmi les partenaires commerciaux, relation 0-100, positions bornées sur des axes connus, intérêts connus', () => {
    const ids = p.pays.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    const interets = new Set(p.accords.map((a) => a.interet));
    for (const x of p.pays) {
      expect(carte.pays.some((c) => c.id === x.id), x.id).toBe(true);
      expect(eco.commerce.partenaires.some((c) => c.id === x.id), x.id).toBe(true);
      expect(x.relation_initiale).toBeGreaterThanOrEqual(0); expect(x.relation_initiale).toBeLessThanOrEqual(100);
      for (const [a, v] of Object.entries(x.positions ?? {})) { expect(AXES).toContain(a); expect(Math.abs(v)).toBeLessThanOrEqual(100); }
      for (const i of x.interets) expect([...interets, 'europe', 'immigration'], i).toContain(i);
      expect(typeof x.ue).toBe('boolean'); expect(typeof x.otan).toBe('boolean');
    }
  });
  it('accords : ids uniques, durée, seuil de relation, contrepartie, effets sur des indicateurs connus', () => {
    expect(new Set(p.accords.map((a) => a.id)).size).toBe(p.accords.length);
    for (const a of p.accords) {
      expect(a.duree_mois).toBeGreaterThanOrEqual(12); expect(a.relation_min).toBeGreaterThan(0); expect(a.contrepartie.length).toBeGreaterThan(10);
      for (const e of a.effets) expect(INDICATEURS).toContain(e.indicateur);
    }
  });
  it('initiatives : types connus, {pays} dans le titre, choix avec libellé, dernier choix sans coût (réponse par défaut possible)', () => {
    expect(new Set(p.initiatives.map((i) => i.id)).size).toBe(p.initiatives.length);
    for (const i of p.initiatives) {
      expect(['proposition', 'tension', 'demande', 'crise', 'ue']).toContain(i.type);
      if (i.type !== 'ue') expect(i.titre).toContain('{pays}');
      if (i.type === 'proposition') expect(p.accords.some((a) => a.id === i.accord)).toBe(true);
      else {
        expect(i.choix.length).toBeGreaterThanOrEqual(2);
        for (const c of i.choix) { expect(c.libelle.length).toBeGreaterThan(3); for (const e of c.effets ?? []) expect(INDICATEURS).toContain(e.indicateur); }
        expect(i.choix.at(-1).cout_capital ?? 0).toBe(0);
        expect(i.choix.at(-1).cout_md ?? 0).toBe(0);
      }
    }
  });
  it('paramètres et sources : la note précise qu’il s’agit de paramètres de simulation', () => {
    expect(p.note).toMatch(/PARAMÈTRES DE SIMULATION/);
    for (const s of p.sources) { expect(s.url).toMatch(/^https?:\/\//); expect(s.date).toMatch(/^\d{4}-\d{2}/); }
    for (const k of ['convergence_mensuelle', 'proba_initiative', 'delai_initiative_pays', 'effet_sanction_echanges']) expect(typeof p.parametres[k]).toBe('number');
  });
});
