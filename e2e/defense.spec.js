// Défense stratégique (lot 4) : disponibilité expliquée, programme lancé, engagement, option de crise bloquée puis débloquée.
import { test, expect } from '@playwright/test';
import { ouvrirOnglet } from './aide.js';

const CLE = 'hemicycle.save';
const sauve = (page) => page.evaluate((c) => JSON.parse(localStorage.getItem(c)), CLE);
const modifier = (page, corps) => page.evaluate(([c, f]) => { const e = JSON.parse(localStorage.getItem(c)); new Function('e', f)(e); localStorage.setItem(c, JSON.stringify(e)); }, [CLE, corps]);

async function campagne(page) {
  await page.goto('/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Campagne présidentielle' }).click();
  await page.getByRole('radio', { name: /^EPR ·/ }).check();
  await page.getByRole('button', { name: 'Commencer le mandat' }).click();
  await expect(page.locator('#monde')).toBeVisible();
}

test('onglet Défense : disponibilité expliquée, programme lancé (coût, délai), exercice OTAN engagé puis moyens immobilisés', async ({ page }) => {
  await campagne(page);
  await ouvrirOnglet(page, 'Défense');
  const def = page.getByRole('region', { name: 'Défense stratégique' });
  await expect(def).toBeVisible();
  await expect(def).toContainText(/Disponibilité des forces/);
  await def.getByText('D’où vient ce chiffre ?').click();
  await expect(def).toContainText(/Équipement en état/);
  await expect(def).toContainText(/Effort de défense/);
  const prog = page.getByRole('list', { name: 'Programmes de défense possibles' }).locator('li', { hasText: 'Reconstitution des stocks de munitions' });
  await expect(prog).toContainText(/2,5 Md€ sur 12 mois/);
  await prog.getByRole('button', { name: 'Lancer' }).click();
  await expect(page.locator('#toasts')).toContainText(/Programme de défense lancé : Reconstitution/);
  let e = await sauve(page);
  expect(e.defense.programmes[0]).toEqual(expect.objectContaining({ id: 'stocks-munitions', statut: 'chantier' }));
  expect(e.joueur.capital).toBe(3);
  await expect(page.getByRole('list', { name: 'Programmes de défense engagés' })).toContainText(/En commande/);
  const eng = page.getByRole('list', { name: 'Engagements possibles' }).locator('li', { hasText: 'exercice majeur' });
  await eng.getByRole('button', { name: 'Engager' }).click();
  await expect(page.locator('#toasts')).toContainText(/Disponibilité des forces : \d+ → \d+/);
  e = await sauve(page);
  expect(e.defense.engagements[0].id).toBe('exercice-otan');
  expect(e.defense.engagementOtan).toBe(61);
  await expect(page.getByRole('list', { name: 'Engagements en cours' })).toContainText(/exercice majeur/);
});

test('crise sécuritaire : option militaire bloquée quand les forces sont peu disponibles, avec la raison ; disponible sinon', async ({ page }) => {
  await campagne(page);
  await modifier(page, "e.diplomatie.initiative = { id: 'crise-frontiere', pays: 'de', tour: 0 }; e.defense.equipement = 20; e.secteurs.defense = 20; e.defense.disponibilite = 20;");
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await ouvrirOnglet(page, 'Bureau');
  const init = page.locator('#initiative');
  await expect(init).toContainText(/Crise sécuritaire impliquant Allemagne/);
  const mil = init.getByRole('button', { name: /Contribuer militairement/ });
  await expect(mil).toBeDisabled();
  await expect(init).toContainText(/Disponibilité des forces insuffisante/);
  await expect(page.locator('#monde, #panneau')).toContainText(/Forces peu disponibles|Disponibilité des forces insuffisante/);
  await modifier(page, "e.defense.equipement = 70; e.secteurs.defense = 70; e.defense.disponibilite = 70;");
  await page.reload();
  await page.getByRole('button', { name: /Reprendre/ }).click();
  await ouvrirOnglet(page, 'Bureau');
  await expect(page.locator('#initiative').getByRole('button', { name: /Contribuer militairement/ })).toBeEnabled();
  await page.locator('#initiative').getByRole('button', { name: /Contribuer militairement/ }).click();
  const e = await sauve(page);
  expect(e.defense.engagements[0]).toEqual(expect.objectContaining({ type: 'operation', pays: 'de' }));
  expect(e.finances.enveloppe).toBeCloseTo(0, 3);
  await ouvrirOnglet(page, 'Défense');
  await expect(page.getByRole('list', { name: 'Engagements en cours' })).toContainText(/Opération extérieure \(Allemagne\)/);
});
