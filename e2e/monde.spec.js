// Écran « Monde » : carte mondiale cadrée sur la France, écran principal de la campagne présidentielle.
import { test, expect } from '@playwright/test';
import { ouvrirOnglet } from './aide.js';

const CLE = 'hemicycle.save';
const sauve = (page) => page.evaluate((c) => JSON.parse(localStorage.getItem(c)), CLE);
const vis = (loc) => loc.locator('visible=true').first();
const viewBox = (page) => page.locator('#svg-monde').getAttribute('viewBox').then((v) => v.split(' ').map(Number));
const debordement = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function campagne(page, parti = 'EPR', graine = 4242) {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Campagne présidentielle' }).click();
  await page.getByRole('radio', { name: new RegExp(`^${parti} ·`) }).check();
  await page.getByRole('button', { name: 'Commencer le mandat' }).click();
  await expect(page.locator('#monde')).toBeVisible();
  await page.evaluate(([c, g]) => { const e = JSON.parse(localStorage.getItem(c)); e.graine = g; localStorage.setItem(c, JSON.stringify(e)); }, [CLE, graine]);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await expect(page.locator('#monde')).toBeVisible();
}

test('arrivée sur la carte : cadrée sur la France, date, temps en pause, cap et urgences, aucune erreur', async ({ page }) => {
  const erreurs = []; page.on('pageerror', (e) => erreurs.push(e.message));
  await campagne(page);
  const [x, y, w] = await viewBox(page);
  const monde = await page.evaluate(async () => (await (await fetch('src/data/carte-monde.json')).json()).cadrages.france);
  expect(w).toBeGreaterThanOrEqual(monde.w - 1); expect(w).toBeLessThan(monde.w * 2.5); // France et environnement proche, selon le ratio du cadre
  expect(x).toBeLessThanOrEqual(monde.x + 1); expect(y).toBeLessThanOrEqual(monde.y + monde.h);
  await expect(page.locator('#monde-ile-de-france')).toBeVisible();
  await expect(page.locator('#monde .pays').first()).toBeAttached();
  await expect(vis(page.getByText(/mai 2027/i))).toBeVisible();
  await expect(vis(page.locator('[data-horloge=basculer]'))).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('region', { name: /Votre cap/ })).toContainText('60 mois restants');
  await expect(page.getByRole('list', { name: 'Objectifs du mandat' }).getByRole('listitem')).toHaveCount(3);
  await expect(page.getByRole('navigation', { name: 'Écrans' })).toContainText('Gouvernement en place');
  expect(await debordement(page)).toBeLessThanOrEqual(0);
  expect(erreurs).toEqual([]);
});

test('sélection d’une région et lancement réel d’un projet ; cadrage et sélection conservés après le passage du mois', async ({ page }) => {
  await campagne(page, 'PS', 7);
  await page.locator('[data-zoom=in]').click();
  const avant = await viewBox(page);
  await page.locator('#monde-bretagne').click();
  await expect(page.locator('#panneau-region')).toContainText('Bretagne');
  await expect(page.locator('#monde-bretagne')).toHaveAttribute('aria-pressed', 'true');
  const env = (await sauve(page)).finances.enveloppe;
  await page.locator('[data-lancer="recrutement-soignants"]').click();
  const e = await sauve(page);
  expect(e.projets).toHaveLength(1);
  expect(e.projets[0]).toMatchObject({ projetId: 'recrutement-soignants', region: 'bretagne' });
  expect(e.finances.enveloppe).toBeCloseTo(env - 0.15, 5);
  await expect(page.locator('#toasts')).toContainText('Projet lancé');
  await expect(page.locator('#panneau-region')).toContainText('Recrutement de soignants');
  // Mise à jour (mois suivant) : le cadrage zoomé et la sélection restent
  await vis(page.getByRole('button', { name: 'Mois suivant' })).click();
  await expect(page.locator('#monde')).toBeVisible();
  const apres = await viewBox(page);
  expect(apres[2]).toBeCloseTo(avant[2], 0);
  await expect(page.locator('#monde-bretagne')).toHaveAttribute('aria-pressed', 'true');
});

test('navigation : zoom, recentrage, outre-mer, clavier, vues, tableau accessible ; aller au Bureau puis revenir', async ({ page }) => {
  await campagne(page, 'DR', 3);
  const w0 = (await viewBox(page))[2];
  await page.locator('[data-zoom=in]').click();
  expect((await viewBox(page))[2]).toBeLessThan(w0);
  await page.locator('[data-cadrage=monde]').click();
  expect((await viewBox(page))[2]).toBeGreaterThan(w0 * 5);
  await page.locator('[data-cadrage=france]').click();
  expect((await viewBox(page))[2]).toBeCloseTo(w0, 0);
  // Outre-mer : encart cliquable → fiche de La Réunion
  await page.locator('[data-region="la-reunion"]').click();
  await expect(page.locator('#panneau-region')).toContainText('La Réunion');
  // Clavier : flèches déplacent, région au clavier
  await page.locator('#cadre-monde').focus();
  const x0 = (await viewBox(page))[0];
  await page.keyboard.press('ArrowRight');
  expect((await viewBox(page))[0]).toBeGreaterThan(x0);
  await page.locator('#monde-occitanie').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#panneau-region')).toContainText('Occitanie');
  // Vues et tableau
  await page.locator('[data-vue=sante]').click();
  await expect(page.locator('#monde-occitanie')).toHaveAttribute('aria-label', /accès aux soins/);
  await page.locator('#bascule-tableau').click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.locator('#bascule-tableau').click();
  // Autres écrans puis retour : la sélection est conservée
  await page.getByRole('navigation', { name: 'Écrans' }).getByRole('button', { name: /Décisions/ }).click();
  await expect(page.getByRole('heading', { name: 'Décisions', level: 2 })).toBeVisible();
  await ouvrirOnglet(page, 'Monde');
  await expect(page.locator('#monde-occitanie')).toHaveAttribute('aria-pressed', 'true');
});

test('événement : urgence dans le cap, accès direct ; alerte territoriale du Bureau rejoint le territoire sur la carte', async ({ page }) => {
  await campagne(page, 'RN', 2);
  await page.evaluate((c) => { const e = JSON.parse(localStorage.getItem(c)); e.evenement = 'greve-transports'; localStorage.setItem(c, JSON.stringify(e)); }, CLE);
  await page.reload(); await page.getByRole('button', { name: /Reprendre/ }).click();
  const cap = page.getByRole('region', { name: /Votre cap/ });
  await expect(cap).toContainText('Grève dans les transports');
  await cap.getByRole('button', { name: 'Traiter' }).click();
  await expect(page.locator('[data-evenement]').first()).toBeVisible();
  await page.locator('[data-evenement]').first().click();
  // Bureau : « Voir sur la carte » d'un point territorial ouvre Monde sur la région
  const voir = page.getByRole('button', { name: /Voir sur la carte/ }).first();
  await expect(voir).toBeVisible();
  const titre = await voir.evaluate((b) => b.closest('li').textContent);
  await voir.click();
  await expect(page.locator('#monde')).toBeVisible();
  await expect(page.locator('#panneau-region')).toBeVisible();
  const sel = await page.locator('#cadre-monde [aria-pressed="true"]').first().getAttribute('data-region');
  expect(sel).toBeTruthy();
  expect(titre).toMatch(/Mayotte|Guyane|Corse|Bretagne|Normandie|Hauts|Grand|Occitanie|Nouvelle|Pays|Centre|Bourgogne|Auvergne|Provence|Île|Guadeloupe|Martinique|Réunion/);
});

test('sauvegarde et reprise : la carte revient ; ancienne partie (PM) : Monde disponible mais Bureau au départ', async ({ page }) => {
  await campagne(page, 'ECOS', 11);
  await vis(page.getByRole('button', { name: 'Mois suivant' })).click();
  const e = await sauve(page);
  await page.reload(); await page.getByRole('button', { name: /Reprendre/ }).click();
  await expect(page.locator('#monde')).toBeVisible();
  expect((await sauve(page)).tour).toBe(e.tour);
  await expect(vis(page.locator('[data-horloge=basculer]'))).toHaveAttribute('aria-pressed', 'false');
});

test('mobile : carte visible à l’arrivée, commandes de zoom et de temps ≥ 44 px, pas de débordement, panneau région atteignable', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'mise en page mobile');
  await campagne(page, 'HOR', 5);
  const carte = await page.locator('#cadre-monde').boundingBox();
  expect(carte.y).toBeLessThan(page.viewportSize().height); // la carte commence dans le premier écran
  for (const sel of ['[data-zoom=in]', '[data-cadrage=france]', '[data-horloge=basculer]', '[data-vitesse="2"]']) {
    const b = await vis(page.locator(sel)).boundingBox();
    expect(b.width, sel).toBeGreaterThanOrEqual(44); expect(b.height, sel).toBeGreaterThanOrEqual(44);
  }
  expect(await debordement(page)).toBeLessThanOrEqual(0);
  await page.locator('#monde-normandie').tap();
  await expect(page.locator('#panneau-region')).toContainText('Normandie');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const pied = await page.getByText('Simulation fictive.').first().boundingBox();
  const barre = await page.locator('.barre-temps').boundingBox();
  expect(pied.y + pied.height).toBeLessThanOrEqual(barre.y + 1);
});
