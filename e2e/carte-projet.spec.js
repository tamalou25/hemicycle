// Parcours principal de la tranche E1 : carte → région → projet → dépense → mois → effet visible.
import { test, expect } from '@playwright/test';
import { ouvrirOnglet, texteVisible } from './aide.js';

/** Accepte le disclaimer et crée un personnage Premier ministre. */
async function nouvellePartie(page) {
  await page.goto('/');
  await expect(page.getByText(/Simulation fictive/).first()).toBeVisible();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Partie personnalisée' }).click();
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
    await ouvrirOnglet(page, 'Carte');

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
    await expect(texteVisible(page, /Décembre 2026/i)).toBeVisible();

    expect(page.erreurs, 'aucune erreur JavaScript').toEqual([]);
  });

  test('pas de défilement horizontal sur la carte', async ({ page }) => {
    await nouvellePartie(page);
    await ouvrirOnglet(page, 'Carte');
    const debordement = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(debordement).toBeLessThanOrEqual(0);
  });
});

test('vue Confiance : distincte de la satisfaction, expliquée dans la fiche', async ({ page }) => {
  await nouvellePartie(page);
  await ouvrirOnglet(page, 'Carte');
  await page.getByRole('button', { name: 'Confiance', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Bretagne, confiance envers le gouvernement 40 sur 100/ })).toBeVisible();
  await page.getByRole('button', { name: /^Bretagne,/ }).click();
  await expect(page.getByText('Confiance envers le gouvernement').first()).toBeVisible();
  await expect(page.getByText(/c'est elle qui pèse aux législatives/)).toBeVisible();
});
