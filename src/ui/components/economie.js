// Onglet « Économie » : filières (production, capacité, demande), dépendances, commerce extérieur et investissements.
// Présentation seulement : tout vient du moteur (bilanCommerce, alertesEconomie, catalogue des décisions).
import { esc, fmt } from '../util.js';
import { bilanCommerce, alertesEconomie, dateDuTour, ORDRE_FILIERES, raisonRefusInvestissement, coutAnnuelChantier } from '../../engine/index.js';
import { MOIS } from '../util.js';

const pct = (v) => `${Math.round(v * 100)} %`;
const STATUT = { chantier: 'En chantier', montee: 'Montée en charge', service: 'En service' };

function jauge(label, v, max = 120) {
  const w = Math.max(0, Math.min(100, (v / max) * 100));
  return `<div class="flex items-center gap-2 text-xs"><span class="w-20 shrink-0 text-doux">${esc(label)}</span>
    <div class="grow h-2 bg-[#E3E8F0] rounded overflow-hidden" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.round(v)}"><div class="h-full bg-bleu" style="width:${w}%"></div></div>
    <strong class="tabular-nums w-10 text-right">${Math.round(v)}</strong></div>`;
}

function carteFiliere(id, f, eco, etat) {
  const deps = Object.entries(etat.economie.filieres[id]?.dependances ?? {}).filter(([, c]) => c > 0).map(([g, c]) => `${eco.filieres[g]?.nom ?? g} (${pct(c)})`);
  const alerte = f.penurie >= eco.parametres.seuil_alerte_penurie;
  const dependante = f.dependance >= eco.parametres.seuil_dependance;
  return `<li class="bg-carte border ${alerte ? 'border-rouge' : 'border-bord'} rounded-lg p-3" data-filiere="${esc(id)}">
    <div class="flex items-start justify-between gap-2"><h3 class="font-serif font-bold text-base">${esc(f.nom)}</h3>
      ${alerte ? `<span class="text-xs font-bold text-white bg-rouge rounded px-2 py-0.5">Pénurie ${pct(f.penurie)}</span>` : dependante ? '<span class="text-xs font-bold border border-laiton text-[#9A6700] bg-[#FFF4D6] rounded px-2 py-0.5">Dépendante</span>' : '<span class="text-xs text-succes font-bold">Couverte</span>'}</div>
    <div class="space-y-1 mt-2">${jauge('Production', f.production)}${jauge('Capacité', f.capacite)}${jauge('Demande', f.demande)}</div>
    <dl class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs mt-2">
      <dt class="text-doux">Besoin couvert</dt><dd class="tabular-nums">${pct(f.couverture)}</dd>
      <dt class="text-doux">Dépendance nette</dt><dd class="tabular-nums">${pct(f.dependance)}</dd>
      <dt class="text-doux">Importations</dt><dd class="tabular-nums">${fmt(f.importations, 0)} Md€/an</dd>
      <dt class="text-doux">Exportations</dt><dd class="tabular-nums">${fmt(f.exportations, 0)} Md€/an</dd>
      <dt class="text-doux">Solde</dt><dd class="tabular-nums ${f.solde < 0 ? 'text-rouge' : 'text-succes'}">${f.solde > 0 ? '+' : ''}${fmt(f.solde, 0)} Md€/an</dd>
    </dl>
    ${deps.length ? `<p class="text-xs mt-1"><span class="text-doux">Dépend de :</span> ${esc(deps.join(', '))}</p>` : ''}
    <p class="text-xs mt-1"><span class="text-doux">Partenaires :</span> ${f.partenaires.map((p) => `${esc(p.nom)}${p.disponibilite < 1 || p.debouches < 1 ? ' <span class="text-rouge">(restreint)</span>' : ''}`).join(', ') || '—'}</p>
  </li>`;
}

export function ongletEconomie(etat, ctx) {
  const eco = ctx.economie;
  if (!etat.economie || !eco) return '<p class="p-4 border border-bord bg-carte rounded-lg text-doux" role="status">Économie indisponible pour cette partie.</p>';
  const donnees = { economie: eco };
  const b = bilanCommerce(etat, donnees);
  const alertes = alertesEconomie(etat, donnees);
  const d = dateDuTour(etat);
  const lances = etat.economie.investissements ?? [];
  const enCours = lances.map((x) => { const inv = eco.investissements.find((i) => i.id === x.id); const dd = dateDuTour({ ...etat, tour: x.enService }); return `<li class="text-sm py-1 border-b border-bord last:border-0"><strong>${esc(inv?.titre ?? x.id)}</strong> <span class="text-xs text-doux">· ${esc(STATUT[x.statut] ?? x.statut)}${x.statut === 'chantier' ? ` · capacité à partir de ${MOIS[dd.mois - 1]} ${dd.annee} · ${fmt(coutAnnuelChantier(inv), 1)} Md€/an pendant le chantier` : x.statut === 'service' ? ` · entretien ${fmt(inv?.entretien_md ?? 0, 1)} Md€/an` : ''}</span></li>`; }).join('');
  const dispo = eco.investissements.filter((inv) => !lances.some((x) => x.id === inv.id));
  const cartesInv = dispo.map((inv, i) => { const raison = raisonRefusInvestissement(etat, inv, eco); return `<li class="bg-carte border border-bord rounded-lg p-3 filet-laiton">
      <h4 class="font-serif font-bold text-base">${esc(inv.titre)}</h4>
      <p class="text-sm text-doux mt-1">${esc(inv.description)}</p>
      <p class="text-xs mt-1">Filière ${esc(eco.filieres[inv.filiere]?.nom ?? inv.filiere)} · ${fmt(inv.cout_total_md, 0)} Md€ sur ${inv.delai_mois} mois (${fmt(coutAnnuelChantier(inv), 1)} Md€/an) · puis ${fmt(inv.entretien_md ?? 0, 1)} Md€/an · ${inv.gain_capacite ? `capacité +${inv.gain_capacite}` : 'pas de production'}${inv.amortissement_penurie ? ` · pénuries amorties de ${pct(inv.amortissement_penurie)}` : ''}${inv.reduction_dependance ? ` · dépendance ${Object.entries(inv.reduction_dependance).map(([g, v]) => `à ${eco.filieres[g]?.nom ?? g} −${Math.round(v * 100)} pts`).join(', ')}` : ''} · 1 capital</p>
      <p class="text-xs text-doux mt-1"><strong>Contrepartie :</strong> ${esc(inv.contrepartie)}</p>
      <div class="mt-2"><button type="button" class="btn btn-s" data-investir="${esc(inv.id)}" ${raison ? `disabled aria-describedby="r-inv-${i}"` : ''}>Lancer</button>${raison ? `<p id="r-inv-${i}" class="text-xs text-doux mt-1">${esc(raison)}</p>` : ''}</div></li>`; }).join('');
  return `<section aria-labelledby="h-eco">
    <h2 id="h-eco" class="font-serif font-bold text-xl mb-1">Économie réelle <span class="font-sans font-normal text-sm text-doux">· ${esc(MOIS[d.mois - 1])} ${d.annee}</span></h2>
    <p class="text-sm text-doux mb-3">Quatre filières produisent pour l’intérieur et l’exportation ; ce qui manque est importé. Une pénurie fait monter les prix et freine les filières qui en dépendent. Indices : 100 = niveau de 2025.</p>
    <ul class="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-3" aria-label="Commerce extérieur">
      <li>Exportations <strong class="tabular-nums">${fmt(b.exportations, 0)}</strong> Md€/an</li>
      <li>Importations <strong class="tabular-nums">${fmt(b.importations, 0)}</strong> Md€/an</li>
      <li>Solde <strong class="tabular-nums ${b.solde < 0 ? 'text-rouge' : 'text-succes'}">${b.solde > 0 ? '+' : ''}${fmt(b.solde, 0)}</strong> Md€/an</li>
    </ul>
    ${alertes.length ? `<ul class="space-y-1 mb-3" aria-label="Alertes économiques">${alertes.map((a) => `<li class="text-sm border-l-4 ${a.type === 'penurie' ? 'border-rouge bg-[#FBE4E4]' : 'border-laiton bg-[#FFF4D6]'} p-2 rounded-r"><strong>${esc(a.titre)}.</strong> ${esc(a.texte)}</li>`).join('')}</ul>` : '<p class="text-sm text-succes mb-3">Aucune pénurie ni dépendance critique ce mois-ci.</p>'}
    <ul class="grid md:grid-cols-2 gap-3 mb-4" aria-label="Filières">${ORDRE_FILIERES.filter((f) => b.filieres[f]).map((f) => carteFiliere(f, b.filieres[f], eco, etat)).join('')}</ul>
    <section aria-labelledby="h-inv" class="mb-4">
      <h3 id="h-inv" class="font-serif font-bold text-lg border-b border-bord pb-1 mb-2">Investissements</h3>
      <ul class="mb-3" aria-label="Investissements engagés">${enCours || '<li class="text-sm text-doux">Aucun investissement engagé.</li>'}</ul>
      <ul class="grid md:grid-cols-2 gap-3" aria-label="Investissements possibles">${cartesInv}</ul>
    </section>
    <p class="text-xs text-doux">Échanges : ordres de grandeur 2025 (Banque de France, Douanes) ; capacités, dépendances et investissements : paramètres d’équilibrage. Les partenaires restreints le sont par la diplomatie.</p>
  </section>`;
}

export function brancherEconomie(racine, dispatch) {
  racine.querySelectorAll('[data-investir]').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'investissement', id: b.dataset.investir })));
}
