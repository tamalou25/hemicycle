// Parcours principal de la tranche E1 : carte → région → projet → dépense → mois → effet visible.
import { test, expect } from '@playwright/test';

/** Accepte le disclaimer et crée un personnage Premier ministre. */
async function nouvellePartie(page) {
  await page.goto('/');
  await expect(page.getByText(/Simulation fictive/).first()).toBeVisible();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Créer mon personnage' }).click();
  await page.getByLabel(/^Nom/).fill('Testeur');
  await page.getByLabel(/Premier ministre/).check();
  await page.getByRole('button', { name: 'Commencer' }).click();
}

test.describe('carte et projets territoriaux', () => {
  test.beforeEach(async ({ page }) => {
    const erreurs = [];
    page.on('pageerror', (e) => erreurs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
    page.erreurs = erreurs;
  });

  test('sélectionner une région au clavier et y lancer un projet', async ({ page }) => {
    await nouvellePartie(page);
    await page.getByRole('tab', { name: 'Carte' }).click();

    // Sélection au clavier : focus sur la région puis Entrée
    const bretagne = page.getByRole('button', { name: /^Bretagne,/ });
    await bretagne.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Bretagne' })).toBeVisible();
    await expect(bretagne).toHaveAttribute('aria-pressed', 'true');

    // Lancement d'un projet : l'enveloppe est débitée (1,50 → 1,25 Md€)
    await expect(page.getByText('Enveloppe disponible : 1,50 Md€.')).toBeVisible();
    await page.locator('#lancer-plan-mobilite').click();
    await expect(page.getByText('Enveloppe disponible : 1,25 Md€.')).toBeVisible();

    // Le même projet ne peut pas être relancé dans la même région
    await expect(page.locator('#lancer-plan-mobilite')).toBeDisabled();
    await expect(page.getByText(/déjà en cours dans cette région/)).toBeVisible();

    // Après un mois, le projet est toujours en chantier et la partie avance
    await page.getByRole('button', { name: 'Mois suivant' }).click();
    await expect(page.getByText(/Décembre 2026/i).first()).toBeVisible();

    expect(page.erreurs, 'aucune erreur JavaScript').toEqual([]);
  });

  test('pas de défilement horizontal sur la carte', async ({ page }) => {
    await nouvellePartie(page);
    await page.getByRole('tab', { name: 'Carte' }).click();
    const debordement = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(debordement).toBeLessThanOrEqual(0);
  });
});
