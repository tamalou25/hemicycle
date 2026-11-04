// Store minimal, routeur d'écrans et sauvegarde automatique.
import { assurerTerritoires, lancerProjet, creerPartie, proposerLoi, amenderTexte, recourir493, negocierAccord, tourSuivant, actionCampagne, seDeclarerCandidat, proposerDissolution, decoderDefi, evaluerFin, entreeClassement, ajouterAuClassement, exporterPartie, importerPartie, resoudreEvenement, deposerPLF, recourir493PLF, engagerPolitique, differerMission } from './engine/index.js';
import { render as accueil } from './ui/screens/accueil.js';
import { render as choixElu } from './ui/screens/choixElu.js';
import { render as creation } from './ui/screens/creation.js';
import { render as decouverte } from './ui/screens/decouverte.js';
import { render as tableau } from './ui/screens/tableau.js';
import { render as fin } from './ui/screens/fin.js';
import { render as defi } from './ui/screens/defi.js';
import { render as classement } from './ui/screens/classement.js';
import { toast } from './ui/components/toast.js';

const CLE = 'hemicycle.save';
const CLE_ACCORD = 'hemicycle.accord';
const CLE_CLASSEMENT = 'hemicycle.classement';
const CLE_IDS = 'hemicycle.classement.ids';
const CLE_ONGLET = 'hemicycle.onglet';
const ECRANS = { accueil, creation, decouverte, choixElu, tableau, fin, defi, classement };

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
    const donnees = { lois: ctx.lois, partis: ctx.partis, senat: ctx.senat, politiciens: ctx.politiciens, calendrier: ctx.calendrier, evenements: ctx.evenements, regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage, politiques: ctx.politiques, mission: ctx.mission };
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
        etat = creerPartie({ ...ctx.defi, mission: ctx.defi.joueur.mission ? ctx.mission : null, situation: ctx.situation, regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage, politiques: ctx.politiques, partis: ctx.partis, objectifs: ctx.objectifs });
        ctx.defi = null; ctx.brouillon = null; ctx.brouillonPLF = null; break;
      }
      case 'abandonnerDefi': ctx.defi = null; return aller('accueil');
      case 'filtre': ctx.filtreTheme = action.theme; return afficher();
      case 'decouverte': {
        // Partie réelle : PM fictif, positions du parti choisi (sources publiques), objectifs par défaut, mission d'initiation
        const parti = ctx.partis.find((p) => p.id === action.parti);
        if (!parti) throw new Error('Choisissez une famille politique.');
        etat = creerPartie({ joueur: { nom: action.nom, parti: parti.id, role: 'premier_ministre', ideologie: { ...parti.positions } }, situation: ctx.situation, regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage, politiques: ctx.politiques, partis: ctx.partis, objectifs: ctx.objectifs, mission: ctx.mission, graine: (Date.now() ^ (Math.random() * 2 ** 32)) >>> 0 });
        ctx.decouverte = null; ctx.brouillonPLF = null; ctx.onglet = 'bureau'; ecrire(CLE_ONGLET, 'bureau'); break;
      }
      case 'mission-differer': etat = differerMission(etat); ctx.focusApres = 'h-mission'; break;
      case 'nouvelle': {
        etat = creerPartie({ joueur: action.joueur, situation: ctx.situation, regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage, politiques: ctx.politiques, partis: ctx.partis, objectifs: ctx.objectifs, graine: (Date.now() ^ (Math.random() * 2 ** 32)) >>> 0 });
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
        if (action.vue) ctx.vue = action.vue;
        if (action.decisions) ctx.decisions = action.decisions; // filtre posé par une piste du mandat
        afficher({ focus: !!action.haut }); if (action.haut) window.scrollTo(0, 0); return;
      case 'region': ctx.region = action.id; return afficher({ focus: false });
      case 'ui': Object.assign(ctx, action.patch); return afficher({ focus: false });
      case 'projet': etat = lancerProjet(etat, action.projetId, action.regionId, donnees); toast('Projet lancé.', 'info'); if (etat.mission?.statut === 'en_cours') ctx.focusApres = 'h-mission'; break;
      case 'politique': etat = engagerPolitique(etat, action.id, donnees); toast('Programme engagé.', 'info'); break;
      case 'proposer': etat = proposerLoi(etat, action.loi, donnees); break;
      case 'amender': etat = amenderTexte(etat, donnees); break;
      case '493': etat = recourir493(etat, donnees); break;
      case 'negocier': etat = negocierAccord(etat, action.parti, donnees); break;
      case 'campagne': etat = actionCampagne(etat, action.action, donnees); break;
      case 'candidat': etat = seDeclarerCandidat(etat, donnees); toast('Vous êtes candidat·e (simulation).', 'info'); break;
      case 'dissolution': etat = proposerDissolution(etat, donnees); break;
      case 'evenement': etat = resoudreEvenement(etat, action.index, donnees); break;
      case 'plf-deposer': etat = deposerPLF(etat, action.plf ?? ctx.brouillonPLF); ctx.brouillonPLF = null; toast('Projet de loi de finances déposé.', 'info'); break;
      case 'plf-493': etat = recourir493PLF(etat); ctx.confirm493 = false; break;
      case 'suivant': ctx.groupesAvant = etat.groupes ?? null; etat = tourSuivant(etat, donnees); break;
      case 'exporter': telecharger(exporterPartie(etat), `hemicycle-mois-${etat.tour}.json`); return;
      case 'rejouer': etat = null; ecrire(CLE, ''); try { localStorage.removeItem(CLE); } catch { /* ignoré */ } return aller('accueil');
      default: throw new Error(`Action inconnue : ${action.type}`);
    }
    const cible = !etat ? 'accueil' : etat.fin ? 'fin' : 'tableau';
    if (cible !== ecran || action.type === 'nouvelle' || action.type === 'decouverte' || action.type === 'relever' || action.type === 'reprendre' || action.type === 'importer') aller(cible);
    else afficher({ focus: false });
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

async function init() {
  try {
    [ctx.partis, ctx.lois, ctx.situation, ctx.senat, ctx.politiciens, ctx.calendrier, ctx.evenements, ctx.regions, ctx.projets, ctx.carte, ctx.finances, ctx.groupes, ctx.groupesEquilibrage, ctx.politiques, ctx.objectifs, ctx.mission] = await Promise.all([
      chargerJson('./data/parties.json'), chargerJson('./data/laws.json'), chargerJson('./data/situation.json'), chargerJson('./data/senat.json'), chargerJson('./data/politicians.json'), chargerJson('./data/calendrier.json'), chargerJson('./data/events.json'), chargerJson('./data/regions.json'), chargerJson('./data/projets.json'), chargerJson('./data/carte-regions.json'), chargerJson('./data/finances.json'), chargerJson('./data/groupes.json'), chargerJson('./data/groupes-equilibrage.json'), chargerJson('./data/politiques.json'), chargerJson('./data/objectifs.json'), chargerJson('./data/mission.json'),
    ]);
  } catch (e) {
    racine.innerHTML = '<p role="alert" class="p-4 border-l-4 border-rouge bg-white">Impossible de charger les données du jeu. Servez le site via un serveur HTTP.</p>';
    return;
  }
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
