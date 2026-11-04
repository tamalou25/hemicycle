// Campagne présidentielle : rôle président, temps continu, gouvernement (nomination après censure), reprise, mobile.
import { test, expect } from '@playwright/test';
import { ouvrirOnglet } from './aide.js';

const CLE = 'hemicycle.save';
const sauve = (page) => page.evaluate((c) => JSON.parse(localStorage.getItem(c)), CLE);
const vis = (loc) => loc.locator('visible=true').first();
const bascule = (page) => vis(page.locator('[data-horloge=basculer]'));
const moisSuivant = (page) => vis(page.getByRole('button', { name: 'Mois suivant' })).click();
const debordement = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/** Répond à un éventuel événement en attente (premier choix activé), puis passe au mois suivant. */
async function mois(page) {
  const choix = vis(page.locator('[data-evenement]:not([disabled])'));
  if (await choix.count()) await choix.click();
  await moisSuivant(page);
}

async function modifierSauvegarde(page, f) {
  await page.evaluate(([c, corps]) => { const e = JSON.parse(localStorage.getItem(c)); new Function('e', corps)(e); localStorage.setItem(c, JSON.stringify(e)); }, [CLE, f]);
}

/** Lance la campagne puis fixe la graine (partie déterministe) et reprend la partie (horloge en pause). */
async function campagne(page, parti = 'EPR', graine = 4242) {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Campagne présidentielle' }).click();
  await page.getByRole('radio', { name: new RegExp(`^${parti} ·`) }).check();
  await page.getByRole('button', { name: 'Commencer le mandat' }).click();
  await expect(page.locator('#gouvernement')).toBeVisible();
  await modifierSauvegarde(page, `e.graine = ${graine};`);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await expect(page.locator('#gouvernement')).toBeVisible();
}

test('accueil → campagne : rôle, pouvoirs, limites, aucun parti présélectionné ; Bureau avec gouvernement', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Campagne présidentielle' }).click();
  await expect(page.getByText('Votre rôle : président·e')).toBeVisible();
  await expect(page.getByText('Vous nommez le gouvernement')).toBeVisible();
  await expect(page.getByText('Le Parlement garde le dernier mot')).toBeVisible();
  await expect(page.getByText('Limites', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Simplifications')).toBeVisible();
  expect(await page.locator('input[name=parti]:checked').count()).toBe(0);
  await page.getByRole('button', { name: 'Commencer le mandat' }).click();
  await expect(page.locator('#pres-erreur')).toContainText('Choisissez une famille politique');
  await page.getByRole('radio', { name: /^EPR ·/ }).check();
  await page.getByRole('button', { name: 'Commencer le mandat' }).click();
  await expect(page.locator('#gouvernement')).toBeVisible();
  await expect(page.locator('#h-gouv')).toContainText('Premier ministre EPR (fictif)');
  await expect(page.getByText('Président·e de la République (fictif)').locator('visible=true').first()).toBeVisible();
  await expect(page.getByText(/mai 2027/i).locator('visible=true').first()).toBeVisible();
  const s = await sauve(page);
  expect(s.joueur.role).toBe('president');
  expect(s.gouvernement.statut).toBe('en_place');
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'false');
});

test('temps continu : lecture ×3, pause sur événement, « Mois suivant » en pause', async ({ page }) => {
  test.setTimeout(90_000);
  await campagne(page);
  const t0 = (await sauve(page)).tour;
  await vis(page.locator('[data-vitesse="3"]')).click();
  await expect(vis(page.locator('[data-vitesse="3"]'))).toHaveAttribute('aria-pressed', 'true');
  await bascule(page).click();
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await sauve(page)).tour, { timeout: 15_000 }).toBeGreaterThanOrEqual(t0 + 1);
  let s = await sauve(page);
  if (s.fin) test.skip(true, 'fin anticipée');
  if (s.evenement) {
    await expect(bascule(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(vis(page.locator('[data-evenement]'))).toBeVisible();
    await vis(page.locator('[data-evenement]:not([disabled])')).click();
  } else {
    await bascule(page).click(); // pause manuelle
    await expect(bascule(page)).toHaveAttribute('aria-pressed', 'false');
  }
  // Relance : le temps continue d'avancer
  const t1 = (await sauve(page)).tour;
  await bascule(page).click();
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => { const x = await sauve(page); if (x.evenement || x.fin) return t1 + 1; return x.tour; }, { timeout: 15_000 }).toBeGreaterThanOrEqual(t1 + 1);
  // Pause puis « Mois suivant » : exactement un mois
  if ((await bascule(page).getAttribute('aria-pressed')) === 'true') await bascule(page).click();
  s = await sauve(page);
  if (s.fin) test.skip(true, 'fin anticipée');
  if (s.evenement) { await vis(page.locator('[data-evenement]:not([disabled])')).click(); s = await sauve(page); }
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'false');
  await moisSuivant(page);
  await expect.poll(async () => (await sauve(page)).tour).toBe(s.tour + 1);
});

test('raccourcis clavier : Espace lecture/pause, « + » vitesse', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'raccourcis clavier : ordinateur');
  await campagne(page);
  await page.locator('h1, h2').first().click({ position: { x: 2, y: 2 } }).catch(() => {});
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Space');
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Space');
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('+');
  await expect(vis(page.locator('[data-vitesse="2"]'))).toHaveAttribute('aria-pressed', 'true');
});

test('pause automatique en arrière-plan', async ({ page }) => {
  await campagne(page);
  const t0 = (await sauve(page)).tour;
  await bascule(page).click();
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); });
  await page.waitForTimeout(3000);
  expect((await sauve(page)).tour).toBe(t0);
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'false');
});

test('gouvernement renversé : la partie continue, le temps refuse de partir, nomination', async ({ page }) => {
  test.setTimeout(90_000);
  await campagne(page);
  await modifierSauvegarde(page, `e.indicateurs.tensions = 100; e.indicateurs.popularite = 12; e.evenement = null;
    e.joueur.ideologie = { retraites: 100, immigration: -100, fiscalite: 100, europe: 100, ecologie: -100, securite: 100 };`);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  let s = await sauve(page);
  for (let i = 0; i < 8 && s.gouvernement.statut !== 'renverse' && !s.fin; i++) { await mois(page); s = await sauve(page); }
  if (s.fin || s.gouvernement.statut !== 'renverse') test.skip(true, 'gouvernement non renversé en 8 mois (fin anticipée ou scénario)');
  const g = page.locator('#gouvernement');
  await expect(g).toHaveAttribute('role', 'alert');
  await expect(g).toContainText('renversé');
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'false');
  await bascule(page).click();
  await expect(page.locator('#toasts')).toContainText('reste en pause');
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'false');
  const capital = s.joueur.capital ?? s.capital;
  await page.locator('[data-nommer]:not([disabled])').first().click();
  await expect.poll(async () => (await sauve(page)).gouvernement.statut).toBe('en_place');
  const a = await sauve(page);
  const capA = a.joueur.capital ?? a.capital;
  expect(capA).toBe(capital - 2);
  await expect(page.locator('#toasts')).toContainText('Nouveau gouvernement');
  await expect(page.locator('#h-gouv')).toContainText('Premier ministre');
});

test('mesures par le gouvernement : proposer une loi, attente du PLF', async ({ page }) => {
  await campagne(page);
  await ouvrirOnglet(page, 'Décisions');
  const proposer = vis(page.getByRole('button', { name: 'Proposer', exact: true }).and(page.locator(':not([disabled])')));
  await expect(proposer).toBeVisible();
  await proposer.click();
  const dlg = page.locator('#dlg-decision');
  if (await dlg.evaluate((d) => d.open).catch(() => false)) await dlg.getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.locator('#toasts')).toContainText('Déposé :');
  await ouvrirOnglet(page, 'Budget');
  await expect(page.getByText(/se dépose à l’automne/).locator('visible=true').first()).toBeVisible();
});

test('sauvegarde et reprise ; ancienne sauvegarde (premier ministre) sans gouvernement ni horloge', async ({ page }) => {
  test.setTimeout(90_000);
  await campagne(page);
  await mois(page); await mois(page);
  const avant = await sauve(page);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  const apres = await sauve(page);
  expect(apres.tour).toBe(avant.tour);
  expect(apres.gouvernement).toEqual(avant.gouvernement);
  await expect(page.locator('#gouvernement')).toBeVisible();
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'false');

  // Ancienne sauvegarde v14 : Premier ministre, sans gouvernement
  await page.goto('/');
  await page.getByRole('button', { name: 'Partie personnalisée' }).click();
  await page.getByLabel(/^Nom/).fill('Testeur');
  await page.getByLabel(/Premier ministre/).check();
  await page.getByRole('button', { name: 'Commencer' }).click();
  await modifierSauvegarde(page, 'e.version = 14; delete e.gouvernement;');
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await expect(vis(page.getByRole('button', { name: 'Mois suivant' }))).toBeVisible();
  expect(await page.locator('#gouvernement').count()).toBe(0);
  expect(await page.locator('[data-horloge]').count()).toBe(0);
  expect((await sauve(page)).joueur.role).toBe('premier_ministre');
});

test('mobile : commandes du temps accessibles, cibles ≥ 44 px, pas de débordement, pied de page dégagé', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'mise en page mobile');
  await campagne(page);
  const temps = page.locator('.barre-temps [data-horloge=basculer]');
  await expect(temps).toBeVisible();
  for (const loc of [temps, ...(await page.locator('.barre-temps [data-vitesse]').all())]) {
    const b = await loc.boundingBox();
    expect(b.width).toBeGreaterThanOrEqual(43.5);
    expect(b.height).toBeGreaterThanOrEqual(43.5);
  }
  expect(await debordement(page)).toBeLessThanOrEqual(0);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  const pied = await page.getByText('Simulation fictive.').locator('visible=true').last().boundingBox();
  const barres = await page.locator('.barre-temps, .barre-action, .barre-nav').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
  const haut = Math.min(...barres);
  expect(pied.y + pied.height).toBeLessThanOrEqual(haut + 1);
  expect(await debordement(page)).toBeLessThanOrEqual(0);
});

test('régression partage : le lien d’une campagne présidentielle recrée le même départ (mai 2027, président, graine, gouvernement)', async ({ page }) => {
  await campagne(page, 'PS', 4242);
  const avant = await sauve(page);
  await ouvrirOnglet(page, 'Chronologie');
  await vis(page.getByRole('button', { name: 'Partager ce défi' })).click();
  const lien = await page.locator('#lien-defi').inputValue();
  expect(lien).toContain('#defi=');
  // Le destinataire ouvre le lien sur un appareil vierge
  await page.evaluate(() => localStorage.clear());
  await page.goto('about:blank'); // un simple changement de hash ne recharge pas l'application
  await page.goto(`/${lien.slice(lien.indexOf('#'))}`);
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: /Relever le défi/ }).click();
  const apres = await sauve(page);
  expect(apres.dateDepart).toEqual({ annee: 2027, mois: 5 });
  expect(apres.joueur.role).toBe('president');
  expect(apres.graineInitiale).toBe(avant.graineInitiale);
  expect(apres.gouvernement).toEqual(avant.gouvernement);
  await expect(vis(page.getByText(/mai 2027/i))).toBeVisible();
  await expect(bascule(page)).toHaveAttribute('aria-pressed', 'false'); // horloge en pause au départ
});

test('régression horloge : changer de vitesse garde le jour ; « Mois suivant » remet le mois au jour 1', async ({ page }) => {
  await campagne(page, 'DR', 4242);
  const jour = async () => Number((await vis(page.locator('[data-jour]')).textContent()).replace(/\D/g, ''));
  await vis(page.locator('[data-vitesse="3"]')).click();
  await bascule(page).click();
  await expect.poll(jour, { timeout: 6000 }).toBeGreaterThanOrEqual(12); // ~2,5 s à ×3
  await bascule(page).click(); // pause
  const j1 = await jour();
  await vis(page.locator('[data-vitesse="1"]')).click();
  await page.waitForTimeout(400);
  const j2 = await jour();
  expect(Math.abs(j2 - j1)).toBeLessThanOrEqual(1); // avant : retombait près du jour 1
  const tour = (await sauve(page)).tour;
  await moisSuivant(page);
  expect((await sauve(page)).tour).toBe(tour + 1);
  expect(await jour()).toBe(1); // le nouveau mois repart de zéro
});
