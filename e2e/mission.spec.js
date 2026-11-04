// Mission d'initiation « Découvrir en jouant » : vraie partie, choix réel, conséquences observées.
import { test, expect } from '@playwright/test';

const CLE = 'hemicycle.save';

/** Lance une découverte puis fixe la graine (partie déterministe) et reprend la partie. */
async function decouverte(page, parti = 'PS', graine = 4242) {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Découvrir en jouant' }).click();
  await page.getByRole('radio', { name: new RegExp(`^${parti} ·`) }).check();
  await page.getByRole('button', { name: 'Commencer la découverte' }).click();
  await expect(page.getByRole('region', { name: /^Mission/ })).toBeVisible();
  await page.evaluate(([c, g]) => { const e = JSON.parse(localStorage.getItem(c)); e.graine = g; localStorage.setItem(c, JSON.stringify(e)); }, [CLE, graine]);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  return page.getByRole('region', { name: /^Mission/ });
}
const moisSuivant = (page) => page.getByRole('button', { name: 'Mois suivant' }).locator('visible=true').first().click();
const sauve = (page) => page.evaluate((c) => JSON.parse(localStorage.getItem(c)), CLE);
const etapeEtat = (mission, id) => mission.locator(`[data-etape=${id}]`).getAttribute('data-etat');

test('accueil : deux entrées, aucune présélection de parti, pas d’écrasement silencieux', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await expect(page.getByRole('button', { name: 'Partie personnalisée' })).toBeEnabled();
  await page.getByRole('button', { name: 'Découvrir en jouant' }).click();
  expect(await page.locator('input[name=parti]:checked').count()).toBe(0);
  await page.getByRole('button', { name: 'Commencer la découverte' }).click();
  await expect(page.locator('#dec-erreur')).toContainText('Choisissez une famille politique');
  // Une partie existe : il faut confirmer le remplacement
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Commencer la découverte' }).click();
  const avant = await sauve(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Découvrir en jouant' }).click();
  await page.getByRole('radio').nth(2).check();
  await page.getByRole('button', { name: 'Commencer la découverte' }).click();
  await expect(page.locator('#dec-erreur')).toContainText('Je remplace ma partie sauvegardée');
  expect((await sauve(page)).graineInitiale).toBe(avant.graineInitiale);
  await expect(page.getByRole('button', { name: 'Exporter ma partie' })).toBeVisible();
});

test('initiation complète : voie courte, ressources engagées, effet observé, débrief, la partie continue', async ({ page }) => {
  const erreurs = []; page.on('pageerror', (e) => erreurs.push(e.message));
  let mission = await decouverte(page);
  await expect(mission.locator('[data-option]')).toHaveCount(2);
  await expect(mission).toContainText('personnage fictif');
  const env = (await sauve(page)).finances.enveloppe;
  await mission.getByRole('button', { name: 'Choisir : Recrutement de soignants' }).click();
  await expect(page.locator('#h-mission')).toBeFocused();
  expect((await sauve(page)).finances.enveloppe).toBeCloseTo(env - 0.15, 5);
  expect(await etapeEtat(mission, 'choisir')).toBe('fait');
  expect(await etapeEtat(mission, 'service')).toBe('en_cours');
  for (let i = 0; i < 4; i++) await moisSuivant(page);
  mission = page.getByRole('region', { name: /^Mission/ });
  expect(await etapeEtat(mission, 'service')).toBe('fait');
  expect(await etapeEtat(mission, 'effet')).toBe('fait');
  for (let i = 0; i < 2; i++) await moisSuivant(page);
  const e = await sauve(page);
  if (e.fin) test.skip(true, 'fin anticipée pour cette graine (couverte par les tests moteur)');
  await expect(mission.locator('#debrief-mission')).toContainText('Réalisation obtenue');
  await expect(mission.locator('#debrief-mission')).toContainText('Encore attendu');
  expect(e.mission.debrief.effetObserve).toBeGreaterThan(0);
  expect(e.tour).toBe(6);
  await moisSuivant(page); // la partie continue sans remise à zéro
  expect((await sauve(page)).tour).toBe(7);
  expect(erreurs).toEqual([]);
});

test('différer puis rien : occasion manquée, résultat distinct ; reprise au milieu identique', async ({ page }) => {
  let mission = await decouverte(page, 'RN', 77);
  await mission.getByRole('button', { name: 'Différer pour l’instant' }).click();
  await expect(page.locator('#h-mission')).toBeFocused();
  await expect(mission).toContainText('Décision différée');
  for (let i = 0; i < 3; i++) await moisSuivant(page);
  const avant = await sauve(page);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  mission = page.getByRole('region', { name: /^Mission/ });
  expect((await sauve(page)).mission).toEqual(avant.mission);
  await expect(mission.locator('[data-option]')).toHaveCount(2); // on peut encore choisir
  for (let i = 0; i < 3; i++) await moisSuivant(page);
  const e = await sauve(page);
  if (e.fin) test.skip(true, 'fin anticipée pour cette graine');
  await expect(mission.locator('#debrief-mission')).toContainText('Objectif non atteint');
});

test('investissement lent : présenté sans effet pendant la mission, puis « engagement pris »', async ({ page }) => {
  const mission = await decouverte(page, 'DR', 5);
  await expect(mission.locator('[data-option=centres-sante]')).toContainText('aucun effet : résultats après la mission');
  await mission.getByRole('button', { name: 'Choisir : Centres de santé' }).click();
  for (let i = 0; i < 6; i++) await moisSuivant(page);
  if ((await sauve(page)).fin) test.skip(true, 'fin anticipée');
  await expect(mission.locator('#debrief-mission')).toContainText('Engagement pris');
});

test('ancienne partie (v12) : aucune mission ajoutée', async ({ page }) => {
  await decouverte(page);
  await page.evaluate((c) => { const e = JSON.parse(localStorage.getItem(c)); e.version = 12; delete e.mission; localStorage.setItem(c, JSON.stringify(e)); }, CLE);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await expect(page.getByRole('region', { name: 'Votre mandat' })).toBeVisible();
  await expect(page.locator('#mission')).toHaveCount(0);
  expect((await sauve(page)).mission ?? null).toBeNull();
});

test('bilan du mois et engagements : la décision, sa suite et son échéance', async ({ page }) => {
  const mission = await decouverte(page, 'ECOS', 31);
  await mission.getByRole('button', { name: 'Choisir : Recrutement de soignants' }).click();
  const attendu = page.getByRole('region', { name: 'Qu’attends-je de mes décisions ?' });
  await expect(attendu).toContainText('Recrutement de soignants');
  await expect(attendu).toContainText('Mise en service');
  await moisSuivant(page);
  const bilan = page.locator('#bilan-mois');
  await expect(bilan).toContainText('Lancement : Recrutement de soignants');
  await moisSuivant(page); await moisSuivant(page); await moisSuivant(page);
  // Mois 4 : premier effet local, attribué au projet, visible même s'il pèse peu au niveau national
  await expect(page.locator('#bilan-mois')).toContainText(/Recrutement de soignants.*accès aux soins/);
});

test('fiche détaillée : accessible au clavier, sans modifier la partie', async ({ page }) => {
  await decouverte(page, 'HOR', 8);
  const avant = JSON.stringify(await sauve(page));
  await page.getByRole('tab', { name: 'Décisions' }).or(page.getByRole('navigation', { name: 'Sections principales' }).getByRole('button', { name: 'Décisions', exact: true })).locator('visible=true').first().click();
  const resume = page.locator('#panneau details summary', { hasText: 'Fiche détaillée' }).first();
  await resume.focus();
  await page.keyboard.press('Enter');
  const fiche = page.locator('#panneau details[open]', { hasText: 'Effets théoriques' }).first();
  await expect(fiche).toContainText('Premiers effets');
  await expect(fiche).toContainText('Étape institutionnelle');
  await expect(fiche).toContainText('le total futur n’est pas garanti');
  // Une loi n'a pas de coût chiffré en Md€ : la fiche le dit, au lieu d'afficher « aucun » (qui voudrait dire gratuit)
  await expect(fiche.locator('dd').first()).toContainText('non chiffré');
  await expect(fiche.locator('dd').first()).not.toHaveText(/^aucun$/);
  expect(JSON.stringify(await sauve(page))).toBe(avant);
});

test('fin anticipée pendant la mission : débrief indiqué à l’écran de fin, distinct du score', async ({ page }) => {
  const mission = await decouverte(page, 'GDR', 3);
  await mission.getByRole('button', { name: 'Choisir : Recrutement de soignants' }).click();
  await page.evaluate((c) => { const e = JSON.parse(localStorage.getItem(c)); e.indicateurs.popularite = 1; localStorage.setItem(c, JSON.stringify(e)); }, CLE);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await moisSuivant(page);
  await expect(page.locator('#fin-mission')).toContainText('Engagement pris, effets encore attendus');
  await expect(page.locator('#fin-mission')).toContainText('n’entre pas dans le score');
});
