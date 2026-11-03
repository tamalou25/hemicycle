import { esc, fmt } from '../util.js';
import {
  ETAPES, groupesAssemblee, groupesSenat, accordActif, ecartIdeologique, toleranceAccord,
  raisonRefus493, raisonRefusAccord,
} from '../../engine/index.js';

const ETAPES_LIB = { assemblee: 'Assemblée', senat: 'Sénat', cmp: 'CMP', lecture_definitive: 'Lecture définitive', conseil: 'Conseil constitutionnel' };
const OPTIONNELLES = ['cmp', 'lecture_definitive'];
const ROLES_LIB = { depute: 'Député·e', premier_ministre: 'Premier ministre (fictif)' };
export const libelleRole = (r) => ROLES_LIB[r] ?? r;

const raison = (id, msg) => (msg ? `<p id="${id}" class="text-xs text-doux mt-1">${esc(msg)}</p>` : '');

/** Frise des étapes de la navette, étape courante en évidence. */
function frise(texte) {
  const idx = ETAPES.indexOf(texte.etape);
  return `<ol class="flex flex-wrap gap-1.5 my-3" aria-label="Étapes du texte">${ETAPES.map((e, i) => {
    const courante = i === idx, passee = i < idx, opt = OPTIONNELLES.includes(e);
    const cls = courante ? 'bg-encre text-white border-encre font-bold'
      : passee ? 'bg-[#E8E1CD] text-doux border-bord line-through'
        : `bg-carte text-encre border-bord ${opt ? 'border-dashed' : ''}`;
    return `<li class="text-xs px-2 py-1 rounded border ${cls}" ${courante ? 'aria-current="step"' : ''}>${i + 1}. ${esc(ETAPES_LIB[e])}${opt ? ' <span class="opacity-80">(optionnelle)</span>' : ''}</li>`;
  }).join('')}</ol>`;
}

function texteEnCours(etat, lois) {
  const t = etat.texte;
  if (!t) return '<p class="text-sm text-doux">Aucun texte en cours. Proposez une loi ci-dessous.</p>';
  const loi = lois.find((l) => l.id === t.loiId);
  const peutAmender = !etat.fin && !etat.actionCeMois && t.etape !== 'conseil' && t.amendements < 2 && etat.joueur.capital >= 1;
  const refusAmend = etat.fin ? 'La partie est terminée.'
    : t.etape === 'conseil' ? 'Le Conseil constitutionnel ne peut être amendé.'
      : etat.actionCeMois ? 'Vous avez déjà agi au Parlement ce mois-ci.'
        : t.amendements >= 2 ? 'Le texte a déjà été amendé deux fois.'
          : etat.joueur.capital < 1 ? 'Capital politique insuffisant.' : null;
  const r493 = etat.joueur.role === 'premier_ministre' ? raisonRefus493(etat) : null;
  const bouton493 = etat.joueur.role === 'premier_ministre'
    ? `<button type="button" class="btn btn-s" id="btn-493" data-493 ${r493 ? 'disabled aria-describedby="r-493"' : ''}>49.3</button>` : '';
  return `<h3 class="font-serif font-bold text-lg">${esc(loi?.titre ?? t.loiId)}</h3>
    ${frise(t)}
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      <dt>Orientation actuelle</dt><dd class="font-semibold tabular-nums">${t.orientation > 0 ? '+' : ''}${esc(t.orientation)}</dd>
      <dt>Effets</dt><dd class="font-semibold tabular-nums">${Math.round(t.facteur * 100)} %</dd>
      <dt>Amendements</dt><dd class="font-semibold">${esc(t.amendements)} sur 2${t.recours493 ? ' · 49.3 engagé' : ''}</dd>
    </dl>
    <div class="flex gap-2 flex-wrap mt-3">
      <button type="button" class="btn btn-s" id="btn-amender" data-amender ${peutAmender ? '' : 'disabled aria-describedby="r-amender"'}>Amender (1 capital)</button>
      ${bouton493}
    </div>
    ${peutAmender ? '' : raison('r-amender', refusAmend)}${raison('r-493', r493)}
    <p class="text-xs text-doux mt-2">Le vote a lieu en fin de mois, au passage au mois suivant.</p>`;
}

/** Barre empilée de l'hémicycle d'une chambre. */
function hemicycle(titre, groupes, couleurDe, estAllie, joueurParti) {
  const total = groupes.reduce((s, g) => s + g.sieges, 0) || 1;
  const tri = [...groupes].sort((a, b) => b.sieges - a.sieges);
  const barres = tri.map((g) => `<div style="width:${(g.sieges / total) * 100}%;background:${esc(couleurDe(g))}" title="${esc(g.sigle)} : ${g.sieges}"></div>`).join('');
  const lignes = tri.map((g) => {
    const moi = g.parti && g.parti === joueurParti, allie = estAllie(g);
    return `<li class="flex items-center gap-2 text-sm ${moi || allie ? 'font-semibold' : ''}">
      <span class="inline-block w-3 h-3 rounded-sm shrink-0" style="background:${esc(couleurDe(g))}" aria-hidden="true"></span>
      <span class="grow">${esc(g.sigle)}${moi ? ' ★ <span class="text-xs font-normal">votre parti</span>' : allie ? ' <span class="text-xs rounded bg-[#DCEBDD] text-[#1F6E43] px-1.5 py-0.5">allié</span>' : ''}</span>
      <span class="tabular-nums">${g.sieges}</span></li>`;
  }).join('');
  return `<div><h3 class="font-semibold mb-1">${esc(titre)} <span class="text-doux font-normal">(${total} sièges)</span></h3>
    <div class="h-5 flex rounded overflow-hidden bg-[#E8E1CD]" role="img" aria-label="${esc(titre)} : ${tri.map((g) => `${g.sigle} ${g.sieges}`).join(', ')}">${barres}</div>
    <ul class="mt-2 space-y-0.5">${lignes}</ul></div>`;
}

function accords(etat, partis) {
  const groupes = groupesAssemblee(partis);
  const tol = toleranceAccord(etat);
  const actifs = (etat.accords ?? []).filter((a) => a.jusqua >= etat.tour);
  const liste = actifs.map((a) => {
    const p = partis.find((x) => x.id === a.parti);
    return `<li class="text-sm">${esc(p?.sigle ?? a.parti)} : encore <strong>${a.jusqua - etat.tour}</strong> mois</li>`;
  }).join('') || '<li class="text-sm text-doux">Aucun accord en vigueur.</li>';
  const lignes = [...groupes].sort((a, b) => b.sieges - a.sieges).map((g) => {
    const ecart = ecartIdeologique(etat.joueur.ideologie, g.positions);
    const refus = raisonRefusAccord(etat, g.id);
    const rid = `r-acc-${esc(g.id)}`;
    const trop = ecart > tol;
    return `<li class="py-2 border-b border-bord last:border-0">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <span class="text-sm"><strong>${esc(g.sigle)}</strong> <span class="text-doux">(${g.sieges} sièges)</span><br>
          <span class="text-xs ${trop ? 'text-rouge' : 'text-[#1F6E43]'}">Écart ${fmt(ecart, 0)} / tolérance ${fmt(tol, 0)}${trop ? ' : peu probable' : ''}</span></span>
        <button type="button" class="btn btn-s" data-negocier="${esc(g.id)}" id="btn-nego-${esc(g.id)}" ${refus ? `disabled aria-describedby="${rid}"` : ''}>Négocier (2 capital)</button>
      </div>${refus ? `<p id="${rid}" class="text-xs text-doux mt-1">${esc(refus)}</p>` : ''}</li>`;
  }).join('');
  return `<h3 class="font-semibold mb-1">Accords actifs</h3><ul class="mb-3 space-y-1">${liste}</ul>
    <h3 class="font-semibold mb-1">Groupes de l’Assemblée</h3>
    <p class="text-xs text-doux mb-1">Un accord dure 6 mois. Un échec coûte 1 capital. Une négociation par mois.</p><ul>${lignes}</ul>`;
}

export function sectionParlement(etat, ctx) {
  const { lois, partis, senat } = ctx;
  const joueurParti = etat.joueur.parti;
  const couleurParti = (id) => partis.find((p) => p.id === id)?.couleur ?? '#8A8A8A';
  const couleurDe = (g) => (g.parti ? couleurParti(g.parti) : '#8A8A8A');
  const estAllie = (g) => !!g.parti && g.parti !== joueurParti && accordActif(etat, g.parti);
  return `<section aria-labelledby="h-parl" class="mb-6">
    <h2 id="h-parl" class="font-serif font-bold text-xl mb-2">Parlement</h2>
    <div class="grid lg:grid-cols-2 gap-4">
      <div class="bg-carte border border-bord rounded-lg p-4"><h3 class="font-semibold text-sm text-doux uppercase tracking-wide mb-1">Texte en cours</h3><div aria-live="polite">${texteEnCours(etat, lois)}</div></div>
      <div class="bg-carte border border-bord rounded-lg p-4 space-y-4">
        ${hemicycle('Assemblée nationale', groupesAssemblee(partis), couleurDe, estAllie, joueurParti)}
        ${hemicycle('Sénat', groupesSenat(senat, partis), couleurDe, estAllie, joueurParti)}
      </div>
    </div>
    <div class="bg-carte border border-bord rounded-lg p-4 mt-4"><h3 class="font-serif font-bold text-lg mb-2">Accords</h3>${accords(etat, partis)}</div>
  </section>`;
}
