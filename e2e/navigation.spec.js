// Navigation (Chantier 1) : onglets atteignables, « Mois suivant » toujours visible, Voir sur la carte.
import { test, expect } from '@playwright/test';
import { ouvrirOnglet } from './aide.js';

async function nouvellePartie(page) {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Partie personnalisée' }).click();
  await page.getByLabel(/^Nom/).fill('Testeur');
  await page.getByLabel(/Premier ministre/).check();
  await page.getByRole('button', { name: 'Commencer' }).click();
}
const surveiller = (page) => {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  return erreurs;
};
const debordement = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test('chaque onglet est atteignable, « Mois suivant » reste visible', async ({ page }, info) => {
  const erreurs = surveiller(page);
  await nouvellePartie(page);
  const suivant = page.getByRole('button', { name: 'Mois suivant' });
  const mobile = info.project.name === 'mobile';
  for (const [nom, titre] of [['Décisions', 'Décisions'], ['Carte', null], ['Budget', null], ['Opinion', null], ['Parlement', null], ['Chronologie', 'Journal'], ['Bureau', 'État du pays']]) {
    await ouvrirOnglet(page, nom);
    if (titre) await expect(page.getByRole('heading', { name: titre, level: 2 }).first()).toBeVisible();
    await expect(suivant).toBeVisible();
    expect(await debordement(page)).toBeLessThanOrEqual(0);
  }
  if (mobile) {
    // Panneau « Plus » : bouton à état, Échap le ferme et rend le focus
    const plus = page.getByRole('button', { name: 'Plus' });
    await expect(plus).toHaveAttribute('aria-expanded', 'false');
    await plus.click();
    await expect(plus).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('group', { name: 'Autres sections' }).getByRole('button')).toHaveCount(3);
    await page.keyboard.press('Escape');
    await expect(plus).toHaveAttribute('aria-expanded', 'false');
    await expect(plus).toBeFocused();
    await expect(page.getByRole('navigation', { name: 'Sections principales' }).getByRole('button', { name: 'Bureau' })).toHaveAttribute('aria-current', 'page');
  }
  // Bas du Bureau : le bouton reste visible et n'est pas masqué par les barres
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(suivant).toBeVisible();
  if (mobile) {
    const pied = await page.getByText('Simulation fictive.').first().boundingBox();
    const barre = await page.locator('.barre-action').boundingBox();
    expect(pied.y + pied.height).toBeLessThanOrEqual(barre.y + 1);
  }
  expect(erreurs, 'aucune erreur JavaScript').toEqual([]);
});

test('Bureau : synthèse, À traiter avec action, détails repliés, hauteur mobile', async ({ page }, info) => {
  const erreurs = surveiller(page);
  await nouvellePartie(page);
  await expect(page.getByText('Premier mois : aucune évolution encore')).toBeVisible();
  for (let i = 0; i < 3; i++) {
    const evt = page.locator('[data-evenement]').first();
    if (await evt.count() && await evt.isEnabled()) await evt.click();
    await page.getByRole('button', { name: 'Mois suivant' }).locator('visible=true').click();
  }
  // Le dernier mois peut tirer un nouvel événement : on y répond aussi, pour mesurer un Bureau stable
  // (la hauteur ne doit pas dépendre de l'aléa ; la carte d'événement est mesurée à part au chantier 2).
  const dernier = page.locator('[data-evenement]').first();
  if (await dernier.count() && await dernier.isEnabled()) await dernier.click();
  await expect(page.locator('[data-evenement]')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: /ce mois-ci|stable/ })).toBeVisible();
  await expect(page.locator('details#secteurs')).not.toHaveAttribute('open', '');
  await expect(page.getByRole('heading', { name: 'Bonnes nouvelles' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Points de vigilance' })).toBeVisible();
  expect(await debordement(page)).toBeLessThanOrEqual(0);
  const hauteur = await page.evaluate(() => document.documentElement.scrollHeight);
  info.annotations.push({ type: 'hauteur-bureau', description: `${hauteur}px` });
  console.log(`[${info.project.name}] hauteur du Bureau après 3 mois : ${hauteur}px`);
  if (info.project.name === 'mobile') expect(hauteur).toBeLessThanOrEqual(2 * 915);
  const dossier = 'test-results/captures/'; // hors dépôt : les captures de docs/ sont mises à jour à la main
  await page.screenshot({ path: `${dossier}${info.project.name === 'mobile' ? 'bureau-mobile' : 'bureau-desktop'}.png`, fullPage: true });
  expect(erreurs, 'aucune erreur JavaScript').toEqual([]);
});

test('« Voir sur la carte » ouvre la Carte sur la région du point', async ({ page }) => {
  const erreurs = surveiller(page);
  await nouvellePartie(page);
  for (let i = 0; i < 12; i++) {
    const bouton = page.getByRole('button', { name: /^Voir sur la carte/ }).first();
    if (await bouton.count()) {
      const nom = (await bouton.locator('.sr-only').textContent()).replace(/^ : /, '');
      const region = nom.split(':').pop().trim();
      await bouton.click();
      await expect(page.getByRole('heading', { name: region, level: 3 }).or(page.getByRole('heading', { name: region, level: 2 }))).toBeVisible();
      expect(erreurs).toEqual([]);
      return;
    }
    const evt = page.locator('[data-evenement]').first();
    if (await evt.count() && await evt.isEnabled()) await evt.click();
    await page.getByRole('button', { name: 'Mois suivant' }).locator('visible=true').click();
  }
  test.skip(true, 'aucun point territorial en 12 mois');
});

test('État du pays : les variations s’affichent dès le premier mois joué', async ({ page }) => {
  const erreurs = surveiller(page);
  await nouvellePartie(page);
  await page.getByRole('button', { name: 'Mois suivant' }).first().click();
  await expect(page.getByText(/Premier mois : aucune évolution/)).toHaveCount(0);
  await expect(page.getByText(/(s’améliore|se dégrade|stable)/).first()).toBeVisible();
  expect(erreurs, 'aucune erreur JavaScript').toEqual([]);
});
