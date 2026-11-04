// Diplomatie (lot 3) : fiche pays sur la carte, accord accepté, sanction refusée puis expliquée, initiative étrangère au Bureau.
import { test, expect } from '@playwright/test';
import { ouvrirOnglet } from './aide.js';

const CLE = 'hemicycle.save';
const sauve = (page) => page.evaluate((c) => JSON.parse(localStorage.getItem(c)), CLE);
const modifier = (page, corps) => page.evaluate(([c, f]) => { const e = JSON.parse(localStorage.getItem(c)); new Function('e', f)(e); localStorage.setItem(c, JSON.stringify(e)); }, [CLE, corps]);
const vis = (loc) => loc.locator('visible=true').first();

async function campagne(page) {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Campagne présidentielle' }).click();
  await page.getByRole('radio', { name: /^EPR ·/ }).check();
  await page.getByRole('button', { name: 'Commencer le mandat' }).click();
  await expect(page.locator('#monde')).toBeVisible();
}

test('carte : mode Partenaires, sélection de l’Allemagne, accord énergétique conclu, sanction contre la Chine puis action du mois épuisée', async ({ page }) => {
  await campagne(page);
  await page.getByRole('button', { name: 'Partenaires' }).click();
  await expect(page.getByRole('list', { name: /Légende : relation/ })).toBeVisible();
  // Sélection au clavier (indépendante du cadrage de la carte)
  await page.locator('#pays-de').focus();
  await page.keyboard.press('Enter');
  const panneau = page.locator('#panneau-pays');
  await expect(panneau).toContainText(/Allemagne/);
  await expect(panneau).toContainText(/Relation 72\/100/);
  await expect(panneau).toContainText(/UE/);
  await panneau.getByText('Pourquoi cette tendance ?').click();
  await expect(panneau).toContainText(/Proximité de vos positions/);
  // Partenariat énergétique : 1 capital, 0,5 Md€/an
  const energie = panneau.locator('li', { hasText: 'Partenariat énergétique' });
  await expect(energie).toContainText(/0,5 Md€\/an/);
  await energie.getByRole('button', { name: 'Proposer' }).click();
  await expect(page.locator('#toasts')).toContainText(/Partenariat énergétique conclu avec Allemagne/);
  let e = await sauve(page);
  expect(e.diplomatie.accords).toEqual([expect.objectContaining({ pays: 'de', type: 'energie' })]);
  expect(e.joueur.capital).toBe(3);
  // Une seule action diplomatique par mois : la sanction contre la Chine est bloquée avec la raison
  await page.locator('#pays-cn').focus();
  await page.keyboard.press('Enter');
  await expect(panneau).toContainText(/Chine/);
  const sanction = panneau.locator('li', { hasText: 'Sanctions économiques' });
  await expect(sanction.getByRole('button', { name: 'Sanctionner' })).toBeDisabled();
  await expect(sanction).toContainText(/déjà mené une action diplomatique/);
  // Mois suivant : l'accord agit sur la disponibilité des importations allemandes
  await vis(page.getByRole('button', { name: 'Mois suivant' })).click();
  e = await sauve(page);
  expect(e.economie.disponibilite.de).toBeCloseTo(1.3, 3);
  await ouvrirOnglet(page, 'Économie');
  await expect(page.locator('[data-filiere=energie]')).toContainText(/Allemagne/);
});

test('initiative étrangère : pause du temps, réponse au Bureau, mesure et relation, puis Décisions la liste comme urgente', async ({ page }) => {
  await campagne(page);
  await modifier(page, "e.diplomatie.initiative = { id: 'droits-douane', pays: 'us', tour: 0 };");
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await expect(page.locator('#monde')).toContainText(/États-Unis relève ses droits de douane/);
  // Le temps refuse de démarrer tant que l'initiative attend
  await vis(page.locator('[data-horloge=basculer]')).click();
  await expect(page.locator('#toasts')).toContainText(/initiative diplomatique/);
  await ouvrirOnglet(page, 'Décisions');
  await expect(page.getByRole('alert', { name: 'Décision urgente' })).toContainText(/droits de douane/);
  await page.getByRole('alert', { name: 'Décision urgente' }).getByRole('button', { name: 'Répondre' }).click();
  const init = page.locator('#initiative');
  await expect(init).toBeVisible();
  await expect(init).toContainText(/simulation/);
  await init.getByRole('button', { name: /Riposter/ }).click();
  await expect(page.locator('#toasts')).toContainText(/Riposter/);
  const e = await sauve(page);
  expect(e.diplomatie.initiative).toBeNull();
  expect(e.diplomatie.mesures[0]).toEqual(expect.objectContaining({ pays: 'us', debouches: -0.25 }));
  expect(e.diplomatie.relations.us).toBe(48);
  expect(e.journal.at(-1).texte).toMatch(/droits de douane : Riposter/);
});

test('mobile : panneau Pays accessible, boutons ≥ 44 px, aucun débordement', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mise en page mobile');
  await campagne(page);
  await page.getByRole('button', { name: 'Partenaires' }).click();
  await page.locator('#pays-it').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#panneau-pays')).toContainText(/Italie/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  for (const b of await page.locator('#panneau-pays summary, [data-mode-monde]').all()) { const r = await b.boundingBox(); if (r) expect(r.height).toBeGreaterThanOrEqual(44); }
});
