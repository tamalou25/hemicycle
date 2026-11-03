// Événements régionaux : carte d'événement compacte, région visée, lien vers la carte.
import { test, expect } from '@playwright/test';

async function partieAvecEvenement(page, evenement, region) {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Créer mon personnage' }).click();
  await page.getByLabel(/^Nom/).fill('Région');
  await page.getByLabel(/Premier ministre/).check();
  await page.getByRole('button', { name: 'Commencer' }).click();
  // Place un événement régional en attente dans la sauvegarde, puis reprend la partie
  await page.evaluate(([ev, r]) => {
    const e = JSON.parse(localStorage.getItem('hemicycle.save'));
    e.evenement = ev; e.evenementRegion = r;
    localStorage.setItem('hemicycle.save', JSON.stringify(e));
  }, [evenement, region]);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
}

test('événement régional : région affichée, effets locaux, lien vers la carte', async ({ page }) => {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await partieAvecEvenement(page, 'fermeture-maternite', 'mayotte');
  const carte = page.getByRole('alert').filter({ hasText: 'maternité' });
  await expect(carte).toContainText('Mayotte');
  await expect(carte).toContainText(/Accès aux soins \(Mayotte\)/);
  await expect(carte).toContainText(/0,15 Md€/);
  const hauteur = await carte.evaluate((el) => el.getBoundingClientRect().height);
  test.info().annotations.push({ type: 'hauteur-evenement', description: `${Math.round(hauteur)}px` });
  // Environ 900 px avant le compactage ; environ 645 px aujourd'hui (environ 680 px avec des polices plus larges, comme en CI).
  // La limite détecte une régression vers l'ancien format, pas les écarts de rendu entre plateformes.
  if (test.info().project.name === 'mobile') expect(hauteur).toBeLessThan(760);
  await page.getByRole('button', { name: 'Voir Mayotte sur la carte' }).click();
  await expect(page.getByRole('heading', { name: 'Mayotte' })).toBeVisible();
  expect(erreurs).toEqual([]);
});
