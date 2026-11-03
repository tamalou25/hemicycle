# Interface : principes et chantiers (Claude)

## Principes
1. **Mobile d'abord** (412 px) : tout est atteignable au pouce, sans défilement horizontal, avec des cibles d'au moins 44 px.
2. Le Bureau répond dans l'ordre à : **Où en est le pays ? → Quel problème ? → Que puis-je faire ?**
3. **Lisible avant d'être exhaustif** : les détails se déplient, les variations insignifiantes sont masquées.
4. **Bon ou mauvais, toujours explicite** : flèche, texte et couleur ensemble, jamais la couleur seule.
5. **L'interface ne calcule pas le jeu.** Elle met en forme ce que renvoie `src/engine/index.js`. Les seules règles propres à l'interface sont de présentation (sens « meilleur » d'un indicateur, seuils d'affichage).

## Chantier 1 : navigation mobile et Bureau (branche `ui-design`)
### Navigation
- **Mobile (< 640 px)** : barre de navigation **fixe en bas**, à 5 entrées (Bureau, Décisions, Carte, Budget, Plus). « Plus » ouvre un panneau avec Opinion, Parlement et Chronologie.
- Au-dessus, une **barre d'action fixe** avec la date et le bouton **Mois suivant**, toujours visible. Une pastille signale qu'un événement attend une réponse.
- **Ordinateur** : les onglets du haut restent ; « Mois suivant » reste dans l'en-tête, qui devient fixe.
- Le contenu est décalé pour ne jamais être masqué par les barres fixes (et respecte les zones sûres).

### Bureau
1. **État du pays** : une phrase de synthèse (par exemple « 3 indicateurs s'améliorent, 2 se dégradent ce mois-ci ») et 4 indicateurs clés (chômage, déficit, popularité, tensions), chacun avec sa valeur, sa variation sur le mois, une flèche et un libellé « mieux » ou « moins bien ».
2. **À traiter** : le briefing du moteur, avec **un bouton d'action par point** :
   - territoire → « Voir sur la carte » (ouvre la Carte sur la région et la bonne vue) ;
   - événement → « Répondre » ;
   - projet → « Suivre le projet » ;
   - budget → « Ouvrir le budget ».
3. **Ce mois-ci** : les explications en deux colonnes, « Bonnes nouvelles » et « Points de vigilance » (au plus 3 chacune). Les variations négligeables sont masquées et les nombres arrondis. Le détail complet et les prévisions sont repliables.
4. **Tous les indicateurs** : grille compacte sur 2 colonnes (valeur, variation, petite courbe).
5. **Secteurs** : repliés par défaut.

### Décisions
- Les compteurs suivent le principe des **filtres par facettes** : chaque groupe de pastilles ignore son propre filtre mais tient compte des autres. Par exemple, les catégories comptent les décisions du statut choisi. C'était déjà le cas : ce n'était pas un bug.

## Critères d'acceptation
- À 412 px, le Bureau tient en **2 écrans au plus**. Les 7 sections sont atteignables en 2 touches au maximum.
- « Mois suivant » est toujours visible.
- Aucune régression : Vitest et Playwright verts (les tests existants sont adaptés seulement si un libellé ou un parcours change légitimement).
- Contraste AA ; navigation au clavier sur ordinateur ; lecteur d'écran : `nav` étiquetée, `aria-current` sur l'entrée active.

## État du chantier 1 (fait)
- **Navigation mobile** : barre du bas à 5 entrées, panneau « Plus » (Échap ferme, le focus revient au bouton), barre fixe « Mois suivant » avec une pastille si un événement attend. Composant `navigation.js`.
- **Bureau** : composants `etatPays.js` (synthèse et 4 indicateurs clés avec « mieux / moins bien ») et `ceMois.js` (bonnes nouvelles et points de vigilance, sans l'usure récurrente, détail repliable), grille compacte, secteurs repliés.
- **Hauteur du Bureau à 412 px après 3 mois** : environ 1 700 à 1 800 px, contre 2 393 avant, soit moins de 2 écrans. Une vérification e2e l'impose.
- **Tests** : `e2e/navigation.spec.js` et l'aide `e2e/aide.js`. Les captures des tests sont écrites dans `test-results/` (hors dépôt) ; celles de `docs/captures/` sont mises à jour à la main.
- **Reste** : audit de contraste automatisé ; vérification clavier approfondie du panneau « Plus » ; la carte d'un événement non résolu rallonge le Bureau d'environ 900 px (à compacter au chantier 2).

## Chantier 2 (fait)
- **Accessibilité** : audit automatisé axe-core (WCAG 2.0 et 2.1, A et AA, contraste compris) sur l'accueil, la création et les 7 onglets, en mobile et en ordinateur (`e2e/accessibilite.spec.js`). Correction : la liste des décisions urgentes n'est plus une liste sans rôle de liste.
- **Carte d'événement** : environ 645 px sur mobile, contre environ 900 (effets en pastilles, région visée, coûts en Md€, lien vers la carte).
- **Décisions mobile** : filtres sur une ligne défilante par groupe, 6 décisions par catégorie puis « Afficher les N autres », réaction des partis repliable. Hauteur : 11,2 → 5,1 écrans.
- **Budget mobile** : chiffres clés sur 2 colonnes ; les curseurs du PLF sont repliés hors de la période de dépôt.
- **Bureau mobile** : grille « Tous les indicateurs » repliée (ses valeurs principales sont déjà dans « État du pays »).
- **Garde-fou** : `tests/build.test.js` échoue si `sw.js` n'est pas à jour (`npm run build`).
