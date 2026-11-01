'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)

// Audience of the public home page, counted anonymously by app/accueil (table site_events, views stats_*).
// A visit = one browser tab; a view = an episode played at least 3 s. The team's browsers are not counted.

function todayParis() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
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

  async function load() {
    const [d, e, s, p] = await Promise.all([
      supabase.from('stats_jours').select('*').order('jour', { ascending: false }).limit(60),
      supabase.from('stats_episodes').select('*').order('vues', { ascending: false }),
      supabase.from('stats_sources').select('*').order('visites', { ascending: false }).limit(15),
      supabase.from('pad_videos').select('id,title'),
    ])
    if (d.data) setDays(d.data)
    if (e.data) setEpisodes(e.data)
    if (s.data) setSources(s.data)
    if (p.data) setTitles(Object.fromEntries(p.data.map(v => [v.id, v.title])))
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
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Statistiques du site</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Comptage anonyme de skroll.tv : une visite = un onglet ouvert sur le site, une vue = un épisode regardé au moins 3 secondes. Vos navigateurs connectés à l'espace équipe ne sont pas comptés. Mis à jour chaque minute.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {cards.map(([label, n]) => (
            <div key={label} className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{n}</p>
            </div>
          ))}
        </div>

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

        <section className="bg-white rounded-xl border p-4 mt-6">
          <h3 className="font-semibold text-gray-900 mb-3">Vues par épisode</h3>
          {!episodes.length && <p className="text-sm text-gray-400">Aucun épisode regardé pour l'instant.</p>}
          {!!episodes.length && (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-500"><th className="py-1 font-normal">Épisode</th><th className="font-normal text-right">Vues</th><th className="font-normal text-right">7 jours</th><th className="font-normal text-right hidden sm:table-cell">Fil</th><th className="font-normal text-right hidden sm:table-cell">Mosaïque</th></tr></thead>
              <tbody className="divide-y">
                {episodes.map(e => (
                  <tr key={e.pad_id}>
                    <td className="py-1.5"><span className="font-medium">#{String(e.number).padStart(2, '0')}</span> <span className="text-gray-500">{titles[e.pad_id] || ''}</span></td>
                    <td className="text-right tabular-nums font-medium">{e.vues}</td>
                    <td className="text-right tabular-nums">{e.vues_7j}</td>
                    <td className="text-right tabular-nums hidden sm:table-cell">{e.vues_fil}</td>
                    <td className="text-right tabular-nums hidden sm:table-cell">{e.vues_mosaique}</td>
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
