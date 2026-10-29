'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)

const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function formatDay(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${WEEKDAYS[date.getDay()]} ${d} ${MONTHS[m - 1]}`
}

function nextDay(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + 1))
  return date.toISOString().slice(0, 10)
}

function isPad(v) {
  return v.bertrand_vote === 'pad' && v.sebastien_vote === 'pad' && v.pierreemmanuel_vote === 'pad'
}

function videoLabel(v) {
  return v.pad_number ? `#${String(v.pad_number).padStart(2, '0')}_${v.title}` : v.title
}

function defaultCaption(v) {
  const parts = v.title.replace(/^SKROLL_/, '').split('_')
  const archives = []
  while (parts.length > 1 && /^\d+$/.test(parts[0])) archives.push(parts.shift())
  const name = parts.join(' ').replace(/ 1$/, '').replace(/^./, c => c.toUpperCase())
  const nums = archives.filter(a => a !== '0000')
  return `${name}\n\nArchives Cinémathèque de Bretagne${nums.length ? ` (n° ${nums.join(', ')})` : ''}. 100 % archives, 0 % IA.\n\n#skroll #bretagne #archives #humour`
}

export default function DiffusionPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [slots, setSlots] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openCaption, setOpenCaption] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('skroll_user')
    if (!saved) { router.push('/'); return }
    setCurrentUser(saved)
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  async function load() {
    const [s, v] = await Promise.all([
      supabase.from('broadcast_schedule').select('*').order('day', { ascending: true }),
      supabase.from('videos').select('id,title,file_url,pad_number,bertrand_vote,sebastien_vote,pierreemmanuel_vote,video_types(name)')
    ])
    if (s.error || v.error) setError('Impossible de charger le planning. Rechargez la page.')
    else { setSlots(s.data); setVideos(v.data); setError('') }
    setLoading(false)
  }

  const byId = Object.fromEntries(videos.map(v => [v.id, v]))
  const scheduledIds = new Set(slots.map(s => s.video_id).filter(Boolean))
  const unscheduled = videos.filter(v => isPad(v) && !scheduledIds.has(v.id)).sort((a, b) => a.pad_number - b.pad_number)
  const locked = s => !!s.metricool_status

  // Move the content (video + caption) at index `from` to index `to`; days stay fixed, content between shifts by one.
  async function move(from, to) {
    if (from === to || to < 0 || to >= slots.length || busy) return
    const lo = Math.min(from, to), hi = Math.max(from, to)
    if (slots.slice(lo, hi + 1).some(locked)) { setError('Une des vidéos concernées est déjà programmée dans Metricool : déplacement impossible.'); return }
    const contents = slots.map(s => ({ video_id: s.video_id, caption: s.caption }))
    const [item] = contents.splice(from, 1)
    contents.splice(to, 0, item)
    const next = slots.map((s, i) => ({ ...s, ...contents[i] }))
    setSlots(next)
    setBusy(true)
    const changed = next.slice(lo, hi + 1)
    const results = await Promise.all(changed.map(s => supabase.from('broadcast_schedule').update({ video_id: s.video_id, caption: s.caption }).eq('id', s.id)))
    setBusy(false)
    if (results.some(r => r.error)) { setError('Ordre pas entièrement enregistré. Rechargez la page.'); load() }
    else setError('')
  }

  async function updateSlot(id, patch) {
    setSlots(ss => ss.map(s => s.id === id ? { ...s, ...patch } : s))
    const { error } = await supabase.from('broadcast_schedule').update(patch).eq('id', id)
    if (error) { setError('Pas enregistré. Vérifiez la connexion et réessayez.'); load() }
  }

  async function setVideo(slot, videoId) {
    const v = byId[videoId]
    await updateSlot(slot.id, { video_id: videoId || null, caption: v ? defaultCaption(v) : '' })
  }

  async function addDay(videoId) {
    const last = slots[slots.length - 1]
    const day = last ? nextDay(last.day) : '2026-11-01'
    const v = byId[videoId]
    const { error } = await supabase.from('broadcast_schedule').insert([{ day, video_id: videoId || null, caption: v ? defaultCaption(v) : '' }])
    if (error) setError('Jour non ajouté. Réessayez.')
    load()
  }

  async function removeLastDay() {
    const last = slots[slots.length - 1]
    if (!last || locked(last)) return
    if (last.video_id && !confirm(`Supprimer le ${formatDay(last.day)} ? La vidéo retourne dans « à programmer ».`)) return
    const { error } = await supabase.from('broadcast_schedule').delete().eq('id', last.id)
    if (error) setError('Suppression impossible.')
    load()
  }

  if (!currentUser) return null

  const filled = slots.filter(s => s.video_id).length
  const sent = slots.filter(locked).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="px-4 md:px-6 py-3 flex justify-between items-center">
          <button onClick={() => router.push('/')} className="text-sm text-gray-500 hover:text-gray-800">← Espace de travail</button>
          <h1 className="text-lg font-bold text-blue-600 tracking-tight">SKROLL.TV</h1>
          <span className="text-sm text-gray-500 hidden md:inline">{currentUser}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Planning de diffusion</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">Une vidéo par jour à partir du 1er novembre. Changez l'ordre avec les flèches (ou en glissant une ligne sur ordinateur) : les dates restent, les vidéos se décalent.</p>
          </div>
          <div className="flex gap-6">
            <div><p className="text-2xl font-bold text-gray-900 tabular-nums">{filled}</p><p className="text-xs text-gray-500">jours programmés</p></div>
            <div><p className="text-2xl font-bold text-gray-900 tabular-nums">{sent}/{filled}</p><p className="text-xs text-gray-500">envoyés à Metricool</p></div>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {loading && <p className="text-gray-500">Chargement…</p>}

        <div className="bg-white rounded-xl shadow-sm divide-y">
          {slots.map((slot, i) => {
            const v = byId[slot.video_id]
            const warn = v && !isPad(v)
            return (
              <div key={slot.id}
                draggable={!locked(slot)}
                onDragStart={() => setDragIndex(i)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => { move(dragIndex, i); setDragIndex(null) }}
                className={`px-3 py-2 ${dragIndex === i ? 'opacity-40' : ''} ${slot.day.endsWith('-01') && i > 0 ? 'border-t-2 border-gray-900' : ''}`}>
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-24 shrink-0 whitespace-nowrap">
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatDay(slot.day)}</p>
                    <p className="text-xs text-gray-400 tabular-nums">J{i + 1}</p>
                  </div>
                  <div className="flex flex-col shrink-0">
                    <button onClick={() => move(i, i - 1)} disabled={i === 0 || locked(slot) || busy} aria-label="Avancer d'un jour" className="text-gray-400 hover:text-gray-900 disabled:opacity-20 leading-none px-1">▲</button>
                    <button onClick={() => move(i, i + 1)} disabled={i === slots.length - 1 || locked(slot) || busy} aria-label="Reculer d'un jour" className="text-gray-400 hover:text-gray-900 disabled:opacity-20 leading-none px-1">▼</button>
                  </div>
                  <div className="flex-1 min-w-0">
                    {v ? (
                      <>
                        <button onClick={() => router.push(`/video/${v.id}`)} className="block text-left text-sm font-medium text-gray-900 hover:text-blue-600 break-all">{videoLabel(v)}</button>
                        <p className="text-xs text-gray-500">
                          {v.video_types?.name || 'sans type'}
                          {warn && <span className="ml-2 text-red-600 font-semibold">n'est plus en PAD</span>}
                        </p>
                      </>
                    ) : (
                      <select value="" onChange={e => setVideo(slot, e.target.value)} className="border border-orange-300 text-orange-700 rounded-lg px-2 py-1.5 text-sm max-w-full">
                        <option value="">Choisir une vidéo…</option>
                        {unscheduled.map(u => <option key={u.id} value={u.id}>{videoLabel(u)}</option>)}
                      </select>
                    )}
                  </div>
                  <input type="time" aria-label="Heure de publication" value={slot.post_time || ''} disabled={locked(slot)}
                    onChange={e => updateSlot(slot.id, { post_time: e.target.value })}
                    className="hidden sm:block border rounded-lg px-2 py-1 text-sm text-gray-700 w-[92px]" />
                  {v && <button onClick={() => setOpenCaption(openCaption === slot.id ? null : slot.id)} className="text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0">Texte</button>}
                  {locked(slot)
                    ? <span className="text-xs font-semibold text-green-700 bg-green-50 rounded-full px-2 py-0.5 shrink-0">Metricool ✓</span>
                    : v && <button onClick={() => setVideo(slot, null)} aria-label="Retirer la vidéo de ce jour" className="text-gray-400 hover:text-red-500 text-sm shrink-0">✕</button>}
                </div>
                {openCaption === slot.id && v && (
                  <div className="mt-2 md:ml-[134px] space-y-2">
                    <CaptionInput slot={slot} disabled={locked(slot)} onSave={caption => updateSlot(slot.id, { caption })} />
                    <input type="time" aria-label="Heure de publication" value={slot.post_time || ''} disabled={locked(slot)}
                      onChange={e => updateSlot(slot.id, { post_time: e.target.value })}
                      className="sm:hidden border rounded-lg px-2 py-1 text-sm text-gray-700" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {!loading && (
          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <button onClick={() => addDay(null)} className="text-sm font-medium text-blue-600 hover:text-blue-800">+ Ajouter un jour</button>
            {slots.length > 0 && <button onClick={removeLastDay} className="text-sm text-gray-500 hover:text-red-600">Supprimer le dernier jour</button>}
          </div>
        )}

        {!loading && unscheduled.length > 0 && (
          <section className="mt-8">
            <h3 className="font-bold text-gray-900 border-b-2 border-gray-900 pb-1.5 mb-2">Vidéos PAD pas encore programmées ({unscheduled.length})</h3>
            {unscheduled.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-dashed border-gray-200">
                <span className="text-sm text-gray-800 truncate">{videoLabel(u)}</span>
                <button onClick={() => addDay(u.id)} className="text-sm font-medium text-blue-600 hover:text-blue-800 shrink-0">Ajouter à la fin</button>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}

function CaptionInput({ slot, disabled, onSave }) {
  const [value, setValue] = useState(slot.caption || '')
  useEffect(() => setValue(slot.caption || ''), [slot.caption])
  return (
    <textarea value={value} rows={5} disabled={disabled} aria-label="Texte de la publication"
      onChange={e => setValue(e.target.value)}
      onBlur={() => { if (value !== (slot.caption || '')) onSave(value) }}
      className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400" />
  )
}
