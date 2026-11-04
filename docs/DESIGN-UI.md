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

## Refonte visuelle « Salle des cartes » (11/2026, branche `campagne-presidence`)
Captures avant / après : `docs/captures/avant-refonte/` et `docs/captures/apres-refonte/` (accueil, campagne, Bureau, Décisions, Carte, Bureau au mois 3 ; mobile 412 px et ordinateur).

### Choix
- **Palette** : fond gris-bleu clair (`#F3F5F9`) et surfaces blanches à la place de l'ivoire parchemin ; encre bleu nuit (`#111C33`) pour le texte et les bandeaux ; **bleu d'action** (`#1E4ED8`) réservé aux boutons principaux, liens et onglet actif ; **ambre** (`#F5B51C` sur fond sombre, `#9A6700` en texte) réservé au temps, aux alertes et aux échéances ; vert (`#157A48`) aux réussites, rouge (`#C0262B`) aux dangers. Les noms Tailwind historiques (`creme`, `carte`, `encre`, `bord`, `doux`, `bleu`, `rouge`, `laiton`) sont conservés avec les nouvelles valeurs ; les couleurs des partis restent des informations, sans mise en avant d'un camp.
- **Identité** : titres en Source Serif 4, corps en sans ; cartes blanches à filet léger et ombre douce ; boutons arrondis (8 px) ; bandeau d'état sombre (date, état du temps, Lecture / Pause, vitesses, Mois suivant) en haut sur ordinateur et dans la barre d'action en bas sur mobile ; onglets soulignés.
- **Prise en main** : l'accueil présente le but, puis trois entrées (Découvrir, Campagne présidentielle, Partie personnalisée) chacune avec une phrase ; au premier mois, « Que puis-je faire ? » (au plus trois priorités avec leur raison : première décision, budget, événement, gouvernement) précède l'état du pays ; les icônes de navigation gardent leur libellé.
- **Temps** : le bouton Lecture pulse en ambre quand le temps est en pause et qu'une action est attendue ; l'état « en marche / en pause » est écrit à côté de la date ; les vitesses sont des boutons à état (`aria-pressed`).
- **Animations** : apparition des messages (200 ms), pulsation du bouton Lecture ; toutes désactivées avec `prefers-reduced-motion`.

### Vérifications
Audit axe (WCAG 2.0/2.1 A et AA, contraste compris) sur l'accueil, la création et les onglets, mobile et ordinateur (`e2e/accessibilite.spec.js`) ; cibles ≥ 44 px, clavier et focus visible (`e2e/presidence.spec.js`, `e2e/cap-mandat.spec.js`) ; aucun débordement horizontal ; contenu non masqué par les barres fixes (barre de vitesse comptée dans le dégagement du bas).

## Écran « Monde » (chantier carte, branche `carte-monde`)
- **Organisation** : carte mondiale zoomable au centre, cadrée à l'arrivée sur la France et ses voisins ; bandeau fixe (date, Lecture / Pause, vitesses, Mois suivant) ; sous le titre, les indicateurs essentiels (chômage, déficit, popularité, tensions, capital, enveloppe) ; à droite (ou dessous sur mobile) : « Votre cap » (urgences + objectifs du mandat), accès Gouvernement / Bureau / Décisions / Parlement / Budget / Journal, panneau « Région » repliable avec la fiche existante (indices, projets en cours, lancement).
- **Carte** : SVG unique (`carte-monde.json`), navigation par `viewBox` (`ctx.monde`, jamais dans l'état de simulation) ; glisser et pincement (pointer events), molette, boutons + / − / FR / EU / Monde, flèches et + / − au clavier sur le cadre ; régions focalisables (Entrée / Espace) ; encarts DROM cliquables ; repères ambre aux positions réelles des DROM ; « Afficher en tableau » pour une lecture sans interaction graphique. Le cadrage et la sélection survivent aux re-rendus (passage du mois).
- **Couleurs** : mer `#D6E2F0`, pays `#F7F9FC` filet `#AEB8CC`, France hors régions `#E3E8F0`, régions en 5 classes séquentielles (légende textuelle), sélection filet ambre épais ; vue Législatives : couleurs des partis avec badge SIMULATION (motifs dans la carte des régions classique).
- **Mobile** : carte de 52 vh en tête, panneaux en dessous, défilement automatique vers la fiche à la sélection ; cibles ≥ 44 px ; barre de vitesse comptée dans le dégagement du bas.
- Captures : `docs/captures/monde-*.png`.
