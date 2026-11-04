// Captures d'écran : node captures.mjs <onglet> <dossier> [prefixe]  (serveur local sur 4173 attendu)
import { chromium, devices } from '@playwright/test';
const [onglet, dossier, prefixe = 'ecran'] = process.argv.slice(2);
const b = await chromium.launch();
const vues = [['ordinateur', { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }], ['mobile-412', { ...devices['Pixel 7'] }], ['mobile-390', { ...devices['iPhone 12'] }]];
for (const [nom, opts] of vues) {
  const ctx = await b.newContext(opts); const page = await ctx.newPage();
  await page.goto('http://localhost:4173/');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Campagne présidentielle' }).click();
  await page.getByRole('radio', { name: /^EPR ·/ }).check();
  await page.getByRole('button', { name: 'Commencer le mandat' }).click();
  await page.locator('#monde').waitFor();
  if (process.env.PREPARE) await page.evaluate(new Function('return (async () => {' + process.env.PREPARE + '})()'));
  if (onglet !== 'Monde') {
    const tab = page.getByRole('tab', { name: onglet });
    if (await tab.isVisible()) await tab.click();
    else { const nav = page.getByRole('navigation', { name: 'Sections principales' }); const d = nav.getByRole('button', { name: onglet, exact: true }); if (await d.count()) await d.click(); else { await nav.getByRole('button', { name: 'Plus' }).click(); await page.getByRole('group', { name: 'Autres sections' }).getByRole('button', { name: onglet }).click(); } }
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dossier}/${prefixe}-${nom}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
