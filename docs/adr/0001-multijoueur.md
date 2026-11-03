# ADR 0001 : Multijoueur et backend

- **Statut** : proposé (décision reportée)
- **Date** : 2026-11-03

## Contexte
La Phase 6 prévoit un classement, le partage de parties et peut-être un mode multijoueur. Aujourd'hui, le jeu est statique (GitHub Pages) et n'a ni serveur ni comptes. Les données personnelles se limitent à un pseudonyme.

## Décision (Phase 6)
1. **Partage sans serveur** : un « défi » encode la graine et le personnage dans l'URL (`#defi=…`). Le moteur étant déterministe, rejouer un défi avec les mêmes choix donne exactement la même partie.
2. **Classement local** : les 10 meilleurs scores sont stockés dans le `localStorage` du navigateur.
3. **Pas de backend pour l'instant.**

## Options pour la suite

| Option | Avantages | Inconvénients |
|---|---|---|
| A. Statu quo (défis par URL) | Zéro coût, zéro donnée personnelle | Pas de classement global |
| B. BaaS (Supabase ou Firebase) avec classement global | Rapide à mettre en place, offre gratuite | Comptes, RGPD, modération des pseudonymes, triche (score calculé côté client) |
| C. Petit serveur (Node + SQLite) qui **rejoue** les parties | Anti-triche : le serveur rejoue la graine et les actions avec le même moteur pur | Hébergement à maintenir |
| D. Multijoueur temps réel (WebSocket) | Expérience sociale | Coût élevé, conflits de conception avec un rythme posé |

## Recommandation
Si le jeu prend, choisir **C** : le moteur pur et déterministe permet de vérifier un score en rejouant le journal d'actions. Pour le multijoueur, préférer de l'**asynchrone** (chacun joue son tour, comme dans les jeux par correspondance) plutôt que du temps réel, ce qui colle au rythme d'un tour par mois.

## Conséquences
- Pour préparer C, il faudra enregistrer le journal des **actions** (et pas seulement l'état) dans la sauvegarde.
- Toute collecte de pseudonymes impose une politique de confidentialité et une modération.
