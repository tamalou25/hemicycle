// Politique reliée (E5) : relations avec les partis, réactions du mois, mode élu réel.
import { test, expect } from '@playwright/test';
import { ouvrirOnglet, toutAfficherDecisions } from './aide.js';

const surveiller = (page) => {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  return erreurs;
};

test('relations : engager un programme modifie les relations et liste les réactions', async ({ page }, info) => {
  const erreurs = surveiller(page);
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Partie personnalisée' }).click();
  await page.getByLabel(/^Nom/).fill('Testeur');
  await page.getByLabel(/Premier ministre/).check();
  await page.getByRole('button', { name: 'Commencer' }).click();

  await ouvrirOnglet(page, 'Décisions');
  await toutAfficherDecisions(page); // 6 décisions par catégorie sont affichées par défaut
  const carte = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Effectifs de police et gendarmerie de proximité' }) });
  // La réaction probable est repliée : on l'ouvre et on vérifie son contenu
  await carte.getByText('Réaction probable des partis').click();
  await expect(carte.getByText(/approuvent/).first()).toBeVisible();
  await carte.getByRole('button', { name: 'Engager' }).click();

  await ouvrirOnglet(page, 'Parlement');
  await expect(page.getByRole('heading', { name: 'Relations avec les partis', level: 2 })).toBeVisible();
  await expect(page.getByText(/SIMULATION/).first()).toBeVisible();
  const valeurs = await page.getByRole('meter').evaluateAll((l) => l.map((m) => m.getAttribute('aria-valuenow')));
  expect(valeurs.length).toBeGreaterThan(0);
  expect(valeurs.some((v) => v !== '50')).toBe(true);
  const bloc = page.locator('[aria-labelledby="h-rel-mois"]');
  await expect(bloc.getByRole('heading', { name: 'Approuvent', exact: true })).toBeVisible();
  await expect(bloc.locator('p').filter({ hasNotText: 'Aucun' }).first()).not.toHaveText('');
  await bloc.getByText('Détail des réactions').click();
  await expect(bloc.locator('li').first()).toContainText('simulation');

  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  if (info.project.name === 'ordinateur') await page.screenshot({ path: 'test-results/captures/relations-desktop.png', fullPage: true });
  expect(erreurs, 'aucune erreur JavaScript').toEqual([]);
});

test('élu réel : personnalité, rôle PM, partie sans erreur, réactions sans guillemets', async ({ page }) => {
  const erreurs = surveiller(page);
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Jouer un élu réel' }).click();
  // Pas de défilement horizontal sur l'écran de choix (régression constatée en CI sur mobile)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.locator('input[name=elu]').first().check();
  await page.locator('input[name=role][value=premier_ministre]').check();
  await page.getByRole('button', { name: 'Commencer' }).click();
  await expect(page.getByRole('tab', { name: 'Bureau' }).or(page.getByRole('navigation', { name: 'Sections principales' }).getByRole('button', { name: 'Bureau' }))).toBeVisible();

  for (const nom of ['Décisions', 'Parlement']) await ouvrirOnglet(page, nom);
  await expect(page.getByRole('heading', { name: 'Relations avec les partis', level: 2 })).toBeVisible();
  const phrases = await page.locator('#h-reac ~ ul p.text-sm, #h-rel ~ div li').allTextContents();
  for (const t of phrases) expect(t).not.toMatch(/[“”"]/);
  expect(erreurs, 'aucune erreur JavaScript').toEqual([]);
});
