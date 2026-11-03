// Audit d'accessibilité automatisé (axe-core, règles WCAG 2.0/2.1 A et AA) sur chaque écran du jeu.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ouvrirOnglet } from './aide.js';

const ONGLETS = ['Bureau', 'Décisions', 'Carte', 'Budget', 'Opinion', 'Parlement', 'Chronologie'];

async function auditer(page, nom) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const details = r.violations.map((v) => `${v.id} (${v.impact}) : ${v.nodes.length} élément(s) — ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(details, `violations sur « ${nom} »`).toEqual([]);
}

test('accueil et création de personnage', async ({ page }) => {
  await page.goto('/');
  await auditer(page, 'Accueil');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Partie personnalisée' }).click();
  await auditer(page, 'Création');
});

test('tous les onglets de jeu, après 2 mois', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Partie personnalisée' }).click();
  await page.getByLabel(/^Nom/).fill('Audit');
  await page.getByLabel(/Premier ministre/).check();
  await page.getByRole('button', { name: 'Commencer' }).click();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Mois suivant' }).locator('visible=true').first().click();
  for (const onglet of ONGLETS) {
    await ouvrirOnglet(page, onglet);
    await auditer(page, onglet);
  }
});

test('découverte : écran de configuration, mission (choix, suivi, débrief) et fiche ouverte', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Découvrir en jouant' }).click();
  await auditer(page, 'Découverte');
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Commencer la découverte' }).click();
  await page.getByText('Que mesure cet indice ?').click();
  await auditer(page, 'Mission : choix');
  await page.getByRole('button', { name: 'Choisir : Recrutement de soignants' }).click();
  await page.getByRole('button', { name: 'Mois suivant' }).locator('visible=true').first().click();
  await auditer(page, 'Mission : suivi et bilan du mois');
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Mois suivant' }).locator('visible=true').first().click();
  await auditer(page, 'Mission : débrief');
  await ouvrirOnglet(page, 'Décisions');
  await page.locator('#panneau details summary', { hasText: 'Fiche détaillée' }).first().click();
  await auditer(page, 'Fiche détaillée');
});
