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

```bash
git push https://github.com/Ticule79/bingolastbreath-web.git $(git subtree split --prefix web):main
```
Penser à changer `CACHE` dans `sw.js` (ex. `bingo-v3`) pour que les téléphones jettent l'ancienne version.

Reste à faire : mettre l'URL dans les pages légales (confidentialité : hébergeur GitHub Pages, stockage local du navigateur).

## Ce qui marche (même fonctions que l'app Android 0.7.2, testé le 22/11/2026)

Tout ce que fait l'app Android : accord 18+, pseudo, groupes, équipe, joker, pari secret, mois prédit, recherche
et ajout de célébrités, **personnes non célèbres** (ajout, naissance partielle, décès, confirmation, signalement,
suppression), réglages, bonus (tous cochés à la création), membres, saison suivante, notice et lexique complets,
**français / anglais**, hors ligne, **comptes par e-mail** (protéger le compte, « J'ai déjà un compte », changer de
compte, se déconnecter), suppression du compte.

Un compte protégé par e-mail se retrouve partout : app Android, iPhone, autre navigateur.

## Connexion Google sur le web (désactivée)

Le bouton est prêt mais masqué (`GOOGLE = false` dans `app.js`). Pour l'activer :
1. Supabase → Authentication → URL Configuration → **Redirect URLs** → ajouter
   `https://ticule79.github.io/bingolastbreath-web/` (sinon Supabase renvoie vers le Site URL, le site légal).
2. Passer `GOOGLE = true`, publier.

## Pas encore porté

- Notifications push (pas faites non plus sur Android).
