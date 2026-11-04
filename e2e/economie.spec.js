// Économie (lot 2) : identifier une dépendance, lancer un investissement, attendre son effet, comprendre le résultat.
import { test, expect } from '@playwright/test';
import { ouvrirOnglet } from './aide.js';

const CLE = 'hemicycle.save';
const sauve = (page) => page.evaluate((c) => JSON.parse(localStorage.getItem(c)), CLE);
const vis = (loc) => loc.locator('visible=true').first();
const moisSuivant = (page) => vis(page.getByRole('button', { name: 'Mois suivant' })).click();

async function campagne(page) {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Campagne présidentielle' }).click();
  await page.getByRole('radio', { name: /^EPR ·/ }).check();
  await page.getByRole('button', { name: 'Commencer le mandat' }).click();
  await expect(page.locator('#monde')).toBeVisible();
}

test('dépendance identifiable → investissement lancé (coût, délai) → capacité et explication après le délai', async ({ page }) => {
  await campagne(page);
  // La dépendance énergétique est visible dans le cap (Monde) et dans l'onglet Économie
  await expect(page.locator('#monde')).toContainText(/Dépendance aux importations : Énergie/);
  await ouvrirOnglet(page, 'Économie');
  const eco = page.getByRole('region', { name: /Économie réelle/ });
  await expect(eco).toBeVisible();
  await expect(page.getByRole('list', { name: 'Alertes économiques' })).toContainText(/Dépendance aux importations : Énergie/);
  await expect(page.locator('[data-filiere=energie]')).toContainText(/Dépendance nette/);
  // Lancer les stocks stratégiques (10 mois) : coût affiché avant, confirmation après
  const carte = page.getByRole('list', { name: 'Investissements possibles' }).locator('li', { hasText: 'Stocks stratégiques' });
  await expect(carte).toContainText(/2 Md€ sur 10 mois/);
  await carte.getByRole('button', { name: 'Lancer' }).click();
  await expect(page.locator('#toasts')).toContainText(/Investissement lancé : Stocks stratégiques/);
  await expect(page.getByRole('list', { name: 'Investissements engagés' })).toContainText(/Stocks stratégiques.*En chantier/);
  let e = await sauve(page);
  expect(e.economie.investissements).toHaveLength(1);
  expect(e.joueur.capital).toBe(3);
  expect(e.effetsEnCours.some((x) => x.source === 'investissement:stocks-strategiques' && x.indicateur === 'deficit')).toBe(true);
  // Le même investissement n'est plus proposé ; la dépendance n'est plus une alerte (action en cours)
  await expect(page.getByRole('list', { name: 'Investissements possibles' })).not.toContainText('Stocks stratégiques');
  await expect(page.getByRole('list', { name: 'Alertes économiques' })).toHaveCount(0);
  // Passer les mois jusqu'à la mise en service (événements : réponse par défaut au passage du mois)
  for (let m = 0; m < 10; m++) await moisSuivant(page);
  e = await sauve(page);
  expect(e.tour).toBe(10);
  expect(e.economie.investissements[0].statut).not.toBe('chantier');
  expect(e.journal.some((j) => /Stocks stratégiques.*mise en service/.test(j.texte))).toBe(true);
  await ouvrirOnglet(page, 'Économie');
  await expect(page.getByRole('list', { name: 'Investissements engagés' })).toContainText(/Stocks stratégiques/);
  await expect(page.getByRole('list', { name: 'Investissements engagés' })).not.toContainText(/En chantier/);
});

test('Décisions : les investissements figurent au catalogue avec leur fiche ; refus expliqué sans gouvernement', async ({ page }) => {
  await campagne(page);
  await ouvrirOnglet(page, 'Décisions');
  await page.locator('#f-secteur').selectOption('energie');
  const carte = page.locator('li', { hasText: 'Parcs éoliens en mer' }).first();
  await expect(carte).toContainText(/8,00 Md€/);
  await carte.getByText('Fiche détaillée').click();
  await expect(carte).toContainText(/capacité Énergie/);
  await expect(carte).toContainText(/24 mois de chantier/);
  await expect(carte.getByRole('button', { name: 'Lancer' })).toBeEnabled();
  // Sans gouvernement : bouton désactivé avec la raison
  await page.evaluate((c) => { const e = JSON.parse(localStorage.getItem(c)); e.gouvernement.statut = 'renverse'; localStorage.setItem(c, JSON.stringify(e)); }, CLE);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await ouvrirOnglet(page, 'Décisions');
  await page.locator('#f-secteur').selectOption('energie');
  await page.locator('#f-stat-bloque').click();
  const bloquee = page.locator('li', { hasText: 'Parcs éoliens en mer' }).first();
  await expect(bloquee.getByRole('button', { name: 'Lancer' })).toBeDisabled();
  await expect(bloquee).toContainText(/relèvent du gouvernement/);
});

test('mobile : onglet Économie dans « Plus », cartes lisibles sans débordement, cibles ≥ 44 px', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mise en page mobile');
  await campagne(page);
  await ouvrirOnglet(page, 'Économie');
  await expect(page.getByRole('region', { name: /Économie réelle/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  for (const b of await page.locator('[data-investir]').all()) { const r = await b.boundingBox(); expect(r.height).toBeGreaterThanOrEqual(44); }
});
