# ADR 0002 : Applications mobiles avec Capacitor

- **Statut** : accepté (E7)
- **Date** : 2026-11-03

## Contexte
Le jeu est une PWA statique (HTML et JS sans framework), jouable hors ligne. On veut des applications Android et iOS en **réutilisant le code web**.

## Options

| Option | Avantages | Inconvénients |
|---|---|---|
| PWA seule | Rien à maintenir | Pas de présence sur les stores ; installation moins connue sur iOS |
| **Capacitor** | Réutilise `www/` tel quel ; projets natifs standards (Gradle, Xcode) ; plugins natifs si besoin | Deux projets natifs à maintenir ; Xcode obligatoire pour iOS |
| TWA (Android uniquement) | Très léger | Pas d'iOS |
| React Native / Flutter | UI native | Réécriture complète, hors de question |

## Décision
**Capacitor 8.6.0**, avec `webDir: www` produit par `npm run build:mobile`. Les projets `android/` et `ios/` sont commités ; les copies du jeu qu'ils embarquent sont ignorées par git.

## Conséquences
- Le moteur reste pur et la sauvegarde reste dans `localStorage` (WebView), sans serveur.
- Le service worker ne sert à rien dans l'application : les fichiers sont déjà locaux. Son enregistrement échoue sans gêner sur iOS.
- CSS : `viewport-fit=cover` et marges `safe-area-inset-*` pour l'encoche.
- La CI compile un **APK de débogage** (workflow `android.yml`, artefact téléchargeable) pour tester sur un vrai téléphone.

## Non fait (étapes séparées, hors de portée d'un agent)
- Comptes développeur (Google Play : frais unique ; Apple Developer : abonnement annuel).
- Signature des versions de production (keystore Android, certificats Apple) : ne jamais commiter ces clés.
- Icônes natives et écran de démarrage (`@capacitor/assets`).
- Compilation iOS : nécessite un Mac avec Xcode.
- Tests sur appareils réels, fiches des stores, politique de confidentialité, validation par les boutiques.
