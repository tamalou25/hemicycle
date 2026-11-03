// Store minimal, routeur d'écrans et sauvegarde automatique.
import { creerPartie, proposerLoi, amenderTexte, recourir493, negocierAccord, tourSuivant, actionCampagne, seDeclarerCandidat, proposerDissolution, exporterPartie, importerPartie } from './engine/index.js';
import { render as accueil } from './ui/screens/accueil.js';
import { render as choixElu } from './ui/screens/choixElu.js';
import { render as creation } from './ui/screens/creation.js';
import { render as tableau } from './ui/screens/tableau.js';
import { render as fin } from './ui/screens/fin.js';
import { toast } from './ui/components/toast.js';

const CLE = 'hemicycle.save';
const CLE_ACCORD = 'hemicycle.accord';
const ECRANS = { accueil, creation, choixElu, tableau, fin };

const lire = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };

async function chargerJson(chemin) {
  const r = await fetch(new URL(chemin, import.meta.url));
  if (!r.ok) throw new Error(`Chargement impossible : ${chemin}`);
  return r.json();
}

const racine = document.getElementById('app');
let etat = null;
let ecran = 'accueil';
const ctx = { accepte: lire(CLE_ACCORD) === '1', filtreTheme: '', brouillon: null, sauvegardeExiste: !!lire(CLE) };

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
  ecran = nom;
  racine.setAttribute('aria-label', nom);
  afficher();
  window.scrollTo(0, 0);
}

export function dispatch(action) {
  try {
    const donnees = { lois: ctx.lois, partis: ctx.partis, senat: ctx.senat, politiciens: ctx.politiciens, calendrier: ctx.calendrier };
    switch (action.type) {
      case 'accepter': ctx.accepte = action.valeur; ecrire(CLE_ACCORD, action.valeur ? '1' : '0'); return afficher();
      case 'aller': return aller(action.ecran);
      case 'filtre': ctx.filtreTheme = action.theme; return afficher();
      case 'nouvelle': {
        etat = creerPartie({ joueur: action.joueur, situation: ctx.situation, graine: (Date.now() ^ (Math.random() * 2 ** 32)) >>> 0 });
        ctx.brouillon = null; break;
      }
      case 'reprendre': {
        const brut = lire(CLE);
        if (!brut) throw new Error('Aucune sauvegarde trouvée.');
        etat = importerPartie(brut); break;
      }
      case 'importer': etat = importerPartie(action.texte); toast('Sauvegarde importée.', 'info'); break;
      case 'proposer': etat = proposerLoi(etat, action.loi, donnees); break;
      case 'amender': etat = amenderTexte(etat, donnees); break;
      case '493': etat = recourir493(etat, donnees); break;
      case 'negocier': etat = negocierAccord(etat, action.parti, donnees); break;
      case 'campagne': etat = actionCampagne(etat, action.action, donnees); break;
      case 'candidat': etat = seDeclarerCandidat(etat, donnees); toast('Vous êtes candidat·e (simulation).', 'info'); break;
      case 'dissolution': etat = proposerDissolution(etat, donnees); break;
      case 'suivant': etat = tourSuivant(etat, donnees); break;
      case 'exporter': telecharger(exporterPartie(etat), `hemicycle-mois-${etat.tour}.json`); return;
      case 'rejouer': etat = null; ecrire(CLE, ''); try { localStorage.removeItem(CLE); } catch { /* ignoré */ } return aller('accueil');
      default: throw new Error(`Action inconnue : ${action.type}`);
    }
    if (etat) ecrire(CLE, JSON.stringify(etat));
    const cible = !etat ? 'accueil' : etat.fin ? 'fin' : 'tableau';
    if (cible !== ecran || action.type === 'nouvelle' || action.type === 'reprendre' || action.type === 'importer') aller(cible);
    else afficher({ focus: false });
  } catch (e) {
    toast(e.message || String(e));
  }
}

async function init() {
  try {
    [ctx.partis, ctx.lois, ctx.situation, ctx.senat, ctx.politiciens, ctx.calendrier] = await Promise.all([
      chargerJson('./data/parties.json'), chargerJson('./data/laws.json'), chargerJson('./data/situation.json'), chargerJson('./data/senat.json'), chargerJson('./data/politicians.json'), chargerJson('./data/calendrier.json'),
    ]);
  } catch (e) {
    racine.innerHTML = '<p role="alert" class="p-4 border-l-4 border-rouge bg-white">Impossible de charger les données du jeu. Servez le site via un serveur HTTP.</p>';
    return;
  }
  afficher({ focus: false });
}
init();
