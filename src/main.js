// Store minimal, routeur d'écrans et sauvegarde automatique.
import { assurerTerritoires, lancerProjet, creerPartie, proposerLoi, amenderTexte, recourir493, negocierAccord, tourSuivant, actionCampagne, seDeclarerCandidat, proposerDissolution, decoderDefi, evaluerFin, entreeClassement, ajouterAuClassement, exporterPartie, importerPartie, resoudreEvenement, deposerPLF, recourir493PLF, engagerPolitique, lancerInvestissement, proposerAccord, sanctionner, leverSanctions, repondreInitiative, differerMission, nommerGouvernement, horlogeInitiale, basculer, pauser, changerVitesse, reinitialiserMois, avancer, raisonPause, jourDuMois } from './engine/index.js';
import { render as accueil } from './ui/screens/accueil.js';
import { render as choixElu } from './ui/screens/choixElu.js';
import { render as creation } from './ui/screens/creation.js';
import { render as decouverte } from './ui/screens/decouverte.js';
import { render as presidence } from './ui/screens/presidence.js';
import { render as tableau } from './ui/screens/tableau.js';
import { render as fin } from './ui/screens/fin.js';
import { render as defi } from './ui/screens/defi.js';
import { render as classement } from './ui/screens/classement.js';
import { toast } from './ui/components/toast.js';
import { confirmation } from './ui/components/confirmations.js';
import { cadrageInitial, cadrageRegion, cadragePays } from './ui/components/carteMonde.js';

const CLE = 'hemicycle.save';
const CLE_ACCORD = 'hemicycle.accord';
const CLE_CLASSEMENT = 'hemicycle.classement';
const CLE_IDS = 'hemicycle.classement.ids';
const CLE_ONGLET = 'hemicycle.onglet';
const ECRANS = { accueil, creation, decouverte, presidence, choixElu, tableau, fin, defi, classement };

const lire = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };

const lireJson = (k) => { try { const v = JSON.parse(lire(k)); return Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined) : []; } catch { return []; } };

// Enregistre une partie terminée au classement local, une seule fois par partie.
function enregistrerClassement(e) {
  const id = `${e.graineInitiale ?? 'x'}:${e.joueur.nom}:${e.tour}:${e.fin?.type ?? ''}`;
  const ids = lireJson(CLE_IDS).filter((x) => typeof x === 'string');
  if (ids.includes(id)) return;
  const entree = entreeClassement(e, evaluerFin(e, { regions: ctx.regions, objectifs: ctx.objectifs }), new Date().toISOString().slice(0, 10));
  ecrire(CLE_CLASSEMENT, JSON.stringify(ajouterAuClassement(lireJson(CLE_CLASSEMENT), entree)));
  ecrire(CLE_IDS, JSON.stringify([...ids, id].slice(-50)));
}

async function chargerJson(chemin) {
  const r = await fetch(new URL(chemin, import.meta.url));
  if (!r.ok) throw new Error(`Chargement impossible : ${chemin}`);
  return r.json();
}

const racine = document.getElementById('app');
let etat = null;
let ecran = 'accueil';
const ctx = { onglet: lire(CLE_ONGLET) || 'bureau', region: null, vue: 'satisfaction', accepte: lire(CLE_ACCORD) === '1', filtreTheme: '', decisions: { categorie: '', secteur: '', statut: 'disponible' }, brouillon: null, sauvegardeExiste: !!lire(CLE) };

function afficher({ focus = true } = {}) {
  const actif = document.activeElement?.id;
  const y = window.scrollY;
  ctx.sauvegardeExiste = !!lire(CLE);
  document.body.classList.toggle('avec-barres', ecran === 'tableau');
  document.body.classList.toggle('avec-temps', ecran === 'tableau' && !!ctx.horloge);
  ECRANS[ecran](racine, etat, dispatch, ctx);
  window.scrollTo(0, y);
  const cible = actif && document.getElementById(actif);
  // Après une action qui fait disparaître le bouton utilisé : focus sur un repère stable (ex. titre de la mission)
  const repere = ctx.focusApres && document.getElementById(ctx.focusApres);
  ctx.focusApres = null;
  if (repere) { repere.setAttribute('tabindex', '-1'); repere.focus({ preventScroll: false }); }
  else if (cible && !cible.disabled) cible.focus({ preventScroll: true });
  else if (focus) racine.focus({ preventScroll: true });
}

async function telecharger(texte, nom) {
  // Application mobile (Capacitor) : la WebView ne gère pas les téléchargements `blob:`.
  // On écrit le fichier dans le cache de l'application puis on ouvre la feuille de partage du système.
  const P = globalThis.Capacitor?.isNativePlatform?.() ? globalThis.Capacitor.Plugins : null;
  if (P?.Filesystem && P?.Share) {
    try {
      const { uri } = await P.Filesystem.writeFile({ path: nom, data: texte, directory: 'CACHE', encoding: 'utf8' });
      await P.Share.share({ title: 'Sauvegarde Hémicycle', files: [uri] });
    } catch (e) { toast(`Export impossible : ${e.message ?? e}`); }
    return;
  }
  const url = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nom });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function aller(nom) {
  ctx.groupesAvant = null;
  ecran = nom;
  racine.setAttribute('aria-label', nom);
  afficher();
  window.scrollTo(0, 0);
}

export function dispatch(action) {
  // En cas d'échec (moteur ou rendu), on revient à l'état et à l'écran précédents.
  const etatPrecedent = etat, ecranPrecedent = ecran;
  try {
    const donnees = { lois: ctx.lois, partis: ctx.partis, senat: ctx.senat, politiciens: ctx.politiciens, calendrier: ctx.calendrier, evenements: ctx.evenements, regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage, politiques: ctx.politiques, mission: ctx.mission, scenario: ctx.scenario, economie: ctx.economie, pays: ctx.pays };
    switch (action.type) {
      case 'accepter': ctx.accepte = action.valeur; ecrire(CLE_ACCORD, action.valeur ? '1' : '0'); return afficher();
      case 'aller': return aller(action.ecran);
      case 'exporterSauvegarde': { const s = lire(CLE); if (s) telecharger(s, 'hemicycle-sauvegarde.json'); return; }
      case 'classement': ctx.classement = lireJson(CLE_CLASSEMENT).filter((x) => typeof x === 'object' && Number.isFinite(x.score)); ctx.confirmEffacer = false; return aller('classement');
      case 'effacerClassement':
        if (action.etape === 'confirme') { ecrire(CLE_CLASSEMENT, '[]'); ctx.classement = []; toast('Classement effacé.', 'info'); }
        ctx.confirmEffacer = action.etape === 'demande';
        return afficher({ focus: false });
      case 'relever': {
        // ...ctx.defi apporte graine, joueur (rôle, positions, objectifs) et, pour une campagne présidentielle, dateDepart
        etat = creerPartie({ ...ctx.defi, mission: ctx.defi.joueur.mission ? ctx.mission : null, scenario: ctx.defi.joueur.scenario ? ctx.scenario : null, situation: ctx.situation, regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage, politiques: ctx.politiques, partis: ctx.partis, objectifs: ctx.objectifs, economie: ctx.economie, pays: ctx.pays });
        ctx.defi = null; ctx.brouillon = null; ctx.brouillonPLF = null; break;
      }
      case 'abandonnerDefi': ctx.defi = null; return aller('accueil');
      case 'filtre': ctx.filtreTheme = action.theme; return afficher();
      case 'decouverte': {
        // Partie réelle : PM fictif, positions du parti choisi (sources publiques), objectifs par défaut, scénario « Douze mois »
        const parti = ctx.partis.find((p) => p.id === action.parti);
        if (!parti) throw new Error('Choisissez une famille politique.');
        etat = creerPartie({ joueur: { nom: action.nom, parti: parti.id, role: 'premier_ministre', ideologie: { ...parti.positions } }, situation: ctx.situation, regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage, politiques: ctx.politiques, partis: ctx.partis, objectifs: ctx.objectifs, economie: ctx.economie, pays: ctx.pays, scenario: ctx.scenario, graine: action.graine ?? ((Date.now() ^ (Math.random() * 2 ** 32)) >>> 0) });
        ctx.decouverte = null; ctx.brouillonPLF = null; ctx.scenarioReplie = false; ctx.onglet = 'bureau'; ecrire(CLE_ONGLET, 'bureau'); break;
      }
      case 'rejouer-scenario': {
        // Même scénario, même graine (mêmes aléas), mêmes nom et parti : on compare ses choix, pas la chance
        if (!etat?.scenario) throw new Error('Aucun scénario à rejouer.');
        const { nom, parti, ideologie } = etat.joueur;
        etat = creerPartie({ joueur: { nom, parti, role: 'premier_ministre', ideologie: { ...ideologie } }, situation: ctx.situation, regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage, politiques: ctx.politiques, partis: ctx.partis, objectifs: ctx.objectifs, economie: ctx.economie, pays: ctx.pays, scenario: ctx.scenario, graine: etat.graineInitiale ?? 1 });
        ctx.brouillonPLF = null; ctx.scenarioReplie = false; ctx.onglet = 'bureau'; ecrire(CLE_ONGLET, 'bureau'); toast('Nouvelle partie : même scénario, même graine. À vous d’autres choix.', 'info'); break;
      }
      case 'mission-differer': etat = differerMission(etat); ctx.focusApres = 'h-mission'; break;
      case 'presidence': {
        // Campagne présidentielle : président·e fictif·ve, mandat à partir de mai 2027, gouvernement du parti choisi, temps continu (en pause au départ)
        const parti = ctx.partis.find((p) => p.id === action.parti);
        if (!parti) throw new Error('Choisissez une famille politique.');
        etat = creerPartie({ joueur: { nom: action.nom, parti: parti.id, role: 'president', ideologie: { ...parti.positions } }, situation: ctx.situation, dateDepart: '2027-05-01', regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage, politiques: ctx.politiques, partis: ctx.partis, objectifs: ctx.objectifs, economie: ctx.economie, pays: ctx.pays, graine: action.graine ?? ((Date.now() ^ (Math.random() * 2 ** 32)) >>> 0) });
        ctx.presidence = null; ctx.brouillonPLF = null; ctx.region = null; ctx.onglet = 'monde'; ecrire(CLE_ONGLET, 'monde'); if (ctx.monde) ctx.monde.cadrage = cadrageInitial(ctx.monde.donnees); break;
      }
      case 'nommer': etat = nommerGouvernement(etat, action.parti, donnees); ctx.focusApres = 'h-gouv'; break;
      case 'horloge': {
        // L'horloge ne touche jamais à l'état du jeu : elle ne fait que décider quand jouer un mois (dispatch « suivant »)
        if (!ctx.horloge) return;
        if (action.action === 'basculer') { const r = raisonPause(etat); if (!ctx.horloge.marche && r) { toast(`Le temps reste en pause : ${r}`); return; } ctx.horloge = basculer(ctx.horloge); }
        else if (action.action === 'pause') ctx.horloge = pauser(ctx.horloge);
        else if (action.action === 'vitesse') ctx.horloge = changerVitesse(ctx.horloge, action.vitesse);
        return afficher({ focus: false });
      }
      case 'nouvelle': {
        etat = creerPartie({ joueur: action.joueur, situation: ctx.situation, regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage, politiques: ctx.politiques, partis: ctx.partis, objectifs: ctx.objectifs, economie: ctx.economie, pays: ctx.pays, graine: (Date.now() ^ (Math.random() * 2 ** 32)) >>> 0 });
        ctx.brouillon = null; ctx.brouillonPLF = null; break;
      }
      case 'reprendre': {
        const brut = lire(CLE);
        if (!brut) throw new Error('Aucune sauvegarde trouvée.');
        etat = assurerTerritoires(importerPartie(brut), donnees); break;
      }
      case 'importer': etat = assurerTerritoires(importerPartie(action.texte), donnees); toast('Sauvegarde importée.', 'info'); break;
      case 'onglet':
        ctx.onglet = action.onglet; ecrire(CLE_ONGLET, action.onglet);
        if (action.region) ctx.region = action.region;
        // Carte du monde : rejoindre directement le territoire demandé (navigation de carte, hors état de simulation)
        if (action.onglet === 'monde' && action.region && ctx.monde) ctx.monde.cadrage = cadrageRegion(ctx.monde.donnees, action.region, ctx.monde.ratio);
        if (action.onglet === 'monde' && action.pays && ctx.monde) { ctx.paysSel = action.pays; ctx.modeMonde = 'partenaires'; ctx.monde.cadrage = cadragePays(ctx.monde.donnees, action.pays, ctx.monde.ratio); }
        if (action.cible) ctx.focusApres = { gouvernement: 'h-gouv', evenement: 'h-ev', temps: 'horloge-bascule', scenario: 'h-scenario', initiative: 'h-init' }[action.cible] ?? null;
        if (action.vue) ctx.vue = action.vue;
        if (action.decisions) ctx.decisions = action.decisions; // filtre posé par une piste du mandat
        afficher({ focus: !!action.haut }); if (action.haut) window.scrollTo(0, 0); return;
      case 'region': ctx.region = action.id; return afficher({ focus: false });
      case 'ui': Object.assign(ctx, action.patch); return afficher({ focus: false });
      case 'projet': etat = lancerProjet(etat, action.projetId, action.regionId, donnees); if (etat.mission?.statut === 'en_cours') ctx.focusApres = 'h-mission'; if (etat.scenario?.statut === 'en_cours' && action.regionId === etat.scenario.region) ctx.focusApres = 'h-scenario'; break;
      case 'politique': etat = engagerPolitique(etat, action.id, donnees); break;
      case 'investissement': etat = lancerInvestissement(etat, action.id, donnees); break;
      case 'accord': etat = proposerAccord(etat, action.pays, action.accord, donnees); break;
      case 'sanction': etat = sanctionner(etat, action.pays, donnees); break;
      case 'lever-sanctions': etat = leverSanctions(etat, action.pays, donnees); break;
      case 'initiative': etat = repondreInitiative(etat, action.index, donnees); break;
      case 'pays': ctx.paysSel = action.id; ctx.modeMonde = 'partenaires'; return afficher({ focus: false });
      case 'proposer': etat = proposerLoi(etat, action.loi, donnees); break;
      case 'amender': etat = amenderTexte(etat, donnees); break;
      case '493': etat = recourir493(etat, donnees); break;
      case 'negocier': etat = negocierAccord(etat, action.parti, donnees); break;
      case 'campagne': etat = actionCampagne(etat, action.action, donnees); break;
      case 'candidat': etat = seDeclarerCandidat(etat, donnees); break;
      case 'dissolution': etat = proposerDissolution(etat, donnees); break;
      case 'evenement': etat = resoudreEvenement(etat, action.index, donnees); break;
      case 'plf-deposer': etat = deposerPLF(etat, action.plf ?? ctx.brouillonPLF); ctx.brouillonPLF = null; break;
      case 'plf-493': etat = recourir493PLF(etat); ctx.confirm493 = false; break;
      case 'suivant': ctx.groupesAvant = etat.groupes ?? null; etat = tourSuivant(etat, donnees); if (ctx.horloge && !action.horloge) ctx.horloge = reinitialiserMois(ctx.horloge); if (etat.scenario?.statut === 'termine' && etatPrecedent.scenario?.statut === 'en_cours') { ctx.scenarioReplie = false; ctx.focusApres = 'h-scenario'; } if (ctx.horloge && raisonPause(etat)) ctx.horloge = pauser(ctx.horloge); break;
      case 'exporter': telecharger(exporterPartie(etat), `hemicycle-mois-${etat.tour}.json`); return;
      case 'rejouer': etat = null; ecrire(CLE, ''); try { localStorage.removeItem(CLE); } catch { /* ignoré */ } return aller('accueil');
      default: throw new Error(`Action inconnue : ${action.type}`);
    }
    const cible = !etat ? 'accueil' : etat.fin ? 'fin' : 'tableau';
    // Temps continu : horloge en pause pour une nouvelle partie ou une reprise ; absente hors du tableau
    if (['presidence', 'nouvelle', 'decouverte', 'rejouer-scenario', 'relever', 'reprendre', 'importer'].includes(action.type)) ctx.horloge = etat?.joueur?.role === 'president' ? horlogeInitiale() : null;
    if (cible !== ecran || ['nouvelle', 'decouverte', 'presidence', 'rejouer-scenario', 'relever', 'reprendre', 'importer'].includes(action.type)) aller(cible);
    else afficher({ focus: false });
    // Confirmation : ce qui a été engagé, la ressource consommée, la prochaine étape (lu dans l'état avant / après)
    const message = confirmation(action, etatPrecedent, etat, ctx);
    if (message) toast(message, 'info');
    // Sauvegarde uniquement après un rendu réussi (une partie corrompue n'écrase pas la bonne)
    if (etat) ecrire(CLE, JSON.stringify(etat));
    if (etat?.fin) enregistrerClassement(etat);
  } catch (e) {
    if (etat !== etatPrecedent || ecran !== ecranPrecedent) {
      etat = etatPrecedent; ecran = ecranPrecedent;
      try { afficher({ focus: false }); } catch { /* ignoré */ }
    }
    toast(e.message || String(e));
  }
}

// ---------- Temps continu (boucle d'affichage) ----------
// L'horloge pure (moteur) décide des pas ; ici on mesure le temps réel, on joue au plus un mois par pas,
// on met en pause en arrière-plan et on n'effectue aucun rattrapage au retour. Les règles restent dans tourSuivant.
let derniereMesure = null;
function boucleTemps(maintenant) {
  if (derniereMesure == null) derniereMesure = maintenant;
  const dt = Math.min(1000, maintenant - derniereMesure); // un intervalle réel long (onglet inactif) ne vaut jamais plus d'une seconde
  derniereMesure = maintenant;
  if (ctx.horloge?.marche && ecran === 'tableau' && etat && !etat.fin && !document.hidden) {
    const r = avancer(ctx.horloge, dt);
    ctx.horloge = r.horloge;
    if (r.pas) dispatch({ type: 'suivant', horloge: true }); // pas d'horloge : la progression est déjà remise à zéro par avancer()
    else { const texte = `jour ${jourDuMois(ctx.horloge)}`; document.querySelectorAll('[data-jour]').forEach((el) => { if (el.textContent !== texte) el.textContent = texte; }); }
  }
  requestAnimationFrame(boucleTemps);
}
requestAnimationFrame(boucleTemps);
// Arrière-plan : pause (le joueur reprend lui-même, sans rattrapage)
document.addEventListener('visibilitychange', () => { if (document.hidden && ctx.horloge?.marche) { ctx.horloge = pauser(ctx.horloge); derniereMesure = null; if (ecran === 'tableau') afficher({ focus: false }); } });
// Raccourcis : Espace (pause / lecture), + et − (vitesse), hors champs de saisie
document.addEventListener('keydown', (e) => {
  if (!ctx.horloge || ecran !== 'tableau' || e.target.closest('input, textarea, select, [contenteditable]')) return;
  if (e.key === ' ' && !e.target.closest('button, a, summary')) { e.preventDefault(); dispatch({ type: 'horloge', action: 'basculer' }); }
  else if (e.key === '+' || e.key === '=') dispatch({ type: 'horloge', action: 'vitesse', vitesse: Math.min(3, ctx.horloge.vitesse + 1) });
  else if (e.key === '-') dispatch({ type: 'horloge', action: 'vitesse', vitesse: Math.max(1, ctx.horloge.vitesse - 1) });
});

async function init() {
  try {
    [ctx.partis, ctx.lois, ctx.situation, ctx.senat, ctx.politiciens, ctx.calendrier, ctx.evenements, ctx.regions, ctx.projets, ctx.carte, ctx.finances, ctx.groupes, ctx.groupesEquilibrage, ctx.politiques, ctx.objectifs, ctx.mission, ctx.scenario, ctx.carteMonde, ctx.economie, ctx.pays] = await Promise.all([
      chargerJson('./data/parties.json'), chargerJson('./data/laws.json'), chargerJson('./data/situation.json'), chargerJson('./data/senat.json'), chargerJson('./data/politicians.json'), chargerJson('./data/calendrier.json'), chargerJson('./data/events.json'), chargerJson('./data/regions.json'), chargerJson('./data/projets.json'), chargerJson('./data/carte-regions.json'), chargerJson('./data/finances.json'), chargerJson('./data/groupes.json'), chargerJson('./data/groupes-equilibrage.json'), chargerJson('./data/politiques.json'), chargerJson('./data/objectifs.json'), chargerJson('./data/mission.json'), chargerJson('./data/scenario.json'), chargerJson('./data/carte-monde.json'), chargerJson('./data/economie.json'), chargerJson('./data/pays.json'),
    ]);
  } catch (e) {
    racine.innerHTML = '<p role="alert" class="p-4 border-l-4 border-rouge bg-white">Impossible de charger les données du jeu. Servez le site via un serveur HTTP.</p>';
    return;
  }
  // Carte du monde : données géographiques et cadrage courant (navigation de carte, jamais sauvegardée dans la partie)
  ctx.monde = { donnees: ctx.carteMonde, cadrage: cadrageInitial(ctx.carteMonde), ratio: 1.5 };
  // Défi reçu par lien (#defi=...) : écran d'accueil du défi, puis hash nettoyé.
  const code = location.hash.slice(1).split('&').find((p) => p.startsWith('defi='));
  if (code !== undefined) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignoré */ }
    try {
      const defi = decoderDefi(decodeURIComponent(code.slice(5)));
      if (!ctx.partis.some((p) => p.id === defi.joueur.parti)) throw new Error('Défi invalide : parti inconnu.');
      ctx.defi = defi; ecran = 'defi';
    } catch (e) { toast(e.message || 'Défi invalide.'); }
  }
  afficher({ focus: false });
}
init();

// PWA (E6) : service worker pour jouer hors ligne après une première visite.
// Désactivé en local sur file:// ; les erreurs d'enregistrement n'empêchent jamais de jouer.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* jeu jouable sans cache */ }); });
}
