// Cap du mandat : brief en tête du Bureau, pistes vers les leviers, ancienne partie sans objectifs.
import { test, expect } from '@playwright/test';
import { ouvrirOnglet, toutAfficherDecisions as ouvrirTout } from './aide.js';

const CLE = 'hemicycle.save';

async function nouvellePartie(page, role) {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await expect(page.getByRole('region', { name: 'Le but' })).toContainText('60 mois');
  await expect(page.getByRole('region', { name: 'Le but' })).toContainText('Choisissez vos actions du mois, puis passez au mois suivant');
  await page.getByRole('button', { name: 'Partie personnalisée' }).click();
  await page.getByLabel(/^Nom/).fill('Cap');
  await page.getByLabel(role === 'pm' ? /Premier ministre/ : /Député/).check();
  await page.getByRole('button', { name: 'Commencer' }).click();
  return page.getByRole('region', { name: 'Votre mandat' });
}

const etatSauve = (page) => page.evaluate((c) => localStorage.getItem(c), CLE);

test('brief avant les indicateurs, objectifs choisis, fins et déroulé', async ({ page }) => {
  const brief = await nouvellePartie(page, 'depute');
  // Le brief précède « État du pays »
  const ordre = await page.evaluate(() => {
    const b = document.getElementById('brief-mandat'), p = document.getElementById('h-pays');
    return !!(b.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(ordre).toBe(true);
  await expect(brief.locator('[data-objectif]')).toHaveCount(3);
  for (const id of ['chomage', 'deficit', 'territoires']) await expect(brief.locator(`[data-objectif=${id}]`)).toBeVisible();
  await expect(brief).toContainText('+8 points');
  await expect(brief).toContainText('une cible atteinte aujourd’hui peut encore se perdre');
  await brief.getByText('Comment jouer un mois').click();
  await expect(brief.getByRole('listitem').filter({ hasText: 'Passez au mois suivant' })).toBeVisible();
  await expect(brief).toContainText('popularité passe sous 8 %');
  await expect(brief).not.toContainText('censure'); // député : pas exposé à la censure
});

test('député : pistes vers Décisions (filtre adapté, ancien filtre levé) et Carte, sans modifier la partie', async ({ page }) => {
  const brief = await nouvellePartie(page, 'depute');
  const avant = await etatSauve(page);
  // Le levier « déficit » d'un député ne pointe pas vers le Budget
  await expect(brief.locator('[data-objectif=deficit]').getByRole('button')).toHaveText('Décisions →');
  await expect(brief.locator('[data-objectif=deficit]')).toContainText('Budget du gouvernement');
  // Ancien filtre restrictif posé dans Décisions : statut « Fait » (aucune décision au départ)
  await ouvrirOnglet(page, 'Décisions');
  await page.locator('#f-stat-fait').click();
  await expect(page.locator('#f-stat-fait')).toHaveAttribute('aria-pressed', 'true');
  await ouvrirOnglet(page, 'Bureau');
  await page.getByRole('region', { name: 'Votre mandat' }).locator('[data-objectif=chomage]').getByRole('button', { name: /Faire reculer le chômage/ }).click();
  await expect(page.locator('#panneau')).toHaveAttribute('aria-labelledby', 'tab-decisions');
  await expect(page.locator('#f-stat-fait')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#f-secteur')).toHaveValue('emploi');
  await expect(page.locator('#panneau [data-decision]').first()).toBeVisible();
  expect(await etatSauve(page)).toBe(avant);

  await ouvrirOnglet(page, 'Bureau');
  await page.getByRole('button', { name: /Ouvrir Carte : Améliorer la vie/ }).click();
  await expect(page.getByRole('heading', { name: 'Carte des territoires' })).toBeVisible();
  expect(await etatSauve(page)).toBe(avant);
});

test('Premier ministre : déficit → Budget ; ancien filtre de statut ne masque pas les leviers', async ({ page }) => {
  const brief = await nouvellePartie(page, 'pm');
  const avant = await etatSauve(page);
  await expect(brief.locator('[data-objectif=deficit]').getByRole('button')).toHaveText('Budget →');
  await brief.locator('[data-objectif=deficit]').getByRole('button').click();
  await expect(page.getByRole('heading', { name: 'Projet de loi de finances' })).toBeVisible();
  expect(await etatSauve(page)).toBe(avant);
});

test('après un mois et après reprise : même brief, compteur de mois à jour', async ({ page }) => {
  const brief = await nouvellePartie(page, 'pm');
  await page.getByRole('button', { name: /Mois suivant/ }).locator('visible=true').first().click();
  // Événement éventuel : le brief reste lisible ; on attend la mise à jour du compteur
  await expect(brief.locator('#mois-restants')).toHaveText('59 mois restants sur 60.');
  const texte = await brief.locator('ul').first().innerText();
  await page.reload();
  await page.getByRole('checkbox').first().check().catch(() => {});
  await page.getByRole('button', { name: /Reprendre/ }).click();
  const apres = page.getByRole('region', { name: 'Votre mandat' });
  await expect(apres.locator('#mois-restants')).toHaveText('59 mois restants sur 60.');
  expect(await apres.locator('ul').first().innerText()).toBe(texte);
});

test('ancienne partie sans objectifs : explication, repères, sauvegarde inchangée', async ({ page }) => {
  await nouvellePartie(page, 'depute');
  await page.evaluate((c) => { const e = JSON.parse(localStorage.getItem(c)); e.objectifs = []; localStorage.setItem(c, JSON.stringify(e)); }, CLE);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  const brief = page.getByRole('region', { name: 'Votre mandat' });
  await expect(brief.locator('#sans-objectifs')).toContainText('commencé avant les objectifs');
  await expect(brief.locator('[data-objectif]')).toHaveCount(0);
  await expect(brief.getByRole('button', { name: /Ouvrir Décisions/ })).toBeVisible();
  await expect(brief.getByRole('button', { name: /Ouvrir Budget/ })).toHaveCount(0); // député
  const objectifs = await page.evaluate((c) => JSON.parse(localStorage.getItem(c)).objectifs, CLE);
  expect(objectifs).toEqual([]);
});

test('brief : clavier, cibles de 44 px, pas de débordement', async ({ page }) => {
  const brief = await nouvellePartie(page, 'pm');
  const boutons = brief.getByRole('button');
  for (const h of await boutons.evaluateAll((l) => l.map((b) => b.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
  await boutons.first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#panneau')).toHaveAttribute('aria-labelledby', 'tab-decisions');
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(deborde).toBe(false);
});

/** Nouvelle partie avec des objectifs choisis (décoche les défauts). */
async function partieAvecObjectifs(page, role, ids) {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Partie personnalisée' }).click();
  await page.getByLabel(/^Nom/).fill('Cap');
  await page.getByLabel(role === 'pm' ? /Premier ministre/ : /Député/).check();
  for (const v of await page.locator('input[name=objectif]:checked').evaluateAll((l) => l.map((c) => c.value))) await page.locator(`input[name=objectif][value=${v}]`).uncheck();
  for (const id of ids) await page.locator(`input[name=objectif][value=${id}]`).check();
  await page.getByRole('button', { name: 'Commencer' }).click();
  return page.getByRole('region', { name: 'Votre mandat' });
}

test('« Investir dans l’avenir » : arrivée sur les programmes, compteur exact, programme engageable', async ({ page }) => {
  const brief = await partieAvecObjectifs(page, 'pm', ['programmes', 'chomage', 'deficit']);
  const avant = await etatSauve(page);
  const ligne = brief.locator('[data-objectif=programmes]');
  const n = Number((await ligne.textContent()).match(/(\d+) programmes? disponibles?/)[1]);
  expect(n).toBeGreaterThan(0);
  await ligne.getByRole('button').click();
  await expect(page.getByRole('button', { name: /Programmes uniquement : retirer ce filtre/ })).toBeVisible();
  // Toutes les cartes affichées sont des programmes ; le premier « Engager » est visible sans dépliage
  const engager = page.locator('#panneau [data-decision]').filter({ hasText: 'Engager' });
  await expect(engager.first()).toBeVisible();
  await expect(engager.first()).toBeEnabled();
  await expect(page.locator('#panneau [data-decision]').filter({ hasText: 'Proposer' })).toHaveCount(0);
  // Le compteur du brief correspond aux programmes réellement engageables
  await ouvrirTout(page);
  expect(await engager.evaluateAll((l) => l.filter((b) => !b.disabled).length)).toBe(n);
  expect(await etatSauve(page)).toBe(avant);
  // Le filtre se retire
  await page.locator('#f-type').click();
  await expect(page.locator('#f-type')).toHaveCount(0);
});

test('« Aucun territoire abandonné » : ouvre la région la plus faible même après une autre sélection', async ({ page }) => {
  const brief = await partieAvecObjectifs(page, 'depute', ['aucun-abandon', 'chomage', 'deficit']);
  // Région et indice attendus, avec la même règle d'égalité (ordre des indices, puis identifiant)
  const attendu = await page.evaluate((c) => {
    const t = JSON.parse(localStorage.getItem(c)).territoires; let m = null;
    for (const id of Object.keys(t).sort()) for (const i of ['emploi', 'sante', 'transports']) if (!m || t[id][i] < m.v) m = { id, i, v: t[id][i] };
    return m;
  }, CLE);
  expect(attendu.id).not.toBe('bretagne');
  // Sélection préalable de la Bretagne sur la carte
  await ouvrirOnglet(page, 'Carte');
  await page.locator('[data-region=bretagne]').first().click();
  await expect(page.locator('[data-region=bretagne]').first()).toHaveAttribute('aria-pressed', 'true');
  await ouvrirOnglet(page, 'Bureau');
  await page.getByRole('region', { name: 'Votre mandat' }).locator('[data-objectif=aucun-abandon]').getByRole('button').click();
  await expect(page.locator(`#vue-${attendu.i}`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(`[data-region=${attendu.id}]`).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-region=bretagne]').first()).toHaveAttribute('aria-pressed', 'false');
});
