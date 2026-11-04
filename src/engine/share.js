// Partage de parties sans serveur (Phase 6).
// Un « défi » = graine + configuration du personnage : même défi + mêmes choix = même partie.
import { AXES, COMPETENCES, ROLES } from './constants.js';

const VERSION_DEFI = 1;

// base64url compatible navigateur et Node (via TextEncoder/btoa)
const versB64 = (txt) => btoa(String.fromCharCode(...new TextEncoder().encode(txt))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const depuisB64 = (b64) => {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(s, (c) => c.charCodeAt(0)));
};

/** Encode un défi en chaîne courte (pour l'URL : #defi=...). */
export function encoderDefi({ graine, joueur }) {
  const j = {
    n: joueur.nom, a: joueur.age, p: joueur.parti, r: joueur.role, e: joueur.politicienId ?? undefined,
    i: AXES.map((x) => joueur.ideologie?.[x] ?? 0), c: COMPETENCES.map((x) => joueur.competences?.[x] ?? 50),
    o: Array.isArray(joueur.objectifs) && joueur.objectifs.length ? joueur.objectifs : undefined, // objectifs de mandat (même défi = même barème)
    m: joueur.mission ? 1 : undefined, // ancienne découverte (v13) : même mission d'initiation
    s: joueur.scenario ? 1 : undefined, // partie courte « Douze mois pour convaincre » : même scénario
  };
  return versB64(JSON.stringify({ v: VERSION_DEFI, g: graine >>> 0, j }));
}

/** Décode et valide un défi. Lève une erreur explicite si invalide. */
export function decoderDefi(code) {
  let d;
  try { d = JSON.parse(depuisB64(String(code).trim())); } catch { throw new Error('Code de défi illisible.'); }
  if (d?.v !== VERSION_DEFI || !Number.isInteger(d.g) || !d.j?.n) throw new Error('Code de défi invalide.');
  const borne = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));
  return {
    graine: d.g >>> 0,
    joueur: {
      nom: String(d.j.n).slice(0, 60), age: borne(d.j.a, 18, 99), parti: String(d.j.p),
      role: ROLES.includes(d.j.r) ? d.j.r : 'depute', politicienId: d.j.e ?? null,
      ideologie: Object.fromEntries(AXES.map((x, k) => [x, borne(d.j.i?.[k], -100, 100)])),
      competences: Object.fromEntries(COMPETENCES.map((x, k) => [x, borne(d.j.c?.[k] ?? 50, 0, 100)])),
      // Objectifs : validés ensuite par normaliserObjectifs (ids connus, nombre exact) à la création de la partie
      ...(d.j.m === 1 ? { mission: true } : {}),
      ...(d.j.s === 1 ? { scenario: true } : {}),
      ...(Array.isArray(d.j.o) ? { objectifs: d.j.o.filter((x) => typeof x === 'string').map((x) => x.slice(0, 40)).slice(0, 5) } : {}),
    },
  };
}

/** Graine initiale d'une partie (pour la retrouver après coup). */
export const graineInitiale = (etat) => etat.graineInitiale ?? null;

// ---------- Classement local (pur : la persistance est faite par l'UI) ----------

export const TAILLE_CLASSEMENT = 10;

/** Entrée de classement à partir d'une partie terminée. */
export function entreeClassement(etat, bilan, date) {
  return {
    nom: etat.joueur.nom, parti: etat.joueur.parti, role: etat.joueur.role,
    titre: bilan.titre, score: bilan.score, mois: etat.tour, fin: etat.fin?.type ?? null, date,
  };
}

/** Insère une entrée et garde les 10 meilleurs scores (à score égal : partie la plus longue). */
export function ajouterAuClassement(classement, entree) {
  return [...(Array.isArray(classement) ? classement : []), entree]
    .filter((e) => e && typeof e.score === 'number')
    .sort((a, b) => b.score - a.score || b.mois - a.mois)
    .slice(0, TAILLE_CLASSEMENT);
}
