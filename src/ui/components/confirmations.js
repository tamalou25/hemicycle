// Confirmation après une action : ce qui a réellement été engagé, la ressource consommée, la prochaine étape.
// Présentation seulement : tout est lu dans l'état avant / après (et le journal), rien n'est calculé ici.
import { fmt, MOIS } from '../util.js';
import { dateDuTour, groupesAssemblee, voterCensure } from '../../engine/index.js';

const moisDe = (etat, tour) => { const d = dateDuTour({ ...etat, tour }); return `${MOIS[d.mois - 1]} ${d.annee}`; };
const capital = (a, b) => (a.joueur.capital !== b.joueur.capital ? `Capital ${a.joueur.capital} → ${b.joueur.capital}.` : '');
const enveloppe = (a, b) => (a.finances && b.finances && a.finances.enveloppe !== b.finances.enveloppe ? `Enveloppe ${fmt(a.finances.enveloppe, 2)} → ${fmt(b.finances.enveloppe, 2)} Md€.` : '');
const dernier = (b) => b.journal[b.journal.length - 1]?.texte ?? '';

/** Message de confirmation pour une action réussie, ou null si rien à dire (navigation, sauvegarde…). */
export function confirmation(action, avant, apres, ctx) {
  if (!avant || !apres || avant === apres) return null;
  const parts = [];
  switch (action.type) {
    case 'projet': {
      const p = apres.projets[apres.projets.length - 1];
      const def = ctx.projets?.projets.find((x) => x.id === p?.projetId);
      const region = ctx.regions?.regions.find((r) => r.id === p?.region)?.nom ?? p?.region;
      parts.push(`Projet lancé : ${def?.titre ?? p?.projetId} (${region}).`, enveloppe(avant, apres), `Mise en service prévue en ${moisDe(apres, p.service)}${p.retard ? `, avec ${p.retard} mois de retard (aléa)` : ''}, puis montée en charge sur ${def?.montee_mois ?? '?'} mois.`);
      break;
    }
    case 'proposer': {
      const loi = ctx.lois?.find((l) => l.id === apres.texte?.loiId);
      parts.push(`Déposé : « ${loi?.titre ?? action.loi} ».`, capital(avant, apres), 'Vote à l’Assemblée à la fin du mois (Mois suivant). Vous pouvez encore amender (Parlement) ou engager le 49.3 (Décisions).');
      break;
    }
    case 'amender':
      parts.push(`Amendement de compromis : orientation ${avant.texte.orientation > 0 ? '+' : ''}${avant.texte.orientation} → ${apres.texte.orientation > 0 ? '+' : ''}${apres.texte.orientation}, effets ${Math.round(apres.texte.facteur * 100)} %.`, capital(avant, apres), 'Le vote de fin de mois porte sur le texte amendé.');
      break;
    case '493': {
      const AN = ctx.partis ? groupesAssemblee(ctx.partis, apres.sieges) : [];
      const c = AN.length ? voterCensure(apres, AN) : null;
      parts.push('49.3 engagé : le texte sera adopté sans vote si la motion de censure échoue.', `Popularité ${fmt(avant.indicateurs.popularite)} → ${fmt(apres.indicateurs.popularite)} %, tensions ${fmt(avant.indicateurs.tensions, 0)} → ${fmt(apres.indicateurs.tensions, 0)}.`, c ? `Censure estimée : ${c.pour} voix sur ${c.requis} requises (estimation).` : '');
      break;
    }
    case 'negocier': parts.push(dernier(apres), capital(avant, apres), apres.accords.length > avant.accords.length ? 'Le groupe votera avec vous (+0,15 de soutien) pendant 6 mois.' : 'Un accord reste possible avec un groupe plus proche (voir l’écart dans Décisions).'); break;
    case 'politique': {
      const p = apres.politiques[apres.politiques.length - 1];
      const def = ctx.politiques?.politiques.find((x) => x.id === p?.id);
      parts.push(`Programme engagé : ${def?.titre ?? p?.id}.`, capital(avant, apres), `${fmt(def?.cout_annuel_md ?? 0, 1)} Md€/an inscrits au déficit dès le mois prochain. Premiers effets en ${moisDe(apres, p.enService)}.`, def?.contrepartie ? `Contrepartie : ${def.contrepartie}` : '');
      break;
    }
    case 'investissement': {
      const x = apres.economie.investissements[apres.economie.investissements.length - 1];
      const def = ctx.economie?.investissements.find((i) => i.id === x?.id);
      parts.push(`Investissement lancé : ${def?.titre ?? x?.id}.`, capital(avant, apres), `${fmt(def?.cout_total_md ?? 0, 0)} Md€ étalés sur le chantier, au déficit dès le mois prochain. Capacité en hausse à partir de ${moisDe(apres, x.enService)} (Économie).`, def?.contrepartie ? `Contrepartie : ${def.contrepartie}` : '');
      break;
    }
    case 'evenement': {
      const ev = ctx.evenements?.find((e) => e.id === avant.evenement);
      const choix = ev?.choix?.[action.index];
      parts.push(`Réponse : ${choix?.libelle ?? '—'}.`, capital(avant, apres), enveloppe(avant, apres), choix?.effets?.length ? 'Les effets nationaux commencent le mois prochain ; les effets locaux sont immédiats (Carte).' : 'Les effets locaux sont immédiats (Carte).');
      break;
    }
    case 'plf-deposer': parts.push(dernier(apres), 'Sans majorité, le budget est rejeté et une loi spéciale reconduit les crédits ; le 49.3 reste possible (Budget).'); break;
    case 'plf-493': parts.push('49.3 engagé sur le budget : adopté sauf motion de censure en fin de mois.'); break;
    case 'candidat': parts.push('Vous êtes candidat·e à la présidentielle (simulation). Une victoire termine la partie ; une défaite coûte de la popularité.'); break;
    case 'campagne': parts.push(dernier(apres), capital(avant, apres)); break;
    case 'nommer': parts.push(dernier(apres), capital(avant, apres), 'Vos mesures gouvernementales sont de nouveau possibles. Le temps peut reprendre.'); break;
    case 'dissolution': parts.push(dernier(apres), capital(avant, apres)); break;
    case 'suivant': {
      if (apres.gouvernement?.statut === 'renverse' && avant.gouvernement?.statut !== 'renverse') return 'Votre gouvernement est renversé : nommez un Premier ministre (Bureau). Le temps est en pause.';
      const fini = apres.scenario?.statut === 'termine' && avant.scenario?.statut === 'en_cours';
      if (fini) return 'Le scénario est conclu : lisez la conclusion en tête du Bureau.';
      if (apres.evenement && apres.evenement !== avant.evenement) { const ev = ctx.evenements?.find((e) => e.id === apres.evenement); return `${moisDe(apres, apres.tour)} : « ${ev?.titre ?? 'un événement'} » attend votre réponse.`; }
      return null;
    }
    default: return null;
  }
  return parts.filter(Boolean).join(' ');
}
