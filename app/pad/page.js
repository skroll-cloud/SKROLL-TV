'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)

// Catalogue des épisodes (table pad_videos) : fichiers finis, mixés et habillés dans DaVinci.
// Chaque épisode passe en « Modif à faire » ou en « PAD » ; les PAD apparaissent dans la liste à côté du planning de diffusion.
const STATUS = {
  modif: { label: 'Modif à faire', on: 'bg-orange-400 border-orange-400 text-white', hover: 'hover:border-orange-400' },
  pad: { label: 'PAD', on: 'bg-green-500 border-green-500 text-white', hover: 'hover:border-green-500' },
}
const FILTERS = [
  ['all', 'Tous'],
  ['todo', 'À voir'],
  ['modif', 'Modif à faire'],
  ['pad', 'PAD'],
  ['unscheduled', 'PAD pas programmés'],
]
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

function shortDay(day) {
  const [y, m, d] = day.split('-').map(Number)
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`
}

function duration(s) {
  if (!s) return ''
  const n = Math.round(s)
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

export default function PadPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [videos, setVideos] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('skroll_user')
    if (!saved) { router.push('/'); return }
    setCurrentUser(saved)
    try { setFilter(localStorage.getItem('skroll_pad_filter2') || 'all') } catch {}
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  async function load() {
    const [v, s] = await Promise.all([
      supabase.from('pad_videos').select('*').order('number', { ascending: true }),
      supabase.from('broadcast_schedule').select('id,day,post_time,format,pad_ids').order('day', { ascending: true }),
    ])
    if (v.error || s.error) setError('Impossible de charger les épisodes. Rechargez la page.')
    else { setVideos(v.data); setEntries(s.data); setError('') }
    setLoading(false)
  }

  async function update(id, patch) {
    setVideos(vs => vs.map(v => v.id === id ? { ...v, ...patch } : v))
    const { error } = await supabase.from('pad_videos').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { setError('Pas enregistré. Vérifiez la connexion et réessayez.'); load() }
  }

  function chooseFilter(f) {
    setFilter(f)
    try { localStorage.setItem('skroll_pad_filter2', f) } catch {}
  }

  if (!currentUser) return null

  // a short = the episode's own post; compils and other formats reuse it
  const slots = id => entries.filter(e => e.format === 'short' && e.pad_ids.includes(id))
  const reuses = id => entries.filter(e => !['short', 'story'].includes(e.format) && e.pad_ids.includes(id))
  const matches = v => {
    if (search && !`${v.number} ${v.title} ${v.name}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'todo') return !v.status
    if (filter === 'modif' || filter === 'pad') return v.status === filter
    if (filter === 'unscheduled') return v.status === 'pad' && !slots(v.id).length
    return true
  }
  const shown = videos.filter(matches)
  const counts = {
    all: videos.length,
    todo: videos.filter(v => !v.status).length,
    modif: videos.filter(v => v.status === 'modif').length,
    pad: videos.filter(v => v.status === 'pad').length,
    unscheduled: videos.filter(v => v.status === 'pad' && !slots(v.id).length).length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="px-4 md:px-6 py-3 flex justify-between items-center">
          <button onClick={() => router.push('/')} className="text-sm text-gray-500 hover:text-gray-800">← Espace de travail</button>
          <h1 className="text-lg font-bold text-blue-600 tracking-tight">SKROLL.TV</h1>
          <button onClick={() => router.push('/diffusion')} className="text-sm text-gray-500 hover:text-gray-800">Planning →</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-5">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Épisodes</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">Versions mixées et habillées. Passez chaque épisode en « Modif à faire » ou en « PAD » : les PAD apparaissent à côté du planning, prêts à être glissés sur un jour. Téléchargez-les pour fabriquer les 9:16.</p>

        <div className="flex flex-wrap gap-2 mb-3">
          {FILTERS.map(([id, label]) => (
            <button key={id} onClick={() => chooseFilter(id)}
              className={`text-sm rounded-full border px-3 py-1 ${filter === id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 hover:border-gray-400'}`}>
              {label} <span className="tabular-nums opacity-70">{counts[id]}</span>
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un numéro ou un titre…"
          className="w-full md:w-80 border rounded-lg px-3 py-2 text-sm mb-4 bg-white focus:outline-none focus:border-blue-400" />

        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {loading && <p className="text-gray-500">Chargement…</p>}
        {!loading && !shown.length && <p className="text-gray-500 text-sm">Aucun épisode dans ce filtre.</p>}

        <ul className="bg-white rounded-xl shadow-sm divide-y">
          {shown.map(v => {
            const open = openId === v.id
            const planned = slots(v.id)
            return (
              <li key={v.id} className="px-3 md:px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button onClick={() => setOpenId(open ? null : v.id)} className="flex-1 min-w-[200px] text-left">
                    <p className="font-medium text-gray-900 break-words"><span className="tabular-nums text-gray-400 mr-2">#{String(v.number).padStart(2, '0')}</span>{v.title}</p>
                    <p className="text-xs text-gray-500">
                      {duration(v.duration_s)}{v.archives.length ? ` · archives ${v.archives.join(', ')}` : ''}
                      {planned.length ? <span className="text-green-700"> · programmé le {planned.map(e => shortDay(e.day)).join(', ')}</span> : ''}
                      {v.note ? <span className="text-orange-700"> · {v.note.length > 60 ? v.note.slice(0, 60) + '…' : v.note}</span> : ''}
                    </p>
                  </button>
                  <div className="flex gap-1.5">
                    {Object.entries(STATUS).map(([id, s]) => (
                      <button key={id} onClick={() => update(v.id, { status: v.status === id ? null : id })}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${v.status === id ? s.on : `text-gray-600 ${s.hover}`}`}>{s.label}</button>
                    ))}
                  </div>
                  {v.file_url
                    ? <a href={`${v.file_url}?download=${encodeURIComponent(v.file_name)}`} className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100">Télécharger</a>
                    : <span className="text-xs text-gray-400">fichier en cours d'envoi</span>}
                </div>

                {open && (
                  <div className="mt-3 grid md:grid-cols-[1fr_260px] gap-4">
                    {v.file_url
                      ? <video src={v.file_url} controls autoPlay playsInline preload="metadata" className="w-full bg-black rounded-lg aspect-[4/3]" />
                      : <div className="w-full bg-gray-100 rounded-lg aspect-[4/3] flex items-center justify-center text-sm text-gray-500">Fichier pas encore envoyé</div>}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-900">Modif à faire / note
                        <NoteInput value={v.note || ''} onSave={note => update(v.id, { note })} />
                      </label>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p className="break-all">Fichier : {v.file_name}</p>
                        {reuses(v.id).map(e => <p key={e.id}>Repris dans une {e.format === 'compil' ? 'compil' : 'publication'} le {shortDay(e.day)}</p>)}
                        {planned.map(e => <p key={e.id}>Programmé le {shortDay(e.day)} à {e.post_time}</p>)}
                        {v.status === 'pad' && !planned.length && <button onClick={() => router.push('/diffusion')} className="text-blue-600 hover:underline">Placer dans le planning →</button>}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}

function NoteInput({ value, onSave }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return <textarea rows={3} value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => draft !== value && onSave(draft)}
    placeholder="Ce qu'il faut modifier, remarque pour le 9:16…"
    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal text-gray-800 focus:outline-none focus:border-blue-400" />
}
