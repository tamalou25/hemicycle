// Store minimal, routeur d'écrans et sauvegarde automatique.
import { assurerTerritoires, lancerProjet, creerPartie, proposerLoi, amenderTexte, recourir493, negocierAccord, tourSuivant, actionCampagne, seDeclarerCandidat, proposerDissolution, decoderDefi, evaluerFin, entreeClassement, ajouterAuClassement, exporterPartie, importerPartie, resoudreEvenement, deposerPLF, recourir493PLF } from './engine/index.js';
import { render as accueil } from './ui/screens/accueil.js';
import { render as choixElu } from './ui/screens/choixElu.js';
import { render as creation } from './ui/screens/creation.js';
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
const ECRANS = { accueil, creation, choixElu, tableau, fin, defi, classement };

const lire = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };

const lireJson = (k) => { try { const v = JSON.parse(lire(k)); return Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined) : []; } catch { return []; } };

// Enregistre une partie terminée au classement local, une seule fois par partie.
function enregistrerClassement(e) {
  const id = `${e.graineInitiale ?? 'x'}:${e.joueur.nom}:${e.tour}:${e.fin?.type ?? ''}`;
  const ids = lireJson(CLE_IDS).filter((x) => typeof x === 'string');
  if (ids.includes(id)) return;
  const entree = entreeClassement(e, evaluerFin(e), new Date().toISOString().slice(0, 10));
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
const ctx = { onglet: lire(CLE_ONGLET) || 'bureau', region: null, vue: 'satisfaction', accepte: lire(CLE_ACCORD) === '1', filtreTheme: '', brouillon: null, sauvegardeExiste: !!lire(CLE) };

function afficher({ focus = true } = {}) {
  const actif = document.activeElement?.id;
  const y = window.scrollY;
  ctx.sauvegardeExiste = !!lire(CLE);
  ECRANS[ecran](racine, etat, dispatch, ctx);
  window.scrollTo(0, y);
  const cible = actif && document.getElementById(actif);
  if (cible && !cible.disabled) cible.focus({ preventScroll: true });
  else if (focus) racine.focus({ preventScroll: true });
}

function telecharger(texte, nom) {
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
    const donnees = { lois: ctx.lois, partis: ctx.partis, senat: ctx.senat, politiciens: ctx.politiciens, calendrier: ctx.calendrier, evenements: ctx.evenements, regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage };
    switch (action.type) {
      case 'accepter': ctx.accepte = action.valeur; ecrire(CLE_ACCORD, action.valeur ? '1' : '0'); return afficher();
      case 'aller': return aller(action.ecran);
      case 'classement': ctx.classement = lireJson(CLE_CLASSEMENT).filter((x) => typeof x === 'object' && Number.isFinite(x.score)); ctx.confirmEffacer = false; return aller('classement');
      case 'effacerClassement':
        if (action.etape === 'confirme') { ecrire(CLE_CLASSEMENT, '[]'); ctx.classement = []; toast('Classement effacé.', 'info'); }
        ctx.confirmEffacer = action.etape === 'demande';
        return afficher({ focus: false });
      case 'relever': {
        etat = creerPartie({ ...ctx.defi, situation: ctx.situation, regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage });
        ctx.defi = null; ctx.brouillon = null; ctx.brouillonPLF = null; break;
      }
      case 'abandonnerDefi': ctx.defi = null; return aller('accueil');
      case 'filtre': ctx.filtreTheme = action.theme; return afficher();
      case 'nouvelle': {
        etat = creerPartie({ joueur: action.joueur, situation: ctx.situation, regions: ctx.regions, projets: ctx.projets, finances: ctx.finances, groupes: ctx.groupes, groupesEquilibrage: ctx.groupesEquilibrage, graine: (Date.now() ^ (Math.random() * 2 ** 32)) >>> 0 });
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
        afficher({ focus: !!action.haut }); if (action.haut) window.scrollTo(0, 0); return;
      case 'region': ctx.region = action.id; return afficher({ focus: false });
      case 'ui': Object.assign(ctx, action.patch); return afficher({ focus: false });
      case 'projet': etat = lancerProjet(etat, action.projetId, action.regionId, donnees); toast('Projet lancé.', 'info'); break;
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
    if (cible !== ecran || action.type === 'nouvelle' || action.type === 'relever' || action.type === 'reprendre' || action.type === 'importer') aller(cible);
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
    [ctx.partis, ctx.lois, ctx.situation, ctx.senat, ctx.politiciens, ctx.calendrier, ctx.evenements, ctx.regions, ctx.projets, ctx.carte, ctx.finances, ctx.groupes, ctx.groupesEquilibrage] = await Promise.all([
      chargerJson('./data/parties.json'), chargerJson('./data/laws.json'), chargerJson('./data/situation.json'), chargerJson('./data/senat.json'), chargerJson('./data/politicians.json'), chargerJson('./data/calendrier.json'), chargerJson('./data/events.json'), chargerJson('./data/regions.json'), chargerJson('./data/projets.json'), chargerJson('./data/carte-regions.json'), chargerJson('./data/finances.json'), chargerJson('./data/groupes.json'), chargerJson('./data/groupes-equilibrage.json'),
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
