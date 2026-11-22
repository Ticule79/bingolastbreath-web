// Bingo Last Breath — web app (PWA) pour iPhone et navigateurs. Même projet Supabase que l'app Android :
// mêmes comptes, mêmes groupes, mêmes règles (calculées en base). Mêmes fonctions que l'app Android 0.7.2.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm'

const SUPABASE_URL = 'https://kqnakimdaivvlyzreevf.supabase.co'
const SUPABASE_KEY = 'sb_publishable_FmmCi5ynO_Ok7ODB1Vw1Uw_Fd3TKNcU' // clé publiable : faite pour être publique (RLS)
const LEGAL = 'https://ticule79.github.io/bingolastbreath-legal/'
const EMAIL = 'novera.app.contact@gmail.com'
const LEGAL_VERSION = 1 // comme Legal.VERSION côté Android : à incrémenter si CGU/politique changent sur le fond
// Connexion Google par redirection : l'adresse de la web app est autorisée dans Supabase → Authentication →
// URL Configuration → Redirect URLs (https://ticule79.github.io/bingolastbreath-web/**, ajoutée le 22/11/2026).
const GOOGLE = true

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'bingo-auth' },
  global: { fetch: (...a) => fetch(...a) }, // fetch relu à chaque appel : permet de simuler le hors ligne en test
})

// ------------------------------------------------------------------ outils

const $app = document.getElementById('app')
const dlg = document.getElementById('dlg')
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { return null } }
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches

// ------------------------------------------------------------------ langue (comme I18n.kt)
// Propre à chaque appareil : un joueur en anglais partage ses groupes avec des joueurs en français.

let en = store('lang') ? store('lang') === 'en' : !(navigator.language || '').toLowerCase().startsWith('fr')
const tr = (fr, e) => (en ? e : fr)
const locale = () => (en ? 'en-GB' : 'fr-FR')
function setLang(english) {
  en = english
  store('lang', english ? 'en' : 'fr')
  document.documentElement.lang = english ? 'en' : 'fr'
  document.getElementById('offline').textContent = tr(
    "📡 Hors ligne : dernières données connues. L'appli s'actualisera dès que la connexion reviendra.",
    '📡 Offline: showing the last known data. The app will refresh as soon as the connection is back.')
}
setLang(en)
const legal = {
  privacy: () => LEGAL + tr('confidentialite/', 'en/privacy/'),
  terms: () => LEGAL + tr('conditions/', 'en/terms/'),
  notice: () => LEGAL + tr('mentions-legales/', 'en/legal-notice/'),
}

// Messages et libellés du serveur (triggers SQL, Edge Function, bonus) : rédigés en français en base,
// traduits à l'affichage. Même table que I18n.kt — tout nouveau message SQL doit être ajouté aux deux.
const SERVER_TEXTS = [
  ['(.+) est déjà choisi\\(e\\) par un autre joueur\\.', '$1 has already been picked by another player.'],
  ['(.+) est déjà décédé\\(e\\)\\.', '$1 has already died.'],
  ['Aucun décès déclaré\\.', 'No death has been declared.'],
  ["Cette personne a demandé à ne pas figurer dans le jeu\\.", 'This person has asked not to appear in the game.'],
  ["Cette personne n'est pas disponible dans ce groupe\\.", "This person isn't available in this group."],
  ['Choix introuvable\\.', 'Pick not found.'],
  ['Code inconnu\\.', 'Unknown code.'],
  ['Durée maximale : 10 ans\\.', 'Maximum length: 10 years.'],
  ['La date de décès ne peut pas être dans le futur\\.', "The date of death can't be in the future."],
  ['La fin doit être après le début\\.', 'The end must be after the start.'],
  ["La prédiction du mois n'est pas activée dans ce groupe\\.", "Month prediction isn't enabled in this group."],
  ['La saison a commencé : les bonus sont figés\\.', 'The season has started: bonuses are locked.'],
  ['La saison doit commencer au plus tôt demain\\.', 'The season must start tomorrow at the earliest.'],
  ['Le joker doit avoir moins de 50 ans au (.+)\\.', 'The joker must be under 50 on $1.'],
  ['Le mois prédit doit être pendant la saison\\.', 'The predicted month must fall within the season.'],
  ["Le pari secret n'est pas activé dans ce groupe\\.", "Secret bets aren't enabled in this group."],
  ['Les choix sont verrouillés : la fiche ne peut plus être modifiée\\.', 'Picks are locked: this entry can no longer be changed.'],
  ['Les choix sont verrouillés depuis le (.+)\\.', 'Picks have been locked since $1.'],
  ['Les personnes non célèbres sont désactivées dans ce groupe\\.', 'Non-famous people are disabled in this group.'],
  ['Membre introuvable\\.', 'Member not found.'],
  ['Modification interdite\\.', "This change isn't allowed."],
  ['Nombre de choix : 3, 5, 10 ou 20\\.', 'Number of picks: 3, 5, 10 or 20.'],
  ['Non connecté\\.', 'Not signed in.'],
  ['Personne introuvable\\.', 'Person not found.'],
  ['Réservé au créateur du groupe\\.', "Only the group's creator can do this."],
  ['Réservé aux administrateurs du groupe\\.', "Only the group's admins can do this."],
  ["Seul l'auteur de la fiche ou le créateur du groupe peut déclarer ce décès\\.", "Only the entry's author or a group admin can declare this death."],
  ["Seul l'auteur de la fiche ou le créateur du groupe peut la modifier\\.", "Only the entry's author or a group admin can change it."],
  ['Tu as déjà (\\d+) choix\\.', 'You already have $1 picks.'],
  ["Tu n'es pas membre de ce groupe\\.", "You're not a member of this group."],
  ['Identifiant Wikidata invalide\\.', 'Invalid Wikidata ID.'],
  ['Personne introuvable sur Wikidata\\.', 'Person not found on Wikidata.'],
  ['Wikidata indisponible, réessaie plus tard\\.', 'Wikidata is unavailable, try again later.'],
  ["(.+) n'est pas une personne\\.", '$1 is not a person.'],
  ['Date de naissance inconnue pour (.+)\\.', 'Unknown date of birth for $1.'],
  ['90 ans ou plus : 0 point', '90 or older: 0 points'],
  ['moins de 30 ans ×1,5', 'under 30 ×1.5'],
  ['anniversaire ×2', 'birthday ×2'],
  ['thème du mois ×1,5', 'theme of the month ×1.5'],
  ['pari secret ×1,5', 'secret bet ×1.5'],
  ['exclusif ×1,2', 'exclusive ×1.2'],
  ['choisi par tous ÷(\\d+)', 'picked by everyone ÷$1'],
  ['premier sang \\+25', 'first blood +25'],
  ['premier mois \\+10', 'first month +10'],
  ['7 derniers jours \\+15', 'last 7 days +15'],
  ['date maudite \\+13', 'cursed date +13'],
  ['mois prédit \\+30', 'predicted month +30'],
  ['doublé \\+(\\d+)', 'double +$1'],
  ['carton plein \\+100', 'full house +100'],
].map(([fr, e]) => [new RegExp('^' + fr + '$'), e])
function serverText(fr) {
  if (!en) return fr
  for (const [re, e] of SERVER_TEXTS) { const m = fr.match(re); if (m) return e.replace('$1', m[1] ?? '') }
  return fr
}

let toastTimer
function toast(m) {
  const t = document.getElementById('toast')
  t.textContent = m
  t.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.classList.remove('show'), 3800)
}

// ------------------------------------------------------------------ hors ligne (comme l'app Android 0.7.2)
// Chaque lecture réussie est gardée ; sans réseau, on ressert la dernière et un bandeau s'affiche.
// Les écritures échouent avec un message (pas de file d'attente).

const offlineText = () => tr('Hors ligne : cette action attendra le retour de la connexion.', 'Offline: this action needs a connection.')
const isNetErr = e => !navigator.onLine || /Failed to fetch|NetworkError|Load failed/i.test(e?.message || String(e))
const setOffline = off => document.body.classList.toggle('offline', off)

// ponytail: dernière réponse de chaque lecture en localStorage (~5 Mo max) ; IndexedDB si ça grossit.
async function cached(key, fn) {
  try {
    const v = await fn()
    store('c:' + key, JSON.stringify(v))
    setOffline(false)
    return v
  } catch (e) {
    if (!isNetErr(e)) throw e
    setOffline(true)
    const c = store('c:' + key)
    if (c != null) return JSON.parse(c)
    throw new Error(offlineText())
  }
}
function clearCache() {
  try { Object.keys(localStorage).filter(k => k.startsWith('c:')).forEach(k => localStorage.removeItem(k)) } catch {}
}

addEventListener('offline', () => setOffline(true))
addEventListener('online', () => { setOffline(false); if (st.profile) route(); else if (store('legal_version')) boot() })

function errText(e) {
  const m = e?.message || String(e)
  if (m.includes('Anonymous sign-ins are disabled')) return tr('Connexion anonyme désactivée sur le serveur.', 'Anonymous sign-in is disabled on the server.')
  if (isNetErr(e)) { setOffline(true); return offlineText() }
  if (m.includes('Failed to send a request to the Edge Function')) return tr('Serveur injoignable, réessaie plus tard.', 'Server unreachable, try again later.')
  return serverText(m)
}
async function q(p) { const { data, error } = await p; if (error) throw new Error(error.message); return data }

// Dates au format ISO « AAAA-MM-JJ », calculées en UTC pour éviter les décalages d'heure d'été.
const pad = n => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
const parts = s => s.split('-').map(Number)
const utc = s => { const [y, m, d] = parts(s); return new Date(Date.UTC(y, m - 1, d)) }
const addDays = (s, n) => { const t = utc(s); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10) }
const diffDays = (a, b) => Math.round((utc(b) - utc(a)) / 864e5)
function addMonths(s, n) { // comme LocalDate.plusMonths : jour ramené au dernier du mois si besoin
  const [y, m, d] = parts(s)
  const first = new Date(Date.UTC(y, m - 1 + n, 1))
  const dim = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return iso(first.getUTCFullYear(), first.getUTCMonth() + 1, Math.min(d, dim))
}
const localToday = () => { const d = new Date(); return iso(d.getFullYear(), d.getMonth() + 1, d.getDate()) }
const parisToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
const ageAt = (b, at) => { const [by, bm, bd] = parts(b), [ay, am, ad] = parts(at); return ay - by - (am < bm || (am === bm && ad < bd) ? 1 : 0) }
const fmt = (s, o) => new Date(s + 'T12:00:00Z').toLocaleDateString(locale(), { ...o, timeZone: 'UTC' })
const show = s => fmt(s, { day: 'numeric', month: 'short', year: 'numeric' })
const monthName = s => fmt(s, { month: 'long', year: 'numeric' })
const pointsFor = (age, joker) => (age >= 100 ? 1 : 100 - age) * (joker ? 2 : 1)
const plural = (n, one, many) => (n > 1 ? many : one)
const colon = tr(' : ', ': ')

/** Naissance saisie à la main (comme parseBirth) : année seule, mois + année, ou date complète ; null si incohérente. */
function parseBirth(d, m, y) {
  if (!d && !m && !y) return { date: null, precision: 'day' }
  if (y.length !== 4) return null
  let r
  if (!m) r = d ? null : { date: iso(+y, 1, 1), precision: 'year' }
  else if (!d) r = { date: iso(+y, +m, 1), precision: 'month' }
  else r = { date: iso(+y, +m, +d), precision: 'day' }
  if (!r) return null
  const [yy, mm, dd] = parts(r.date), t = utc(r.date)
  if (t.getUTCFullYear() !== yy || t.getUTCMonth() + 1 !== mm || t.getUTCDate() !== dd) return null
  return r.date > localToday() ? null : r
}
const birthText = (date, precision) => (precision === 'year' ? date.slice(0, 4) : precision === 'month' ? monthName(date) : show(date))

// Saison : verrouillage à minuit (heure de Paris) le jour du début.
const locked = g => parisToday() >= g.season_start
const period = g => tr(`du ${show(g.season_start)} au ${show(g.season_end)}`, `from ${show(g.season_start)} to ${show(g.season_end)}`)
const lastOpenDay = g => show(addDays(g.season_start, -1))
function seasonMonths(g) {
  const out = []
  for (let m = g.season_start.slice(0, 8) + '01'; m <= g.season_end; m = addMonths(m, 1)) out.push(m)
  return out
}
/** Saison suivante : commence le lendemain de la fin (au plus tôt demain), même durée en mois + jours. */
function nextSeason(g) {
  const start = [addDays(g.season_end, 1), addDays(localToday(), 1)].sort().pop()
  const endExcl = addDays(g.season_end, 1)
  let months = 0
  while (addMonths(g.season_start, months + 1) <= endExcl) months++
  const days = diffDays(addMonths(g.season_start, months), endExcl)
  return [start, addDays(addDays(addMonths(start, months), days), -1)]
}
function roman(n) {
  return [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v } return s }, '')
}

const ICON = {
  back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  share: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>',
  more: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
  star: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
  trash: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
}
const spinner = '<div class="center"><div class="spinner"></div></div>'
const pts = (n, gold) => `<span class="pts ${gold ? 'gold-t' : ''}">${n}<small>pts</small></span>`
const roleBadge = r => (r === 'owner' ? ' 👑' : r === 'admin' ? ' 🛡' : '')
const top = (kicker, title, left = '<span></span>', right = '<span></span>') =>
  `<header class="top">${left}<div><div class="kicker">${kicker}</div><h1>${h(title)}</h1></div>${right}</header>`
const actions = (ok, cancel = tr('Annuler', 'Cancel')) => `<div class="actions"><button type="button" class="text dim" data-close>${cancel}</button>${ok}</div>`
const langChips = () => `<div class="chips" style="justify-content:center">
  <label><input type="radio" name="lang" value="fr" ${en ? '' : 'checked'} data-act="lang"><span>Français</span></label>
  <label><input type="radio" name="lang" value="en" ${en ? 'checked' : ''} data-act="lang"><span>English</span></label></div>`

// ------------------------------------------------------------------ règles affichées (calcul réel en base)

const BONUSES = () => [
  ['exclusive', tr('Exclusivité', 'Exclusive'), tr('Choisie par un seul joueur : ×1,2 (doublons autorisés).', 'Picked by only one player: ×1.2 (duplicates allowed).')],
  ['consensus', tr('Consensus', 'Consensus'), tr('Choisie par tous les joueurs : points divisés par le nombre de joueurs (doublons autorisés).', 'Picked by every player: points divided by the number of players (duplicates allowed).')],
  ['first_blood', tr('Premier sang', 'First blood'), tr('Premier décès de la saison dans le groupe : +25.', 'First death of the season in the group: +25.')],
  ['young', tr('Jeunesse', 'Youth'), tr('Mort avant 30 ans : ×1,5.', 'Died under 30: ×1.5.')],
  ['sprint', tr('Sprint', 'Sprint'), tr('Décès dans le premier mois de la saison : +10.', 'Death in the first month of the season: +10.')],
  ['suspense', tr('Suspense', 'Suspense'), tr('Décès dans les 7 derniers jours de la saison : +15.', 'Death in the last 7 days of the season: +15.')],
  ['double', tr('Doublé', 'Double'), tr('Deux de tes choix meurent le même mois : +20 (par mois).', 'Two of your picks die in the same month: +20 (per month).')],
  ['full_house', tr('Carton plein', 'Full house'), tr('Toute ton équipe (complète) meurt pendant la saison : +100.', 'Your whole (full) team dies during the season: +100.')],
  ['birthday', tr('Anniversaire', 'Birthday'), tr('Décès le jour de son anniversaire : ×2.', 'Death on their birthday: ×2.')],
  ['cursed_date', tr('Date maudite', 'Cursed date'), tr('Décès un vendredi 13, un 1er janvier ou un 31 décembre : +13.', 'Death on a Friday the 13th, 1 January or 31 December: +13.')],
  ['old', tr('Malus « trop facile »', '"Too easy" penalty'), tr('90 ans ou plus pendant le premier mois de la saison : 0 point.', '90 or older during the first month of the season: 0 points.')],
  ['theme', tr('Thème du mois', 'Theme of the month'), tr('Chaque mois a un thème tiré au sort (les 6 thèmes, 2 fois chacun sur 12 mois). Décès dans le thème de son mois (métier Wikidata) : ×1,5.', 'Each month gets a random theme (the 6 themes, twice each over 12 months). Death matching that month\'s theme (Wikidata occupation): ×1.5.')],
  ['secret', tr('Pari secret', 'Secret bet'), tr("Un choix par joueur, caché aux autres jusqu'à sa mort : ×1,5.", 'One pick per player, hidden from the others until they die: ×1.5.')],
  ['prediction', tr('Prédiction du mois', 'Month prediction'), tr("Devine le mois du décès d'un de tes choix : +30 si c'est juste.", "Guess the month one of your picks dies: +30 if you're right.")],
]
const BONUS_KEYS = BONUSES().map(([k]) => k)
const THEMES = () => ({
  musique: tr('Musique', 'Music'), sport: 'Sport', politique: tr('Politique', 'Politics'),
  cinema: tr('Cinéma et télévision', 'Film and TV'), litterature: tr('Littérature', 'Literature'), sciences: tr('Sciences', 'Science'),
})

// ------------------------------------------------------------------ données

let me = null // identifiant du compte

const api = {
  async ensureUser() {
    const { data: { session } } = await sb.auth.getSession()
    if (session) return (me = session.user.id)
    const { data, error } = await sb.auth.signInAnonymously()
    if (error) throw new Error(error.message)
    return (me = data.user.id)
  },
  async myProfile() {
    await api.ensureUser()
    await q(sb.rpc('touch')).catch(() => {}) // dernière visite (sautée hors ligne) : purge des comptes inactifs après 3 ans
    return cached('profile', () => q(sb.from('profiles').select('id,display_name').eq('id', me).maybeSingle()))
  },
  saveProfile: name => q(sb.from('profiles').upsert({ id: me, display_name: name.trim() })),
  myGroups: () => cached('groups', () => q(sb.from('groups').select('*,group_members!inner(user_id)').eq('group_members.user_id', me).order('created_at', { ascending: false }))),
  group: id => cached('group:' + id, () => q(sb.from('groups').select('*').eq('id', id).single())),
  createGroup: n => q(sb.rpc('create_group', {
    p_name: n.name, p_allow_duplicates: n.duplicates, p_allow_manual: n.manual, p_show_picks: n.showPicks,
    p_start: n.start, p_end: n.end, p_max_picks: n.maxPicks, p_members: n.friends, p_bonuses: n.bonuses,
  })),
  joinGroup: code => q(sb.rpc('join_group', { p_code: code })),
  updateSettings: (g, name, dup, manual, showPicks) => q(sb.rpc('update_group_settings', {
    p_group: g.id, p_name: name, p_allow_duplicates: dup, p_allow_manual: manual, p_show_picks: showPicks,
  })),
  setBonuses: (g, list) => q(sb.rpc('set_bonuses', { p_group: g.id, p_bonuses: list })),
  setPickOptions: (gid, pid, secret, month) => q(sb.rpc('set_pick_options', { p_group: gid, p_person: pid, p_secret: secret, p_month: month })),
  standings: gid => cached('standings:' + gid, () => q(sb.from('standings').select('*').eq('group_id', gid)
    .order('points', { ascending: false }).order('deaths', { ascending: false }).order('display_name'))),
  /** En anglais, complète avec la description Wikidata anglaise (colonne persons.description_en). */
  async picks(gid) {
    const picks = await cached('picks:' + gid, () => q(sb.from('pick_scores').select('*').eq('group_id', gid).order('created_at')))
    const ids = [...new Set(picks.filter(p => p.source === 'wikidata').map(p => p.person_id))]
    if (!en || !ids.length) return picks
    const rows = await cached('desc_en:' + gid, () => q(sb.from('persons').select('id,description_en').in('id', ids))).catch(() => [])
    const m = Object.fromEntries(rows.map(r => [r.id, r.description_en]))
    return picks.map(p => ({ ...p, description: m[p.person_id] || p.description }))
  },
  manualPersons: gid => cached('manual:' + gid, () => q(sb.from('persons').select('*').eq('group_id', gid).eq('source', 'manual').order('name'))),
  addManualPerson: (gid, name, birth, description) => q(sb.rpc('add_manual_person', {
    p_group: gid, p_name: name, p_birth_date: birth.date, p_description: description || null, p_birth_precision: birth.precision,
  })),
  setManualBirth: (pid, birth) => q(sb.rpc('set_manual_birth', { p_person: pid, p_birth_date: birth.date, p_birth_precision: birth.precision })),
  deleteManualPerson: pid => q(sb.rpc('delete_manual_person', { p_person: pid })),
  setManualDeath: (pid, death, age) => q(sb.rpc('set_manual_death', { p_person: pid, p_death_date: death, p_age: age })),
  confirmManualDeath: pid => q(sb.rpc('confirm_manual_death', { p_person: pid })),
  addPick: (gid, pid) => q(sb.from('picks').insert({ group_id: gid, user_id: me, person_id: pid })),
  removePick: (gid, pid) => q(sb.from('picks').delete().eq('group_id', gid).eq('user_id', me).eq('person_id', pid)),
  setJoker: (gid, pid) => q(sb.rpc('set_joker', { p_group: gid, p_person: pid })),
  leave: g => q(sb.from('group_members').delete().eq('group_id', g.id).eq('user_id', me)),
  kick: (g, uid) => q(sb.from('group_members').delete().eq('group_id', g.id).eq('user_id', uid)),
  setAdmin: (g, uid, admin) => q(sb.rpc('set_admin', { p_group: g.id, p_user: uid, p_admin: admin })),
  deleteGroup: g => q(sb.from('groups').delete().eq('id', g.id)),
  blockedIds: async () => new Set((await cached('blocks', () => q(sb.from('blocks').select('blocked_id')))).map(b => b.blocked_id)),
  block: uid => q(sb.from('blocks').upsert({ blocked_id: uid }, { ignoreDuplicates: true })),
  unblock: uid => q(sb.from('blocks').delete().eq('blocked_id', uid)),
  async friends() {
    const blocked = await api.blockedIds()
    return (await q(sb.from('profiles').select('id,display_name').neq('id', me).order('display_name'))).filter(p => !blocked.has(p.id))
  },
  /** Signalement (DSA art. 16) : lu par l'éditeur dans le tableau de bord Supabase. */
  report: (label, reason, o = {}) => q(sb.from('reports').insert({
    target_label: label.slice(0, 200), reason: reason.trim(),
    target_user_id: o.userId ?? null, group_id: o.groupId ?? null, person_id: o.personId ?? null,
  })),
  async deleteAccount() {
    await q(sb.rpc('delete_my_account'))
    await api.forget()
  },
  /** Oublie la session locale (déconnexion, compte supprimé) : le prochain lancement crée un compte neuf. */
  async forget() {
    await sb.auth.signOut({ scope: 'local' }).catch(() => {})
    clearCache()
    me = null
  },
  /** Enregistre (ou retrouve) une célébrité ; les dates sont relues côté serveur sur Wikidata. */
  async addCelebrity(qid) {
    const { data, error } = await sb.functions.invoke('wikidata', { body: { action: 'add', id: qid } })
    if (!error) return data
    let msg = error.message
    try { const b = await error.context.json(); msg = b.error || b.message || msg } catch {}
    throw new Error(msg)
  },
  /** Recherche plein texte limitée aux humains, puis noms, descriptions et dates en une requête SPARQL. */
  async searchCelebrities(query) {
    const s = await fetch('https://www.wikidata.org/w/api.php?action=query&list=search&srlimit=20&srprop=&format=json&origin=*&srsearch=' +
      encodeURIComponent(query.trim() + ' haswbstatement:P31=Q5'))
    if (!s.ok) throw new Error(tr('Wikidata indisponible.', 'Wikidata is unavailable.'))
    const ids = (await s.json()).query.search.map(x => x.title)
    if (!ids.length) return []
    const sparql = `SELECT ?item ?itemLabel ?itemDescription ?birth ?death WHERE {
      VALUES ?item { ${ids.map(i => 'wd:' + i).join(' ')} }
      ?item wdt:P569 ?birth . OPTIONAL { ?item wdt:P570 ?death }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "${en ? 'en,mul,fr' : 'fr,mul,en'}". } }`
    const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql), { headers: { Accept: 'application/sparql-results+json' } })
    if (!r.ok) throw new Error(tr('Wikidata indisponible.', 'Wikidata is unavailable.'))
    const rows = {}
    for (const b of (await r.json()).results.bindings) rows[b.item.value.split('/').pop()] = b
    const date = v => (v && /^\d{4}-\d\d-\d\d/.test(v) ? v.slice(0, 10) : null)
    return ids.filter(id => rows[id]).map(id => { // garde l'ordre de pertinence
      const b = rows[id]
      return { qid: id, name: b.itemLabel?.value ?? id, description: b.itemDescription?.value, birth: date(b.birth?.value), death: date(b.death?.value) }
    })
  },
}

// ------------------------------------------------------------------ comptes : e-mail (code à 6 chiffres) et Google, sans mot de passe

const account = {
  /** { email, anonymous, providers } ; null hors ligne. */
  async me() {
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return null
      return { email: user.email || null, anonymous: !!user.is_anonymous, providers: (user.identities ?? []).map(i => i.provider) }
    } catch { return null }
  },
  message(e) {
    const raw = e?.message || String(e)
    if (/already/i.test(raw) && /registered|linked|exists/i.test(raw) || /identity_already_exists|email_exists/i.test(raw))
      return tr("Cette adresse ou ce compte Google appartient déjà à un autre compte : utilise « J'ai déjà un compte ».", 'This address or Google account already belongs to another account: use "I already have an account".')
    if (/expired/i.test(raw) || /invalid/i.test(raw) && /otp|token/i.test(raw)) return tr('Code invalide ou expiré.', 'Invalid or expired code.')
    if (/Email address/i.test(raw) && /invalid/i.test(raw)) return tr('Adresse e-mail refusée : vérifie-la.', 'Email address rejected: please check it.')
    if (/Error sending/i.test(raw)) return tr("L'e-mail n'a pas pu partir. Réessaie dans quelques minutes.", "The email couldn't be sent. Try again in a few minutes.")
    if (/rate limit/i.test(raw) || e?.status === 429) return tr('Trop de demandes : réessaie dans quelques minutes.', 'Too many requests: try again in a few minutes.')
    if (/Signups not allowed|provider is not enabled/i.test(raw)) return tr('Connexion par e-mail ou Google pas encore activée sur le serveur.', "Email or Google sign-in isn't enabled on the server yet.")
    return errText(e)
  },
  /** [link] : rattacher l'adresse au compte courant ; sinon se connecter à un compte existant. */
  async sendCode(email, link) {
    const { error } = link
      ? await sb.auth.updateUser({ email })
      : await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    if (error) throw new Error(account.message(error))
  },
  async verifyCode(email, token, link) {
    if (link) {
      // Selon le modèle d'e-mail utilisé par Supabase, le code est de type email_change ou email.
      let error
      for (const type of ['email_change', 'email']) {
        ({ error } = await sb.auth.verifyOtp({ email, token, type }))
        if (!error) break
      }
      if (error) throw new Error(tr('Code invalide ou expiré.', 'Invalid or expired code.'))
      await sb.auth.refreshSession() // le jeton porte désormais is_anonymous = false
      return
    }
    const old = await account.anonymousToken()
    const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' })
    if (error) throw new Error(account.message(error))
    await account.dropAnonymous(old)
  },
  /** Jeton du compte courant s'il est anonyme : effacé après connexion à un autre compte. */
  async anonymousToken() {
    const { data: { session } } = await sb.auth.getSession()
    return session?.user?.is_anonymous ? session.access_token : null
  },
  // ponytail: best effort ; sinon la purge mensuelle l'efface (compte sans pseudo) ou après 3 ans.
  async dropAnonymous(token) {
    if (!token) return
    await fetch(SUPABASE_URL + '/rest/v1/rpc/delete_my_account', {
      method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}',
    }).catch(() => {})
  },
  /** Google par redirection : la page revient ici avec ?code=..., échangé par supabase-js au démarrage. */
  async google(link) {
    const redirectTo = location.origin + location.pathname
    store('google_pending', link ? 'link' : 'login')
    if (!link) store('google_old', await account.anonymousToken())
    const { error } = link
      ? await sb.auth.linkIdentity({ provider: 'google', options: { redirectTo } })
      : await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) { store('google_pending', null); throw new Error(account.message(error)) }
  },
}

// ------------------------------------------------------------------ état, navigation

const st = { profile: null, groups: null, gd: null, tab: 'classement', open: new Set(), pendingCode: null, acct: null }
let navToken = 0

function go(hash) { if (location.hash === hash) route(); else location.hash = hash }
window.addEventListener('hashchange', route)

async function route() {
  if (dlg.open) dlg.close()
  const token = ++navToken
  const [, page, id, sub] = location.hash.split('/')
  window.scrollTo(0, 0)
  if (page === 'g' && id) return sub === 'add' ? searchPage(id, token) : groupPage(id, token)
  if (page === 'regles') return rulesPage()
  return homePage(token)
}

// ------------------------------------------------------------------ démarrage

async function start() {
  const params = new URLSearchParams(location.search)
  const join = params.get('join')
  if (join) st.pendingCode = join.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  // Retour de Google : erreur éventuelle dans l'adresse, session déjà échangée par supabase-js.
  const oauthError = params.get('error_description') || new URLSearchParams(location.hash.slice(1)).get('error_description')
  await sb.auth.getSession().catch(() => {}) // laisse supabase-js lire ?code= avant qu'on nettoie l'adresse
  if (params.has('join') || params.has('code') || params.has('error') || oauthError) history.replaceState(null, '', location.pathname)
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {})
  // Sur iPhone, Safari et l'app installée ne partagent pas leur stockage : compte créé dans Safari = perdu
  // une fois l'app ajoutée à l'écran d'accueil. On fait donc installer d'abord.
  if (isIOS && !standalone && store('browser_ok') !== '1') return installScreen()
  if (Number(store('legal_version')) < LEGAL_VERSION) return consentScreen()
  await boot()
  const pending = store('google_pending')
  if (pending) {
    store('google_pending', null)
    if (oauthError) toast(account.message(new Error(oauthError)))
    else if (pending === 'link') toast(tr('Compte protégé : tu pourras le retrouver sur un autre appareil.', 'Account protected: you can get it back on another device.'))
    else { await account.dropAnonymous(store('google_old')); clearCache() }
    store('google_old', null)
  }
}

async function boot() {
  $app.innerHTML = spinner
  try {
    st.profile = await api.myProfile()
  } catch (e) {
    $app.innerHTML = `<div class="backdrop"></div><div class="center"><p class="muted">${h(errText(e))}</p><button class="gold" style="width:auto" data-act="retry">${tr('Réessayer', 'Retry')}</button></div>`
    return
  }
  account.me().then(a => { st.acct = a })
  if (!st.profile) return onboarding()
  route()
}

function installScreen() {
  $app.innerHTML = `<div class="center">
    <img src="medal.png" width="120" height="120" alt="">
    ${langChips()}
    <h1>Bingo Last Breath</h1>
    <p class="soft">${tr("Sur iPhone, installe d'abord l'app sur ton écran d'accueil :", 'On iPhone, first install the app on your home screen:')}</p>
    <div class="card stack" style="text-align:left">
      <div class="row"><span class="roman">I</span><span>${tr(`Touche <b>Partager</b> ${ICON.share} dans la barre de Safari.`, `Tap <b>Share</b> ${ICON.share} in Safari's toolbar.`)}</span></div>
      <div class="row"><span class="roman">II</span><span>${tr("Choisis <b>« Sur l'écran d'accueil »</b>, puis <b>Ajouter</b>.", 'Choose <b>"Add to Home Screen"</b>, then <b>Add</b>.')}</span></div>
      <div class="row"><span class="roman">III</span><span>${tr('Ouvre <b>Last Breath</b> depuis la nouvelle icône.', 'Open <b>Last Breath</b> from the new icon.')}</span></div>
    </div>
    ${st.pendingCode ? `<p class="soft">${tr('Puis rejoins le groupe avec le code', 'Then join the group with the code')}<br><b class="serif" style="font-size:34px;letter-spacing:.15em;color:var(--gold)">${h(st.pendingCode)}</b></p>` : ''}
    <p class="small muted">${tr("Ton compte vit dans l'app installée : si tu joues dans Safari, ce sera un autre compte (sauf si tu le protèges par e-mail).", 'Your account lives in the installed app: if you play in Safari it will be a different account (unless you protect it with an email).')}</p>
    <button class="text dim" data-act="browserOk">${tr('Continuer dans le navigateur quand même', 'Continue in the browser anyway')}</button>
  </div>`
}

function consentScreen() {
  $app.innerHTML = `<div class="center">
    <img src="medal.png" width="120" height="120" alt="">
    ${langChips()}
    <h1>Bingo Last Breath</h1>
    <p class="muted">${tr('Un jeu de pronostics entre amis, gratuit et sans mise. Il se joue avec humour, et avec respect pour les personnes.', 'A free prediction game between friends, with no stakes. Played with humour, and with respect for people.')}</p>
    <form id="consent" class="stack" style="width:100%">
      <label class="check"><input type="checkbox" name="adult"><span>${tr("J'ai 18 ans ou plus.", 'I am 18 or older.')}</span></label>
      <label class="check"><input type="checkbox" name="terms"><span>${tr("J'accepte les conditions d'utilisation et la politique de confidentialité.", 'I accept the terms of use and the privacy policy.')}</span></label>
      <div class="row" style="justify-content:center"><a class="text" href="${legal.terms()}" target="_blank" rel="noopener">${tr('Conditions', 'Terms')}</a><a class="text" href="${legal.privacy()}" target="_blank" rel="noopener">${tr('Confidentialité', 'Privacy')}</a></div>
      <button class="gold" disabled>${tr('Continuer', 'Continue')}</button>
    </form>
  </div>`
  const f = document.getElementById('consent')
  f.addEventListener('change', () => { f.querySelector('button').disabled = !(f.adult.checked && f.terms.checked) })
  f.addEventListener('submit', e => { e.preventDefault(); store('legal_version', String(LEGAL_VERSION)); store('legal_at', String(Date.now())); boot() })
}

function onboarding() {
  $app.innerHTML = `<div class="backdrop"></div><div class="center">
    <img src="medal.png" width="150" height="150" alt="">
    <div class="kicker">${tr('Le jeu des derniers soupirs', 'The last-breath game')}</div>
    <h1 style="font-size:34px">Bingo Last Breath</h1>
    <p class="muted">${tr('Fais tes pronostics sur des célébrités. Si elles partent pendant la saison, tu marques.', 'Make your predictions about celebrities. If they pass away during the season, you score.')}</p>
    <form id="onb" class="stack" style="width:100%">
      <label class="field">${tr('Ton pseudo', 'Your nickname')}<input type="text" name="name" maxlength="30" autocomplete="nickname" required></label>
      <button class="gold">${tr("C'est parti", "Let's go")}</button>
    </form>
    <button class="text" data-act="login">${tr("J'ai déjà un compte (e-mail ou Google)", 'I already have an account (email or Google)')}</button>
  </div>`
  document.getElementById('onb').addEventListener('submit', async e => {
    e.preventDefault()
    const b = e.target.querySelector('button')
    b.disabled = true
    try {
      await api.saveProfile(e.target.elements.name.value)
      st.profile = await api.myProfile()
      route()
    } catch (err) { toast(errText(err)); b.disabled = false }
  })
}

// ------------------------------------------------------------------ accueil

async function homePage(token) {
  renderHome()
  try { st.groups = await api.myGroups() } catch (e) { toast(errText(e)) }
  if (token !== navToken) return
  renderHome()
  if (st.pendingCode) { const c = st.pendingCode; st.pendingCode = null; joinDialog(c) }
}

function renderHome() {
  const groups = st.groups
  $app.innerHTML = `<div class="backdrop"></div>
    ${top(tr('💀 Mes parties', '💀 My games'), 'Bingo Last Breath', '<span></span>', `<button class="icon" data-act="menu" aria-label="Menu">${ICON.more}</button>`)}
    <div class="stack">
      <p class="soft small" style="text-align:center">${tr('Bonjour', 'Hello')} ${h(st.profile.display_name)}</p>
      <button class="outline" data-act="join">${tr('Rejoindre un groupe avec un code', 'Join a group with a code')}</button>
      ${groups == null ? spinner : groups.length === 0 ? `<p class="muted" style="text-align:center;padding-top:48px">${tr("Aucun groupe pour l'instant.<br>Crée le tien ou demande le code à un ami.", 'No groups yet.<br>Create yours or ask a friend for their code.')}</p>` : ''}
      ${(groups ?? []).map(g => `<div class="card click" data-act="open" data-id="${g.id}">
        <div class="row"><h2 class="grow">${h(g.name)}</h2>${locked(g) ? `<span class="goldc" aria-label="${tr('Verrouillé', 'Locked')}">🔒</span>` : ''}</div>
        <div class="muted">Code ${h(g.code)}${g.owner_id === me ? tr(' · créateur', ' · creator') : ''}</div>
        <div class="small soft">${tr('Saison', 'Season')} ${period(g)} · ${locked(g) ? tr('en cours', 'under way') : tr('choix ouverts', 'picks open')}</div>
      </div>`).join('')}
    </div>
    <div class="bottom"><button class="gold" data-act="create">＋ ${tr('Créer un groupe', 'Create a group')}</button></div>`
}

function modal(html) {
  dlg.innerHTML = html
  if (!dlg.open) dlg.showModal()
  return dlg
}
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close() }) // clic hors de la boîte

function joinDialog(code = '') {
  const d = modal(`<form class="stack" id="jf"><h2>${tr('Rejoindre un groupe', 'Join a group')}</h2>
    <label class="field">${tr('Code à 6 caractères', '6-character code')}<input type="text" name="code" class="code-input" maxlength="6" autocapitalize="characters" autocomplete="off" value="${h(code)}" required></label>
    ${actions(`<button class="gold">${tr('Rejoindre', 'Join')}</button>`)}</form>`)
  const f = d.querySelector('form')
  f.code.addEventListener('input', () => { f.code.value = f.code.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) })
  f.addEventListener('submit', async e => {
    e.preventDefault()
    if (f.code.value.length !== 6) return toast(tr('Le code fait 6 caractères.', 'The code has 6 characters.'))
    try { const g = await api.joinGroup(f.code.value); dlg.close(); go('#/g/' + g.id) } catch (err) { toast(errText(err)) }
  })
}

async function menuDialog() {
  const a = st.acct ?? (st.acct = await account.me())
  const anonymous = a?.anonymous !== false
  modal(`<h2>Menu</h2><div class="menu">
    ${!a ? '' : anonymous ? `<button data-act="protect" class="goldc">${tr('Protéger mon compte (e-mail ou Google)', 'Protect my account (email or Google)')}</button>`
      : `<p class="small muted" style="padding:10px 4px;margin:0;border-bottom:1px solid var(--line)">${tr('Compte : ', 'Account: ')}${h(a.email ?? tr('protégé', 'protected'))}${a.providers.includes('google') ? ' (Google)' : ''}</p>`}
    <button data-act="login">${anonymous ? tr("J'ai déjà un compte", 'I already have an account') : tr('Changer de compte', 'Switch account')}</button>
    <button data-act="logout">${tr('Se déconnecter', 'Sign out')}</button>
    <button data-act="rename">${tr('Changer de pseudo', 'Change nickname')}</button>
    <button data-act="toggleLang" class="goldc">${en ? '🌐 Passer en français' : '🌐 Switch to English'}</button>
    <button data-act="rules">📜 ${tr('Règles du jeu', 'Rules of the game')}</button>
    <button data-act="link" data-href="${legal.privacy()}">${tr('Politique de confidentialité', 'Privacy policy')}</button>
    <button data-act="link" data-href="${legal.terms()}">${tr("Conditions d'utilisation", 'Terms of use')}</button>
    <button data-act="link" data-href="${legal.notice()}">${tr('Mentions légales', 'Legal notice')}</button>
    <button data-act="licences">${tr('Licences open source', 'Open-source licences')}</button>
    <button data-act="link" data-href="mailto:${EMAIL}">${tr('Nous écrire', 'Contact us')}</button>
    <button data-act="deleteAccount" class="warn">${tr('Supprimer mon compte', 'Delete my account')}</button>
  </div>${actions('', tr('Fermer', 'Close'))}`)
}

function licencesDialog() {
  modal(`<h2>${tr('Licences open source', 'Open-source licences')}</h2><div class="stack small soft">
    <p>supabase-js — © Supabase. ${tr('Licence MIT', 'MIT licence')}.</p>
    <p>Cormorant Garamond — © The Cormorant Project Authors. Manrope — © The Manrope Project Authors. SIL Open Font License 1.1 : https://openfontlicense.org</p>
    <p>${tr("Données des personnalités : Wikidata, licence CC0. Bingo Last Breath n'est affilié ni à Wikidata ni à la Wikimedia Foundation.", 'Celebrity data: Wikidata, CC0 licence. Bingo Last Breath is affiliated with neither Wikidata nor the Wikimedia Foundation.')}</p>
  </div>${actions('', tr('Fermer', 'Close'))}`)
}

function renameDialog() {
  const f = modal(`<form class="stack"><h2>${tr('Ton pseudo', 'Your nickname')}</h2>
    <input type="text" name="name" maxlength="30" required value="${h(st.profile.display_name)}">
    ${actions(`<button class="gold">${tr('Enregistrer', 'Save')}</button>`)}</form>`).querySelector('form')
  f.addEventListener('submit', async e => {
    e.preventDefault()
    const name = f.elements.name.value.trim()
    try { await api.saveProfile(name); st.profile.display_name = name; dlg.close(); renderHome() } catch (err) { toast(errText(err)) }
  })
}

function deleteAccountDialog() {
  const f = modal(`<form class="stack"><h2>${tr('Supprimer mon compte ?', 'Delete my account?')}</h2>
    <p>${tr('Ton pseudo, tes choix dans tous tes groupes et les groupes que tu as créés (pour tous leurs membres) seront effacés. Immédiat et irréversible.', 'Your nickname, your picks in all your groups and the groups you created (for all their members) will be erased. Immediate and irreversible.')}</p>
    <label class="check"><input type="checkbox" name="sure"><span>${tr('Je comprends, tout effacer.', 'I understand, erase everything.')}</span></label>
    ${actions(`<button class="outline danger" style="width:auto;padding:0 20px" disabled>${tr('Supprimer', 'Delete')}</button>`)}</form>`).querySelector('form')
  f.sure.addEventListener('change', () => { f.querySelector('.danger').disabled = !f.sure.checked })
  f.addEventListener('submit', async e => {
    e.preventDefault()
    try { await api.deleteAccount(); dlg.close(); accountChanged() } catch (err) { toast(errText(err)) }
  })
}

/** Compte supprimé, quitté ou remplacé : tout relire (pseudo, groupes). */
function accountChanged() {
  st.profile = null; st.groups = null; st.gd = null; st.acct = null
  if (location.hash && location.hash !== '#/') history.replaceState(null, '', location.pathname)
  boot()
}

function logoutDialog() {
  const a = st.acct
  modal(`<h2>${tr('Se déconnecter ?', 'Sign out?')}</h2>
    <p>${a?.anonymous !== false
      ? tr("⚠ Ce compte n'est pas protégé par un e-mail ou Google : une fois déconnecté, tu ne pourras plus jamais le retrouver, ni ses groupes. Protège-le d'abord depuis le menu.", "⚠ This account isn't protected by an email or Google: once signed out you can never get it or its groups back. Protect it first from the menu.")
      : tr(`Tu pourras te reconnecter avec ${h(a.email ?? 'ton compte Google')} (« J'ai déjà un compte »).`, `You can sign back in with ${h(a.email ?? 'your Google account')} ("I already have an account").`)}</p>
    ${actions(`<button class="gold" data-act="doLogout">${tr('Se déconnecter', 'Sign out')}</button>`)}`)
}

/** [link] : protéger le compte courant ; sinon « J'ai déjà un compte » (le compte anonyme courant est abandonné). */
function accountDialog(link) {
  let email = '', codeSent = false, busy = false
  const render = (error = '') => {
    modal(`<form class="stack" id="acf"><h2>${link ? tr('Protéger mon compte', 'Protect my account') : tr("J'ai déjà un compte", 'I already have an account')}</h2>
      <p class="small muted">${link ? tr('Rattache une adresse e-mail ou un compte Google : tu retrouveras tes groupes sur un autre appareil. Pas de mot de passe.', 'Link an email address or a Google account to get your groups back on another device. No password.')
        : tr("Connecte-toi avec l'adresse e-mail ou le compte Google déjà rattaché. Pas de mot de passe.", 'Sign in with the email address or Google account already linked. No password.')}</p>
      ${GOOGLE && !codeSent ? `<button type="button" class="outline" data-act="google" data-link="${link ? 1 : ''}">${tr('Continuer avec Google', 'Continue with Google')}</button>` : ''}
      <label class="field">${tr('Adresse e-mail', 'Email address')}<input type="email" name="email" maxlength="254" autocomplete="email" required value="${h(email)}" ${codeSent ? 'disabled' : ''}></label>
      ${codeSent ? `<p class="small">${tr(`Un code à 6 chiffres vient d'être envoyé à ${h(email)} (regarde aussi les indésirables).`, `A 6-digit code has just been sent to ${h(email)} (check your spam folder too).`)}</p>
        <label class="field">${tr('Code reçu', 'Code received')}<input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required></label>
        <button type="button" class="text dim" data-act="acctReset">${tr("Changer d'adresse ou renvoyer", 'Change address or resend')}</button>` : ''}
      ${error ? `<p class="small warn">${h(error)}</p>` : ''}
      ${link && !codeSent ? `<button type="button" class="text" data-act="acctSwitch">${tr("J'ai déjà un compte (e-mail ou Google)", 'I already have an account (email or Google)')}</button>` : ''}
      ${actions(`<button class="gold">${codeSent ? tr('Valider', 'Confirm') : tr('Recevoir un code', 'Get a code')}</button>`)}</form>`)
    const f = dlg.querySelector('form')
    ;(codeSent ? f.code : f.email).focus()
    f.addEventListener('submit', async e => {
      e.preventDefault()
      if (busy) return
      busy = true
      f.querySelector('.gold').disabled = true
      try {
        if (!codeSent) { email = f.email.value.trim(); await account.sendCode(email, link); codeSent = true; busy = false; return render() }
        await account.verifyCode(email, f.code.value.replace(/\D/g, ''), link)
        dlg.close()
        if (link) { st.acct = await account.me(); toast(tr('Compte protégé : tu pourras le retrouver sur un autre appareil.', 'Account protected: you can get it back on another device.')) }
        else accountChanged() // connecté à l'ancien compte : ses groupes et son pseudo
      } catch (err) { busy = false; render(err.message) }
    })
  }
  acts.acctReset = () => { codeSent = false; render() }
  acts.acctSwitch = () => { link = false; render() }
  render()
}

const DURATIONS = () => [[0, tr('Année civile', 'Calendar year')], [1, tr('1 mois', '1 month')], [3, tr('3 mois', '3 months')], [6, tr('6 mois', '6 months')], [12, tr('1 an', '1 year')], [-1, tr('Dates libres', 'Custom dates')]]

/** Nouveau groupe, ou saison suivante pré-remplie ([init]). Dates null : année civile suivante (choix du serveur). */
function createDialog(init) {
  const today = localToday()
  const tomorrow = addDays(today, 1)
  const ny = Number(today.slice(0, 4)) + 1
  let start = init?.start ?? addDays(today, 7)
  let freeEnd = init?.end ?? addDays(addMonths(start, 12), -1)
  const f = modal(`<form class="stack" id="cg"><h2>${init ? tr('Saison suivante', 'Next season') : tr('Nouveau groupe', 'New group')}</h2>
    <label class="field">${tr('Nom du groupe', 'Group name')}<input type="text" name="name" maxlength="50" required value="${h(init?.name ?? '')}"></label>
    <div class="label">${tr('Durée de la saison', 'Season length')}</div>
    <div class="chips">${DURATIONS().map(([m, l]) => `<label><input type="radio" name="dur" value="${m}" ${m === (init ? -1 : 0) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    <div id="dates" class="stack"></div>
    <div class="label">${tr('Nombre de choix par joueur', 'Picks per player')}</div>
    <div class="chips">${[3, 5, 10, 20].map(n => `<label><input type="radio" name="max" value="${n}" ${n === (init?.maxPicks ?? 5) ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
    <label class="switch"><input type="checkbox" name="dup" ${init?.duplicates ? 'checked' : ''}><span>${tr('Plusieurs joueurs peuvent choisir la même personne', 'Several players can pick the same person')}</span></label>
    <label class="switch"><input type="checkbox" name="show" ${init?.showPicks ?? true ? 'checked' : ''}><span>${tr('Choix des autres visibles avant le début', "Others' picks visible before the start")}</span></label>
    <label class="switch"><input type="checkbox" name="manual" ${init?.manual ? 'checked' : ''}><span>${tr('Autoriser les personnes non célèbres', 'Allow non-famous people')}</span></label>
    <p class="small muted">${tr("Options modifiables à tout moment dans les réglages (pas les dates ni le nombre de choix). Tous les bonus et malus sont activés : les administrateurs peuvent en retirer dans les réglages du groupe, jusqu'au début de la saison.", 'Options can be changed any time in the settings (not the dates or number of picks). All bonuses and penalties are on: admins can remove some in the group settings, until the season starts.')}</p>
    <div id="friends" class="stack" style="gap:0"></div>
    ${actions(`<button class="gold">${tr('Créer', 'Create')}</button>`)}</form>`).querySelector('form')

  const dur = () => Number(f.dur.value)
  const end = () => (dur() > 0 ? addDays(addMonths(start, dur()), -1) : freeEnd)
  const datesOk = () => dur() === 0 || (start > today && end() > start)
  function dates() {
    const box = f.querySelector('#dates')
    if (dur() === 0) { box.innerHTML = `<p class="small muted">${tr(`Du 1er janvier au 31 décembre ${ny}. Choix modifiables jusqu'au 31 décembre ${ny - 1} inclus.`, `From 1 January to 31 December ${ny}. Picks can be changed until 31 December ${ny - 1}.`)}</p>`; return }
    box.innerHTML = `<label class="field">${tr('Début', 'Start')}<input type="date" name="start" min="${tomorrow}" value="${start}"></label>
      ${dur() === -1 ? `<label class="field">${tr('Fin', 'End')}<input type="date" name="end" min="${tomorrow}" value="${freeEnd}"></label>` : ''}
      <p class="small ${datesOk() ? 'muted' : 'warn'}">${datesOk()
        ? tr(`Saison du ${show(start)} au ${show(end())}. Choix modifiables jusqu'au ${show(addDays(start, -1))} inclus.`, `Season from ${show(start)} to ${show(end())}. Picks can be changed until ${show(addDays(start, -1))}.`)
        : tr('Le début doit être dans le futur et la fin après le début.', 'The start must be in the future and the end after the start.')}</p>`
  }
  dates()
  f.addEventListener('change', e => {
    if (e.target.name === 'start' && e.target.value) start = e.target.value
    if (e.target.name === 'end' && e.target.value) freeEnd = e.target.value
    if (['dur', 'start', 'end'].includes(e.target.name)) dates()
  })
  api.friends().then(list => {
    if (!list.length) return
    const picked = new Set(init?.friends ?? [])
    f.querySelector('#friends').innerHTML = `<div class="label">${tr('Inviter des amis', 'Invite friends')}</div><p class="small muted">${tr('Joueurs croisés dans tes autres groupes : ils sont ajoutés directement.', 'Players from your other groups: they are added straight away.')}</p>` +
      list.map(p => `<label class="check"><input type="checkbox" name="friend" value="${p.id}" ${picked.has(p.id) ? 'checked' : ''}><span>${h(p.display_name)}</span></label>`).join('')
  }).catch(() => {})
  f.addEventListener('submit', async e => {
    e.preventDefault()
    if (!datesOk()) return toast(tr('Vérifie les dates de la saison.', 'Check the season dates.'))
    const custom = dur() !== 0
    const b = f.querySelector('.gold')
    b.disabled = true
    try {
      const g = await api.createGroup({
        name: f.elements.name.value.trim(), duplicates: f.dup.checked, manual: f.manual.checked, showPicks: f.show.checked,
        start: custom ? start : null, end: custom ? end() : null, maxPicks: Number(f.max.value),
        friends: [...f.querySelectorAll('[name=friend]:checked')].map(c => c.value),
        bonuses: init?.bonuses ?? BONUS_KEYS, // tous par défaut (comme Android 0.7.2) ; nouveau tirage des thèmes
      })
      dlg.close()
      go('#/g/' + g.id)
    } catch (err) { toast(errText(err)); b.disabled = false }
  })
}

// ------------------------------------------------------------------ groupe

async function loadGroup(id) {
  const g = await api.group(id)
  const [standings, picks, blocked, manual] = await Promise.all([
    api.standings(id), api.picks(id), api.blockedIds(), g.allow_manual ? api.manualPersons(id) : [],
  ])
  st.gd = { group: g, standings, picks, blocked, manual }
}

async function groupPage(id, token) {
  if (st.gd?.group.id !== id) { st.gd = null; st.tab = 'classement'; st.open.clear() }
  renderGroup()
  try { await loadGroup(id) } catch (e) { toast(errText(e)); if (!st.gd) return go('#/') }
  if (token === navToken) renderGroup()
}

/** Action puis rechargement du groupe. */
async function act(fn) {
  try {
    await fn()
    if (st.gd) { await loadGroup(st.gd.group.id); renderGroup() }
  } catch (e) { toast(errText(e)) }
}

const isAdmin = d => d.standings.some(s => s.user_id === me && s.role !== 'member')

function renderGroup() {
  const d = st.gd
  const back = `<button class="icon" data-act="home" aria-label="${tr('Retour', 'Back')}">${ICON.back}</button>`
  if (!d) { $app.innerHTML = top('', '', back) + spinner; return }
  const g = d.group
  const tabs = [['classement', tr('Classement', 'Standings')], ['equipe', tr('Équipe', 'Team')]]
  if (g.allow_manual) tabs.push(['manual', tr('Non célèbres', 'Non-famous')])
  tabs.push(['reglages', tr('Réglages', 'Settings')])
  if (!tabs.some(([k]) => k === st.tab)) st.tab = 'classement'
  const body = { equipe: teamHtml, manual: manualHtml, reglages: settingsHtml }[st.tab]?.(d) ?? standingsHtml(d)
  $app.innerHTML = (st.tab === 'classement' ? '<div class="backdrop"></div>' : '') +
    top(locked(g) ? tr('Saison en cours', 'Season under way') : tr('Choix ouverts', 'Picks open'), g.name, back, `<button class="icon" data-act="share" aria-label="${tr('Inviter', 'Invite')}">${ICON.share}</button>`) +
    `<nav class="tabs">${tabs.map(([k, l]) => `<button class="${st.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${l}</button>`).join('')}</nav>
    <p class="small soft" style="text-align:center;margin-bottom:10px">${tr('Saison', 'Season')} ${period(g)}<br>${locked(g) ? tr('Choix verrouillés', 'Picks locked') : tr(`Choix modifiables jusqu'au ${lastOpenDay(g)} inclus`, `Picks can be changed until ${lastOpenDay(g)}`)}</p>
    <div class="stack">${body}</div>`
}

function pickStatus(p, g) {
  const b = p.birth_date, dd = p.death_date
  if (!dd) return b ? tr(`${ageAt(b, g.season_start)} ans au début`, `${ageAt(b, g.season_start)} at the start`) : tr('âge inconnu', 'age unknown')
  if (dd < g.season_start) return `† ${show(dd)} · ` + tr('avant la saison, ne compte pas', "before the season, doesn't count")
  if (p.source === 'manual' && !p.death_confirmed) return `† ${show(dd)} · ` + tr('en attente de confirmation', 'awaiting confirmation')
  if (p.counted) return `† ${show(dd)} · ` + tr(`${p.age_at_death} ans`, `aged ${p.age_at_death}`)
  return `† ${show(dd)}`
}

function pickLine(p, g, trailing = '') {
  return `<div class="row"><div class="grow">
      <div><b>${h(p.name)}</b>${p.source === 'manual' ? ` <span class="muted">${tr('(non célèbre)', '(non-famous)')}</span>` : ''}</div>
      <div class="small soft">${pickStatus(p, g)}</div>
      ${p.labels?.length ? `<div class="small goldc">${p.labels.map(l => h(serverText(l))).join(' · ')}</div>` : ''}
    </div>
    <div style="text-align:right">${p.points > 0 ? pts(p.points, true) : ''}${p.young ? '<div><span class="badge">★ JOKER</span></div>' : ''}</div>
    ${trailing}</div>`
}

const ruleNote = g => `<p class="rule">${tr("100 moins l'âge au décès. Le joker, moins de 50 ans au début de la saison, compte double. Il faut au moins une personne de moins de 50 ans pour marquer.", '100 minus the age at death. The joker, under 50 at the start of the season, counts double. You need at least one person under 50 to score.')}${g.bonuses?.length ? tr(' Bonus du groupe : voir Réglages.', ' Group bonuses: see Settings.') : ''}</p>`

function standingsHtml(d) {
  const g = d.group
  return d.standings.map((s, i) => {
    const mine = s.user_id === me
    let sub = ''
    if (st.open.has(s.user_id)) {
      const picks = d.picks.filter(p => p.user_id === s.user_id)
      const hidden = !mine && !g.show_picks && !locked(g)
      const secret = s.picks_count - picks.length // paris secrets des autres, cachés jusqu'au décès
      sub = `<div class="sub stack small">
        ${hidden ? `<span class="muted">${tr(`🔒 Choix cachés jusqu'au ${show(g.season_start)}.`, `🔒 Picks hidden until ${show(g.season_start)}.`)}</span>` : picks.length ? '' : `<span class="muted">${tr('Aucun choix.', 'No picks.')}</span>`}
        ${picks.map(p => pickLine(p, g)).join('')}
        ${!hidden && secret > 0 ? `<span class="muted">🤫 + ${secret} ${tr(plural(secret, 'pari secret', 'paris secrets'), plural(secret, 'secret bet', 'secret bets'))}</span>` : ''}</div>`
    }
    return `<div class="standing line ${mine ? 'mine' : ''}" data-act="toggle" data-id="${s.user_id}">
      <div class="row"><span class="rank">${i + 1}</span><span class="avatar">${h(s.display_name.slice(0, 2).toUpperCase())}</span>
        <div class="grow"><div><b>${mine ? tr('Toi', 'You') : h(s.display_name)}</b>${roleBadge(s.role)}</div>
          <div class="small ${s.valid ? 'muted' : 'warn'}">${s.valid
            ? `💀 ${s.deaths} ${tr(plural(s.deaths, 'mort', 'morts'), plural(s.deaths, 'death', 'deaths'))} · ${s.picks_count}/${g.max_picks} ${tr('choix', plural(s.picks_count, 'pick', 'picks'))}`
            : tr('⚠ Personne de moins de 50 ans · ne marque pas', "⚠ No one under 50 · doesn't score")}</div>
          ${s.extras?.length ? `<div class="small goldc">${s.extras.map(x => h(serverText(x))).join(' · ')}</div>` : ''}</div>
        ${pts(s.points, i === 0 && s.points > 0)}</div>${sub}</div>`
  }).join('') + ruleNote(g)
}

function pickOptions(p, g) {
  const secretOn = g.bonuses?.includes('secret'), predictOn = g.bonuses?.includes('prediction')
  if (!secretOn && !predictOn) return ''
  const month = p.predicted_month
  if (locked(g)) {
    const bits = [secretOn && p.secret && tr('🤫 pari secret', '🤫 secret bet'), predictOn && month && tr(`📅 prédit : ${monthName(month)}`, `📅 predicted: ${monthName(month)}`)].filter(Boolean)
    return bits.length ? `<div class="small soft">${bits.join(' · ')}</div>` : ''
  }
  return `<div class="row">
    ${secretOn ? `<button class="text ${p.secret ? '' : 'dim'}" data-act="secret" data-id="${p.person_id}">${p.secret ? tr('🤫 Secret (×1,5)', '🤫 Secret (×1.5)') : tr('🤫 Rendre secret', '🤫 Make secret')}</button>` : ''}
    ${predictOn ? `<button class="text ${month ? '' : 'dim'}" data-act="month" data-id="${p.person_id}">${month ? '📅 ' + monthName(month) : tr('📅 Prédire le mois', '📅 Predict the month')}</button>` : ''}</div>`
}

function teamHtml(d) {
  const g = d.group, lk = locked(g)
  const mine = d.picks.filter(p => p.user_id === me)
  const valid = mine.some(p => p.under50), joker = mine.some(p => p.young)
  const left = g.max_picks - mine.length
  return `<div class="row line" style="justify-content:center;padding-bottom:10px">
      <span class="serif goldc" style="font-size:46px">${mine.length}</span><span class="serif muted" style="font-size:24px">/${g.max_picks}</span>
      <div style="margin-left:12px"><div class="${valid ? '' : 'warn'}"><b>${!valid ? tr('Il faut une personne de moins de 50 ans', 'You need someone under 50') : joker ? tr('Joker désigné', 'Joker chosen') : tr('Désigne ton joker ⭐', 'Choose your joker ⭐')}</b></div>
      <div class="small muted">${lk ? tr('Choix verrouillés', 'Picks locked') : tr(`Choix ouverts jusqu'au ${lastOpenDay(g)} inclus`, `Picks open until ${lastOpenDay(g)}`)}</div></div></div>
    ${mine.map((p, i) => `<div class="card ${p.young ? 'hl' : ''}"><div class="row" style="align-items:flex-start">
      <span class="roman">${roman(i + 1)}</span><div class="grow stack" style="gap:4px">
      ${pickLine(p, g, lk ? '' : `${p.under50 || p.young ? `<button class="icon ${p.young ? 'on' : 'dim'}" data-act="joker" data-id="${p.person_id}" aria-label="${p.young ? tr('Retirer le joker', 'Remove joker') : tr('Désigner comme joker', 'Make joker')}">${ICON.star}</button>` : ''}
        <button class="icon dim" data-act="remove" data-id="${p.person_id}" aria-label="${tr('Retirer', 'Remove')} ${h(p.name)}">${ICON.trash}</button>`)}
      ${p.description ? `<div class="small muted">${h(p.description)}</div>` : ''}
      ${pickOptions(p, g)}</div></div></div>`).join('')}
    ${!lk && left > 0 ? `<button class="gold" data-act="add">＋ ${tr('Ajouter une personne', 'Add a person')}</button>
      <p class="small muted" style="text-align:center">${tr(`Encore ${left} choix possible${left > 1 ? 's' : ''}`, `${left} more ${plural(left, 'pick', 'picks')} available`)}</p>` : ''}
    ${ruleNote(g)}`
}

// ------------------------------------------------------------------ personnes non célèbres

function manualHtml(d) {
  const admin = isAdmin(d), lk = locked(d.group)
  return `<p class="small muted">${tr("Des personnes non célèbres, visibles seulement dans ce groupe. Un décès déclaré par un joueur ne compte qu'une fois confirmé par un administrateur du groupe.", 'Non-famous people, visible only in this group. A death declared by a player only counts once a group admin confirms it.')}</p>
    <p class="small goldc">${tr("Uniquement avec l'accord de la personne, jamais pour un mineur.", "Only with the person's consent, never for a minor.")}</p>
    <button class="gold" data-act="manualAdd">＋ ${tr('Ajouter une personne', 'Add a person')}</button>
    ${d.manual.map(p => {
      const b = p.birth_date, dd = p.death_date
      const canDeclare = admin || p.created_by === me
      const canEdit = canDeclare && !lk // la base refuse après le verrouillage
      const status = dd
        ? `† ${show(dd)} · ${tr(`${p.age_at_death ?? '?'} ans`, `aged ${p.age_at_death ?? '?'}`)}${p.death_confirmed_by ? tr(' · confirmé', ' · confirmed') : tr(' · en attente de confirmation', ' · awaiting confirmation')}`
        : b ? `${p.birth_precision === 'day' ? tr('Né(e) le ', 'Born ') : tr('Né(e) en ', 'Born in ')}${birthText(b, p.birth_precision)} · ${p.birth_precision === 'day' ? '' : '≈ '}${tr(`${ageAt(b, d.group.season_start)} ans au début de la saison`, `${ageAt(b, d.group.season_start)} at the start of the season`)}`
        : tr('Date de naissance inconnue (ne peut pas être joker)', "Date of birth unknown (can't be a joker)")
      return `<div class="card stack" style="gap:4px"><b>${h(p.name)}</b><div class="small muted">${status}</div>
        ${p.description ? `<div class="small soft">${h(p.description)}</div>` : ''}
        <div class="row" style="flex-wrap:wrap;gap:0">
          ${canEdit ? `<button class="text" data-act="manualBirth" data-id="${p.id}">${b ? tr('Modifier la naissance', 'Edit birth date') : tr('Ajouter la naissance', 'Add birth date')}</button>` : ''}
          ${canDeclare && !dd ? `<button class="text" data-act="manualDeath" data-id="${p.id}">${tr('Déclarer le décès', 'Declare death')}</button>` : ''}
          ${canDeclare && dd ? `<button class="text dim" data-act="manualUndo" data-id="${p.id}">${tr('Annuler le décès', 'Undo death')}</button>` : ''}
          ${admin && dd && !p.death_confirmed_by ? `<button class="text" data-act="manualConfirm" data-id="${p.id}">✔ ${tr('Confirmer', 'Confirm')}</button>` : ''}
          ${p.created_by !== me ? `<button class="text dim" data-act="manualReport" data-id="${p.id}">${tr('Signaler', 'Report')}</button>` : ''}
          ${canEdit ? `<span class="grow"></span><button class="icon dim" data-act="manualDelete" data-id="${p.id}" aria-label="${tr('Supprimer', 'Delete')} ${h(p.name)}">${ICON.trash}</button>` : ''}
        </div></div>`
    }).join('')}`
}

/** Jour / mois / année facultatifs ; [onValid] reçoit la naissance lue (null si incohérente). */
function birthFields(init) {
  const [y, m, d] = init?.date ? init.date.split('-') : ['', '', '']
  return `<p class="small muted">${tr('Naissance (laisse vide ce que tu ne sais pas)', "Birth date (leave blank what you don't know)")}</p>
    <div class="row">
      <label class="field grow">${tr('Jour', 'Day')}<input type="text" inputmode="numeric" name="bd" maxlength="2" value="${init?.precision === 'day' ? +d : ''}"></label>
      <label class="field grow">${tr('Mois', 'Month')}<input type="text" inputmode="numeric" name="bm" maxlength="2" value="${init?.date && init.precision !== 'year' ? +m : ''}"></label>
      <label class="field grow" style="flex:1.4">${tr('Année', 'Year')}<input type="text" inputmode="numeric" name="by" maxlength="4" value="${y}"></label>
    </div><p class="small" id="birthHint"></p>`
}
function readBirth(f) {
  const v = n => f[n].value.replace(/\D/g, '')
  const b = parseBirth(v('bd'), v('bm'), v('by'))
  const hint = f.querySelector('#birthHint')
  hint.className = 'small ' + (b ? 'muted' : 'warn')
  hint.textContent = !b ? tr('Date incomplète : année seule, mois + année, ou date complète.', 'Incomplete date: year only, month + year, or full date.')
    : b.precision !== 'day' ? tr('Jour/mois inconnus comptés au 1er : âge arrondi vers le haut.', 'Unknown day/month counted as the 1st: age rounded up.') : ''
  return b
}

function manualAddDialog() {
  const f = modal(`<form class="stack"><h2>${tr('Ajouter une personne non célèbre', 'Add a non-famous person')}</h2>
    <label class="field">${tr('Nom', 'Name')}<input type="text" name="pname" maxlength="100" required></label>
    ${birthFields()}
    <label class="field">${tr('Description (facultatif)', 'Description (optional)')}<textarea name="desc" rows="2" maxlength="300"></textarea></label>
    ${actions(`<button class="gold">${tr('Ajouter', 'Add')}</button>`)}</form>`).querySelector('form')
  f.addEventListener('input', () => readBirth(f))
  f.addEventListener('submit', async e => {
    e.preventDefault()
    const b = readBirth(f)
    if (!b) return
    dlg.close()
    act(() => api.addManualPerson(st.gd.group.id, f.pname.value.trim(), b, f.desc.value.trim()))
  })
}

function manualBirthDialog(p) {
  const f = modal(`<form class="stack"><h2>${tr(`Naissance de ${h(p.name)}`, `Birth date of ${h(p.name)}`)}</h2>
    ${birthFields({ date: p.birth_date, precision: p.birth_precision })}
    ${actions(`<button class="gold">${tr('Enregistrer', 'Save')}</button>`)}</form>`).querySelector('form')
  f.addEventListener('input', () => readBirth(f))
  f.addEventListener('submit', e => {
    e.preventDefault()
    const b = readBirth(f)
    if (!b) return
    dlg.close()
    act(() => api.setManualBirth(p.id, b))
  })
}

function manualDeathDialog(p) {
  const f = modal(`<form class="stack"><h2>${tr(`Décès de ${h(p.name)}`, `Death of ${h(p.name)}`)}</h2>
    <label class="field">${tr('Date du décès', 'Date of death')}<input type="date" name="death" max="${localToday()}" required></label>
    <label class="field">${p.birth_date ? tr('Âge (calculé si vide)', 'Age (calculated if empty)') : tr('Âge au décès', 'Age at death')}<input type="text" inputmode="numeric" name="age" maxlength="3" ${p.birth_date ? '' : 'required'}></label>
    ${actions(`<button class="gold">${tr('Déclarer', 'Declare')}</button>`)}</form>`).querySelector('form')
  f.addEventListener('submit', e => {
    e.preventDefault()
    const age = f.age.value.replace(/\D/g, '')
    dlg.close()
    act(() => api.setManualDeath(p.id, f.death.value, age ? Number(age) : null))
  })
}

function manualDeleteDialog(p) {
  const takers = st.gd.picks.filter(x => x.person_id === p.id).length
  modal(`<h2>${tr(`Supprimer ${h(p.name)} ?`, `Delete ${h(p.name)}?`)}</h2>
    <p>${tr(`Si un joueur a choisi ${h(p.name)}, la personne sera aussi retirée de son équipe.`, `If a player picked ${h(p.name)}, they will also be removed from that team.`)}
    ${takers ? tr(`<br><br>Choisi(e) actuellement par ${takers} joueur${takers > 1 ? 's' : ''}.`, `<br><br>Currently picked by ${takers} ${plural(takers, 'player', 'players')}.`) : ''}</p>
    ${actions(`<button class="outline danger" style="width:auto;padding:0 20px" data-act="manualDoDelete" data-id="${p.id}">${tr('Supprimer', 'Delete')}</button>`)}`)
}

// ------------------------------------------------------------------ réglages

function bonusHtml(g, canEdit) {
  const months = seasonMonths(g), themes = THEMES()
  const calendar = () => (g.theme_months ?? []).map((t, i) => months[i] ? `<div class="small soft">${monthName(months[i])}${colon}${themes[t] ?? h(t)}</div>` : '').join('')
  if (canEdit) {
    return `<div class="card stack" style="gap:4px"><b class="goldc">${tr('Bonus et malus', 'Bonuses and penalties')}</b>
      <p class="small muted">${tr(`Coche ceux du groupe. Modifiables jusqu'au ${lastOpenDay(g)} inclus, puis figés.`, `Tick the group's ones. They can be changed until ${lastOpenDay(g)}, then they're locked.`)}</p>
      <div class="row"><button type="button" class="text" data-act="bonusAll" data-on="1">${tr('Tout cocher', 'Select all')}</button><button type="button" class="text dim" data-act="bonusAll" data-on="">${tr('Tout décocher', 'Deselect all')}</button></div>
      <form id="bonus">${BONUSES().map(([k, t, r]) => `<label class="check"><input type="checkbox" name="b" value="${k}" ${g.bonuses?.includes(k) ? 'checked' : ''}><span><b>${t}</b><br><span class="small muted">${r}</span>
        ${k === 'theme' && g.bonuses?.includes('theme') ? (g.theme_months ? calendar() : `<br><span class="small soft">${tr("Tirage au sort à l'enregistrement.", 'Drawn at random when you save.')}</span>`) : ''}</span></label>`).join('')}
      ${!g.allow_duplicates ? `<p class="small warn">${tr("Doublons interdits dans ce groupe : exclusivité et consensus ne s'appliquent pas.", "Duplicates aren't allowed in this group: exclusive and consensus don't apply.")}</p>` : ''}
      <button class="outline" style="margin-top:6px">${tr('Enregistrer les bonus', 'Save bonuses')}</button></form></div>`
  }
  const active = BONUSES().filter(([k]) => g.bonuses?.includes(k))
  return `<div class="card stack" style="gap:4px"><b class="goldc">${tr('Bonus et malus', 'Bonuses and penalties')}</b>
    ${active.length ? active.map(([k, t, r]) => `<div class="small soft">• ${t} — ${r}</div>${k === 'theme' ? `<div style="padding-left:12px">${calendar()}</div>` : ''}`).join('') : `<p class="small muted">${tr('Aucun : règles classiques.', 'None: classic rules.')}</p>`}
    <p class="small muted">${locked(g) ? tr('Figés depuis le début de la saison.', 'Locked since the season started.') : tr(`Les administrateurs peuvent les changer jusqu'au ${lastOpenDay(g)} inclus.`, `Admins can change them until ${lastOpenDay(g)}.`)}</p></div>`
}

function settingsHtml(d) {
  const g = d.group, admin = isAdmin(d), owner = g.owner_id === me
  const yes = b => (b ? tr('oui', 'yes') : tr('non', 'no'))
  return `<button class="outline" data-act="rules">📜 ${tr('Notice du jeu : règles et lexique', 'How to play: rules and glossary')}</button>
    <div class="card" style="text-align:center"><div class="muted">${tr("Code d'invitation", 'Invite code')}</div>
      <div class="serif" style="font-size:40px;letter-spacing:.12em;font-style:normal;font-weight:700">${h(g.code)}</div>
      <button class="text" data-act="share">${tr('Partager', 'Share')}</button></div>
    ${admin ? `<form id="settings" class="stack">
      <label class="field">${tr('Nom du groupe', 'Group name')}<input type="text" name="gname" maxlength="50" required value="${h(g.name)}"></label>
      <label class="switch"><input type="checkbox" name="dup" ${g.allow_duplicates ? 'checked' : ''}><span>${tr('Plusieurs joueurs peuvent choisir la même personne', 'Several players can pick the same person')}</span></label>
      <label class="switch"><input type="checkbox" name="show" ${g.show_picks ? 'checked' : ''}><span>${tr('Choix des autres visibles avant le début', "Others' picks visible before the start")}</span></label>
      <label class="switch"><input type="checkbox" name="manual" ${g.allow_manual ? 'checked' : ''}><span>${tr('Autoriser les personnes non célèbres', 'Allow non-famous people')}</span></label>
      <button class="outline">${tr('Enregistrer', 'Save')}</button></form>`
    : `<div class="small soft">${tr('Même personne pour plusieurs joueurs : ', 'Same person for several players: ')}${yes(g.allow_duplicates)}<br>${tr('Choix des autres visibles avant le début : ', "Others' picks visible before the start: ")}${yes(g.show_picks)}<br>${tr('Personnes non célèbres : ', 'Non-famous people: ')}${yes(g.allow_manual)}</div>`}
    <p class="small muted">${tr(`Saison ${period(g)} · ${g.max_picks} choix par joueur`, `Season ${period(g)} · ${g.max_picks} picks per player`)}</p>
    ${bonusHtml(g, admin && !locked(g))}
    ${admin ? `<button class="outline" data-act="nextSeason">${tr('Saison suivante avec les mêmes joueurs', 'Next season with the same players')}</button>` : ''}
    <div class="label">${tr('Membres', 'Members')}</div>
    ${[...d.standings].sort((a, b) => a.display_name.localeCompare(b.display_name, locale())).map(s => `<div class="row line" style="padding:4px 0">
      <span class="grow">${h(s.display_name)}${roleBadge(s.role)}${d.blocked.has(s.user_id) ? ` <span class="small warn">${tr('bloqué', 'blocked')}</span>` : ''}</span>
      ${s.user_id !== me ? `<button class="icon dim" data-act="member" data-id="${s.user_id}" aria-label="${tr('Actions pour', 'Actions for')} ${h(s.display_name)}">${ICON.more}</button>` : ''}</div>`).join('')}
    ${d.standings.some(s => d.blocked.has(s.user_id)) ? `<p class="small muted">${tr("Un joueur bloqué ne peut plus t'ajouter à un groupe. Pour ne plus le côtoyer ici, quitte le groupe ou demande à un administrateur de l'exclure.", 'A blocked player can no longer add you to a group. To stop seeing them here, leave the group or ask an admin to remove them.')}</p>` : ''}
    ${owner ? `<p class="small muted">${tr('Menu ⋮ d\'un membre → « Nommer administrateur » : il pourra régler le groupe, confirmer les décès et exclure les membres.', 'A member\'s ⋮ menu → "Make admin": they can then change settings, confirm deaths and remove members.')}</p>` : ''}
    ${!admin ? `<button class="text dim" data-act="reportGroup">${tr('Signaler ce groupe', 'Report this group')}</button>` : ''}
    <button class="outline danger" style="margin-top:16px" data-act="leave">${owner ? tr('Supprimer le groupe', 'Delete the group') : tr('Quitter le groupe', 'Leave the group')}</button>`
}

async function shareGroup(g) {
  const url = new URL('./?join=' + g.code, location.href).href
  const text = tr(`Rejoins mon groupe « ${g.name} » sur Bingo Last Breath 💀\nCode : ${g.code}`, `Join my group "${g.name}" on Bingo Last Breath 💀\nCode: ${g.code}`)
  if (navigator.share) {
    try { await navigator.share({ title: 'Bingo Last Breath', text, url }); return } catch (e) { if (e.name === 'AbortError') return }
  }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast(tr('Invitation copiée.', 'Invitation copied.')) } catch { toast(`Code${colon}${g.code}`) }
}

function reportDialog(label, target) {
  const f = modal(`<form class="stack"><h2>${tr(`Signaler « ${h(label)} »`, `Report "${h(label)}"`)}</h2>
    <p class="small muted">${tr("Contenu injurieux, haineux, faux décès, fiche d'une personne sans son accord… Le signalement est examiné par l'éditeur.", 'Abusive or hateful content, fake death, an entry about someone without their consent… Reports are reviewed by the publisher.')}</p>
    <label class="field">${tr('Motif', 'Reason')}<textarea name="reason" rows="4" maxlength="500" required></textarea></label>
    ${actions(`<button class="gold">${tr('Envoyer', 'Send')}</button>`)}</form>`).querySelector('form')
  f.addEventListener('submit', async e => {
    e.preventDefault()
    try { await api.report(label, f.reason.value, target); dlg.close(); toast(tr('Signalement envoyé. Merci.', 'Report sent. Thank you.')) } catch (err) { toast(errText(err)) }
  })
}

function memberDialog(uid) {
  const d = st.gd, g = d.group, s = d.standings.find(x => x.user_id === uid)
  if (!s) return
  const admin = isAdmin(d), owner = g.owner_id === me
  const kickable = admin && s.role !== 'owner' && (s.role === 'member' || owner)
  modal(`<h2>${h(s.display_name)}${roleBadge(s.role)}</h2><div class="menu">
    ${owner && s.role !== 'owner' ? `<button data-act="toggleAdmin" data-id="${uid}">${s.role === 'admin' ? tr('Retirer administrateur', 'Remove admin') : tr('Nommer administrateur', 'Make admin')}</button>` : ''}
    ${kickable ? `<button data-act="kick" data-id="${uid}">${tr('Exclure', 'Remove')}</button>` : ''}
    <button data-act="reportMember" data-id="${uid}">${tr('Signaler', 'Report')}</button>
    <button data-act="toggleBlock" data-id="${uid}">${d.blocked.has(uid) ? tr('Débloquer', 'Unblock') : tr('Bloquer', 'Block')}</button>
  </div>${actions('', tr('Fermer', 'Close'))}`)
}

function monthDialog(pid) {
  const d = st.gd, g = d.group, p = d.picks.find(x => x.user_id === me && x.person_id === pid), themes = THEMES()
  modal(`<h2>${tr('Mois du décès', 'Month of death')}</h2><p class="small muted">${tr('+30 points si le décès tombe ce mois-là.', '+30 points if the death falls in that month.')}</p>
    <div class="chips" style="margin-top:10px">${seasonMonths(g).map((m, i) => `<label><input type="radio" name="m" value="${m}" ${p.predicted_month === m ? 'checked' : ''} data-act="setMonth" data-id="${pid}"><span>${monthName(m)}${g.theme_months?.[i] ? ' · ' + (themes[g.theme_months[i]] ?? '') : ''}</span></label>`).join('')}</div>
    <div class="actions">${p.predicted_month ? `<button class="text dim" data-act="setMonth" data-id="${pid}" data-value="">${tr('Effacer', 'Clear')}</button>` : ''}<button class="text" data-close>${tr('Fermer', 'Close')}</button></div>`)
}

function confirmLeave() {
  const g = st.gd.group, owner = g.owner_id === me
  modal(`<h2>${owner ? tr(`Supprimer « ${h(g.name)} » ?`, `Delete "${h(g.name)}"?`) : tr(`Quitter « ${h(g.name)} » ?`, `Leave "${h(g.name)}"?`)}</h2>
    <p>${owner ? tr('Le groupe et tous les choix seront effacés pour tout le monde. Irréversible.', "The group and all picks will be erased for everyone. This can't be undone.") : tr('Tes choix dans ce groupe seront effacés.', 'Your picks in this group will be erased.')}</p>
    ${actions(`<button class="outline danger" style="width:auto;padding:0 20px" data-act="doLeave">${owner ? tr('Supprimer', 'Delete') : tr('Quitter', 'Leave')}</button>`)}`)
}

// ------------------------------------------------------------------ recherche

async function searchPage(gid, token) {
  try { if (st.gd?.group.id !== gid) await loadGroup(gid) } catch (e) { toast(errText(e)); return go('#/') }
  if (token !== navToken) return
  const g = st.gd.group
  $app.innerHTML = top(tr('Ajouter à mon équipe', 'Add to my team'), tr('Chercher', 'Search'), `<button class="icon" data-act="backGroup" aria-label="${tr('Retour', 'Back')}">${ICON.back}</button>`) +
    `<input type="search" id="sq" placeholder="${tr("Nom d'une célébrité", "A celebrity's name")}" autocomplete="off" enterkeyhint="search">
    <div id="sr" class="stack" style="margin-top:12px;gap:0"></div>`
  const input = document.getElementById('sq'), out = document.getElementById('sr')
  input.focus()
  const takenBy = new Map(st.gd.picks.map(p => [p.wikidata_id ?? p.person_id, p.user_id]))
  const mine = new Set(st.gd.picks.filter(p => p.user_id === me).map(p => p.wikidata_id ?? p.person_id))
  const row = (c, key, attrs) => {
    const age = c.birth ? ageAt(c.birth, g.season_start) : null
    const taken = !g.allow_duplicates && takenBy.has(key) && takenBy.get(key) !== me
    const already = mine.has(key)
    const ok = !c.death && !taken && !already
    const status = c.death ? tr('† déjà décédé(e)', '† already dead') : already ? tr('Déjà dans ton équipe', 'Already on your team') : taken ? tr('Déjà choisi(e) par un autre joueur', 'Already picked by another player')
      : age == null ? tr('âge inconnu', 'age unknown') : tr(`${age} ans au ${show(g.season_start)}`, `${age} on ${show(g.season_start)}`) + (age < 50 ? tr('  ★ Joker possible', '  ★ Can be joker') : '')
    return `<div class="row line" style="padding:12px 2px;${ok ? '' : 'opacity:.55'}">
      <div class="grow"><b>${h(c.name)}</b>${c.description ? `<div class="small muted">${h(c.description)}</div>` : ''}
        <div class="small ${!ok ? 'warn' : age != null && age < 50 ? 'goldc' : 'soft'}">${status}</div></div>
      ${age != null && !c.death ? pts(pointsFor(age, false)) : ''}
      <button class="plus" ${ok ? '' : 'disabled'} ${attrs} aria-label="${tr('Ajouter', 'Add')} ${h(c.name)}">+</button></div>`
  }
  const manual = st.gd.manual.filter(p => !p.death_date)
  const idle = () => {
    out.innerHTML = (manual.length ? `<div class="kicker" style="margin:4px 0">${tr('Personnes non célèbres', 'Non-famous people')}</div>` +
      manual.map(p => row({ name: p.name, description: p.description, birth: p.birth_date }, p.id, `data-act="pickManual" data-id="${p.id}"`)).join('') : '') +
      `<p class="small muted" style="padding-top:12px">${tr('Les données (naissance, décès) viennent de Wikidata et sont vérifiées chaque matin.', 'Data (birth, death) comes from Wikidata and is checked every morning.')}</p>`
  }
  idle()
  let timer, seq = 0
  input.addEventListener('input', () => {
    clearTimeout(timer)
    const text = input.value
    if (text.trim().length < 2) { idle(); return }
    timer = setTimeout(async () => { // anti-rebond : une requête quand on arrête de taper
      const n = ++seq
      out.innerHTML = spinner
      try {
        const res = await api.searchCelebrities(text)
        if (n !== seq) return
        out.innerHTML = res.length ? res.map(c => row(c, c.qid, `data-act="pickCeleb" data-id="${c.qid}"`)).join('') : `<p class="muted">${tr('Aucune personne trouvée.', 'No one found.')}</p>`
      } catch (e) { if (n === seq) out.innerHTML = `<p class="warn">${h(errText(e))}</p>` }
    }, 400)
  })
}

async function addAndBack(fn, btn) {
  btn.disabled = true
  try { await fn(); st.tab = 'equipe'; go('#/g/' + st.gd.group.id) } catch (e) { toast(errText(e)); btn.disabled = false }
}

// ------------------------------------------------------------------ notice (comme NoticeScreen.kt)

function rulesPage() {
  const steps = [
    tr('Un joueur crée le groupe et partage le code.', 'A player creates the group and shares the code.'),
    tr('Chacun rejoint, fait ses choix et désigne son joker ⭐.', 'Everyone joins, makes their picks and chooses their joker ⭐.'),
    tr("Au début de la saison, les choix sont verrouillés (et révélés s'ils étaient cachés).", 'When the season starts, picks are locked (and revealed if they were hidden).'),
    tr("Pendant la saison, chaque décès d'un de tes choix te rapporte des points.", 'During the season, each death among your picks earns you points.'),
    tr('À la fin de la saison, le premier du classement gagne.', 'At the end of the season, the top of the standings wins.'),
  ]
  const lexicon = [
    [tr('Groupe', 'Group'), tr('Une partie entre amis. Chaque groupe a ses joueurs, sa saison et ses réglages.', 'A game between friends. Each group has its own players, season and settings. Players can use the app in French or in English within the same group.')],
    [tr("Code d'invitation", 'Invite code'), tr('6 caractères pour rejoindre un groupe (bouton « Rejoindre un groupe avec un code », ou lien partagé).', '6 characters to join a group ("Join a group with a code" button, or a shared link).')],
    [tr('Créateur 👑', 'Creator 👑'), tr('Le joueur qui a créé le groupe : il règle les options, confirme les décès des personnes non célèbres, peut exclure un membre, nommer des administrateurs ou supprimer le groupe.', 'The player who created the group: they set the options, confirm the deaths of non-famous people, can remove a member, appoint admins or delete the group.')],
    [tr('Administrateur 🛡', 'Admin 🛡'), tr("Un membre nommé par le créateur (menu ⋮ d'un membre). Il a les mêmes droits que le créateur — réglages, confirmation des décès, exclusion des simples membres, saison suivante — sauf nommer d'autres administrateurs, exclure un administrateur ou supprimer le groupe.", "A member appointed by the creator (a member's ⋮ menu). They have the same rights as the creator — settings, confirming deaths, removing ordinary members, next season — except appointing admins, removing an admin or deleting the group.")],
    [tr('Saison', 'Season'), tr('La période pendant laquelle les décès comptent. Par défaut du 1er janvier au 31 décembre ; le créateur peut choisir d\'autres dates à la création.', 'The period during which deaths count. By default 1 January to 31 December; the creator can choose other dates when creating the group.')],
    [tr('Verrouillage', 'Lock'), tr("Les choix sont modifiables jusqu'à la veille du début de la saison incluse. À minuit (heure de Paris), ils sont figés : plus d'ajout, de retrait ni de changement de joker.", 'Picks can be changed until the day before the season starts. At midnight (Paris time) they are locked: no more adding, removing or changing the joker.')],
    [tr('Choix', 'Picks'), tr('Les personnes que tu choisis : 3, 5, 10 ou 20 au maximum selon le groupe (fixé à la création), célébrités (Wikidata) ou proches.', 'The people you choose: up to 3, 5, 10 or 20 depending on the group (set at creation), celebrities (Wikidata) or people you know.')],
    [tr('Joker ⭐', 'Joker ⭐'), tr("Une personne de ton équipe ayant moins de 50 ans au début de la saison, que tu désignes avec l'étoile. Ses points comptent double. Un seul joker par joueur, modifiable jusqu'au verrouillage.", 'A person on your team under 50 at the start of the season, marked with the star. Their points count double. One joker per player, changeable until the lock.')],
    [tr('Équipe valide', 'Valid team'), tr('Ton équipe ne marque que si elle contient au moins une personne de moins de 50 ans au début de la saison. Sinon : 0 point, quels que soient les décès.', 'Your team only scores if it includes at least one person under 50 at the start of the season. Otherwise: 0 points, whatever the deaths.')],
    [tr('Mort qui compte', 'Death that counts'), tr('Un décès survenu entre le début et la fin de la saison. Une personne déjà morte ne peut pas être choisie ; une mort avant le début ne compte pas.', "A death between the start and the end of the season. Someone already dead can't be picked; a death before the start doesn't count.")],
    [tr('Personne non célèbre', 'Non-famous person'), tr("Quelqu'un qui n'est pas dans Wikidata, visible seulement dans ce groupe (option des administrateurs). Jour ou mois de naissance inconnus : comptés au 1er, l'âge est arrondi vers le haut.", "Someone who isn't in Wikidata, visible only in this group (admin option). Unknown birth day or month: counted as the 1st, so the age is rounded up.")],
    [tr('Décès confirmé', 'Confirmed death'), tr("Le décès d'une personne non célèbre est déclaré par l'auteur de sa fiche ; il ne rapporte des points qu'une fois confirmé par un administrateur du groupe.", 'The death of a non-famous person is declared by the author of their entry; it only scores once a group admin confirms it.')],
    [tr('Doublons', 'Duplicates'), tr('Option des administrateurs : plusieurs joueurs peuvent-ils choisir la même personne ? Si non, premier arrivé, premier servi.', 'Admin option: can several players pick the same person? If not, first come, first served.')],
    [tr('Bonus et malus', 'Bonuses and penalties'), tr("Tous activés à la création d'un groupe ; les administrateurs peuvent en retirer dans les réglages jusqu'à la veille du début de la saison, puis ils sont figés. Calcul : (100 − âge) × joker et bonus multiplicateurs, arrondi, puis + bonus fixes. Les bonus appliqués s'affichent sous chaque décès.", 'All on when a group is created; admins can remove some in the settings until the day before the season starts, then they are locked. Calculation: (100 − age) × joker and multiplier bonuses, rounded, then + fixed bonuses. Applied bonuses are shown under each death.')],
    [tr('Choix cachés', 'Hidden picks'), tr("Option des administrateurs : si les choix des autres ne sont pas visibles, ils restent secrets jusqu'au début de la saison, puis sont révélés à tous.", "Admin option: if others' picks aren't visible, they stay secret until the season starts, then are revealed to everyone.")],
    [tr('Amis', 'Friends'), tr('Les joueurs croisés dans tes groupes. À la création d\'un groupe, coche-les pour les ajouter directement, sans code.', 'Players from your groups. When creating a group, tick them to add them straight away, without a code.')],
    [tr('Saison suivante', 'Next season'), tr('Dans les réglages, un administrateur relance un nouveau groupe avec les mêmes joueurs et les mêmes options, qui commence après la fin de la saison.', 'In the settings, an admin starts a new group with the same players and options, beginning after the season ends.')],
    [tr('Compte', 'Account'), tr("Créé sans mot de passe. Protège-le par e-mail (ou Google) depuis le menu pour le retrouver sur un autre appareil, entre l'app Android et la version web, ou après t'être déconnecté.", 'Created without a password. Protect it with an email (or Google) from the menu to get it back on another device, between the Android app and the web version, or after signing out.')],
    [tr('Langue', 'Language'), tr("Français ou anglais, au choix de chaque joueur (menu de l'accueil). Les noms de groupes et les pseudos ne sont pas traduits.", "French or English, each player's choice (home screen menu). Group names and nicknames aren't translated.")],
    ['Wikidata', tr("La base libre d'où viennent les dates de naissance et de décès des célébrités. Elle est vérifiée chaque matin : un décès y apparaît en général dans les heures qui suivent.", "The free database celebrities' birth and death dates come from. It is checked every morning: a death usually appears there within hours.")],
    ...BONUSES().map(([, t, r]) => [`Bonus · ${t}`, r]),
  ]
  const ex = (l, f, n) => `<div class="row" style="padding:6px 0"><div class="grow"><b>${l}</b><div class="small muted">${f}</div></div>${pts(n, true)}</div>`
  $app.innerHTML = top(tr('Règles du jeu', 'Rules of the game'), tr('Notice', 'How to play'), `<button class="icon" data-act="historyBack" aria-label="${tr('Retour', 'Back')}">${ICON.back}</button>`) + `<div class="stack">
    <div class="card stack"><div class="kicker">${tr('Le principe', 'The idea')}</div><p class="soft">${tr("Chaque joueur choisit quelques personnalités (5 par défaut, de 3 à 20 selon le groupe). Si l'une d'elles meurt pendant la saison, il marque des points : plus elle était jeune, plus ça rapporte.", 'Each player picks a few public figures (5 by default, 3 to 20 depending on the group). If one of them dies during the season, they score points: the younger the person, the more it pays.')}</p></div>
    <div class="card"><div class="kicker">${tr('Les points', 'Points')}</div><p class="soft">${tr('Points = 100 − âge au décès. À 100 ans et plus : 1 point symbolique. Le joker compte double.', 'Points = 100 − age at death. At 100 and over: 1 token point. The joker counts double.')}</p>
      ${ex(tr('Mort à 84 ans', 'Died at 84'), '100 − 84', 16)}${ex(tr('Joker mort à 26 ans', 'Joker died at 26'), '(100 − 26) × 2', 148)}${ex(tr('Mort à 103 ans', 'Died at 103'), tr('point symbolique', 'token point'), 1)}
      <p class="soft">${tr("Ton score est la somme des points de tes choix morts pendant la saison, si ton équipe est valide.", 'Your score is the sum of the points of your picks who died during the season, if your team is valid.')}</p></div>
    <div class="card"><div class="kicker">${tr('Une saison, étape par étape', 'A season, step by step')}</div>${steps.map((s, i) => `<div class="row" style="padding:4px 0"><span class="roman">${roman(i + 1)}</span><span class="soft">${s}</span></div>`).join('')}</div>
    <div class="card stack" style="gap:0"><div class="kicker" style="margin-bottom:6px">${tr('Lexique', 'Glossary')}</div>${lexicon.map(([w, t], i) => `<div style="padding:10px 0;${i ? 'border-top:1px solid var(--line)' : ''}"><b class="goldc">${w}</b><div class="small soft">${t}</div></div>`).join('')}</div>
    <p class="rule">${tr('Jeu entre amis, sans argent réel. Respecte les proches des personnes disparues.', 'A game between friends, with no real money. Respect the loved ones of those who have died.')}</p></div>`
}

// ------------------------------------------------------------------ actions (délégation des clics)

const manualPerson = el => st.gd.manual.find(p => p.id === el.dataset.id)
const myPick = id => st.gd.picks.find(x => x.user_id === me && x.person_id === id)

const acts = {
  retry: boot,
  browserOk: () => { store('browser_ok', '1'); start() },
  lang: el => { setLang(el.value === 'en'); isIOS && !standalone && store('browser_ok') !== '1' ? installScreen() : consentScreen() },
  toggleLang: () => { setLang(!en); dlg.close(); route() },
  home: () => go('#/'),
  historyBack: () => (history.length > 1 ? history.back() : go('#/')),
  open: el => go('#/g/' + el.dataset.id),
  join: () => joinDialog(),
  create: () => createDialog(),
  menu: menuDialog,
  protect: () => accountDialog(true),
  login: () => accountDialog(false),
  logout: logoutDialog,
  doLogout: async () => { dlg.close(); await api.forget(); accountChanged() },
  google: async el => { try { await account.google(!!el.dataset.link) } catch (e) { toast(e.message) } },
  rename: renameDialog,
  licences: licencesDialog,
  rules: () => go('#/regles'),
  link: el => { dlg.close(); window.open(el.dataset.href, '_blank', 'noopener') },
  deleteAccount: deleteAccountDialog,
  tab: el => { st.tab = el.dataset.tab; renderGroup() },
  toggle: el => { const id = el.dataset.id; st.open.has(id) ? st.open.delete(id) : st.open.add(id); renderGroup() },
  share: () => shareGroup(st.gd.group),
  add: () => go(`#/g/${st.gd.group.id}/add`),
  backGroup: () => go('#/g/' + st.gd.group.id),
  joker: el => act(() => api.setJoker(st.gd.group.id, myPick(el.dataset.id)?.young ? null : el.dataset.id)),
  remove: el => act(() => api.removePick(st.gd.group.id, el.dataset.id)),
  secret: el => { const p = myPick(el.dataset.id); act(() => api.setPickOptions(st.gd.group.id, p.person_id, !p.secret, p.predicted_month ?? null)) },
  month: el => monthDialog(el.dataset.id),
  setMonth: el => {
    const p = myPick(el.dataset.id)
    const value = el.dataset.value ?? el.value
    dlg.close()
    act(() => api.setPickOptions(st.gd.group.id, p.person_id, p.secret, value || null))
  },
  member: el => memberDialog(el.dataset.id),
  bonusAll: el => document.querySelectorAll('#bonus [name=b]').forEach(c => { c.checked = !!el.dataset.on }),
  toggleAdmin: el => { dlg.close(); act(() => api.setAdmin(st.gd.group, el.dataset.id, st.gd.standings.find(s => s.user_id === el.dataset.id).role !== 'admin')) },
  kick: el => { dlg.close(); act(() => api.kick(st.gd.group, el.dataset.id)) },
  toggleBlock: el => { const id = el.dataset.id; dlg.close(); act(() => (st.gd.blocked.has(id) ? api.unblock(id) : api.block(id))) },
  reportMember: el => { const s = st.gd.standings.find(x => x.user_id === el.dataset.id); reportDialog(s.display_name, { userId: s.user_id, groupId: st.gd.group.id }) },
  reportGroup: () => reportDialog(tr('Groupe ', 'Group ') + st.gd.group.name, { groupId: st.gd.group.id }),
  leave: confirmLeave,
  doLeave: async () => {
    const g = st.gd.group
    dlg.close()
    try { await (g.owner_id === me ? api.deleteGroup(g) : api.leave(g)); st.gd = null; go('#/') } catch (e) { toast(errText(e)) }
  },
  nextSeason: () => {
    const g = st.gd.group, [s, e] = nextSeason(g)
    createDialog({ name: g.name, duplicates: g.allow_duplicates, manual: g.allow_manual, showPicks: g.show_picks, start: s, end: e,
      maxPicks: g.max_picks, friends: st.gd.standings.map(x => x.user_id).filter(id => id !== me), bonuses: g.bonuses ?? [] })
  },
  pickCeleb: el => addAndBack(async () => api.addPick(st.gd.group.id, (await api.addCelebrity(el.dataset.id)).id), el),
  pickManual: el => addAndBack(() => api.addPick(st.gd.group.id, el.dataset.id), el),
  manualAdd: manualAddDialog,
  manualBirth: el => manualBirthDialog(manualPerson(el)),
  manualDeath: el => manualDeathDialog(manualPerson(el)),
  manualUndo: el => act(() => api.setManualDeath(el.dataset.id, null, null)),
  manualConfirm: el => act(() => api.confirmManualDeath(el.dataset.id)),
  manualReport: el => { const p = manualPerson(el); reportDialog(tr('Fiche ', 'Entry ') + p.name, { userId: p.created_by, groupId: st.gd.group.id, personId: p.id }) },
  manualDelete: el => manualDeleteDialog(manualPerson(el)),
  manualDoDelete: el => { dlg.close(); act(() => api.deleteManualPerson(el.dataset.id)) },
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act],[data-close]')
  if (!el) return
  if (el.hasAttribute('data-close')) { e.preventDefault(); dlg.close(); return }
  const fn = acts[el.dataset.act]
  if (!fn) return
  if (el.tagName !== 'INPUT') e.preventDefault()
  fn(el)
})

// Formulaires des réglages (re-rendus à chaque rechargement : écoute déléguée).
document.addEventListener('submit', e => {
  const g = st.gd?.group
  if (e.target.id === 'settings' && g) {
    e.preventDefault()
    const f = e.target
    act(async () => { await api.updateSettings(g, f.gname.value.trim(), f.dup.checked, f.manual.checked, f.show.checked); toast(tr('Réglages enregistrés.', 'Settings saved.')) })
  } else if (e.target.id === 'bonus' && g) {
    e.preventDefault()
    act(async () => { await api.setBonuses(g, [...e.target.querySelectorAll('[name=b]:checked')].map(c => c.value)); toast(tr('Bonus enregistrés.', 'Bonuses saved.')) })
  }
})

start()
