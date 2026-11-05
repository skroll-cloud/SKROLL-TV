'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)

// All the audience in one page: the public home page, counted anonymously by app/accueil (table site_events, views stats_*),
// and the networks, copied from Metricool once a day by Claude (tables network_posts, network_followers).
// A visit = one browser tab; a view = an episode played at least 3 s. The team's browsers are not counted.

const NETWORKS = [
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-500' },
  { id: 'facebook', label: 'Facebook', color: 'bg-blue-600' },
  { id: 'tiktok', label: 'TikTok', color: 'bg-gray-900' },
  { id: 'youtube', label: 'YouTube', color: 'bg-red-600' },
]

function todayParis() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
}

// 31652 → "8 h 48", 754 → "12 min", 40 → "40 s"
function duration(sec) {
  if (!sec) return '0 s'
  if (sec < 60) return `${Math.round(sec)} s`
  const min = Math.round(sec / 60)
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
}

function shortDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Stats() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [days, setDays] = useState([])
  const [episodes, setEpisodes] = useState([])
  const [sources, setSources] = useState([])
  const [titles, setTitles] = useState({})
  const [posts, setPosts] = useState([])
  const [followers, setFollowers] = useState([])
  const [watchTotals, setWatchTotals] = useState({})
  const [sort, setSort] = useState({ key: 'total', desc: true })  // episode table, click a column title to sort

  async function load() {
    const [d, e, s, p, n, f, w] = await Promise.all([
      supabase.from('stats_jours').select('*').order('jour', { ascending: false }).limit(60),
      supabase.from('stats_episodes').select('*').order('vues', { ascending: false }),
      supabase.from('stats_sources').select('*').order('visites', { ascending: false }).limit(15),
      supabase.from('pad_videos').select('id,number,title'),
      supabase.from('network_posts').select('*'),
      supabase.from('network_followers').select('*').order('day', { ascending: false }).limit(400),
      supabase.from('network_watch_totals').select('*'),
    ])
    if (d.data) setDays(d.data)
    if (e.data) setEpisodes(e.data)
    if (s.data) setSources(s.data)
    if (p.data) setTitles(Object.fromEntries(p.data.map(v => [v.id, v])))
    if (n.data) setPosts(n.data)
    if (f.data) setFollowers(f.data)
    if (w.data) setWatchTotals(Object.fromEntries(w.data.map(r => [r.network, r])))
  }

  useEffect(() => {
    const saved = localStorage.getItem('skroll_user')
    if (!saved) { router.push('/equipe'); return }
    setCurrentUser(saved)
    load()
    const timer = setInterval(load, 60000)
    return () => clearInterval(timer)
  }, [])

  if (!currentUser) return null

  const today = days.find(d => d.jour === todayParis())
  const last7 = days.filter(d => (Date.now() - new Date(d.jour + 'T12:00:00')) / 86400000 < 7)
  const sum = (rows, k) => rows.reduce((n, r) => n + (r[k] || 0), 0)
  const cards = [
    ["Visites aujourd'hui", today?.visites || 0],
    ["Vues aujourd'hui", today?.vues || 0],
    ['Visites 7 jours', sum(last7, 'visites')],
    ['Vues au total', sum(days, 'vues')],
  ]
  // networks: latest follower count, gain over 7 days, views summed over the posts
  const net = NETWORKS.map(nw => {
    const rows = followers.filter(r => r.network === nw.id)
    const last = rows[0]
    const weekAgo = rows.find(r => (new Date(last?.day) - new Date(r.day)) / 86400000 >= 7)
    const mine = posts.filter(r => r.network === nw.id)
    // Instagram stories (reel reposted the next day at noon) count as views of the episode: most reels are short enough to be seen whole there
    const stories = posts.filter(r => r.network === nw.id + '_story')
    return { ...nw, followers: last?.followers, gain: last && weekAgo ? last.followers - weekAgo.followers : null, views: sum(mine, 'views') + sum(stories, 'views'), storyViews: sum(stories, 'views'), stories: stories.length, likes: sum(mine, 'likes'), posts: mine.length,
      // watch time per video when Metricool gives it (Instagram, Facebook), else the channel total typed in from a screenshot (YouTube)
      watch: sum(mine, 'watch_seconds') || watchTotals[nw.id]?.watch_seconds || null, watchTotal: !sum(mine, 'watch_seconds') ? watchTotals[nw.id] : null }
  })
  // site views made before watch time was measured on the home page: estimated with the networks' average seconds per view
  const netViews = net.reduce((n, nw) => n + (nw.watch ? nw.watchTotal?.views || nw.views : 0), 0)
  const perView = netViews ? net.reduce((n, nw) => n + (nw.watch || 0), 0) / netViews : 0
  const siteGuess = sum(days, 'vues_sans_temps') * perView
  const siteWatch = sum(days, 'secondes') + siteGuess
  const watchAll = siteWatch + net.reduce((n, nw) => n + (nw.watch || 0), 0)
  const synced = posts.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), '')
  // one row per episode: site views + views on each network
  const rows = {}
  const row = id => (rows[id] ||= { id, site: 0, total: 0, watch: 0 })
  episodes.forEach(e => { row(e.pad_id).site = e.vues; row(e.pad_id).total += e.vues; row(e.pad_id).watch += (e.secondes || 0) + (e.vues_sans_temps || 0) * perView })
  posts.filter(r => r.pad_id).forEach(r => { const o = row(r.pad_id); const k = r.network.replace(/_story$/, ''); o[k] = (o[k] || 0) + (r.views || 0); o.total += r.views || 0; o.watch += r.watch_seconds || 0 })
  const sortValue = e => sort.key === 'number' ? titles[e.id]?.number ?? 0 : e[sort.key] ?? -1
  const perEpisode = Object.values(rows).sort((a, b) => (sortValue(a) - sortValue(b)) * (sort.desc ? -1 : 1) || b.total - a.total)
  const Sortable = ({ k, children, className = '' }) => (
    <th className={`font-normal ${className}`}>
      <button onClick={() => setSort(s => ({ key: k, desc: s.key === k ? !s.desc : k !== 'number' }))}
        className={`inline-flex items-center gap-0.5 hover:text-gray-900 ${sort.key === k ? 'text-gray-900 font-medium' : ''}`}>
        {children}<span className={sort.key === k ? '' : 'opacity-30'}>{sort.key === k && !sort.desc ? '↑' : '↓'}</span>
      </button>
    </th>
  )
  const maxDay = Math.max(1, ...days.slice(0, 14).map(d => Math.max(d.visites, d.vues)))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="px-4 md:px-6 py-3 flex justify-between items-center">
          <button onClick={() => router.push('/equipe')} className="text-sm text-gray-500 hover:text-gray-800">← Espace de travail</button>
          <h1 className="text-lg font-bold text-blue-600 tracking-tight">SKROLL.TV</h1>
          <span className="text-sm text-gray-500 hidden md:inline">{currentUser}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Statistiques</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Site skroll.tv (comptage anonyme, en direct) : une visite = un onglet ouvert sur le site, une vue = un épisode regardé au moins 3 secondes. Vos navigateurs connectés à l'espace équipe ne sont pas comptés. Mis à jour chaque minute.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {cards.map(([label, n]) => (
            <div key={label} className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{n}</p>
            </div>
          ))}
        </div>

        <section className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h3 className="font-semibold text-gray-900">Réseaux sociaux</h3>
            <p className="text-xs text-gray-500">{synced ? `Chiffres Metricool du ${new Date(synced).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} (copiés une fois par jour ; les réseaux livrent leurs chiffres avec environ un jour de retard)` : 'Les premiers chiffres arrivent demain matin (Metricool les reçoit des réseaux avec environ un jour de retard).'}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {net.map(nw => (
              <div key={nw.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2"><span className={`inline-block w-2.5 h-2.5 rounded-full ${nw.color}`} />{nw.label}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{nw.followers ?? '–'} <span className="text-xs font-normal text-gray-500">abonnés{nw.gain != null && ` (${nw.gain >= 0 ? '+' : ''}${nw.gain} en 7 j)`}</span></p>
                <p className="text-sm text-gray-600 tabular-nums">{nw.views} vues{nw.storyViews ? ` (dont ${nw.storyViews} en story)` : ''} · {nw.likes} j'aime · {nw.posts} vidéos{nw.stories ? ` + ${nw.stories} stories` : ''}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <h3 className="font-semibold text-gray-900">Temps de visionnage</h3>
            <p className="text-2xl font-bold tabular-nums">{duration(watchAll)} <span className="text-xs font-normal text-gray-500">au total, partout</span></p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[{ id: 'site', label: 'Site skroll.tv', color: 'bg-pink-300', watch: siteWatch, views: sum(days, 'vues'), guess: siteGuess }, ...net].map(w => (
              <div key={w.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2"><span className={`inline-block w-2.5 h-2.5 rounded-full ${w.color}`} />{w.label}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">{w.watch ? duration(w.watch) : '–'}</p>
                <p className="text-xs text-gray-500">
                  {w.guess ? `dont ${duration(w.guess)} estimées : ${sum(days, 'vues_sans_temps')} vues d'avant le 5 nov. × ${perView.toFixed(1).replace('.', ',')} s (moyenne des réseaux)`
                    : w.watchTotal ? `chaîne entière, capture YouTube Studio du ${new Date(w.watchTotal.as_of + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
                    : !w.watch ? (w.id === 'tiktok' ? 'TikTok ne le fournit pas à Metricool' : 'pas encore de chiffre')
                    : `${(w.watch / Math.max(1, w.watchTotal?.views || w.views)).toFixed(1).replace('.', ',')} s par vue en moyenne`}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Site : secondes réellement jouées (en direct, sans les retours en arrière) depuis le 5 novembre au soir ; avant, estimé avec la moyenne par vue des réseaux. Instagram et Facebook : chiffres Metricool, par vidéo. YouTube : Metricool ne le donne pas, total de la chaîne recopié depuis YouTube Studio.</p>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-1">Par jour</h3>
            <p className="text-xs text-gray-500 mb-3"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500 align-middle" /> visites · <span className="inline-block w-2.5 h-2.5 rounded-sm bg-pink-500 align-middle" /> vues d'épisodes</p>
            {!days.length && <p className="text-sm text-gray-400">Pas encore de visite.</p>}
            <ul className="space-y-2">
              {days.slice(0, 14).map(d => (
                <li key={d.jour} className="text-sm">
                  <div className="flex justify-between text-gray-600"><span>{shortDate(d.jour)}</span><span className="tabular-nums">{d.visites} visites · {d.vues} vues · {d.visites_tel} sur téléphone</span></div>
                  <div className="mt-1 space-y-0.5">
                    <div className="h-1.5 rounded bg-blue-500" style={{ width: `${(d.visites / maxDay) * 100}%` }} />
                    <div className="h-1.5 rounded bg-pink-500" style={{ width: `${(d.vues / maxDay) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-3">D'où viennent les visiteurs</h3>
            {!sources.length && <p className="text-sm text-gray-400">Pas encore de visite.</p>}
            <ul className="divide-y text-sm">
              {sources.map(s => (
                <li key={s.source} className="flex justify-between py-1.5"><span className="text-gray-700">{s.source === 'direct' ? 'Lien direct ou appli (Instagram, TikTok… ne transmettent pas toujours la source)' : s.source}</span><span className="tabular-nums font-medium">{s.visites}</span></li>
              ))}
            </ul>
          </section>
        </div>

        <section className="bg-white rounded-xl border p-4 mt-6 overflow-x-auto">
          <h3 className="font-semibold text-gray-900 mb-1">Vues par épisode, partout</h3>
          <p className="text-xs text-gray-500 mb-3">Temps regardé : site + Instagram + Facebook (YouTube et TikTok ne donnent pas le détail par vidéo).</p>
          {!perEpisode.length && <p className="text-sm text-gray-400">Aucune vue pour l'instant.</p>}
          {!!perEpisode.length && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500"><Sortable k="number" className="py-1">Épisode</Sortable><Sortable k="site" className="text-right">Site</Sortable>{NETWORKS.map(nw => <Sortable key={nw.id} k={nw.id} className="text-right">{nw.label}</Sortable>)}<Sortable k="total" className="text-right">Total</Sortable><Sortable k="watch" className="text-right pl-2">Temps regardé</Sortable></tr></thead>
              <tbody className="divide-y">
                {perEpisode.map(e => (
                  <tr key={e.id}>
                    <td className="py-1.5 pr-2"><span className="font-medium">#{String(titles[e.id]?.number ?? '').padStart(2, '0')}</span> <span className="text-gray-500 hidden sm:inline">{titles[e.id]?.title || ''}</span></td>
                    <td className="text-right tabular-nums px-1">{e.site}</td>
                    {NETWORKS.map(nw => <td key={nw.id} className="text-right tabular-nums px-1">{e[nw.id] ?? '–'}</td>)}
                    <td className="text-right tabular-nums font-semibold pl-1">{e.total}</td>
                    <td className="text-right tabular-nums pl-2 whitespace-nowrap">{e.watch ? duration(e.watch) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  )
}
