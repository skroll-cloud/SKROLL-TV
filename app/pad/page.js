'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)

// Catalogue des épisodes (table pad_videos) : fichiers finis, mixés et habillés dans DaVinci.
// Chaque épisode passe en « Modif à faire » ou en « PAD » ; les PAD apparaissent dans la liste à côté du planning de diffusion.
// Chaque épisode a aussi sa version 9:16 (vertical_url) : c'est elle que le planning publie pour ses réels.
const STATUS = {
  modif: { label: 'Modif à faire', on: 'bg-orange-400 border-orange-400 text-white', hover: 'hover:border-orange-400' },
  pad: { label: 'PAD', on: 'bg-green-500 border-green-500 text-white', hover: 'hover:border-green-500' },
}
const FILTERS = [
  ['all', 'Tous'],
  ['todo', 'À voir'],
  ['modif', 'Modif à faire'],
  ['pad', 'PAD à diffuser'],
  ['aired', 'Diffusés'],
  ['unscheduled', 'PAD pas programmés'],
  ['vertical', '9:16 à faire'],
]
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

function shortDay(day) {
  const [y, m, d] = day.split('-').map(Number)
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS_SHORT[m - 1]}`
}

// nom DaVinci / fichiers attendu pour un titre : #NN_SKROLL_<archives>_<titre>
function expectedName(v) {
  return `#${String(v.number).padStart(2, '0')}_SKROLL_${v.archives.length ? v.archives.join('_') : '0000'}_${v.title.trim().replace(/\s+/g, '_')}`
}

// un « _ » sépare les morceaux du nom, et certains caractères sont interdits dans les noms de fichiers
function cleanTitle(t) {
  return t.replace(/[_/\\:*?"<>|#]/g, ' ').replace(/\s+/g, ' ').trim()
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
  const [uploading, setUploading] = useState(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('skroll_user')
    if (!saved) { router.push('/equipe'); return }
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

  async function uploadVertical(v, file) {
    if (!file) return
    setUploading(v.id)
    const safe = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]/g, '_')
    const filePath = `pad/916/${Date.now()}-${safe}`
    const { error } = await supabase.storage.from('Videos').upload(filePath, file, { cacheControl: '3600', upsert: false })
    if (error) setError(`Envoi du 9:16 impossible : ${error.message}`)
    else {
      const { data } = supabase.storage.from('Videos').getPublicUrl(filePath)
      await update(v.id, { vertical_url: data.publicUrl, vertical_name: file.name, vertical_uploaded_at: new Date().toISOString(), vertical_uploaded_by: currentUser })
    }
    setUploading(null)
  }

  // a new episode, finished (mixed + dressed) by whoever made it: 4:3 file required, 9:16 optional, next free number
  async function addEpisode({ title, archives, tags, note, file43, file916 }) {
    const number = Math.max(0, ...videos.map(v => v.number)) + 1
    const v = { number, title: cleanTitle(title), archives }
    const name = expectedName(v)
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-')
    const path = `pad/${stamp}-_${name.slice(1)}.mp4`
    const up = await supabase.storage.from('Videos').upload(path, file43, { cacheControl: '3600', upsert: false })
    if (up.error) throw new Error(`Envoi du 4:3 impossible : ${up.error.message}`)
    const url = p => supabase.storage.from('Videos').getPublicUrl(p).data.publicUrl
    const { seconds, thumb } = await probe(file43)
    let thumb_url = null
    if (thumb) {
      const tp = `pad/vignettes/v${number}-${stamp}.jpg`
      const t = await supabase.storage.from('Videos').upload(tp, thumb, { contentType: 'image/jpeg', upsert: false })
      if (!t.error) thumb_url = url(tp)
    }
    let vertical = {}
    if (file916) {
      const vp = `pad/916/${stamp}-_${name.slice(1)}.mp4`
      const u = await supabase.storage.from('Videos').upload(vp, file916, { cacheControl: '3600', upsert: false })
      if (u.error) throw new Error(`Envoi du 9:16 impossible : ${u.error.message}`)
      vertical = { vertical_url: url(vp), vertical_name: `${name}.mp4`, vertical_uploaded_at: new Date().toISOString(), vertical_uploaded_by: currentUser }
    }
    const { error } = await supabase.from('pad_videos').insert([{ ...v, name, tags, note: note || null, file_url: url(path), file_name: `${name}.mp4`, file_size: file43.size,
      duration_s: seconds ? Math.round(seconds * 100) / 100 : null, thumb_url, uploaded_by: currentUser, ...vertical }])
    if (error) throw new Error(error.code === '23505' ? 'Ce numéro vient d\'être pris : rechargez la page et réessayez.' : `Épisode pas enregistré : ${error.message}`)
    await load()
    setFilter('todo')
  }

  function chooseFilter(f) {
    setFilter(f)
    try { localStorage.setItem('skroll_pad_filter2', f) } catch {}
  }

  if (!currentUser) return null

  // a short = the episode's own post; compils and other formats reuse it
  const slots = id => entries.filter(e => e.format === 'short' && e.pad_ids.includes(id))
  // aired = its short's day and time are past (Paris); it then leaves the "PAD à diffuser" tab for "Diffusés"
  const now = new Date()
  const aired = id => slots(id).filter(e => new Date(`${e.day}T${e.post_time || '18:00'}:00+01:00`) <= now)
  const reuses = id => entries.filter(e => !['short', 'story'].includes(e.format) && e.pad_ids.includes(id))
  const matches = v => {
    if (search && !`${v.number} ${v.title} ${v.name} ${(v.tags || []).join(' ')}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'todo') return !v.status
    if (filter === 'modif') return v.status === 'modif'
    if (filter === 'pad') return v.status === 'pad' && !aired(v.id).length
    if (filter === 'aired') return aired(v.id).length > 0
    if (filter === 'unscheduled') return v.status === 'pad' && !slots(v.id).length
    if (filter === 'vertical') return !v.vertical_url
    return true
  }
  const shown = videos.filter(matches)
  const counts = {
    all: videos.length,
    todo: videos.filter(v => !v.status).length,
    modif: videos.filter(v => v.status === 'modif').length,
    pad: videos.filter(v => v.status === 'pad' && !aired(v.id).length).length,
    aired: videos.filter(v => aired(v.id).length).length,
    unscheduled: videos.filter(v => v.status === 'pad' && !slots(v.id).length).length,
    vertical: videos.filter(v => !v.vertical_url).length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="px-4 md:px-6 py-3 flex justify-between items-center">
          <button onClick={() => router.push('/equipe')} className="text-sm text-gray-500 hover:text-gray-800">← Espace de travail</button>
          <h1 className="text-lg font-bold text-blue-600 tracking-tight">SKROLL.TV</h1>
          <button onClick={() => router.push('/diffusion')} className="text-sm text-gray-500 hover:text-gray-800">Planning →</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-5">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Épisodes</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">Versions mixées et habillées. Passez chaque épisode en « Modif à faire » ou en « PAD » : les PAD apparaissent à côté du planning, prêts à être glissés sur un jour. Chaque épisode a sa version 9:16, téléchargeable ou à déposer : c'est elle que publient les réels du planning.</p>

        {adding
          ? <AddEpisode next={Math.max(0, ...videos.map(v => v.number)) + 1} onCancel={() => setAdding(false)} onAdd={async ep => { await addEpisode(ep); setAdding(false) }} />
          : <button onClick={() => setAdding(true)} className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Ajouter un épisode fini</button>}

        <div className="flex flex-wrap gap-2 mb-3">
          {FILTERS.map(([id, label]) => (
            <button key={id} onClick={() => chooseFilter(id)}
              className={`text-sm rounded-full border px-3 py-1 ${filter === id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 hover:border-gray-400'}`}>
              {label} <span className="tabular-nums opacity-70">{counts[id]}</span>
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher un numéro, un titre, un mot-clé…"
          className="w-full md:w-80 border rounded-lg px-3 py-2 text-sm mb-4 bg-white focus:outline-none focus:border-blue-400" />

        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {loading && <p className="text-gray-500">Chargement…</p>}
        {!loading && !shown.length && <p className="text-gray-500 text-sm">Aucun épisode dans ce filtre.</p>}

        <ul className="bg-white rounded-xl shadow-sm divide-y">
          {shown.map(v => {
            const open = openId === v.id
            const planned = slots(v.id)
            const done = aired(v.id)
            return (
              <li key={v.id} className="px-3 md:px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button onClick={() => setOpenId(open ? null : v.id)} className="flex-1 min-w-[200px] text-left">
                    <p className="font-medium text-gray-900 break-words"><span className="tabular-nums text-gray-400 mr-2">#{String(v.number).padStart(2, '0')}</span>{v.title}</p>
                    <p className="text-xs text-gray-500">
                      {duration(v.duration_s)}{v.archives.length ? ` · archives ${v.archives.join(', ')}` : ''}
                      {planned.length > done.length ? <span className="text-green-700"> · programmé le {planned.filter(e => !done.includes(e)).map(e => shortDay(e.day)).join(', ')}</span> : ''}
                      {expectedName(v) !== v.name ? <span className="text-blue-700"> · nouveau titre, à reporter dans DaVinci et les fichiers</span> : ''}
                      {v.tags?.length ? <span className="text-gray-400"> · {v.tags.join(', ')}</span> : ''}
                      {v.note ? <span className="text-orange-700"> · {v.note.length > 60 ? v.note.slice(0, 60) + '…' : v.note}</span> : ''}
                    </p>
                  </button>
                  <div className="flex gap-1.5">
                    {done.length > 0 && <span title={`Diffusé le ${done.map(e => `${shortDay(e.day)} à ${e.post_time}`).join(', ')}`} className="rounded-lg px-3 py-1.5 text-sm font-medium border bg-purple-600 border-purple-600 text-white">Diffusé · {shortDay(done[done.length - 1].day)}</span>}
                    {Object.entries(STATUS).map(([id, s]) => (
                      <button key={id} onClick={() => update(v.id, { status: v.status === id ? null : id })}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${v.status === id ? s.on : `text-gray-600 ${s.hover}`}`}>{s.label}</button>
                    ))}
                  </div>
                  {v.file_url
                    ? <a href={`${v.file_url}?download=${encodeURIComponent(v.file_name)}`} className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100">Télécharger 4:3</a>
                    : <span className="text-xs text-gray-400">fichier en cours d'envoi</span>}
                  {v.vertical_url
                    ? <a href={`${v.vertical_url}?download=${encodeURIComponent(v.vertical_name || v.file_name)}`} className="text-sm border border-green-500 rounded-lg px-3 py-1.5 text-green-800 hover:bg-green-50">Télécharger 9:16</a>
                    : <button onClick={() => setOpenId(v.id)} className="text-sm border border-dashed rounded-lg px-3 py-1.5 text-gray-500 hover:border-gray-400">9:16 à faire</button>}
                </div>

                {open && (
                  <div className="mt-3 grid md:grid-cols-[1fr_260px] gap-4">
                    {v.file_url
                      ? <video src={v.file_url} controls autoPlay playsInline preload="metadata" className="w-full bg-black rounded-lg aspect-[4/3]" />
                      : <div className="w-full bg-gray-100 rounded-lg aspect-[4/3] flex items-center justify-center text-sm text-gray-500">Fichier pas encore envoyé</div>}
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-900">Titre
                        <TitleInput value={v.title} onSave={title => update(v.id, { title })} />
                        {expectedName(v) !== v.name && <span className="block text-xs font-normal text-blue-700 mt-1">Pas encore reporté dans DaVinci ni dans les noms de fichiers (actuellement {v.name}).</span>}
                      </label>
                      <label className="block text-sm font-semibold text-gray-900">Mots-clés
                        <TagsInput value={v.tags || []} onSave={tags => update(v.id, { tags })} />
                        <span className="block text-xs font-normal text-gray-500 mt-1">Pour écrire la légende : lieu, époque, personnages, sujet, la blague… séparés par des virgules.</span>
                      </label>
                      <VerticalSlot v={v} uploading={uploading === v.id} onUpload={file => uploadVertical(v, file)} />
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

function TitleInput({ value, onSave }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  function save() {
    const t = cleanTitle(draft)
    if (!t) { setDraft(value); return }
    setDraft(t)
    if (t !== value) onSave(t)
  }
  return <input value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => e.key === 'Enter' && e.target.blur()}
    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal text-gray-800 focus:outline-none focus:border-blue-400" />
}

function NoteInput({ value, onSave }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return <textarea rows={3} value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => draft !== value && onSave(draft)}
    placeholder="Ce qu'il faut modifier, remarque pour le 9:16…"
    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal text-gray-800 focus:outline-none focus:border-blue-400" />
}

function VerticalSlot({ v, uploading, onUpload }) {
  const input = useRef(null)
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900 mb-1">Version 9:16</p>
      {v.vertical_url
        ? <>
            <video src={v.vertical_url} controls playsInline preload="metadata" className="h-64 aspect-[9/16] bg-black rounded-lg" />
            <p className="text-xs text-gray-500 mt-1 break-all">{v.vertical_name}{v.vertical_uploaded_by ? `, déposé par ${v.vertical_uploaded_by}` : ''}{v.vertical_uploaded_at ? ` le ${new Date(v.vertical_uploaded_at).toLocaleDateString('fr-FR')}` : ''}</p>
          </>
        : <p className="text-xs text-orange-700">Pas encore de 9:16. Les réels du planning publieront celui-ci.</p>}
      <input ref={input} type="file" accept="video/*" className="hidden" onChange={ev => { onUpload(ev.target.files[0]); ev.target.value = '' }} />
      <button onClick={() => input.current.click()} disabled={uploading}
        className="mt-2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40">
        {uploading ? 'Envoi en cours…' : v.vertical_url ? 'Remplacer le 9:16' : 'Déposer le 9:16'}
      </button>
    </div>
  )
}

function splitTags(text) {
  return [...new Set(text.split(',').map(t => t.trim().toLowerCase()).filter(Boolean))]
}

function TagsInput({ value, onSave }) {
  const [draft, setDraft] = useState(value.join(', '))
  useEffect(() => setDraft(value.join(', ')), [value.join(',')])
  function save() {
    const tags = splitTags(draft)
    setDraft(tags.join(', '))
    if (tags.join(',') !== value.join(',')) onSave(tags)
  }
  return <input value={draft} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={e => e.key === 'Enter' && e.target.blur()}
    placeholder="plage, années 60, Bigouden, quiproquo…"
    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal text-gray-800 focus:outline-none focus:border-blue-400" />
}

// duration and a 640×480 poster image (at 1 s) read from the video file, in the browser
function probe(file) {
  return new Promise(resolve => {
    const video = document.createElement('video')
    const src = URL.createObjectURL(file)
    const done = r => { URL.revokeObjectURL(src); resolve(r) }
    video.muted = true; video.preload = 'auto'; video.src = src
    video.onerror = () => done({})
    video.onloadedmetadata = () => { video.currentTime = Math.min(1, (video.duration || 2) / 2) }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 640; canvas.height = Math.round(640 * video.videoHeight / video.videoWidth) || 480
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => done({ seconds: video.duration, thumb: blob }), 'image/jpeg', 0.85)
    }
    setTimeout(() => done({}), 15000)
  })
}

function AddEpisode({ next, onAdd, onCancel }) {
  const [title, setTitle] = useState('')
  const [archives, setArchives] = useState('')
  const [tags, setTags] = useState('')
  const [note, setNote] = useState('')
  const [file43, setFile43] = useState(null)
  const [file916, setFile916] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const arch = archives.split(/[\s,;_]+/).map(a => a.replace(/\D/g, '')).filter(Boolean)
  const preview = expectedName({ number: next, title: cleanTitle(title) || 'Titre', archives: arch })
  async function submit(e) {
    e.preventDefault()
    if (!cleanTitle(title)) { setError('Il manque le titre.'); return }
    if (!file43) { setError('Il manque le fichier 4:3.'); return }
    setBusy(true); setError('')
    try { await onAdd({ title, archives: arch, tags: splitTags(tags), note, file43, file916 }) }
    catch (err) { setError(err.message); setBusy(false) }
  }
  const field = 'mt-1 w-full border rounded-lg px-3 py-2 text-sm font-normal text-gray-800 focus:outline-none focus:border-blue-400'
  return (
    <form onSubmit={submit} className="bg-white rounded-xl border p-4 mb-5 space-y-3">
      <div className="flex justify-between items-baseline gap-2">
        <h3 className="font-semibold text-gray-900">Nouvel épisode : #{String(next).padStart(2, '0')}</h3>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800">Annuler</button>
      </div>
      <p className="text-xs text-gray-500">Le fichier doit être fini : mixé à -14 LUFS et habillé (logo, fin éclair), exporté en 4:3 1440×1080 et en 9:16 1080×1920, comme dans le pack d'habillage. Il arrive dans « À voir » ; passez-le en PAD puis placez-le sur la grille.</p>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block text-sm font-semibold text-gray-900">Titre<input value={title} onChange={e => setTitle(e.target.value)} placeholder="COP 31" className={field} /></label>
        <label className="block text-sm font-semibold text-gray-900">Numéros d'archives<input value={archives} onChange={e => setArchives(e.target.value)} placeholder="23318 (plusieurs : 24806, 7591)" className={field} /></label>
        <label className="block text-sm font-semibold text-gray-900">Fichier 4:3 (obligatoire)<input type="file" accept="video/*" onChange={e => setFile43(e.target.files[0] || null)} className="mt-1 block w-full text-sm font-normal" /></label>
        <label className="block text-sm font-semibold text-gray-900">Fichier 9:16 (pour les réels)<input type="file" accept="video/*" onChange={e => setFile916(e.target.files[0] || null)} className="mt-1 block w-full text-sm font-normal" /></label>
      </div>
      <label className="block text-sm font-semibold text-gray-900">Mots-clés<input value={tags} onChange={e => setTags(e.target.value)} placeholder="avion, Concorde, écologie, années 70…" className={field} /></label>
      <label className="block text-sm font-semibold text-gray-900">Note<textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Ce qu'il faut savoir sur ce montage…" className={field} /></label>
      <p className="text-xs text-gray-500 break-all">Nom : {preview}</p>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <button disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40">{busy ? 'Envoi en cours… (laissez la page ouverte)' : 'Ajouter l\'épisode'}</button>
    </form>
  )
}
