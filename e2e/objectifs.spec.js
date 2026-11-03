// Objectifs du mandat : choix à la création (exactement 3), suivi au Bureau.
import { test, expect } from '@playwright/test';

test('choisir 3 objectifs non défaut, les voir au Bureau', async ({ page }) => {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Créer mon personnage' }).click();
  await page.getByLabel(/^Nom/).fill('Testeur');
  const fs = page.locator('#fs-objectifs');
  const cases = fs.getByRole('checkbox');
  await expect(fs.locator('#nb-objectifs')).toHaveText('3/3');
  // Défauts : chomage, deficit, territoires. On les décoche puis on en coche 3 autres.
  for (const t of ['Faire reculer le chômage', 'Revenir sous 3 % de déficit', 'Améliorer la vie dans les territoires']) await fs.getByRole('checkbox', { name: new RegExp(t) }).uncheck();
  await expect(fs.locator('#nb-objectifs')).toHaveText('0/3');
  const choix = ['Stabiliser la dette', 'Rester populaire', 'Réformer'];
  for (const t of choix) await fs.getByRole('checkbox', { name: new RegExp(t) }).check();
  await expect(fs.locator('#nb-objectifs')).toHaveText('3/3');
  await expect(fs.getByRole('checkbox', { name: /Apaiser le pays/ })).toBeDisabled();
  expect(await cases.evaluateAll((l) => l.filter((c) => !c.disabled && !c.checked).length)).toBe(0);
  await page.getByRole('button', { name: 'Commencer' }).click();
  const bloc = page.getByRole('region', { name: 'Objectifs du mandat' });
  await expect(bloc).toBeVisible();
  for (const t of choix) await expect(bloc.getByText(t)).toBeVisible();
  await expect(bloc.getByText('Évalués en fin de mandat')).toBeVisible();
  await expect(bloc.getByText(/Atteint|En cours/)).toHaveCount(3);
  expect(erreurs).toEqual([]);
});

test('élu réel : décocher un objectif puis changer de filtre laisse « Commencer » désactivé', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Jouer un élu réel' }).click();
  await page.locator('input[name=elu]').first().check();
  await page.locator('input[name=objectif]:checked').first().uncheck();
  const filtre = page.locator('#fp');
  await filtre.selectOption({ index: 1 });
  await expect(page.locator('#go')).toBeDisabled();
});
