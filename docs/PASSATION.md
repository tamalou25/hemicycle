# Passation : Hémicycle (03/11/2026)

## Où en est le projet
- **Branche** : `e0-fondations`, partie de `main`. La PR est en brouillon.
- **`main`** : les phases 1 à 6 (v1) sont mergées et déployées sur https://tamalou25.github.io/hemicycle/
- **Cadrage v2** : validé, avec la roadmap E0 → E7 (voir plus bas).

## Terminé
### v1 (sur `main`)
- Moteur pur avec hasard à graine
- Navette, 49.3 et censure
- Élections
- Événements et budget à 2 leviers
- Mode élu réel (réactions marquées SIMULATION, 0 citation)
- Défis par lien et classement local
- Sauvegardes v4, nettoyées à l'import

### E0 Fondations (cette branche)
- **CSS** : Tailwind compilé localement (`npm run build:css` produit `assets/app.css`, à commiter). Plus aucun CDN.
- **Police** : Source Serif 4 auto-hébergée (licence OFL).
- **Couleurs « bureau »** : bordeaux et laiton ajoutés, ainsi que des variables CSS réutilisables.
- **Registre des causes** (`src/engine/explications.js`) : chaque variation d'un indicateur est attribuée à une cause (loi, budget, événement, conjoncture ou opinion). Il distingue l'observé des prévisions, garde 12 mois et survit à l'export.
- **Encart « Ce qui a changé ce mois-ci »** en haut du tableau de bord.
- **CI** : vérifie que `assets/app.css` est à jour, et le déploiement copie le dossier `assets/`.

## Décisions validées (cadrage v2)
1. Le joueur est **Premier ministre** par défaut. Le Président est une IA, et le mode député est gelé.
2. La carte couvre **13 régions et 5 départements et régions d'outre-mer**. Les autres collectivités d'outre-mer sont exclues pour l'instant.
3. CSS : **Tailwind compilé localement** (fait en E0).
4. Budget en **Md€, en ordres de grandeur sourcés**. Les paramètres d'équilibrage sont étiquetés comme tels.
5. Les fonctionnalités v1 sont conservées et passent au second plan (onglet Parlement). Le capital politique est réservé aux actions politiques.
- Ordre de livraison : web, puis PWA, puis Capacitor (à évaluer en E7, rien d'installé). Multijoueur, comptes et opérations militaires sont hors périmètre.

## Tests exécutés (sur cette branche)
- **Vitest** : 71 tests passent, dont 5 nouveaux sur le registre. Par exemple : la somme des causes égale la variation réelle de chaque indicateur.
- **Playwright** :
  - Les 152 classes CSS utilisées pendant une partie ont toutes une règle dans la feuille compilée.
  - Aucune ressource externe n'est chargée.
  - Le rendu est identique à la version CDN, à la police près.
  - L'encart du bilan s'affiche sans erreur console.
- **Lighthouse** (accueil uniquement, en local) : accessibilité 100, bonnes pratiques 100, performance 93.

## Problèmes connus et points ouverts
- **Pas encore fait dans E0** : `docs/VISION.md` (la vision complète est dans le prompt de cadrage). La CI de cette branche n'a pas encore tourné.
- **Lighthouse** n'a audité que l'accueil, pas le tableau de bord.
- **Le tableau de bord reste une longue page** (environ 7 000 px sur mobile). La refonte en onglets est prévue en E1.
- **Données de départ** : les indicateurs viennent de la presse et de l'OFCE, pas de l'Insee. La dette n'est pas sourcée (valeur par défaut). Les fonctions des élus viennent de Wikipédia et sont à recouper.
- **Régions** absentes, **0 citation** vérifiée.
- **Polices** : seul le sous-ensemble latin est embarqué. Les caractères hors latin utiliseront la police de secours (Georgia).

## Prochaine étape recommandée : E1 « Carte et territoires »
1. Sourcer les données régionales :
   - populations et chômage par région (Insee) ;
   - accès aux soins, indicateur APL (DREES) ;
   - fond de carte IGN Admin Express (licence ouverte à confirmer), simplifié une fois avec mapshaper et commité.
2. Moteur :
   - `territoires.js` : les régions et leurs indicateurs ;
   - `projets.js` : 6 projets (étude → chantier → en service), avec coût de départ, coût annuel et délai ;
   - `finances.js` : enveloppe d'investissement en Md€ ;
   - sauvegarde v5 avec migration depuis v4.
3. Interface :
   - onglets Bureau, Carte, Budget, Parlement, Chronologie ;
   - carte en SVG avec 3 vues et une légende, plus un tableau équivalent ;
   - fiche région ;
   - briefing de 3 alertes.
4. Critère d'acceptation : le parcours « problème → projet → mois → effet expliqué » fonctionne à 390 px et au clavier, et les 71 tests restent verts.
