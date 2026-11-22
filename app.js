// Bingo Last Breath — web app (PWA) pour iPhone et navigateurs. Même projet Supabase que l'app Android :
// mêmes groupes, mêmes règles (calculées en base). Port volontairement réduit de l'app (voir web/README.md).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm'

const SUPABASE_URL = 'https://kqnakimdaivvlyzreevf.supabase.co'
const SUPABASE_KEY = 'sb_publishable_FmmCi5ynO_Ok7ODB1Vw1Uw_Fd3TKNcU' // clé publiable : faite pour être publique (RLS)
const LEGAL = 'https://ticule79.github.io/bingolastbreath-legal/'
const EMAIL = 'novera.app.contact@gmail.com'
const LEGAL_VERSION = 1 // comme Legal.VERSION côté Android : à incrémenter si CGU/politique changent sur le fond

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'bingo-auth' },
  global: { fetch: (...a) => fetch(...a) }, // fetch relu à chaque appel : permet de simuler le hors ligne en test
})

// ------------------------------------------------------------------ outils

const $app = document.getElementById('app')
const dlg = document.getElementById('dlg')
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch { return null } }
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches

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

const OFFLINE = 'Hors ligne : cette action attendra le retour de la connexion.'
const isNetErr = e => !navigator.onLine || /Failed to fetch|NetworkError|Load failed/i.test(e?.message || String(e))

function setOffline(off) {
  if (document.body.classList.contains('offline') === off) return
  document.body.classList.toggle('offline', off)
}

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
    throw new Error(OFFLINE)
  }
}
function clearCache() {
  try { Object.keys(localStorage).filter(k => k.startsWith('c:')).forEach(k => localStorage.removeItem(k)) } catch {}
}

addEventListener('offline', () => setOffline(true))
addEventListener('online', () => { setOffline(false); if (st.profile) route(); else if (store('legal_version')) boot() })

function errText(e) {
  const m = e?.message || String(e)
  if (m.includes('Anonymous sign-ins are disabled')) return 'Connexion anonyme désactivée sur le serveur.'
  if (isNetErr(e)) { setOffline(true); return OFFLINE }
  if (m.includes('Failed to send a request to the Edge Function')) return 'Serveur injoignable, réessaie plus tard.'
  return m
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
const fmt = (s, o) => new Date(s + 'T12:00:00Z').toLocaleDateString('fr-FR', { ...o, timeZone: 'UTC' })
const show = s => fmt(s, { day: 'numeric', month: 'short', year: 'numeric' })
const monthName = s => fmt(s, { month: 'long', year: 'numeric' })
const pointsFor = (age, joker) => (age >= 100 ? 1 : 100 - age) * (joker ? 2 : 1)
const plural = (n, one, many) => (n > 1 ? many : one)

// Saison : verrouillage à minuit (heure de Paris) le jour du début.
const locked = g => parisToday() >= g.season_start
const period = g => `du ${show(g.season_start)} au ${show(g.season_end)}`
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

// ------------------------------------------------------------------ règles affichées (calcul réel en base)

const BONUSES = [
  ['exclusive', 'Exclusivité', 'Choisie par un seul joueur : ×1,2 (doublons autorisés).'],
  ['consensus', 'Consensus', 'Choisie par tous les joueurs : points divisés par le nombre de joueurs (doublons autorisés).'],
  ['first_blood', 'Premier sang', 'Premier décès de la saison dans le groupe : +25.'],
  ['young', 'Jeunesse', 'Mort avant 30 ans : ×1,5.'],
  ['sprint', 'Sprint', 'Décès dans le premier mois de la saison : +10.'],
  ['suspense', 'Suspense', 'Décès dans les 7 derniers jours de la saison : +15.'],
  ['double', 'Doublé', 'Deux de tes choix meurent le même mois : +20 (par mois).'],
  ['full_house', 'Carton plein', 'Toute ton équipe (complète) meurt pendant la saison : +100.'],
  ['birthday', 'Anniversaire', 'Décès le jour de son anniversaire : ×2.'],
  ['cursed_date', 'Date maudite', 'Décès un vendredi 13, un 1er janvier ou un 31 décembre : +13.'],
  ['old', 'Malus « trop facile »', '90 ans ou plus pendant le premier mois de la saison : 0 point.'],
  ['theme', 'Thème du mois', 'Chaque mois a un thème tiré au sort (les 6 thèmes, 2 fois chacun sur 12 mois). Décès dans le thème de son mois (métier Wikidata) : ×1,5.'],
  ['secret', 'Pari secret', "Un choix par joueur, caché aux autres jusqu'à sa mort : ×1,5."],
  ['prediction', 'Prédiction du mois', "Devine le mois du décès d'un de tes choix : +30 si c'est juste."],
]
const THEMES = { musique: 'Musique', sport: 'Sport', politique: 'Politique', cinema: 'Cinéma et télévision', litterature: 'Littérature', sciences: 'Sciences' }

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
    await q(sb.rpc('touch')).catch(() => {}) // dernière visite (sauté hors ligne) : purge des comptes inactifs après 3 ans
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
  picks: gid => cached('picks:' + gid, () => q(sb.from('pick_scores').select('*').eq('group_id', gid).order('created_at'))),
  manualPersons: gid => q(sb.from('persons').select('*').eq('group_id', gid).eq('source', 'manual').order('name')),
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
    await sb.auth.signOut({ scope: 'local' })
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
    if (!s.ok) throw new Error('Wikidata indisponible.')
    const ids = (await s.json()).query.search.map(x => x.title)
    if (!ids.length) return []
    const sparql = `SELECT ?item ?itemLabel ?itemDescription ?birth ?death WHERE {
      VALUES ?item { ${ids.map(i => 'wd:' + i).join(' ')} }
      ?item wdt:P569 ?birth . OPTIONAL { ?item wdt:P570 ?death }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,mul,en". } }`
    const r = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql), { headers: { Accept: 'application/sparql-results+json' } })
    if (!r.ok) throw new Error('Wikidata indisponible.')
    const rows = {}
    for (const b of (await r.json()).results.bindings) rows[b.item.value.split('/').pop()] = b
    const date = v => (v && /^\d{4}-\d\d-\d\d/.test(v) ? v.slice(0, 10) : null)
    return ids.filter(id => rows[id]).map(id => { // garde l'ordre de pertinence
      const b = rows[id]
      return { qid: id, name: b.itemLabel?.value ?? id, description: b.itemDescription?.value, birth: date(b.birth?.value), death: date(b.death?.value) }
    })
  },
}

// ------------------------------------------------------------------ état, navigation

const st = { profile: null, groups: null, gd: null, tab: 'classement', open: new Set(), pendingCode: null }
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
  const join = new URLSearchParams(location.search).get('join')
  if (join) {
    st.pendingCode = join.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    history.replaceState(null, '', location.pathname + location.hash)
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {})
  // Sur iPhone, Safari et l'app installée ne partagent pas leur stockage : compte créé dans Safari = perdu
  // une fois l'app ajoutée à l'écran d'accueil. On fait donc installer d'abord.
  if (isIOS && !standalone && store('browser_ok') !== '1') return installScreen()
  if (Number(store('legal_version')) < LEGAL_VERSION) return consentScreen()
  boot()
}

async function boot() {
  $app.innerHTML = spinner
  try {
    st.profile = await api.myProfile()
  } catch (e) {
    $app.innerHTML = `<div class="backdrop"></div><div class="center"><p class="muted">${h(errText(e))}</p><button class="gold" style="width:auto" data-act="retry">Réessayer</button></div>`
    return
  }
  if (!st.profile) return onboarding()
  route()
}

function installScreen() {
  $app.innerHTML = `<div class="center">
    <img src="medal.png" width="120" height="120" alt="">
    <h1>Bingo Last Breath</h1>
    <p class="soft">Sur iPhone, installe d'abord l'app sur ton écran d'accueil :</p>
    <div class="card stack" style="text-align:left">
      <div class="row"><span class="roman">I</span><span>Touche <b>Partager</b> ${ICON.share} dans la barre de Safari.</span></div>
      <div class="row"><span class="roman">II</span><span>Choisis <b>« Sur l'écran d'accueil »</b>, puis <b>Ajouter</b>.</span></div>
      <div class="row"><span class="roman">III</span><span>Ouvre <b>Last Breath</b> depuis la nouvelle icône.</span></div>
    </div>
    ${st.pendingCode ? `<p class="soft">Puis rejoins le groupe avec le code<br><b class="serif" style="font-size:34px;letter-spacing:.15em;color:var(--gold)">${h(st.pendingCode)}</b></p>` : ''}
    <p class="small muted">Ton compte vit dans l'app installée : si tu joues dans Safari, ce sera un autre compte.</p>
    <button class="text dim" data-act="browserOk">Continuer dans le navigateur quand même</button>
  </div>`
}

function consentScreen() {
  $app.innerHTML = `<div class="center">
    <img src="medal.png" width="120" height="120" alt="">
    <h1>Bingo Last Breath</h1>
    <p class="muted">Un jeu de pronostics entre amis, gratuit et sans mise. Il se joue avec humour, et avec respect pour les personnes.</p>
    <form id="consent" class="stack" style="width:100%">
      <label class="check"><input type="checkbox" name="adult"><span>J'ai 18 ans ou plus.</span></label>
      <label class="check"><input type="checkbox" name="terms"><span>J'accepte les conditions d'utilisation et la politique de confidentialité.</span></label>
      <div class="row" style="justify-content:center"><a class="text" href="${LEGAL}conditions/" target="_blank" rel="noopener">Conditions</a><a class="text" href="${LEGAL}confidentialite/" target="_blank" rel="noopener">Confidentialité</a></div>
      <button class="gold" disabled>Continuer</button>
    </form>
  </div>`
  const f = document.getElementById('consent')
  f.addEventListener('change', () => { f.querySelector('button').disabled = !(f.adult.checked && f.terms.checked) })
  f.addEventListener('submit', e => { e.preventDefault(); store('legal_version', String(LEGAL_VERSION)); store('legal_at', String(Date.now())); boot() })
}

function onboarding() {
  $app.innerHTML = `<div class="backdrop"></div><div class="center">
    <img src="medal.png" width="150" height="150" alt="">
    <div class="kicker">Le jeu des derniers soupirs</div>
    <h1 style="font-size:34px">Bingo Last Breath</h1>
    <p class="muted">Fais tes pronostics sur des célébrités. Si elles partent pendant la saison, tu marques.</p>
    <form id="onb" class="stack" style="width:100%">
      <label class="field">Ton pseudo<input type="text" name="name" maxlength="30" autocomplete="nickname" required></label>
      <button class="gold">C'est parti</button>
    </form>
  </div>`
  document.getElementById('onb').addEventListener('submit', async e => {
    e.preventDefault()
    const b = e.target.querySelector('button')
    b.disabled = true
    try {
      await api.saveProfile(e.target.name.value)
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
    ${top('💀 Mes parties', 'Bingo Last Breath', '<span></span>', `<button class="icon" data-act="menu" aria-label="Menu">${ICON.more}</button>`)}
    <div class="stack">
      <p class="soft small" style="text-align:center">Bonjour ${h(st.profile.display_name)}</p>
      <button class="outline" data-act="join">Rejoindre un groupe avec un code</button>
      ${groups == null ? spinner : groups.length === 0 ? '<p class="muted" style="text-align:center;padding-top:48px">Aucun groupe pour l\'instant.<br>Crée le tien ou demande le code à un ami.</p>' : ''}
      ${(groups ?? []).map(g => `<div class="card click" data-act="open" data-id="${g.id}">
        <div class="row"><h2 class="grow">${h(g.name)}</h2>${locked(g) ? '<span class="goldc" aria-label="Verrouillé">🔒</span>' : ''}</div>
        <div class="muted">Code ${h(g.code)}${g.owner_id === me ? ' · créateur' : ''}</div>
        <div class="small soft">Saison ${period(g)} · ${locked(g) ? 'en cours' : 'choix ouverts'}</div>
      </div>`).join('')}
    </div>
    <div class="bottom"><button class="gold" data-act="create">＋ Créer un groupe</button></div>`
}

function modal(html) {
  dlg.innerHTML = html
  if (!dlg.open) dlg.showModal()
  return dlg
}
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close() }) // clic hors de la boîte

function joinDialog(code = '') {
  const d = modal(`<form class="stack" id="jf"><h2>Rejoindre un groupe</h2>
    <label class="field">Code à 6 caractères<input type="text" name="code" class="code-input" maxlength="6" autocapitalize="characters" autocomplete="off" value="${h(code)}" required></label>
    <div class="actions"><button type="button" class="text dim" data-close>Annuler</button><button class="gold">Rejoindre</button></div></form>`)
  const f = d.querySelector('form')
  f.code.addEventListener('input', () => { f.code.value = f.code.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) })
  f.addEventListener('submit', async e => {
    e.preventDefault()
    if (f.code.value.length !== 6) return toast('Le code fait 6 caractères.')
    try { const g = await api.joinGroup(f.code.value); dlg.close(); go('#/g/' + g.id) } catch (err) { toast(errText(err)) }
  })
}

function menuDialog() {
  modal(`<h2>Menu</h2><div class="menu">
    <button data-act="rename">Changer de pseudo</button>
    <button data-act="rules">📜 Règles du jeu</button>
    <button data-act="link" data-href="${LEGAL}confidentialite/">Politique de confidentialité</button>
    <button data-act="link" data-href="${LEGAL}conditions/">Conditions d'utilisation</button>
    <button data-act="link" data-href="${LEGAL}mentions-legales/">Mentions légales</button>
    <button data-act="link" data-href="mailto:${EMAIL}">Nous écrire</button>
    <button data-act="deleteAccount" class="warn">Supprimer mon compte</button>
  </div><div class="actions"><button class="text dim" data-close>Fermer</button></div>`)
}

function renameDialog() {
  const f = modal(`<form class="stack"><h2>Ton pseudo</h2>
    <input type="text" name="name" maxlength="30" required value="${h(st.profile.display_name)}">
    <div class="actions"><button type="button" class="text dim" data-close>Annuler</button><button class="gold">Enregistrer</button></div></form>`).querySelector('form')
  f.addEventListener('submit', async e => {
    e.preventDefault()
    try { await api.saveProfile(f.name.value); st.profile.display_name = f.name.value.trim(); dlg.close(); renderHome() } catch (err) { toast(errText(err)) }
  })
}

function deleteAccountDialog() {
  const f = modal(`<form class="stack"><h2>Supprimer mon compte ?</h2>
    <p>Ton pseudo, tes choix dans tous tes groupes et les groupes que tu as créés (pour tous leurs membres) seront effacés. Immédiat et irréversible.</p>
    <label class="check"><input type="checkbox" name="sure"><span>Je comprends, tout effacer.</span></label>
    <div class="actions"><button type="button" class="text dim" data-close>Annuler</button><button class="outline danger" style="width:auto;padding:0 20px" disabled>Supprimer</button></div></form>`).querySelector('form')
  f.sure.addEventListener('change', () => { f.querySelector('.danger').disabled = !f.sure.checked })
  f.addEventListener('submit', async e => {
    e.preventDefault()
    try { await api.deleteAccount(); dlg.close(); st.profile = null; st.groups = null; boot() } catch (err) { toast(errText(err)) }
  })
}

const DURATIONS = [[0, 'Année civile'], [1, '1 mois'], [3, '3 mois'], [6, '6 mois'], [12, '1 an'], [-1, 'Dates libres']]

/** Nouveau groupe, ou saison suivante pré-remplie ([init]). Dates null : année civile suivante (choix du serveur). */
function createDialog(init) {
  const today = localToday()
  const tomorrow = addDays(today, 1)
  const ny = Number(today.slice(0, 4)) + 1
  let start = init?.start ?? addDays(today, 7)
  let freeEnd = init?.end ?? addDays(addMonths(start, 12), -1)
  const f = modal(`<form class="stack" id="cg"><h2>${init ? 'Saison suivante' : 'Nouveau groupe'}</h2>
    <label class="field">Nom du groupe<input type="text" name="name" maxlength="50" required value="${h(init?.name ?? '')}"></label>
    <div class="label">Durée de la saison</div>
    <div class="chips">${DURATIONS.map(([m, l]) => `<label><input type="radio" name="dur" value="${m}" ${m === (init ? -1 : 0) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    <div id="dates" class="stack"></div>
    <div class="label">Nombre de choix par joueur</div>
    <div class="chips">${[3, 5, 10, 20].map(n => `<label><input type="radio" name="max" value="${n}" ${n === (init?.maxPicks ?? 5) ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
    <label class="switch"><input type="checkbox" name="dup" ${init?.duplicates ? 'checked' : ''}><span>Plusieurs joueurs peuvent choisir la même personne</span></label>
    <label class="switch"><input type="checkbox" name="show" ${init?.showPicks ?? true ? 'checked' : ''}><span>Choix des autres visibles avant le début</span></label>
    <label class="switch"><input type="checkbox" name="manual" ${init?.manual ? 'checked' : ''}><span>Autoriser les personnes non célèbres</span></label>
    <p class="small muted">Options modifiables à tout moment dans les réglages (pas les dates ni le nombre de choix). Tous les bonus et malus sont activés : les administrateurs peuvent en retirer dans les réglages du groupe, jusqu'au début de la saison.</p>
    <div id="friends" class="stack" style="gap:0"></div>
    <div class="actions"><button type="button" class="text dim" data-close>Annuler</button><button class="gold">Créer</button></div></form>`).querySelector('form')

  const dur = () => Number(f.dur.value)
  const end = () => (dur() > 0 ? addDays(addMonths(start, dur()), -1) : freeEnd)
  const datesOk = () => dur() === 0 || (start > today && end() > start)
  function dates() {
    const box = f.querySelector('#dates')
    if (dur() === 0) { box.innerHTML = `<p class="small muted">Du 1er janvier au 31 décembre ${ny}. Choix modifiables jusqu'au 31 décembre ${ny - 1} inclus.</p>`; return }
    box.innerHTML = `<label class="field">Début<input type="date" name="start" min="${tomorrow}" value="${start}"></label>
      ${dur() === -1 ? `<label class="field">Fin<input type="date" name="end" min="${tomorrow}" value="${freeEnd}"></label>` : ''}
      <p class="small ${datesOk() ? 'muted' : 'warn'}">${datesOk() ? `Saison du ${show(start)} au ${show(end())}. Choix modifiables jusqu'au ${show(addDays(start, -1))} inclus.` : 'Le début doit être dans le futur et la fin après le début.'}</p>`
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
    f.querySelector('#friends').innerHTML = `<div class="label">Inviter des amis</div><p class="small muted">Joueurs croisés dans tes autres groupes : ils sont ajoutés directement.</p>` +
      list.map(p => `<label class="check"><input type="checkbox" name="friend" value="${p.id}" ${picked.has(p.id) ? 'checked' : ''}><span>${h(p.display_name)}</span></label>`).join('')
  }).catch(() => {})
  f.addEventListener('submit', async e => {
    e.preventDefault()
    if (!datesOk()) return toast('Vérifie les dates de la saison.')
    const custom = dur() !== 0
    const b = f.querySelector('.gold')
    b.disabled = true
    try {
      const g = await api.createGroup({
        name: f.name.value.trim(), duplicates: f.dup.checked, manual: f.manual.checked, showPicks: f.show.checked,
        start: custom ? start : null, end: custom ? end() : null, maxPicks: Number(f.max.value),
        friends: [...f.querySelectorAll('[name=friend]:checked')].map(c => c.value), bonuses: init?.bonuses ?? BONUSES.map(([k]) => k), // tous par défaut (comme Android 0.7.2)
      })
      dlg.close()
      go('#/g/' + g.id)
    } catch (err) { toast(errText(err)); b.disabled = false }
  })
}

// ------------------------------------------------------------------ groupe

async function loadGroup(id) {
  const g = await api.group(id)
  const [standings, picks, blocked] = await Promise.all([api.standings(id), api.picks(id), api.blockedIds()])
  st.gd = { group: g, standings, picks, blocked }
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
  const back = `<button class="icon" data-act="home" aria-label="Retour">${ICON.back}</button>`
  if (!d) { $app.innerHTML = top('', '', back) + spinner; return }
  const g = d.group
  const tabs = [['classement', 'Classement'], ['equipe', 'Équipe'], ['reglages', 'Réglages']]
  const body = st.tab === 'equipe' ? teamHtml(d) : st.tab === 'reglages' ? settingsHtml(d) : standingsHtml(d)
  $app.innerHTML = (st.tab === 'classement' ? '<div class="backdrop"></div>' : '') +
    top(locked(g) ? 'Saison en cours' : 'Choix ouverts', g.name, back, `<button class="icon" data-act="share" aria-label="Inviter">${ICON.share}</button>`) +
    `<nav class="tabs">${tabs.map(([k, l]) => `<button class="${st.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${l}</button>`).join('')}</nav>
    <p class="small soft" style="text-align:center;margin-bottom:10px">Saison ${period(g)}<br>${locked(g) ? 'Choix verrouillés' : `Choix modifiables jusqu'au ${lastOpenDay(g)} inclus`}</p>
    <div class="stack">${body}</div>`
}

function pickStatus(p, g) {
  const b = p.birth_date, dd = p.death_date
  if (!dd) return b ? `${ageAt(b, g.season_start)} ans au début` : 'âge inconnu'
  if (dd < g.season_start) return `† ${show(dd)} · avant la saison, ne compte pas`
  if (p.source === 'manual' && !p.death_confirmed) return `† ${show(dd)} · en attente de confirmation`
  if (p.counted) return `† ${show(dd)} · ${p.age_at_death} ans`
  return `† ${show(dd)}`
}

function pickLine(p, g, trailing = '') {
  return `<div class="row"><div class="grow">
      <div><b>${h(p.name)}</b>${p.source === 'manual' ? ' <span class="muted">(non célèbre)</span>' : ''}</div>
      <div class="small soft">${pickStatus(p, g)}</div>
      ${p.labels?.length ? `<div class="small goldc">${p.labels.map(h).join(' · ')}</div>` : ''}
    </div>
    <div style="text-align:right">${p.points > 0 ? pts(p.points, true) : ''}${p.young ? '<div><span class="badge">★ JOKER</span></div>' : ''}</div>
    ${trailing}</div>`
}

const ruleNote = g => `<p class="rule">100 moins l'âge au décès. Le joker, moins de 50 ans au début de la saison, compte double. Il faut au moins une personne de moins de 50 ans pour marquer.${g.bonuses?.length ? ' Bonus du groupe : voir Réglages.' : ''}</p>`

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
        ${hidden ? `<span class="muted">🔒 Choix cachés jusqu'au ${show(g.season_start)}.</span>` : picks.length ? '' : '<span class="muted">Aucun choix.</span>'}
        ${picks.map(p => pickLine(p, g)).join('')}
        ${!hidden && secret > 0 ? `<span class="muted">🤫 + ${secret} pari${secret > 1 ? 's' : ''} secret${secret > 1 ? 's' : ''}</span>` : ''}</div>`
    }
    return `<div class="standing line ${mine ? 'mine' : ''}" data-act="toggle" data-id="${s.user_id}">
      <div class="row"><span class="rank">${i + 1}</span><span class="avatar">${h(s.display_name.slice(0, 2).toUpperCase())}</span>
        <div class="grow"><div><b>${mine ? 'Toi' : h(s.display_name)}</b>${roleBadge(s.role)}</div>
          <div class="small ${s.valid ? 'muted' : 'warn'}">${s.valid ? `💀 ${s.deaths} ${plural(s.deaths, 'mort', 'morts')} · ${s.picks_count}/${g.max_picks} choix` : '⚠ Personne de moins de 50 ans · ne marque pas'}</div>
          ${s.extras?.length ? `<div class="small goldc">${s.extras.map(h).join(' · ')}</div>` : ''}</div>
        ${pts(s.points, i === 0 && s.points > 0)}</div>${sub}</div>`
  }).join('') + ruleNote(g)
}

function pickOptions(p, g) {
  const secretOn = g.bonuses?.includes('secret'), predictOn = g.bonuses?.includes('prediction')
  if (!secretOn && !predictOn) return ''
  const month = p.predicted_month
  if (locked(g)) {
    const bits = [secretOn && p.secret && '🤫 pari secret', predictOn && month && `📅 prédit : ${monthName(month)}`].filter(Boolean)
    return bits.length ? `<div class="small soft">${bits.join(' · ')}</div>` : ''
  }
  return `<div class="row">
    ${secretOn ? `<button class="text ${p.secret ? '' : 'dim'}" data-act="secret" data-id="${p.person_id}">${p.secret ? '🤫 Secret (×1,5)' : '🤫 Rendre secret'}</button>` : ''}
    ${predictOn ? `<button class="text ${month ? '' : 'dim'}" data-act="month" data-id="${p.person_id}">${month ? '📅 ' + monthName(month) : '📅 Prédire le mois'}</button>` : ''}</div>`
}

function teamHtml(d) {
  const g = d.group, lk = locked(g)
  const mine = d.picks.filter(p => p.user_id === me)
  const valid = mine.some(p => p.under50), joker = mine.some(p => p.young)
  const left = g.max_picks - mine.length
  return `<div class="row line" style="justify-content:center;padding-bottom:10px">
      <span class="serif goldc" style="font-size:46px">${mine.length}</span><span class="serif muted" style="font-size:24px">/${g.max_picks}</span>
      <div style="margin-left:12px"><div class="${valid ? '' : 'warn'}"><b>${!valid ? 'Il faut une personne de moins de 50 ans' : joker ? 'Joker désigné' : 'Désigne ton joker ⭐'}</b></div>
      <div class="small muted">${lk ? 'Choix verrouillés' : `Choix ouverts jusqu'au ${lastOpenDay(g)} inclus`}</div></div></div>
    ${mine.map((p, i) => `<div class="card ${p.young ? 'hl' : ''}"><div class="row" style="align-items:flex-start">
      <span class="roman">${roman(i + 1)}</span><div class="grow stack" style="gap:4px">
      ${pickLine(p, g, lk ? '' : `${p.under50 || p.young ? `<button class="icon ${p.young ? 'on' : 'dim'}" data-act="joker" data-id="${p.person_id}" aria-label="${p.young ? 'Retirer le joker' : 'Désigner comme joker'}">${ICON.star}</button>` : ''}
        <button class="icon dim" data-act="remove" data-id="${p.person_id}" aria-label="Retirer ${h(p.name)}">${ICON.trash}</button>`)}
      ${p.description ? `<div class="small muted">${h(p.description)}</div>` : ''}
      ${pickOptions(p, g)}</div></div></div>`).join('')}
    ${!lk && left > 0 ? `<button class="gold" data-act="add">＋ Ajouter une personne</button>
      <p class="small muted" style="text-align:center">Encore ${left} choix possible${left > 1 ? 's' : ''}</p>` : ''}
    ${ruleNote(g)}`
}

function bonusHtml(g, canEdit) {
  const months = seasonMonths(g)
  const calendar = () => (g.theme_months ?? []).map((t, i) => months[i] ? `<div class="small soft">${monthName(months[i])} : ${THEMES[t] ?? h(t)}</div>` : '').join('')
  if (canEdit) {
    return `<div class="card stack" style="gap:4px"><b class="goldc">Bonus et malus</b>
      <p class="small muted">Coche ceux du groupe. Modifiables jusqu'au ${lastOpenDay(g)} inclus, puis figés.</p>
      <div class="row"><button type="button" class="text" data-act="bonusAll" data-on="1">Tout cocher</button><button type="button" class="text dim" data-act="bonusAll" data-on="">Tout décocher</button></div>
      <form id="bonus">${BONUSES.map(([k, t, r]) => `<label class="check"><input type="checkbox" name="b" value="${k}" ${g.bonuses?.includes(k) ? 'checked' : ''}><span><b>${t}</b><br><span class="small muted">${r}</span>
        ${k === 'theme' && g.bonuses?.includes('theme') ? (g.theme_months ? calendar() : '<br><span class="small soft">Tirage au sort à l\'enregistrement.</span>') : ''}</span></label>`).join('')}
      ${!g.allow_duplicates ? '<p class="small warn">Doublons interdits dans ce groupe : exclusivité et consensus ne s\'appliquent pas.</p>' : ''}
      <button class="outline" style="margin-top:6px">Enregistrer les bonus</button></form></div>`
  }
  const active = BONUSES.filter(([k]) => g.bonuses?.includes(k))
  return `<div class="card stack" style="gap:4px"><b class="goldc">Bonus et malus</b>
    ${active.length ? active.map(([k, t, r]) => `<div class="small soft">• ${t} — ${r}</div>${k === 'theme' ? `<div style="padding-left:12px">${calendar()}</div>` : ''}`).join('') : '<p class="small muted">Aucun : règles classiques.</p>'}
    <p class="small muted">${locked(g) ? 'Figés depuis le début de la saison.' : `Les administrateurs peuvent les changer jusqu'au ${lastOpenDay(g)} inclus.`}</p></div>`
}

function settingsHtml(d) {
  const g = d.group, admin = isAdmin(d), owner = g.owner_id === me
  const yes = b => (b ? 'oui' : 'non')
  return `<button class="outline" data-act="rules">📜 Notice du jeu : règles et bonus</button>
    <div class="card" style="text-align:center"><div class="muted">Code d'invitation</div>
      <div class="serif" style="font-size:40px;letter-spacing:.12em;font-style:normal;font-weight:700">${h(g.code)}</div>
      <button class="text" data-act="share">Partager</button></div>
    ${admin ? `<form id="settings" class="stack">
      <label class="field">Nom du groupe<input type="text" name="name" maxlength="50" required value="${h(g.name)}"></label>
      <label class="switch"><input type="checkbox" name="dup" ${g.allow_duplicates ? 'checked' : ''}><span>Plusieurs joueurs peuvent choisir la même personne</span></label>
      <label class="switch"><input type="checkbox" name="show" ${g.show_picks ? 'checked' : ''}><span>Choix des autres visibles avant le début</span></label>
      <label class="switch"><input type="checkbox" name="manual" ${g.allow_manual ? 'checked' : ''}><span>Autoriser les personnes non célèbres</span></label>
      <button class="outline">Enregistrer</button></form>`
    : `<div class="small soft">Même personne pour plusieurs joueurs : ${yes(g.allow_duplicates)}<br>Choix des autres visibles avant le début : ${yes(g.show_picks)}<br>Personnes non célèbres : ${yes(g.allow_manual)}</div>`}
    <p class="small muted">Saison ${period(g)} · ${g.max_picks} choix par joueur</p>
    ${bonusHtml(g, admin && !locked(g))}
    ${admin ? '<button class="outline" data-act="nextSeason">Saison suivante avec les mêmes joueurs</button>' : ''}
    <div class="label">Membres</div>
    ${[...d.standings].sort((a, b) => a.display_name.localeCompare(b.display_name, 'fr')).map(s => `<div class="row line" style="padding:4px 0">
      <span class="grow">${h(s.display_name)}${roleBadge(s.role)}${d.blocked.has(s.user_id) ? ' <span class="small warn">bloqué</span>' : ''}</span>
      ${s.user_id !== me ? `<button class="icon dim" data-act="member" data-id="${s.user_id}" aria-label="Actions pour ${h(s.display_name)}">${ICON.more}</button>` : ''}</div>`).join('')}
    ${d.standings.some(s => d.blocked.has(s.user_id)) ? '<p class="small muted">Un joueur bloqué ne peut plus t\'ajouter à un groupe. Pour ne plus le côtoyer ici, quitte le groupe ou demande à un administrateur de l\'exclure.</p>' : ''}
    ${!admin ? '<button class="text dim" data-act="reportGroup">Signaler ce groupe</button>' : ''}
    <button class="outline danger" style="margin-top:16px" data-act="leave">${owner ? 'Supprimer le groupe' : 'Quitter le groupe'}</button>
    <p class="small muted" style="text-align:center">Personnes non célèbres (ajout, décès) : dans l'app Android pour l'instant.</p>`
}

async function shareGroup(g) {
  const url = new URL('./?join=' + g.code, location.href).href
  const text = `Rejoins mon groupe « ${g.name} » sur Bingo Last Breath 💀\nCode : ${g.code}`
  if (navigator.share) {
    try { await navigator.share({ title: 'Bingo Last Breath', text, url }); return } catch (e) { if (e.name === 'AbortError') return }
  }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Invitation copiée.') } catch { toast(`Code : ${g.code}`) }
}

function reportDialog(label, target) {
  const f = modal(`<form class="stack"><h2>Signaler « ${h(label)} »</h2>
    <p class="small muted">Contenu injurieux, haineux, faux décès, fiche d'une personne sans son accord… Le signalement est examiné par l'éditeur.</p>
    <label class="field">Motif<textarea name="reason" rows="4" maxlength="500" required></textarea></label>
    <div class="actions"><button type="button" class="text dim" data-close>Annuler</button><button class="gold">Envoyer</button></div></form>`).querySelector('form')
  f.addEventListener('submit', async e => {
    e.preventDefault()
    try { await api.report(label, f.reason.value, target); dlg.close(); toast('Signalement envoyé. Merci.') } catch (err) { toast(errText(err)) }
  })
}

function memberDialog(uid) {
  const d = st.gd, g = d.group, s = d.standings.find(x => x.user_id === uid)
  if (!s) return
  const admin = isAdmin(d), owner = g.owner_id === me
  const kickable = admin && s.role !== 'owner' && (s.role === 'member' || owner)
  const blocked = d.blocked.has(uid)
  modal(`<h2>${h(s.display_name)}${roleBadge(s.role)}</h2><div class="menu">
    ${owner && s.role !== 'owner' ? `<button data-act="toggleAdmin" data-id="${uid}">${s.role === 'admin' ? 'Retirer administrateur' : 'Nommer administrateur'}</button>` : ''}
    ${kickable ? `<button data-act="kick" data-id="${uid}">Exclure du groupe</button>` : ''}
    <button data-act="reportMember" data-id="${uid}">Signaler</button>
    <button data-act="toggleBlock" data-id="${uid}">${blocked ? 'Débloquer' : 'Bloquer'}</button>
  </div>${owner && s.role !== 'owner' ? '<p class="small muted">Un administrateur peut régler le groupe, confirmer les décès et exclure les membres.</p>' : ''}
  <div class="actions"><button class="text dim" data-close>Fermer</button></div>`)
}

function monthDialog(pid) {
  const d = st.gd, g = d.group, p = d.picks.find(x => x.user_id === me && x.person_id === pid)
  modal(`<h2>Mois du décès</h2><p class="small muted">+30 points si le décès tombe ce mois-là.</p>
    <div class="chips" style="margin-top:10px">${seasonMonths(g).map((m, i) => `<label><input type="radio" name="m" value="${m}" ${p.predicted_month === m ? 'checked' : ''} data-act="setMonth" data-id="${pid}"><span>${monthName(m)}${g.theme_months?.[i] ? ' · ' + (THEMES[g.theme_months[i]] ?? '') : ''}</span></label>`).join('')}</div>
    <div class="actions">${p.predicted_month ? `<button class="text dim" data-act="setMonth" data-id="${pid}" data-value="">Effacer</button>` : ''}<button class="text" data-close>Fermer</button></div>`)
}

function confirmLeave() {
  const g = st.gd.group, owner = g.owner_id === me
  modal(`<h2>${owner ? 'Supprimer' : 'Quitter'} « ${h(g.name)} » ?</h2>
    <p>${owner ? 'Le groupe et tous les choix seront effacés pour tout le monde. Irréversible.' : 'Tes choix dans ce groupe seront effacés.'}</p>
    <div class="actions"><button class="text dim" data-close>Annuler</button><button class="outline danger" style="width:auto;padding:0 20px" data-act="doLeave">${owner ? 'Supprimer' : 'Quitter'}</button></div>`)
}

// ------------------------------------------------------------------ recherche

async function searchPage(gid, token) {
  try { if (st.gd?.group.id !== gid) await loadGroup(gid) } catch (e) { toast(errText(e)); return go('#/') }
  if (token !== navToken) return
  const g = st.gd.group
  let manual = []
  $app.innerHTML = top('Ajouter à mon équipe', 'Chercher', `<button class="icon" data-act="backGroup" aria-label="Retour">${ICON.back}</button>`) +
    `<input type="search" id="sq" placeholder="Nom d'une célébrité" autocomplete="off" enterkeyhint="search">
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
    const status = c.death ? '† déjà décédé(e)' : already ? 'Déjà dans ton équipe' : taken ? 'Déjà choisi(e) par un autre joueur'
      : age == null ? 'âge inconnu' : `${age} ans au ${show(g.season_start)}${age < 50 ? '  ★ Joker possible' : ''}`
    return `<div class="row line" style="padding:12px 2px;${ok ? '' : 'opacity:.55'}">
      <div class="grow"><b>${h(c.name)}</b>${c.description ? `<div class="small muted">${h(c.description)}</div>` : ''}
        <div class="small ${!ok ? 'warn' : age != null && age < 50 ? 'goldc' : 'soft'}">${status}</div></div>
      ${age != null && !c.death ? pts(pointsFor(age, false)) : ''}
      <button class="plus" ${ok ? '' : 'disabled'} ${attrs} aria-label="Ajouter ${h(c.name)}">+</button></div>`
  }
  const idle = () => {
    out.innerHTML = (manual.length ? '<div class="kicker" style="margin:4px 0">Personnes non célèbres</div>' +
      manual.filter(p => !p.death_date).map(p => row({ name: p.name, description: p.description, birth: p.birth_date }, p.id, `data-act="pickManual" data-id="${p.id}"`)).join('') : '') +
      '<p class="small muted" style="padding-top:12px">Les données (naissance, décès) viennent de Wikidata et sont vérifiées chaque matin.</p>'
  }
  if (g.allow_manual) api.manualPersons(gid).then(m => { manual = m; if (!input.value) idle() }).catch(() => {})
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
        out.innerHTML = res.length ? res.map(c => row(c, c.qid, `data-act="pickCeleb" data-id="${c.qid}"`)).join('') : '<p class="muted">Aucune personne trouvée.</p>'
      } catch (e) { if (n === seq) out.innerHTML = `<p class="warn">${h(errText(e))}</p>` }
    }, 400)
  })
}

async function addAndBack(fn, btn) {
  btn.disabled = true
  try { await fn(); st.tab = 'equipe'; go('#/g/' + st.gd.group.id) } catch (e) { toast(errText(e)); btn.disabled = false }
}

// ------------------------------------------------------------------ notice

function rulesPage() {
  const steps = ['Un joueur crée le groupe et partage le code.', 'Chacun rejoint, fait ses choix et désigne son joker ⭐.',
    'Au début de la saison, les choix sont verrouillés (et révélés s\'ils étaient cachés).', 'Pendant la saison, chaque décès d\'un de tes choix te rapporte des points.',
    'À la fin de la saison, le premier du classement gagne.']
  const ex = (l, f, n) => `<div class="row" style="padding:6px 0"><div class="grow"><b>${l}</b><div class="small muted">${f}</div></div>${pts(n, true)}</div>`
  $app.innerHTML = top('Règles du jeu', 'Notice', `<button class="icon" data-act="historyBack" aria-label="Retour">${ICON.back}</button>`) + `<div class="stack">
    <div class="card stack"><div class="kicker">Le principe</div><p class="soft">Chaque joueur choisit quelques personnalités (5 par défaut, de 3 à 20 selon le groupe). Si l'une d'elles meurt pendant la saison, il marque des points : plus elle était jeune, plus ça rapporte.</p></div>
    <div class="card"><div class="kicker">Les points</div><p class="soft">Points = 100 − âge au décès. À 100 ans et plus : 1 point symbolique. Le joker compte double.</p>
      ${ex('Mort à 84 ans', '100 − 84', 16)}${ex('Joker mort à 26 ans', '(100 − 26) × 2', 148)}${ex('Mort à 103 ans', 'point symbolique', 1)}
      <p class="soft">Ton équipe ne marque que si elle contient au moins une personne de moins de 50 ans au début de la saison.</p></div>
    <div class="card"><div class="kicker">Une saison, étape par étape</div>${steps.map((s, i) => `<div class="row" style="padding:4px 0"><span class="roman">${roman(i + 1)}</span><span class="soft">${s}</span></div>`).join('')}</div>
    <div class="card stack" style="gap:6px"><div class="kicker">Bonus et malus (au choix du groupe)</div>${BONUSES.map(([, t, r]) => `<div><b class="goldc">${t}</b><div class="small soft">${r}</div></div>`).join('')}</div>
    <p class="rule">Jeu entre amis, sans argent réel. Respecte les proches des personnes disparues.</p></div>`
}

// ------------------------------------------------------------------ actions (délégation des clics)

const acts = {
  retry: boot,
  browserOk: () => { store('browser_ok', '1'); start() },
  home: () => go('#/'),
  historyBack: () => (history.length > 1 ? history.back() : go('#/')),
  open: el => go('#/g/' + el.dataset.id),
  join: () => joinDialog(),
  create: () => createDialog(),
  menu: menuDialog,
  rename: renameDialog,
  rules: () => go('#/regles'),
  link: el => { dlg.close(); window.open(el.dataset.href, '_blank', 'noopener') },
  deleteAccount: deleteAccountDialog,
  tab: el => { st.tab = el.dataset.tab; renderGroup() },
  toggle: el => { const id = el.dataset.id; st.open.has(id) ? st.open.delete(id) : st.open.add(id); renderGroup() },
  share: () => shareGroup(st.gd.group),
  add: () => go(`#/g/${st.gd.group.id}/add`),
  backGroup: () => go('#/g/' + st.gd.group.id),
  joker: el => act(() => api.setJoker(st.gd.group.id, el.dataset.id === st.gd.picks.find(p => p.user_id === me && p.young)?.person_id ? null : el.dataset.id)),
  remove: el => act(() => api.removePick(st.gd.group.id, el.dataset.id)),
  secret: el => {
    const p = st.gd.picks.find(x => x.user_id === me && x.person_id === el.dataset.id)
    act(() => api.setPickOptions(st.gd.group.id, p.person_id, !p.secret, p.predicted_month ?? null))
  },
  month: el => monthDialog(el.dataset.id),
  setMonth: el => {
    const p = st.gd.picks.find(x => x.user_id === me && x.person_id === el.dataset.id)
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
  reportGroup: () => reportDialog('Groupe ' + st.gd.group.name, { groupId: st.gd.group.id }),
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
    act(async () => { await api.updateSettings(g, f.name.value.trim(), f.dup.checked, f.manual.checked, f.show.checked); toast('Réglages enregistrés.') })
  } else if (e.target.id === 'bonus' && g) {
    e.preventDefault()
    act(async () => { await api.setBonuses(g, [...e.target.querySelectorAll('[name=b]:checked')].map(c => c.value)); toast('Bonus enregistrés.') })
  }
})

start()
