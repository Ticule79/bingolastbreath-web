# Bingo Last Breath — web app (PWA)

Version web pour iPhone (et tout navigateur), sans App Store. **Même projet Supabase** que l'app Android :
mêmes comptes, mêmes groupes, mêmes règles (calculées en base). Pas de build : HTML + JS + `supabase-js` (CDN).

## Tester en local

```powershell
python -m http.server 8765 --directory web
```
Puis http://localhost:8765 (aussi : configuration `web` dans `.claude/launch.json`).

## Edge Function

`wikidata` v6 (déployée le 22/11/2026) répond au CORS : l'ajout de célébrités marche depuis le navigateur.

## En ligne

**https://ticule79.github.io/bingolastbreath-web/** — dépôt public `Ticule79/bingolastbreath-web` (branche `main`,
GitHub Pages), qui ne contient que le dossier `web/`. Le dépôt principal reste privé.

Publier une mise à jour (après avoir commité `web/` ici) :

```powershell
git subtree split --prefix web -b web-pages
git push https://github.com/Ticule79/bingolastbreath-web.git web-pages:main
```
Penser à changer `CACHE` dans `sw.js` (ex. `bingo-v3`) pour que les téléphones jettent l'ancienne version.

Reste à faire : mettre l'URL dans les pages légales (confidentialité : hébergeur GitHub Pages, stockage local du navigateur).

## Ce qui marche (testé les 20 et 22/11/2026 sur Supabase réel, comptes de test supprimés ensuite)

Accord 18+ et CGU, pseudo, accueil, rejoindre par code ou lien `?join=CODE`, créer un groupe (durées, dates,
nombre de choix, options, amis), classement dépliable, équipe (joker, retrait, pari secret, mois prédit),
recherche et ajout de célébrités, réglages admin, bonus (avec tirage du thème), membres (admin, exclure, signaler, bloquer),
quitter/supprimer le groupe, saison suivante, notice, menu légal, suppression du compte.

Sur iPhone dans Safari : écran « installe d'abord l'app » (Safari et l'app de l'écran d'accueil n'ont **pas
le même stockage** : un compte créé dans Safari serait perdu).

Depuis la v0.7.2 Android (testé le 22/11/2026) : hors ligne (dernières données en cache, bandeau,
rechargement au retour du réseau, écritures refusées avec un message), tous les bonus cochés à la création,
boutons Tout cocher / Tout décocher.

## Pas encore porté

- « J'ai déjà un compte », « Changer de compte », « Se déconnecter » (Android 0.7.2) : dépendent de la connexion e-mail.

- Personnes non célèbres : ajout, naissance, décès, confirmation (choisir une fiche existante marche).
- Anglais (interface en français seulement).
- Connexion e-mail / Google (le SMTP n'est pas encore configuré de toute façon) : changer de téléphone = perdre son compte.
- Notifications push web.
