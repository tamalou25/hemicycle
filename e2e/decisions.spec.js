// Onglet Décisions : filtres, engagement d'un programme, raison d'un blocage.
import { test, expect } from '@playwright/test';
import { ouvrirOnglet } from './aide.js';

async function nouvellePartie(page) {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Créer mon personnage' }).click();
  await page.getByLabel(/^Nom/).fill('Testeur');
  await page.getByLabel(/Premier ministre/).check();
  await page.getByRole('button', { name: 'Commencer' }).click();
}

test('décisions : filtrer, engager un programme, voir une raison de blocage', async ({ page }, info) => {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  await nouvellePartie(page);

  await ouvrirOnglet(page, 'Décisions');
  await expect(page.getByRole('heading', { name: 'Décisions', level: 2 })).toBeVisible();
  const nationales = page.getByRole('button', { name: /^Politiques nationales/ });
  await nationales.click();
  await expect(nationales).toHaveAttribute('aria-pressed', 'true');

  const carte = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: "Aide à l'apprentissage" }) });
  await expect(carte).toBeVisible();
  await carte.getByRole('button', { name: 'Engager' }).click();
  await expect(carte).toHaveCount(0); // sort de « Disponibles »

  await page.getByRole('button', { name: /^En cours/ }).click();
  await expect(carte).toBeVisible();
  await expect(carte.getByText('En cours', { exact: true })).toBeVisible();

  // Une décision bloquée affiche sa raison
  await page.getByRole('button', { name: /^Bloquées/ }).click();
  const bouton = page.locator('button[data-decision][disabled]').first();
  await expect(bouton).toBeVisible();
  const raison = await bouton.getAttribute('aria-describedby');
  await expect(page.locator(`#${raison}`)).not.toHaveText('');

  // État vide
  await page.getByRole('button', { name: /^Faites/ }).click();
  await page.getByRole('button', { name: /^Négociations/ }).click();
  await expect(page.getByText('Aucune décision ne correspond à ces filtres.')).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(erreurs, 'aucune erreur JavaScript').toEqual([]);
});
