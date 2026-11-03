// Catalogue unifié des décisions (E4) : toutes les actions possibles du joueur, normalisées,
// pour une interface unique et filtrable. Trois catégories (cadrage §7) + les négociations :
//  - 'nationale'      : lois, programmes nationaux, budget ;
//  - 'territoriale'   : projets dans les régions ;
//  - 'exceptionnelle' : réponse à un événement, 49.3, dissolution ;
//  - 'negociation'    : accords avec les groupes parlementaires.
import { raisonRefus } from './laws.js';
import { raisonRefus493, raisonRefusAccord, toleranceAccord } from './laws.js';
import { ecartIdeologique } from './parliament.js';
import { raisonRefusPolitique } from './secteurs.js';
import { raisonRefusPLF } from './budgetEtat.js';
import { raisonRefusDissolution } from './elections.js';
import { raisonRefusProjet } from './projets.js';

export const CATEGORIES = { nationale: 'Politiques nationales', territoriale: 'Projets territoriaux', exceptionnelle: 'Décisions exceptionnelles', negociation: 'Négociations' };
export const SECTEURS_DECISION = {
  social: 'Social et logement', sante: 'Santé', education: 'Éducation', emploi: 'Emploi et économie', transports: 'Transports',
  energie: 'Énergie et environnement', securite: 'Sécurité et justice', defense: 'Défense', recherche: 'Recherche',
  finances: 'Finances publiques', institutions: 'Institutions et Europe',
};
const THEME_LOI = { retraites: 'social', immigration: 'securite', fiscalite: 'finances', europe: 'institutions', ecologie: 'energie', securite: 'securite' };
const SECTEUR_POLITIQUE = { logement: 'social', education: 'education', energie: 'energie', securite: 'securite', defense: 'defense', recherche: 'recherche' };

const item = (o) => ({ cout: {}, delai: null, raison: null, ...o, statut: o.statut ?? (o.raison ? 'bloque' : 'disponible') });

/** Liste de toutes les décisions, avec leur statut et la raison d'un éventuel blocage. */
export function catalogueDecisions(etat, d) {
  const res = [];
  // Événement en attente (prioritaire)
  if (etat.evenement) {
    const ev = d.evenements?.find((e) => e.id === etat.evenement);
    if (ev) res.push(item({ id: `evenement:${ev.id}`, categorie: 'exceptionnelle', type: 'evenement', secteur: null, titre: ev.titre, resume: ev.description, statut: 'urgent', action: { type: 'evenement' } }));
  }
  // Lois
  for (const l of d.lois ?? []) {
    const enCours = etat.texte?.loiId === l.id;
    const fait = etat.loisAdoptees.includes(l.id);
    res.push(item({ id: `loi:${l.id}`, categorie: 'nationale', type: 'loi', secteur: THEME_LOI[l.theme] ?? 'institutions', titre: l.titre, resume: l.description,
      cout: { capital: l.cout_politique }, delai: 'Navette : 1 étape par mois', statut: fait ? 'fait' : enCours ? 'en_cours' : undefined,
      raison: fait || enCours ? null : raisonRefus(etat, l), action: { type: 'proposer', loi: l.id } }));
  }
  // Programmes nationaux
  for (const p of d.politiques?.politiques ?? []) {
    const engage = (etat.politiques ?? []).find((x) => x.id === p.id);
    res.push(item({ id: `programme:${p.id}`, categorie: 'nationale', type: 'programme', secteur: SECTEUR_POLITIQUE[p.secteur], titre: p.titre, resume: p.description,
      cout: { capital: 1, mdAn: p.cout_annuel_md }, delai: `${p.delai_mois} mois, puis montée en charge sur ${p.montee_mois} mois`, contrepartie: p.contrepartie,
      statut: engage ? (engage.statut === 'en_oeuvre' ? 'fait' : 'en_cours') : undefined,
      raison: engage ? null : raisonRefusPolitique(etat, p, d.politiques), action: { type: 'politique', id: p.id } }));
  }
  // Budget
  if (etat.budget) res.push(item({ id: 'budget:plf', categorie: 'nationale', type: 'budget', secteur: 'finances', titre: 'Projet de loi de finances', resume: 'Arbitrer dépenses et recettes de l’année.',
    delai: 'Vote à la fin du mois du dépôt', statut: etat.plf ? 'en_cours' : undefined, raison: etat.plf ? null : raisonRefusPLF(etat), action: { type: 'onglet', onglet: 'budget' } }));
  // Projets territoriaux (un par type : la région se choisit sur la carte)
  for (const p of d.projets?.projets ?? []) {
    const enCours = (etat.projets ?? []).filter((x) => x.projetId === p.id && x.statut !== 'service').length;
    const possible = (d.regions?.regions ?? []).some((r) => !raisonRefusProjet(etat, p, r));
    res.push(item({ id: `projet:${p.id}`, categorie: 'territoriale', type: 'projet', secteur: p.secteur === 'sante' ? 'sante' : p.secteur, titre: p.titre, resume: p.description,
      cout: { md: p.cout_md, mdAn: p.cout_annuel_md }, delai: `${p.delai_mois} mois de chantier`, enCours,
      raison: possible ? null : raisonRefusProjet(etat, p, d.regions?.regions?.[0]), action: { type: 'onglet', onglet: 'carte' } }));
  }
  // 49.3 et dissolution
  if (etat.joueur.role === 'premier_ministre') {
    if (etat.texte) res.push(item({ id: '493:texte', categorie: 'exceptionnelle', type: '493', secteur: 'institutions', titre: 'Engager la responsabilité (49.3)', resume: 'Adopter le texte sans vote, au risque d’une censure.',
      raison: raisonRefus493(etat), action: { type: '493' } }));
    res.push(item({ id: 'dissolution', categorie: 'exceptionnelle', type: 'dissolution', secteur: 'institutions', titre: 'Proposer une dissolution', resume: 'Législatives anticipées dans deux mois, si le Président accepte.',
      raison: raisonRefusDissolution(etat), action: { type: 'dissolution' } }));
  }
  // Négociations
  for (const p of d.partis ?? []) {
    // Sièges effectifs : après des législatives simulées, un parti sans député n'est plus un partenaire
    const sieges = etat.sieges ? (etat.sieges[p.id] ?? 0) : (p.sieges_assemblee ?? 0);
    if (p.id === etat.joueur.parti || !sieges) continue;
    const ecart = Math.round(ecartIdeologique(etat.joueur.ideologie, p.positions));
    res.push(item({ id: `accord:${p.id}`, categorie: 'negociation', type: 'accord', secteur: 'institutions', titre: `Accord avec ${p.sigle}`, resume: `Écart idéologique ${ecart} (accepté jusqu’à ${Math.round(toleranceAccord(etat))}).`,
      cout: { capital: 2 }, delai: '6 mois', statut: (etat.accords ?? []).some((a) => a.parti === p.id && a.jusqua >= etat.tour) ? 'en_cours' : undefined,
      raison: raisonRefusAccord(etat, p.id), action: { type: 'negocier', parti: p.id } }));
  }
  return res;
}

/** Filtre le catalogue (critères optionnels). */
export function filtrerDecisions(liste, { categorie, secteur, statut } = {}) {
  return liste.filter((x) => (!categorie || x.categorie === categorie) && (!secteur || x.secteur === secteur) && (!statut || x.statut === statut));
}

/** Compteurs par catégorie et par statut (pour les onglets de filtre). */
export function compterDecisions(liste) {
  const c = { total: liste.length, parCategorie: {}, parStatut: {} };
  for (const x of liste) { c.parCategorie[x.categorie] = (c.parCategorie[x.categorie] ?? 0) + 1; c.parStatut[x.statut] = (c.parStatut[x.statut] ?? 0) + 1; }
  return c;
}
