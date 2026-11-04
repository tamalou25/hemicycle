// Fiche comparable d'une décision (présentation de ficheDecision du moteur), repliable, accessible au clavier et au tactile.
import { esc, fmt } from '../util.js';
import { META } from './jauge.js';

const NOMS = { emploi: 'Emploi (région)', sante: 'Accès aux soins (région)', transports: 'Transports (région)' };
const nomIndicateur = (k) => (k.startsWith('secteur:') ? `Niveau du secteur ${k.slice(8)}` : NOMS[k] ?? META[k]?.label ?? k);
const signe = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v), Math.abs(v) < 1 ? 2 : 1)}`;
/** null = non chiffré par le modèle (ex. une loi : son coût passe par le déficit), 0 = vraiment gratuit. */
const montant = (v) => (v == null ? 'non chiffré (effets via le déficit)' : v ? `${fmt(v, 2)} Md€` : 'aucun');
const sens = (f) => (f === true ? 'favorable' : f === false ? 'défavorable' : 'à surveiller');

export function blocFiche(f, id) {
  const effets = f.effets.map((e) => `<li><strong>${esc(nomIndicateur(e.indicateur))}</strong> : ${signe(e.valeur)}${e.regional ? ' pts' : ''}
      <span class="text-doux">(${e.delaiMois ? `après ${e.delaiMois} mois, ` : ''}réparti sur ${e.duree} mois · ${sens(e.favorable)})</span></li>`).join('');
  const lignes = [
    ['Coût immédiat', montant(f.coutImmediatMd)],
    ['Coût chaque année', montant(f.coutAnnuelMd)],
    ['Capital politique', f.capital == null ? 'non chiffré' : f.capital ? `${f.capital}` : 'aucun'],
    ['Premiers effets', f.premiersEffets],
    ...(f.beneficiaires ? [['Bénéficiaires', f.beneficiaires]] : []),
  ].map(([k, v]) => `<dt class="text-doux">${k}</dt><dd>${esc(v)}</dd>`).join('');
  const liens = [...(f.mission ? ['la mission en cours'] : []), ...f.objectifs];
  return `<details class="mt-1 text-sm" id="${esc(id)}"><summary class="cursor-pointer text-bleu underline min-h-[44px] flex items-center">Fiche détaillée</summary>
    <p class="mt-1">${esc(f.description)}</p>
    <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 mt-2">${lignes}</dl>
    <p class="font-semibold mt-2">Effets théoriques si l’action aboutit</p>
    <ul class="list-disc pl-5">${effets}</ul>
    <p class="text-xs text-doux">Ils s’ajoutent à la conjoncture, aux autres décisions et aux événements, dans les bornes du modèle : le total futur n’est pas garanti.</p>
    ${f.contrepartie ? `<p class="mt-1"><strong>Contrepartie :</strong> ${esc(f.contrepartie)}</p>` : ''}
    <p class="mt-1"><strong>Étape institutionnelle :</strong> ${esc(f.institution)}</p>
    ${f.risques.length ? `<ul class="list-disc pl-5 mt-1">${f.risques.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
    ${f.blocage ? `<p class="mt-1 text-rouge"><strong>Bloqué :</strong> ${esc(f.blocage)}</p>` : ''}
    <p class="mt-1"><strong>Lien avec vos buts :</strong> ${liens.length ? esc(liens.join(', ')) : 'aucun objectif sélectionné directement concerné'}.</p>
  </details>`;
}
