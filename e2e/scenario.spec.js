// Scénario « Douze mois pour convaincre » (entrée « Découvrir en jouant ») : parcours réels, déterministes (graine fixée).
import { test, expect } from '@playwright/test';
import { ouvrirOnglet } from './aide.js';

const CLE = 'hemicycle.save';

/** Lance une découverte puis fixe la graine (partie déterministe) et reprend la partie. */
async function decouverte(page, parti = 'PS', graine = 4242) {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Découvrir en jouant' }).click();
  await page.getByRole('radio', { name: new RegExp(`^${parti} ·`) }).check();
  await page.getByRole('button', { name: 'Commencer la découverte' }).click();
  await expect(page.getByRole('region', { name: 'Douze mois pour convaincre' })).toBeVisible();
  await page.evaluate(([c, g]) => { const e = JSON.parse(localStorage.getItem(c)); e.graine = g; localStorage.setItem(c, JSON.stringify(e)); }, [CLE, graine]);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  return page.getByRole('region', { name: 'Douze mois pour convaincre' });
}
const moisSuivant = (page) => page.getByRole('button', { name: 'Mois suivant' }).locator('visible=true').first().click();
const sauve = (page) => page.evaluate((c) => JSON.parse(localStorage.getItem(c)), CLE);
/** Répond à un éventuel événement en attente (premier choix activé), puis passe au mois suivant. */
async function mois(page) {
  const choix = page.locator('[data-evenement] button:not([disabled])').locator('visible=true').first();
  if (await choix.count()) await choix.click();
  await moisSuivant(page);
}

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


test('découverte : rôle, pouvoirs, problème, engagements ; Bureau avec trois engagements à commencer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Découvrir en jouant' }).click();
  await expect(page.getByText('Premier ministre (personnage fictif)')).toBeVisible();
  await expect(page.getByText('Vos pouvoirs')).toBeVisible();
  await expect(page.getByText('Le problème')).toBeVisible();
  await expect(page.getByText('Trois engagements', { exact: true })).toBeVisible();
  await expect(page.getByText('jugés en novembre 2027')).toBeVisible();
  expect(await page.locator('input[name=parti]:checked').count()).toBe(0);
  const sc = await decouverte(page);
  await expect(sc.locator('[data-engagement]')).toHaveCount(3);
  await expect(sc.locator('[data-engagement][data-etat=manque]')).toHaveCount(3);
  await expect(sc.locator('[data-engagement]').first()).toContainText('À commencer');
  await expect(sc.locator('[data-option]')).toHaveCount(2);
  await expect(page.locator('#priorites [data-priorite=engagement]')).toHaveCount(3);
});

test('parcours constructif : projet lancé, douze mois, conclusion, la partie continue', async ({ page }) => {
  const erreurs = []; page.on('pageerror', (e) => erreurs.push(e.message));
  const sc = await decouverte(page);
  const env = (await sauve(page)).finances.enveloppe;
  await sc.getByRole('button', { name: 'Choisir : Recrutement de soignants' }).click();
  await expect(page.locator('#h-scenario')).toBeFocused();
  expect((await sauve(page)).finances.enveloppe).toBeCloseTo(env - 0.15, 5);
  await expect(page.locator('#toasts')).toContainText('Projet lancé');
  await expect(sc.locator('[data-engagement=soins]')).toHaveAttribute('data-etat', 'partiel');
  await expect(sc.locator('[data-option]')).toHaveCount(0);
  for (let i = 0; i < 12; i++) {
    if ((await sauve(page)).fin) test.skip(true, 'fin anticipée pour cette graine (couverte par les tests moteur)');
    await mois(page);
  }
  const e = await sauve(page);
  if (e.fin) test.skip(true, 'fin anticipée pour cette graine');
  expect(e.tour).toBe(12);
  const concl = page.locator('#conclusion-scenario');
  await expect(concl).toHaveAttribute('open', '');
  await expect(concl.locator('summary')).toContainText('Conclusion :');
  expect(e.scenario.statut).toBe('termine');
  expect(e.scenario.bilan.tour).toBe(12);
  await page.locator('#scenario-poursuivre').click();
  await moisSuivant(page);
  expect((await sauve(page)).tour).toBe(13);
  expect(erreurs).toEqual([]);
});

test('rejouer : même graine, nouvelle partie au mois 0', async ({ page }) => {
  await decouverte(page);
  const avant = await sauve(page);
  for (let i = 0; i < 12; i++) {
    if ((await sauve(page)).fin) test.skip(true, 'fin anticipée pour cette graine');
    await mois(page);
  }
  if ((await sauve(page)).fin) test.skip(true, 'fin anticipée pour cette graine');
  await page.locator('#scenario-rejouer').click();
  await expect.poll(async () => (await sauve(page)).tour).toBe(0);
  const e = await sauve(page);
  expect(e.graineInitiale).toBe(avant.graineInitiale);
  expect(e.scenario.statut).toBe('en_cours');
});

test('crise programmée : maternité au mois 3, dans la région du scénario', async ({ page }) => {
  await decouverte(page);
  for (let i = 0; i < 3; i++) {
    if ((await sauve(page)).fin) test.skip(true, 'fin anticipée pour cette graine');
    await mois(page);
  }
  const e = await sauve(page);
  if (e.fin) test.skip(true, 'fin anticipée pour cette graine');
  expect(e.tour).toBe(3);
  expect(e.evenement).toBe('fermeture-maternite');
  const carte = page.getByRole('alert').filter({ has: page.locator('[data-evenement]') });
  await expect(carte).toContainText(/Menace de fermeture d.une maternité/);
  // La région visée est celle du scénario (la plus fragile en accès aux soins)
  const nom = await page.evaluate(async (id) => { const r = await (await fetch('src/data/regions.json')).json(); return r.regions.find((x) => x.id === id)?.nom; }, e.scenario.region);
  await expect(carte).toContainText(nom);
});

test('compromis : déposer une loi, aperçu d’amendement, amender', async ({ page }) => {
  await decouverte(page, 'PS', 4242);
  await ouvrirOnglet(page, 'Décisions');
  await page.getByRole('button', { name: /^Lois/ }).or(page.getByRole('button', { name: /^Politiques nationales/ })).first().click();
  const proposer = page.locator('button[data-decision]', { hasText: 'Proposer' }).locator('visible=true').first();
  await expect(proposer).toBeEnabled();
  await proposer.click();
  await expect(page.locator('#toasts')).toContainText('Déposé');
  await ouvrirOnglet(page, 'Parlement');
  const ap = page.locator('#apercu-amendement');
  await expect(ap).toBeVisible();
  await expect(ap).toContainText('Vote estimé');
  await expect(ap).toContainText('→');
  // Règle réelle : une seule action parlementaire par mois → amender est refusé le mois du dépôt, avec sa raison
  await expect(page.getByRole('button', { name: 'Amender (1 capital)' })).toBeDisabled();
  await expect(page.locator('#r-amender')).toContainText('déjà agi');
  await moisSuivant(page);
  const e = await sauve(page);
  if (!e.texte) { expect(e.loisRejetees.length).toBe(1); return; } // rejetée à l'Assemblée : plus rien à amender
  await ouvrirOnglet(page, 'Parlement');
  await page.getByRole('button', { name: 'Amender (1 capital)' }).click();
  await expect(page.locator('#toasts')).toContainText('Amendement de compromis');
  expect((await sauve(page)).texte.amendements).toBe(1);
});

test('fin anticipée : l’écran de fin mentionne le scénario', async ({ page }) => {
  await decouverte(page, 'GDR', 3);
  await page.evaluate((c) => { const e = JSON.parse(localStorage.getItem(c)); e.indicateurs.popularite = 1; localStorage.setItem(c, JSON.stringify(e)); }, CLE);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await moisSuivant(page);
  await expect(page.locator('#fin-scenario')).toContainText('Douze mois pour convaincre');
  await expect(page.locator('#fin-scenario')).toContainText('avant l’échéance');
});

test('ancienne partie (v13) : aucun scénario ajouté', async ({ page }) => {
  await decouverte(page);
  await page.evaluate((c) => { const e = JSON.parse(localStorage.getItem(c)); e.version = 13; delete e.scenario; localStorage.setItem(c, JSON.stringify(e)); }, CLE);
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await expect(page.getByRole('region', { name: 'Votre mandat' })).toBeVisible();
  await expect(page.locator('#scenario')).toHaveCount(0);
  expect((await sauve(page)).scenario ?? null).toBeNull();
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
