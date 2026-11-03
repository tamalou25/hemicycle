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
- Les compteurs des pastilles de catégorie ne dépendent plus du filtre de statut, et inversement.

## Critères d'acceptation
- À 412 px, le Bureau tient en **2 écrans au plus**. Les 7 sections sont atteignables en 2 touches au maximum.
- « Mois suivant » est toujours visible.
- Aucune régression : Vitest et Playwright verts (les tests existants sont adaptés seulement si un libellé ou un parcours change légitimement).
- Contraste AA ; navigation au clavier sur ordinateur ; lecteur d'écran : `nav` étiquetée, `aria-current` sur l'entrée active.
