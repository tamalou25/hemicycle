# ADR 0003 : modèle d'économie, de diplomatie et de défense stratégique

- **Statut** : accepté (lots 2 à 4 de `docs/VISION-CAMPAGNE.md`)
- **Date** : 2026-11-04
- **Décideurs** : propriétaire (mission du 04/11/2026), Claude

## Contexte
Le jeu a un budget en Md€, six secteurs 0-100 nourris par des programmes, des projets régionaux et des indicateurs macro
(chômage, croissance, inflation, déficit). Il manque une production, des échanges extérieurs et des acteurs étrangers.
Il faut un modèle **limité mais cohérent**, explicable mois par mois, sans double compte avec le budget et les programmes,
et dont les paramètres de comportement étranger ne sont jamais présentés comme des intentions réelles.

## Décision
### Unités et ordre des calculs mensuels (`turn.js`)
1. Institutions (navette, censure, PLF) — inchangé.
2. Effets différés des décisions (`effetsEnCours`) — inchangé ; les investissements économiques et les accords y inscrivent
   leurs effets sur le **déficit** (source `investissement:<id>`, `diplomatie:<id>`).
3. Dynamique macro et bruit — inchangé.
4. **Économie** (`economie.js`, nouveau) : usure des capacités, chantiers d'investissement, demande, production par filière dans
   l'ordre énergie → agriculture → industrie → services (dépendances), importations et exportations en Md€/an, pénuries ;
   effets du mois sur `croissance`, `chomage`, `inflation` (registre des causes, types `economie` et `commerce`).
5. Territoires, finances publiques, secteurs, population — inchangés.
6. **Diplomatie** (`diplomatie.js`) : dérive des relations, échéance des accords, initiatives étrangères, crises ; elle écrit la
   **disponibilité** des importations et les **débouchés** des exportations par partenaire, lus par l'économie **au mois suivant**.
7. **Défense** (`defense.js`) : équipement et disponibilité d'après le budget, les programmes et les engagements.
8. Popularité, sondage, fin, élections, événement — inchangés.

Unités : indices de production et de capacité (100 = niveau de 2025), échanges en **Md€ par an**, coûts en Md€, relations 0-100.

### Pas de double compte
- Le **coût** d'un investissement passe une seule fois : effet planifié sur le déficit (pendant le chantier, puis entretien) et
  inscription du même montant au poste budgétaire pour l'affichage du budget. La production, elle, n'ajoute rien au déficit.
- Le commerce agit sur la croissance **par la production** (les exportations sont produites, les importations comblent les
  manques) ; le solde en Md€ est affiché mais n'ajoute pas un second effet sur la croissance.
- Les programmes nationaux existants (secteurs 0-100) restent inchangés ; seuls « Énergie » et « Défense » reçoivent un lien
  vers l'économie (production d'énergie) et la défense (préparation).

### Partenaires
Identifiants ISO 3166-1 alpha-2 minuscules, identiques à `carte-monde.json` (`de`, `us`, `cn`…), plus `ue` pour l'Union
européenne. Les parts commerciales sont des ordres de grandeur sourcés (Douanes, Banque de France) ; les comportements
diplomatiques (intérêts, seuils d'acceptation, probabilité d'initiative) sont des **paramètres de simulation**.

### Limites assumées
Quatre filières seulement, pas de prix par produit, pas de taux de change, pas de dette extérieure ; diplomatie bilatérale
simplifiée (une relation par partenaire), Union européenne réduite à une relation et à la règle des 3 % ; défense sans
opérations ni géographie militaire.

## Alternatives écartées
- Modèle entrées-sorties complet (trop de paramètres non sourcés, inexplicable au joueur).
- Pays étrangers jouables ou IA économique complète (hors mission : la France seule est jouable).

## Conséquences
- Sauvegarde **v16** (`economie`, `diplomatie`, `defense`, `difficulte`), migration v15 → v16 sans activation rétroactive, puis
  complétion à la reprise (comme `assurerTerritoires`).
- Nouveaux types d'explications : `economie`, `commerce`, `investissement`, `diplomatie`, `defense`.
- Nouvelle vue de carte « Partenaires » et fiche pays ; nouvel onglet « Économie ».
