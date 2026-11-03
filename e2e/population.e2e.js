import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { creerPartie } from '../src/engine/index.js';

const lire = (nom) => JSON.parse(readFileSync(new URL(`../src/data/${nom}.json`, import.meta.url)));
async function sansDebordement(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('créer, consulter les habitants, investir, avancer puis exporter et réimporter en v6', async ({ page }, testInfo) => {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (e) => { if (e.type() === 'error') erreurs.push(e.text()); });
  await page.goto('/');
  await page.locator('#accept').check();
  await page.locator('#nouvelle').click();
  await page.locator('#nom').fill('Camille Test');
  await page.getByRole('button', { name: 'Commencer', exact: true }).click();
  await page.getByRole('tab', { name: 'Population', exact: true }).click();
  await expect(page.locator('#h-population')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Retraités', exact: true })).toBeVisible();
  await sansDebordement(page);
  await page.screenshot({ path: testInfo.outputPath('population.png'), fullPage: true });
  await page.getByRole('button', { name: 'Voir les besoins et projets' }).first().click();
  await page.getByText('Habitants : besoins et confiance', { exact: true }).click();
  await expect(page.locator('#fiche').getByRole('heading', { name: 'Retraités', exact: true })).toBeVisible();
  await page.locator('[data-lancer="centres-sante"]').click();
  await page.locator('#suivant').click();
  await page.getByRole('tab', { name: 'Population', exact: true }).click();
  await page.reload();
  await page.locator('#reprendre').click();
  await expect(page.locator('#h-population')).toBeVisible();
  await sansDebordement(page);
  await page.getByRole('tab', { name: 'Chronologie', exact: true }).click();
  const attente = page.waitForEvent('download');
  await page.locator('#export').click();
  const telechargement = await attente;
  const partie = JSON.parse(readFileSync(await telechargement.path(), 'utf8'));
  expect(partie.version).toBe(7);
  expect(partie.projets).toHaveLength(1);
  const population = partie.population;
  await page.locator('#import').setInputFiles({ name: 'partie.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(partie)) });
  await expect(page.getByText('Sauvegarde importée.', { exact: true })).toBeVisible();
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('hemicycle.save'))).population).toEqual(population);
  partie.version = 6; delete partie.population;
  await page.locator('#import').setInputFiles({ name: 'ancienne.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(partie)) });
  await page.getByRole('tab', { name: 'Population', exact: true }).click();
  await expect(page.locator('#h-population')).toBeVisible();
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('hemicycle.save'))).projets).toHaveLength(1);
  expect(erreurs).toEqual([]);
});

test('élection régionale consultable et navigation des onglets au clavier', async ({ page }) => {
  const etat = creerPartie({ joueur: { nom: 'Test scrutin', parti: 'epr' }, situation: lire('situation'), regions: lire('regions'), projets: lire('projets'), finances: lire('finances'), dateDepart: '2027-03-01', graine: 42 });
  await page.addInitScript((e) => {
    localStorage.setItem('hemicycle.accord', '1');
    localStorage.setItem('hemicycle.save', JSON.stringify(e));
  }, etat);
  await page.goto('/');
  await page.locator('#reprendre').click();
  await page.locator('#suivant').click();
  await page.getByRole('tab', { name: 'Population', exact: true }).click();
  await page.getByRole('tab', { name: 'Population', exact: true }).press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Budget', exact: true })).toBeFocused();
  await page.getByRole('tab', { name: 'Parlement', exact: true }).click();
  await page.getByText('Résultats par région · 1er tour', { exact: true }).click();
  const res = JSON.parse(await page.evaluate(() => localStorage.getItem('hemicycle.save'))).resultatsElections[0];
  expect(Object.keys(res.regions)).toHaveLength(18);
  await expect(page.getByText(/Guadeloupe.*en tête/)).toBeVisible();
  await sansDebordement(page);
});
