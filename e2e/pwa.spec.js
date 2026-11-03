// PWA : manifeste valide et partie jouable hors ligne après une première visite.
import { test, expect } from '@playwright/test';
import { texteVisible } from './aide.js';

test('manifeste et icônes accessibles', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const manifeste = await (await request.get(`/${href}`)).json();
  expect(manifeste.short_name).toBe('Hémicycle');
  expect(manifeste.display).toBe('standalone');
  for (const icone of manifeste.icons) expect((await request.get(`/${icone.src}`)).ok()).toBe(true);
});

test('hors ligne : la partie se recharge et se joue sans réseau', async ({ page, context }) => {
  await page.goto('/');
  // Attendre que le service worker ait mis le jeu en cache
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).length)).toBeGreaterThan(0);
  await page.reload(); // la page est désormais contrôlée par le service worker

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/Simulation fictive/).first()).toBeVisible();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Créer mon personnage' }).click();
  await page.getByLabel(/^Nom/).fill('Hors ligne');
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.getByRole('button', { name: 'Mois suivant' }).click();
  await expect(texteVisible(page, /Décembre 2026/i)).toBeVisible();
  await context.setOffline(false);
});
