'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)

const NETWORKS = [
  { id: 'instagram', label: 'Instagram', short: 'IG' },
  { id: 'facebook', label: 'Facebook', short: 'FB' },
  { id: 'tiktok', label: 'TikTok', short: 'TT' },
  { id: 'youtube', label: 'YouTube', short: 'YT' },
]
const ALL_NETWORKS = NETWORKS.map(n => n.id)
// Diffusion strategy: daily short at 19:00, compils (2 or 3 already-aired shorts, 61–90 s) Tue & Fri 12:30, "Le 2 minutes" 16:9 Sunday 10:00.
const FORMATS = {
  short: { label: 'Short quotidien', chip: 'bg-blue-50 border-blue-500 text-blue-950', dot: 'bg-blue-500', slots: 1, time: '19:00', networks: ALL_NETWORKS, hint: '9:16, 15–45 s.' },
  compil: { label: 'Compil 61–90 s', chip: 'bg-orange-50 border-orange-500 text-orange-950', dot: 'bg-orange-500', slots: 3, time: '12:30', networks: ALL_NETWORKS, hint: '9:16, 2 ou 3 shorts diffusés depuis au moins une semaine.' },
  '2min': { label: 'Le 2 minutes 16:9', chip: 'bg-purple-50 border-purple-500 text-purple-950', dot: 'bg-purple-500', slots: null, time: '10:00', networks: ['youtube', 'facebook'], hint: '16:9, thématique, pour YouTube et Facebook.' },
}
const WEEKDAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
const WEEKDAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const FIRST_MONTH = { y: 2026, m: 10 }

function iso(y, m, d) {
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
}

function todayIso() {
  const d = new Date()
  return iso(d.getFullYear(), d.getMonth(), d.getDate())
}

function longDay(day) {
  const [y, m, d] = day.split('-').map(Number)
  return `${WEEKDAYS_LONG[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS[m - 1].toLowerCase()}`
}

// Weeks (Monday first) covering the month, as arrays of ISO dates.
function monthWeeks(y, m) {
  const first = new Date(Date.UTC(y, m, 1))
  const offset = (first.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const weeks = []
  for (let start = 1 - offset; start <= daysInMonth; start += 7) {
    weeks.push(Array.from({ length: 7 }, (_, i) => iso(y, m, start + i)))
  }
  return weeks
}

function isPad(v) {
  return v.bertrand_vote === 'pad' && v.sebastien_vote === 'pad' && v.pierreemmanuel_vote === 'pad'
}

function isRejected(v) {
  return [v.bertrand_vote, v.sebastien_vote, v.pierreemmanuel_vote].includes('non')
}

function videoLabel(v) {
  return v.pad_number ? `#${String(v.pad_number).padStart(2, '0')}_${v.title}` : v.title
}

function shortName(v) {
  const parts = v.title.replace(/^SKROLL_/, '').split('_')
  while (parts.length > 1 && /^\d+$/.test(parts[0])) parts.shift()
  return parts.join(' ').replace(/ 1$/, '')
}

function defaultCaption(v) {
  const parts = v.title.replace(/^SKROLL_/, '').split('_')
  const archives = []
  while (parts.length > 1 && /^\d+$/.test(parts[0])) archives.push(parts.shift())
  const name = parts.join(' ').replace(/ 1$/, '').replace(/^./, c => c.toUpperCase())
  const nums = archives.filter(a => a !== '0000')
  return `${name}\n\nArchives Cinémathèque de Bretagne${nums.length ? ` (n° ${nums.join(', ')})` : ''}. 100 % archives, 0 % IA.\n\n#skroll #bretagne #archives #humour`
}

function readList(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback }
}

export default function DiffusionPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [entries, setEntries] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(FIRST_MONTH)
  const [shownNetworks, setShownNetworks] = useState(ALL_NETWORKS)
  const [shownFormats, setShownFormats] = useState(Object.keys(FORMATS))
  const [editingId, setEditingId] = useState(null)
  const [dropDay, setDropDay] = useState(null)
  const [uploading, setUploading] = useState(null)
  const [onlyTodo, setOnlyTodo] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('skroll_user')
    if (!saved) { router.push('/'); return }
    setCurrentUser(saved)
    setShownNetworks(readList('skroll_diff_networks2', ALL_NETWORKS))
    setShownFormats(readList('skroll_diff_formats2', Object.keys(FORMATS)))
    const now = new Date()
    if (now.getFullYear() * 12 + now.getMonth() > FIRST_MONTH.y * 12 + FIRST_MONTH.m) setMonth({ y: now.getFullYear(), m: now.getMonth() })
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  async function load() {
    const [s, v] = await Promise.all([
      supabase.from('broadcast_schedule').select('*').order('day', { ascending: true }).order('created_at', { ascending: true }),
      supabase.from('videos').select('id,title,file_url,pad_number,bertrand_vote,sebastien_vote,pierreemmanuel_vote')
    ])
    if (s.error || v.error) setError('Impossible de charger le planning. Rechargez la page.')
    else { setEntries(s.data); setVideos(v.data); setError('') }
    setLoading(false)
  }

  const byId = Object.fromEntries(videos.map(v => [v.id, v]))
  const usedIds = new Set(entries.filter(e => e.format === 'short').flatMap(e => e.video_ids))
  const unscheduled = videos.filter(v => isPad(v) && !usedIds.has(v.id)).sort((a, b) => a.pad_number - b.pad_number)
  const pickable = videos.filter(v => !isRejected(v)).sort((a, b) => (a.pad_number || 999) - (b.pad_number || 999) || a.title.localeCompare(b.title))
  const locked = e => !!e.metricool_status
  const todo = e => !e.final_url
  const visible = e => shownFormats.includes(e.format) && e.networks.some(n => shownNetworks.includes(n)) && (!onlyTodo || todo(e))
  const editing = entries.find(e => e.id === editingId)

  function entryName(e) {
    const names = e.video_ids.map(id => byId[id]).filter(Boolean)
    if (e.format === 'short') {
      const v = names[0] && `${names[0].pad_number ? '#' + String(names[0].pad_number).padStart(2, '0') + ' ' : ''}${shortName(names[0])}`
      if (e.title && v) return `${e.title} · ${v}`
      return e.title || v || 'Short à choisir'
    }
    return e.title || names.map(shortName).join(' + ') || FORMATS[e.format].label
  }

  async function updateEntry(id, patch) {
    setEntries(es => es.map(e => e.id === id ? { ...e, ...patch } : e))
    const { error } = await supabase.from('broadcast_schedule').update(patch).eq('id', id)
    if (error) { setError('Pas enregistré. Vérifiez la connexion et réessayez.'); load() }
  }

  async function addEntry(day, videoId) {
    const v = byId[videoId]
    const { data, error } = await supabase.from('broadcast_schedule')
      .insert([{ day, format: 'short', networks: FORMATS.short.networks, post_time: FORMATS.short.time, video_ids: v ? [v.id] : [], caption: v ? defaultCaption(v) : '' }]).select().single()
    if (error) { setError('Publication non ajoutée. Réessayez.'); return }
    setEntries(es => [...es, data])
    if (!v) setEditingId(data.id)
  }

  async function deleteEntry(e) {
    if (!confirm(`Supprimer la publication « ${entryName(e)} » du ${longDay(e.day)} ?`)) return
    setEditingId(null)
    setEntries(es => es.filter(x => x.id !== e.id))
    const { error } = await supabase.from('broadcast_schedule').delete().eq('id', e.id)
    if (error) { setError('Suppression impossible.'); load() }
  }

  // Dropping on a day that already has the same format swaps the two, so the rhythm (one short a day, etc.) stays intact.
  async function dropOn(day, payload) {
    setDropDay(null)
    if (payload.videoId) return addEntry(day, payload.videoId)
    const moving = entries.find(e => e.id === payload.entryId)
    if (!moving || moving.day === day || locked(moving)) return
    const other = entries.find(e => e.day === day && e.id !== moving.id && e.format === moving.format)
    if (other && locked(other)) { setError('Ce jour contient une publication déjà envoyée à Metricool : échange impossible.'); return }
    await updateEntry(moving.id, { day })
    if (other) await updateEntry(other.id, { day: moving.day })
  }

  async function uploadFinal(e, file) {
    if (!file) return
    setUploading(e.id)
    const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]/g, '_')
    const filePath = `diffusion/${Date.now()}-${safe}`
    const { error } = await supabase.storage.from('Videos').upload(filePath, file, { cacheControl: '3600', upsert: false })
    if (error) { setError(`Envoi du fichier impossible : ${error.message}`); setUploading(null); return }
    const { data } = supabase.storage.from('Videos').getPublicUrl(filePath)
    await updateEntry(e.id, { final_url: data.publicUrl, final_name: file.name, final_uploaded_at: new Date().toISOString(), final_uploaded_by: currentUser })
    setUploading(null)
  }

  function toggle(list, setList, key, value) {
    const next = list.includes(value) ? list.filter(x => x !== value) : [...list, value]
    setList(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  function shiftMonth(delta) {
    setMonth(({ y, m }) => ({ y: y + Math.floor((m + delta) / 12), m: (m + delta + 12) % 12 }))
  }

  if (!currentUser) return null

  const today = todayIso()
  const weeks = monthWeeks(month.y, month.m)
  const monthPrefix = `${month.y}-${String(month.m + 1).padStart(2, '0')}`
  const monthEntries = entries.filter(e => e.day.startsWith(monthPrefix) && visible(e))
  const readyCount = entries.filter(e => e.final_url).length
  const emptyShorts = entries.filter(e => e.format === 'short' && !e.video_ids.length).length
  const dayEntries = day => entries.filter(e => e.day === day && visible(e)).sort((a, b) => (a.post_time || '').localeCompare(b.post_time || ''))

  const dragProps = payload => ({
    draggable: true,
    onDragStart: ev => ev.dataTransfer.setData('text/plain', JSON.stringify(payload)),
  })
  const dropProps = day => ({
    onDragOver: ev => { ev.preventDefault(); setDropDay(day) },
    onDragLeave: () => setDropDay(d => d === day ? null : d),
    onDrop: ev => { ev.preventDefault(); try { dropOn(day, JSON.parse(ev.dataTransfer.getData('text/plain'))) } catch { setDropDay(null) } },
  })

  const Chip = ({ e }) => (
    <button {...(locked(e) ? {} : dragProps({ entryId: e.id }))} onClick={() => setEditingId(e.id)}
      title={`${e.post_time} · ${entryName(e)} · ${FORMATS[e.format].label}${e.final_url ? '' : ' · reste à faire'}`}
      className={`w-full text-left text-xs rounded-md border-l-4 px-1.5 py-1 flex items-center gap-1 ${FORMATS[e.format].chip} ${e.final_url ? '' : 'border-dashed opacity-80'} ${locked(e) ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}>
      <span className="line-clamp-2 break-words flex-1 leading-tight"><span className="opacity-60 tabular-nums mr-1">{e.post_time}</span><span className={`font-medium ${e.final_url ? '' : 'italic'}`}>{entryName(e)}</span></span>
      {e.networks.length < NETWORKS.length && <span className="text-[10px] opacity-60 shrink-0">{NETWORKS.filter(n => e.networks.includes(n.id)).map(n => n.short).join(' ')}</span>}
      {locked(e) ? <span className="shrink-0 text-green-700" aria-label="Envoyé à Metricool">✓</span>
        : e.final_url ? <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-500" aria-label="Fichier final prêt" /> : null}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="px-4 md:px-6 py-3 flex justify-between items-center">
          <button onClick={() => router.push('/')} className="text-sm text-gray-500 hover:text-gray-800">← Espace de travail</button>
          <h1 className="text-lg font-bold text-blue-600 tracking-tight">SKROLL.TV</h1>
          <span className="text-sm text-gray-500 hidden md:inline">{currentUser}</span>
        </div>
      </header>

      <div className="lg:flex">
        <aside className="lg:w-60 lg:shrink-0 lg:min-h-[calc(100vh-57px)] bg-white lg:border-r px-4 py-4 lg:py-6 space-y-5">
          <div className="flex flex-wrap gap-x-8 gap-y-4 lg:block lg:space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Réseaux</p>
              <div className="flex gap-3 lg:block lg:space-y-1.5">
                {NETWORKS.map(n => (
                  <label key={n.id} className="flex items-center gap-2 text-sm text-gray-800">
                    <input type="checkbox" checked={shownNetworks.includes(n.id)} onChange={() => toggle(shownNetworks, setShownNetworks, 'skroll_diff_networks2', n.id)} className="w-4 h-4" />
                    {n.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Formats</p>
              <div className="flex flex-wrap gap-3 lg:block lg:space-y-1.5">
                {Object.entries(FORMATS).map(([id, f]) => (
                  <label key={id} className="flex items-center gap-2 text-sm text-gray-800">
                    <input type="checkbox" checked={shownFormats.includes(id)} onChange={() => toggle(shownFormats, setShownFormats, 'skroll_diff_formats2', id)} className="w-4 h-4" />
                    <span className={`w-2.5 h-2.5 rounded-sm ${f.dot}`} />{f.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Reste à faire</p>
            <div className="text-sm text-gray-800 space-y-1">
              {Object.entries(FORMATS).map(([id, f]) => {
                const all = entries.filter(e => e.format === id)
                return <p key={id} className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-sm ${f.dot}`} /><span className="flex-1">{f.label}</span><span className="tabular-nums text-gray-500">{all.filter(todo).length}/{all.length}</span></p>
              })}
              {emptyShorts > 0 && <p className="text-xs text-orange-700">dont {emptyShorts} shorts sans vidéo choisie</p>}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-800 mt-2">
              <input type="checkbox" checked={onlyTodo} onChange={e => setOnlyTodo(e.target.checked)} className="w-4 h-4" />
              Seulement ce qui reste à faire
            </label>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />fichier final déposé</p>
            <p><span className="inline-block w-4 border-t-2 border-dashed border-gray-400 mr-1.5 align-middle" />pointillés, italique : reste à faire (pas de fichier final)</p>
            <p><span className="text-green-700 mr-1.5">✓</span>envoyé à Metricool</p>
          </div>
          {unscheduled.length > 0 && (
            <div className="hidden lg:block">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">PAD à programmer ({unscheduled.length})</p>
              <p className="text-xs text-gray-500 mb-2">Glissez une vidéo sur un jour.</p>
              <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                {unscheduled.map(v => (
                  <div key={v.id} {...dragProps({ videoId: v.id })} className="text-xs bg-gray-100 rounded px-2 py-1 truncate cursor-grab">{videoLabel(v)}</div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0 px-4 md:px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{MONTHS[month.m]} {month.y}</h2>
              <p className="text-sm text-gray-500">{monthEntries.length} publications ce mois · fichiers finaux : {readyCount}/{entries.length}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => shiftMonth(-1)} aria-label="Mois précédent" className="border rounded-lg w-9 h-9 bg-white hover:bg-gray-100">‹</button>
              <button onClick={() => { const n = new Date(); setMonth({ y: n.getFullYear(), m: n.getMonth() }) }} className="border rounded-lg px-3 h-9 text-sm bg-white hover:bg-gray-100">Aujourd'hui</button>
              <button onClick={() => shiftMonth(1)} aria-label="Mois suivant" className="border rounded-lg w-9 h-9 bg-white hover:bg-gray-100">›</button>
            </div>
          </div>

          {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {loading && <p className="text-gray-500">Chargement…</p>}

          <p className="hidden md:block text-xs text-gray-500 mb-2">Glissez une publication sur un autre jour pour la déplacer ; si ce jour a déjà le même format, les deux s'échangent. Cliquez pour modifier ou déposer le fichier final.</p>

          {/* Month grid (tablet and up) */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b">
              {WEEKDAYS.map(d => <div key={d} className="text-right text-sm text-gray-500 px-2 py-1.5">{d}</div>)}
            </div>
            {weeks.map(week => (
              <div key={week[0]} className="grid grid-cols-7 border-b last:border-b-0">
                {week.map((day, i) => {
                  const inMonth = day.startsWith(monthPrefix)
                  const list = dayEntries(day)
                  return (
                    <div key={day} {...dropProps(day)}
                      className={`group min-h-[112px] border-l first:border-l-0 p-1.5 flex flex-col gap-1 ${i > 4 ? 'bg-gray-50' : ''} ${dropDay === day ? 'ring-2 ring-inset ring-blue-400 bg-blue-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <button onClick={() => addEntry(day)} aria-label={`Ajouter une publication le ${longDay(day)}`} className="text-gray-300 hover:text-blue-600 text-sm leading-none opacity-0 group-hover:opacity-100 px-1">+</button>
                        <span className={`text-sm tabular-nums ${day === today ? 'bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-semibold' : inMonth ? 'text-gray-800' : 'text-gray-300'}`}>
                          {Number(day.slice(8))}{day.endsWith('-01') ? ` ${MONTHS[Number(day.slice(5, 7)) - 1].slice(0, 4).toLowerCase()}.` : ''}
                        </span>
                      </div>
                      {list.map(e => <Chip key={e.id} e={e} />)}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Agenda list (phone) */}
          <div className="md:hidden bg-white rounded-xl shadow-sm divide-y">
            {weeks.flat().filter(d => d.startsWith(monthPrefix)).map(day => {
              const list = dayEntries(day)
              return (
                <div key={day} className="flex gap-3 px-3 py-2">
                  <div className={`w-12 shrink-0 text-center ${day === today ? 'text-red-500' : 'text-gray-800'}`}>
                    <p className="text-[11px] uppercase text-gray-400">{longDay(day).slice(0, 3)}</p>
                    <p className="text-lg font-semibold tabular-nums leading-tight">{Number(day.slice(8))}</p>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1 self-center">
                    {list.map(e => <Chip key={e.id} e={e} />)}
                    {!list.length && <button onClick={() => addEntry(day)} className="text-xs text-gray-400">+ Ajouter</button>}
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {editing && (
        <Editor entry={editing} locked={locked(editing)} pickable={pickable} byId={byId} uploading={uploading === editing.id}
          name={entryName(editing)} onClose={() => setEditingId(null)} onChange={patch => updateEntry(editing.id, patch)}
          onUpload={file => uploadFinal(editing, file)} onDelete={() => deleteEntry(editing)} />
      )}
    </div>
  )
}

function Editor({ entry, locked, pickable, byId, uploading, name, onClose, onChange, onUpload, onDelete }) {
  const fileInput = useRef(null)
  const format = FORMATS[entry.format]
  const slotCount = format.slots || entry.video_ids.length + 1
  const preview = entry.final_url || byId[entry.video_ids[0]]?.file_url

  useEffect(() => {
    const onKey = ev => ev.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function setFormat(f) {
    const { slots, time, networks } = FORMATS[f]
    onChange({ format: f, post_time: time, networks, video_ids: slots ? entry.video_ids.slice(0, slots) : entry.video_ids })
  }

  function setVideo(i, id) {
    const ids = [...entry.video_ids]
    ids[i] = id
    const clean = ids.filter(Boolean)
    const patch = { video_ids: clean }
    if (entry.format === 'short' && id && !entry.caption) patch.caption = defaultCaption(byId[id])
    onChange(patch)
  }

  function toggleNetwork(n) {
    const next = entry.networks.includes(n) ? entry.networks.filter(x => x !== n) : [...entry.networks, n]
    if (next.length) onChange({ networks: next })
  }

  const field = 'w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400 disabled:bg-gray-50'

  return (
    <div className="fixed inset-0 z-40 bg-black/30 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-xl" onClick={ev => ev.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{longDay(entry.day)}</p>
            <h3 className="font-bold text-gray-900 break-words">{name}</h3>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-800 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {locked && <p className="text-sm text-green-800 bg-green-50 rounded-lg px-3 py-2">Déjà envoyée à Metricool : modifiez-la dans Metricool, ou demandez à Claude de la retirer d'abord.</p>}

          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2">Fichier à publier</p>
            {preview && <video key={preview} src={preview} controls preload="metadata" playsInline className="w-full max-h-72 bg-black rounded-lg mb-2" />}
            {entry.final_url
              ? <p className="text-xs text-gray-600 break-all">Final : {entry.final_name}{entry.final_uploaded_by ? ` · déposé par ${entry.final_uploaded_by}` : ''}{entry.final_uploaded_at ? ` le ${new Date(entry.final_uploaded_at).toLocaleDateString('fr-FR')}` : ''}</p>
              : <p className="text-xs text-orange-700">Reste à faire : pas encore de fichier final (mixé, habillé). {preview ? 'Aperçu : version de travail du site.' : ''}</p>}
            <input ref={fileInput} type="file" accept="video/*" className="hidden" onChange={ev => { onUpload(ev.target.files[0]); ev.target.value = '' }} />
            <button onClick={() => fileInput.current.click()} disabled={locked || uploading}
              className="mt-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40">
              {uploading ? 'Envoi en cours…' : entry.final_url ? 'Remplacer le fichier final' : 'Déposer le fichier final'}
            </button>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-gray-900">Date
              <input type="date" value={entry.day} disabled={locked} onChange={ev => ev.target.value && onChange({ day: ev.target.value })} className={`${field} mt-1 font-normal`} />
            </label>
            <label className="text-sm font-semibold text-gray-900">Heure
              <input type="time" value={entry.post_time || ''} disabled={locked} onChange={ev => onChange({ post_time: ev.target.value })} className={`${field} mt-1 font-normal`} />
            </label>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2">Format</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(FORMATS).map(([id, f]) => (
                <button key={id} onClick={() => setFormat(id)} disabled={locked}
                  className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm ${entry.format === id ? 'border-gray-900 font-semibold' : 'text-gray-600'}`}>
                  <span className={`w-2.5 h-2.5 rounded-sm ${f.dot}`} />{f.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">{format.hint}</p>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2">Réseaux</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {NETWORKS.map(n => (
                <label key={n.id} className="flex items-center gap-2 text-sm text-gray-800">
                  <input type="checkbox" checked={entry.networks.includes(n.id)} disabled={locked} onChange={() => toggleNetwork(n.id)} className="w-4 h-4" />{n.label}
                </label>
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-900 mb-2">{entry.format === 'short' ? 'Vidéo' : 'Vidéos sources'}</p>
            <div className="space-y-2">
              {Array.from({ length: slotCount }, (_, i) => (
                <select key={i} value={entry.video_ids[i] || ''} disabled={locked} onChange={ev => setVideo(i, ev.target.value)} className={field}>
                  <option value="">{i < entry.video_ids.length ? 'Retirer' : entry.format === 'short' ? 'Choisir une vidéo…' : '+ Ajouter une vidéo…'}</option>
                  {pickable.map(v => <option key={v.id} value={v.id}>{videoLabel(v)}{isPad(v) ? '' : ' (pas PAD)'}</option>)}
                </select>
              ))}
            </div>
          </section>

          <section>
            <label className="text-sm font-semibold text-gray-900">Titre {entry.format === 'short' && <span className="font-normal text-gray-500">(facultatif)</span>}
              <BlurInput value={entry.title || ''} disabled={locked} placeholder={name} onSave={title => onChange({ title })} className={`${field} mt-1 font-normal`} />
            </label>
            <p className="text-xs text-gray-500 mt-1">Sert de titre YouTube.</p>
          </section>

          <section>
            <label className="text-sm font-semibold text-gray-900">Texte de la publication
              <BlurInput multiline value={entry.caption || ''} disabled={locked} onSave={caption => onChange({ caption })} className={`${field} mt-1 font-normal`} />
            </label>
          </section>

          {!locked && <button onClick={onDelete} className="text-sm text-red-600 hover:text-red-800">Supprimer cette publication</button>}
        </div>
      </div>
    </div>
  )
}

function BlurInput({ value, onSave, multiline, ...props }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const common = { ...props, value: draft, onChange: ev => setDraft(ev.target.value), onBlur: () => { if (draft !== value) onSave(draft) } }
  return multiline ? <textarea rows={6} {...common} /> : <input {...common} />
}
