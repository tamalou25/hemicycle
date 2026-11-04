// Bilan de campagne (lot 5) : faits mesurés sur l'ensemble du mandat pour comprendre une réussite ou un échec.
// API pure, présentation seulement : chaque ligne vient de l'état (journal, historique, économie, diplomatie, défense).
import { bilanCommerce } from './economie.js';
import { bilanDefense } from './defense.js';
import { nomDifficulte } from './difficulte.js';

const r1 = (v) => Math.round(v * 10) / 10;

export function bilanCampagne(etat, donnees = {}) {
  const j = etat.journal ?? [];
  const compte = (re) => j.filter((x) => re.test(x.texte) || re.test(x.type)).length;
  const h0 = etat.historique?.[0] ?? etat.indicateurs;
  const sections = [];
  // Institutions
  sections.push({ id: 'institutions', titre: 'Institutions', lignes: [
    { libelle: 'Lois adoptées / rejetées', valeur: `${etat.loisAdoptees.length} / ${etat.loisRejetees.length}` },
    { libelle: 'Gouvernements renversés', valeur: String(etat.gouvernement?.renversements ?? compte(/^censure$/)), alerte: (etat.gouvernement?.renversements ?? 0) >= 2 },
    { libelle: 'Événements subis sans réponse (option par défaut)', valeur: String(compte(/^evenement-auto$/)), alerte: compte(/^evenement-auto$/) >= 5 },
    { libelle: 'Budgets reconduits par loi spéciale', valeur: String(compte(/loi spéciale/)), alerte: compte(/loi spéciale/) >= 2 },
  ] });
  // Économie
  if (etat.economie && donnees.economie) {
    const b = bilanCommerce(etat, donnees);
    const eco0 = donnees.economie.commerce.filieres;
    const solde0 = Object.values(eco0).reduce((s, f) => s + f.exportations_md - f.importations_md, 0);
    const livres = (etat.economie.investissements ?? []).filter((x) => x.statut === 'service').length;
    const lances = (etat.economie.investissements ?? []).length;
    const penuries = Object.entries(etat.economie.penuries ?? {}).filter(([, v]) => v > 0.02).map(([f]) => donnees.economie.filieres[f]?.nom ?? f);
    sections.push({ id: 'economie', titre: 'Économie et commerce', lignes: [
      { libelle: 'Solde commercial (Md€/an)', valeur: `${r1(solde0)} → ${r1(b.solde)}`, alerte: b.solde < solde0 - 5 },
      { libelle: 'Investissements lancés / livrés', valeur: `${lances} / ${livres}` },
      { libelle: 'Pénuries en fin de mandat', valeur: penuries.length ? penuries.join(', ') : 'aucune', alerte: penuries.length > 0 },
      { libelle: 'Déficit public', valeur: `${r1(h0.deficit)} → ${r1(etat.indicateurs.deficit)} % du PIB`, alerte: etat.indicateurs.deficit > h0.deficit + 2 },
    ] });
  }
  // Diplomatie
  if (etat.diplomatie && donnees.pays) {
    const allies = donnees.pays.pays.filter((p) => p.otan || p.ue);
    const moyenne = (f) => r1(allies.reduce((s, p) => s + f(p), 0) / Math.max(1, allies.length));
    const init = etat.diplomatie.initiativesPassees ?? [];
    sections.push({ id: 'diplomatie', titre: 'Diplomatie', lignes: [
      { libelle: 'Relation moyenne avec les alliés (UE, OTAN)', valeur: `${moyenne((p) => p.relation_initiale)} → ${moyenne((p) => etat.diplomatie.relations[p.id] ?? p.relation_initiale)}`, alerte: moyenne((p) => etat.diplomatie.relations[p.id] ?? p.relation_initiale) < moyenne((p) => p.relation_initiale) - 10 },
      { libelle: 'Relation avec l’Union européenne', valeur: `${donnees.pays.ue?.relation_initiale ?? 60} → ${r1(etat.diplomatie.ue.relation)}` },
      { libelle: 'Accords conclus (en vigueur à la fin)', valeur: `${compte(/conclu avec/)} (${etat.diplomatie.accords.length})` },
      { libelle: 'Sanctions prises', valeur: String(compte(/^Sanctions contre/)) },
      { libelle: 'Initiatives étrangères traitées / laissées par défaut', valeur: `${init.filter((i) => !i.parDefaut).length} / ${init.filter((i) => i.parDefaut).length}`, alerte: init.filter((i) => i.parDefaut).length >= 3 },
    ] });
  }
  // Défense
  if (etat.defense && donnees.defense) {
    const b = bilanDefense(etat, donnees);
    sections.push({ id: 'defense', titre: 'Défense', lignes: [
      { libelle: 'Disponibilité des forces', valeur: `${Math.round(b.disponibilite.valeur)}/100`, alerte: b.alerte },
      { libelle: 'Équipement', valeur: `${donnees.defense.initial.equipement} → ${Math.round(etat.defense.equipement)}`, alerte: etat.defense.equipement < donnees.defense.initial.equipement - 5 },
      { libelle: 'Engagement dans l’OTAN', valeur: `${donnees.defense.initial.engagementOtan} → ${Math.round(etat.defense.engagementOtan)}` },
      { libelle: 'Programmes lancés', valeur: String((etat.defense.programmes ?? []).length) },
    ] });
  }
  return { difficulte: nomDifficulte(etat, donnees), sections };
}
