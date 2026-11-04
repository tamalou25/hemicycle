// Difficulté et prise en main (lot 5) : choix expliqué, conservé par la sauvegarde et le défi ; repères à fermer ; bilan de fin enrichi.
import { test, expect } from '@playwright/test';
import { ouvrirOnglet } from './aide.js';

const CLE = 'hemicycle.save';
const sauve = (page) => page.evaluate((c) => JSON.parse(localStorage.getItem(c)), CLE);

test('campagne : Facile conseillé et coché, tableau comparatif, Difficile choisi → sauvegarde, en-tête, lien de défi', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Campagne présidentielle' }).click();
  const facile = page.getByRole('radio', { name: /Facile/ });
  await expect(facile).toBeChecked();
  await expect(page.getByText('conseillé pour débuter')).toBeVisible();
  await page.getByText('Comparer les trois niveaux').click();
  await expect(page.getByRole('table', { name: 'Paramètres par niveau' })).toContainText(/Capital politique gagné chaque mois/);
  await page.getByRole('radio', { name: /Difficile/ }).check();
  await page.getByRole('radio', { name: /^EPR ·/ }).check();
  await page.getByRole('button', { name: 'Commencer le mandat' }).click();
  await expect(page.locator('#monde')).toBeVisible();
  // Repère de la carte, fermé d'un geste et non réaffiché après rechargement
  const rep = page.getByRole('complementary', { name: /Repère : Votre carte/ });
  await expect(rep).toBeVisible();
  await rep.getByRole('button', { name: 'Compris' }).click();
  await expect(rep).toHaveCount(0);
  let e = await sauve(page);
  expect(e.difficulte).toBe('difficile');
  await ouvrirOnglet(page, 'Bureau');
  await expect(page.locator('[data-difficulte]')).toContainText(/difficulté Difficile/);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await expect(page.getByRole('complementary', { name: /Repère : Votre carte/ })).toHaveCount(0);
  // Lien de défi : le niveau est transmis
  await ouvrirOnglet(page, 'Chronologie');
  await page.getByRole('button', { name: 'Partager ce défi' }).locator('visible=true').first().click();
  const lien = await page.locator('#lien-defi').inputValue();
  await page.evaluate(() => localStorage.clear());
  await page.goto('about:blank'); // un simple changement de hash ne recharge pas l'application
  await page.goto(`/${lien.slice(lien.indexOf('#'))}`);
  await expect(page.getByRole('heading', { name: 'Un défi vous attend' })).toBeVisible();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: /Relever le défi/ }).click();
  await expect(page.locator('#monde, #panneau')).toBeVisible();
  e = await sauve(page);
  expect(e.difficulte).toBe('difficile');
  expect(e.joueur.role).toBe('president');
});

test('ancienne partie sans niveau : jouable, affichée « Normal » ; bilan de fin avec sections économie, diplomatie, défense', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Campagne présidentielle' }).click();
  await page.getByRole('radio', { name: /^EPR ·/ }).check();
  await page.getByRole('button', { name: 'Commencer le mandat' }).click();
  await expect(page.locator('#monde')).toBeVisible();
  await page.evaluate((c) => { const e = JSON.parse(localStorage.getItem(c)); e.difficulte = null; e.indicateurs.popularite = 1; localStorage.setItem(c, JSON.stringify(e)); }, CLE);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await ouvrirOnglet(page, 'Bureau');
  await expect(page.locator('[data-difficulte]')).toContainText(/difficulté Normal/);
  // Popularité sous le seuil : la fin tombe au passage du mois ; le bilan explique
  await page.getByRole('button', { name: 'Mois suivant' }).locator('visible=true').first().click();
  await expect(page.getByRole('heading', { name: 'Désavoué·e' })).toBeVisible();
  await expect(page.getByText(/Difficulté : Normal/)).toBeVisible();
  for (const t of ['Institutions', 'Économie et commerce', 'Diplomatie', 'Défense']) await expect(page.getByRole('heading', { name: t, level: 2 })).toBeVisible();
  await expect(page.getByText(/Solde commercial/)).toBeVisible();
});
