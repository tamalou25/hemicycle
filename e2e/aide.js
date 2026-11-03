// Aides communes aux tests : accès aux onglets (onglets du haut sur ordinateur, barre du bas sur mobile).
export async function ouvrirOnglet(page, nom) {
  const onglet = page.getByRole('tab', { name: nom });
  if (await onglet.isVisible()) return onglet.click();
  const nav = page.getByRole('navigation', { name: 'Sections principales' });
  const direct = nav.getByRole('button', { name: nom, exact: true });
  if (await direct.count()) return direct.click();
  await nav.getByRole('button', { name: 'Plus' }).click();
  await page.getByRole('group', { name: 'Autres sections' }).getByRole('button', { name: nom }).click();
}

/** Premier texte visible correspondant (la date apparaît dans plusieurs barres, une seule est visible selon l'écran). */
export const texteVisible = (page, motif) => page.getByText(motif).locator('visible=true').first();

/** Déplie toutes les catégories de l'onglet Décisions (6 décisions affichées par défaut). */
export async function toutAfficherDecisions(page) {
  for (let i = 0; i < 6; i++) {
    const b = page.locator('[data-etendre]').first();
    if (!(await b.count())) return;
    await b.click();
  }
}
