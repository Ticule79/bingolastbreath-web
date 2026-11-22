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

## Mettre en ligne (à décider)

Il faut un hébergement HTTPS statique. Le dépôt `bingolastbreath` est privé (GitHub Pages payant sur dépôt privé). Options :
1. Nouveau dépôt **public** `bingolastbreath-web` avec le contenu de `web/` → GitHub Pages → `https://ticule79.github.io/bingolastbreath-web/`.
2. Netlify / Vercel / Cloudflare Pages (glisser-déposer du dossier `web/`).

Ensuite : mettre l'URL dans les pages légales (confidentialité : hébergeur du site, stockage local du navigateur).

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
