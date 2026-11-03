# Demandes de l'interface au moteur

L'interface (Claude) ne modifie pas `src/engine/` : elle décrit ici ce dont elle a besoin, et le moteur (Codex) implémente.
Une demande = un bloc. Le moteur indique le statut et la PR quand c'est fait.

## Modèle
### [AAAA-MM-JJ] Titre court
- **Demandé par** : interface / moteur
- **Besoin** : ce que l'écran doit afficher ou permettre
- **Proposition d'API** : fonction exportée (signature, retour) ou champ d'état (nom, type, valeur par défaut)
- **Impact sauvegarde** : aucun / nouveau champ (migration vN → vN+1)
- **Statut** : proposé · accepté · fait (PR #…) · refusé (raison)

## Demandes ouvertes
_Aucune pour l'instant._
