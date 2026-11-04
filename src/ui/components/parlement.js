import { esc } from '../util.js';
import { ETAPES, groupesAssemblee, groupesSenat, accordActif, apercuAmendement } from '../../engine/index.js';

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

function texteEnCours(etat, lois, ctx) {
  const t = etat.texte;
  if (!t) return '<p class="text-sm text-doux">Aucun texte en cours. Proposez une loi depuis l’onglet Décisions.</p>';
  const loi = lois.find((l) => l.id === t.loiId);
  const peutAmender = !etat.fin && !etat.actionCeMois && t.etape !== 'conseil' && t.amendements < 2 && etat.joueur.capital >= 1;
  const refusAmend = etat.fin ? 'La partie est terminée.'
    : t.etape === 'conseil' ? 'Le Conseil constitutionnel ne peut être amendé.'
      : etat.actionCeMois ? 'Vous avez déjà agi au Parlement ce mois-ci.'
        : t.amendements >= 2 ? 'Le texte a déjà été amendé deux fois.'
          : etat.joueur.capital < 1 ? 'Capital politique insuffisant.' : null;
  return `<h3 class="font-serif font-bold text-lg">${esc(loi?.titre ?? t.loiId)}</h3>
    ${frise(t)}
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      <dt>Orientation actuelle</dt><dd class="font-semibold tabular-nums">${t.orientation > 0 ? '+' : ''}${esc(t.orientation)}</dd>
      <dt>Effets</dt><dd class="font-semibold tabular-nums">${Math.round(t.facteur * 100)} %</dd>
      <dt>Amendements</dt><dd class="font-semibold">${esc(t.amendements)} sur 2${t.recours493 ? ' · 49.3 engagé' : ''}</dd>
    </dl>
    ${apercu(etat, ctx)}
    <div class="flex gap-2 flex-wrap mt-3">
      <button type="button" class="btn btn-s" id="btn-amender" data-amender ${peutAmender ? '' : 'disabled aria-describedby="r-amender"'}>Amender (1 capital)</button>
    </div>
    ${peutAmender ? '' : raison('r-amender', refusAmend)}${raison('r-493', r493)}
    <p class="text-xs text-doux mt-2">Le 49.3 se trouve dans l’onglet Décisions. Le vote a lieu en fin de mois, au passage au mois suivant.</p>`;
}

/** Ce que changerait un amendement de compromis : vote estimé avant / après, effets conservés (aperçu pur du moteur). */
function apercu(etat, ctx) {
  const a = ctx?.partis ? apercuAmendement(etat, { partis: ctx.partis, senat: ctx.senat, lois: ctx.lois }) : null;
  if (!a || !a.avant) return '';
  const v = (x) => `${x.pour} pour, ${x.contre} contre (${x.adoptee ? 'adoption probable' : 'rejet probable'})`;
  return `<div class="mt-2 text-sm border border-bord rounded p-2 bg-white" id="apercu-amendement">
    <p class="font-semibold">Si vous amendez (compromis)</p>
    <ul class="list-disc pl-5"><li>Vote estimé ${a.chambre === 'senat' ? 'au Sénat' : 'à l’Assemblée'} : <span class="tabular-nums">${esc(v(a.avant))}</span> → <strong class="tabular-nums">${esc(v(a.apres))}</strong></li>
      <li>Orientation ${a.orientationAvant > 0 ? '+' : ''}${a.orientationAvant} → ${a.orientation > 0 ? '+' : ''}${a.orientation} ; effets conservés : ${a.effetsRestants} %</li></ul>
    <p class="text-xs text-doux">Estimation d’aujourd’hui, pas un résultat : accords et relations peuvent encore bouger.</p></div>`;
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
  const actifs = (etat.accords ?? []).filter((a) => a.jusqua >= etat.tour);
  const liste = actifs.map((a) => {
    const p = partis.find((x) => x.id === a.parti);
    return `<li class="text-sm">${esc(p?.sigle ?? a.parti)} : encore <strong>${a.jusqua - etat.tour}</strong> mois</li>`;
  }).join('') || '<li class="text-sm text-doux">Aucun accord en vigueur.</li>';
  return `<ul class="mb-2 space-y-1">${liste}</ul>
    <p class="text-xs text-doux">Un accord dure 6 mois. Pour en négocier un, voir l’onglet Décisions.</p>`;
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
      <div class="bg-carte border border-bord rounded-lg p-4"><h3 class="font-semibold text-sm text-doux uppercase tracking-wide mb-1">Texte en cours</h3><div aria-live="polite">${texteEnCours(etat, lois, ctx)}</div></div>
      <div class="bg-carte border border-bord rounded-lg p-4 space-y-4">
        ${etat.sieges ? '<p class="text-xs"><span class="font-bold uppercase border-2 border-encre bg-[#FFF3C4] rounded px-1.5 py-0.5">Simulation</span> Assemblée issue des législatives simulées</p>' : ''}
        ${hemicycle('Assemblée nationale', groupesAssemblee(partis, etat.sieges), couleurDe, estAllie, joueurParti)}
        ${hemicycle('Sénat', groupesSenat(senat, partis), couleurDe, estAllie, joueurParti)}
      </div>
    </div>
    <div class="bg-carte border border-bord rounded-lg p-4 mt-4"><h3 class="font-serif font-bold text-lg mb-2">Accords</h3>${accords(etat, partis)}</div>
  </section>`;
}
