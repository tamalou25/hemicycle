// Repères (initiation progressive, lot 5) : une courte explication la première fois qu'un système apparaît, à fermer d'un geste.
// Présentation seulement ; la liste des repères vus est propre à l'appareil (localStorage), jamais dans l'état de simulation.
import { esc } from '../util.js';

const CLE = 'hemicycle.reperes';
const lireVus = () => { try { const v = JSON.parse(localStorage.getItem(CLE)); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; } };
const ecrireVus = (l) => { try { localStorage.setItem(CLE, JSON.stringify(l.slice(-50))); } catch { /* stockage indisponible */ } };

export const REPERES = {
  monde: ['Votre carte', 'La France est au centre : touchez une région pour ses projets. « Votre cap » liste ce qui presse et vos objectifs ; « À surveiller » signale ce qui mérite un œil. Le temps avance quand vous appuyez sur Lecture et s’arrête de lui-même quand une réponse est attendue.'],
  economie: ['Lire l’économie', 'Quatre filières produisent ; ce qui manque est importé. Une dépendance élevée n’est pas une pénurie : elle devient un problème si un partenaire ferme le robinet. Un investissement coûte pendant des années avant de livrer sa capacité.'],
  partenaires: ['Lire les partenaires', 'Chaque pays a une relation avec la France qui tend vers une cible expliquée dans sa fiche. Un accord demande une relation suffisante et du capital ; une sanction coupe les échanges des deux côtés. Une action diplomatique par mois.'],
  initiative: ['Une initiative étrangère', 'Un partenaire vous propose, vous demande ou vous impose quelque chose. Chaque réponse montre son coût et ce qu’elle change (relation, échanges). Sans réponse, la dernière option s’applique à la fin du mois.'],
  defense: ['Lire la défense', 'La disponibilité des forces combine équipement et préparation, moins les engagements en cours. Elle conditionne vos options en cas de crise. Les programmes coûtent avant de livrer ; le budget de défense nourrit l’équipement.'],
};

/** Encadré repère (vide si déjà vu). */
export function repere(id) {
  const r = REPERES[id];
  if (!r || lireVus().includes(id)) return '';
  return `<aside class="mb-3 border-l-4 border-bleu bg-[#E8F1FB] rounded-r-lg p-3 flex items-start justify-between gap-3" aria-label="Repère : ${esc(r[0])}" data-repere="${esc(id)}">
    <p class="text-sm"><strong>${esc(r[0])}.</strong> ${esc(r[1])}</p>
    <button type="button" class="btn btn-s shrink-0 !min-h-[44px]" data-repere-ok="${esc(id)}">Compris</button></aside>`;
}

export function brancherReperes(racine) {
  racine.querySelectorAll('[data-repere-ok]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.repereOk;
    ecrireVus([...new Set([...lireVus(), id])]);
    racine.querySelector(`[data-repere="${CSS.escape(id)}"]`)?.remove();
  }));
}
