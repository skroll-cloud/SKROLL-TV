'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Bricolage_Grotesque } from 'next/font/google'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)
const font = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] })

// Future public home page. For now it is only shown to the team (logged in), with its texts editable in place (table site_content).
// The mosaic shows the shorts already broadcast (broadcast_schedule, day + 18:30 Paris passed); "Aperçu" shows every PAD episode.
const C = { film: '#1A0E17', neon: '#FF2E9A', tube: '#FFD3EC', amber: '#F0A957', paper: '#FBEAF2', ink: '#2A1424' }
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function longDate(day) {
  const [y, m, d] = day.split('-').map(Number)
  return `${d}${d === 1 ? 'er' : ''} ${MONTHS[m - 1]}`
}

function broadcastDone(e, now) {
  const at = new Date(`${e.day}T${e.post_time || '18:30'}:00+01:00`)
  return at <= now
}

export default function Accueil() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [texts, setTexts] = useState({})
  const [videos, setVideos] = useState([])
  const [shorts, setShorts] = useState([])
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState(false)
  const [playing, setPlaying] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('skroll_user')
    if (!saved) { router.push('/'); return }
    setUser(saved)
    Promise.all([
      supabase.from('site_content').select('key,value'),
      supabase.from('pad_videos').select('id,number,title,file_url,thumb_url,status').order('number'),
      supabase.from('broadcast_schedule').select('day,post_time,pad_ids').eq('format', 'short').order('day'),
    ]).then(([t, v, s]) => {
      if (t.data) setTexts(Object.fromEntries(t.data.map(r => [r.key, r.value])))
      if (v.data) setVideos(v.data)
      if (s.data) setShorts(s.data)
    })
  }, [])

  useEffect(() => {
    if (!playing) return
    const onKey = ev => ev.key === 'Escape' && setPlaying(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing])

  async function save(key, value) {
    setTexts(t => ({ ...t, [key]: value }))
    await supabase.from('site_content').upsert({ key, value, updated_at: new Date().toISOString(), updated_by: user })
  }

  if (!user) return null

  const byId = Object.fromEntries(videos.map(v => [v.id, v]))
  const now = new Date()
  const aired = shorts.filter(e => broadcastDone(e, now) && byId[e.pad_ids[0]]).map(e => ({ ...byId[e.pad_ids[0]], day: e.day })).reverse()
  const next = shorts.find(e => !broadcastDone(e, now))
  // preview: 9 episodes, dated as if aired from 1 November, to see the mosaic after a week and a bit
  const tiles = preview
    ? videos.filter(v => v.file_url).slice(0, 9).map((v, i) => ({ ...v, day: `2026-11-${String(i + 1).padStart(2, '0')}` })).reverse()
    : aired
  const latest = tiles[0]

  const Text = ({ k, as: Tag = 'p', className = '', rows = 4 }) => editing
    ? <textarea defaultValue={texts[k] || ''} rows={rows} onBlur={e => e.target.value !== texts[k] && save(k, e.target.value)}
        className={`w-full rounded-md border-2 border-dashed p-2 bg-white/70 text-inherit ${className}`} style={{ borderColor: C.neon }} />
    : <Tag className={`whitespace-pre-line ${className}`}>{texts[k]}</Tag>

  return (
    <div className={font.className} style={{ background: C.film, color: C.tube }}>
      <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 px-4 py-2 text-sm" style={{ background: C.neon, color: C.film }}>
        <span className="font-semibold flex-1 min-w-[200px]">Aperçu privé : cette page n'est visible que par l'équipe.</span>
        <button onClick={() => setPreview(p => !p)} className="rounded-full border-2 px-3 py-0.5 font-semibold" style={{ borderColor: C.film }}>
          {preview ? 'Voir seulement les épisodes diffusés' : 'Aperçu avec 9 épisodes diffusés'}
        </button>
        <button onClick={() => setEditing(e => !e)} className="rounded-full px-3 py-0.5 font-semibold" style={{ background: C.film, color: C.tube }}>
          {editing ? 'Terminer la modification' : 'Modifier les textes'}
        </button>
        <button onClick={() => router.push('/')} className="underline">Espace de travail</button>
      </div>

      <header>
        <img src="/banniere-skroll.jpg" alt="SKROLL, des images vraies, des histoires fausses" className="w-full h-[58vw] md:h-auto object-cover" />
      </header>

      <section className="max-w-3xl mx-auto px-4 pt-10 pb-12 text-center">
        <Text k="accroche" className="text-xl md:text-2xl leading-relaxed" rows={4} />
        <p className="mt-6 text-base" style={{ color: C.amber }}>
          {next ? `Prochain épisode le ${longDate(next.day)} à ${next.post_time.replace(':', ' h ')}` : 'Les épisodes arrivent bientôt.'}
        </p>
      </section>

      {latest && (
        <section className="max-w-3xl mx-auto px-4 pb-14">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4" style={{ color: C.neon }}>Le dernier épisode</h2>
          <video key={latest.file_url} src={latest.file_url} poster={latest.thumb_url || undefined} controls playsInline preload="metadata" className="w-full aspect-[4/3] bg-black rounded-sm" />
          <p className="mt-2 text-lg font-semibold">{latest.title}{latest.day ? <span style={{ color: C.amber }} className="font-normal"> , diffusé le {longDate(latest.day)}</span> : ''}</p>
        </section>
      )}

      <section aria-label="Tous les épisodes" className="relative py-6" style={{ background: '#0F070D' }}>
        <div aria-hidden className="absolute inset-y-0 left-0 w-5 md:w-8" style={{ backgroundImage: `radial-gradient(ellipse 35% 22% at 50% 50%, ${C.film} 98%, transparent 100%)`, backgroundSize: '100% 28px', backgroundColor: '#000' }} />
        <div aria-hidden className="absolute inset-y-0 right-0 w-5 md:w-8" style={{ backgroundImage: `radial-gradient(ellipse 35% 22% at 50% 50%, ${C.film} 98%, transparent 100%)`, backgroundSize: '100% 28px', backgroundColor: '#000' }} />
        <div className="px-7 md:px-12">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-1" style={{ color: C.tube }}>Tous les épisodes</h2>
          <p className="mb-5 text-sm" style={{ color: C.amber }}>{tiles.length ? `Un de plus chaque soir. ${tiles.length} déjà diffusé${tiles.length > 1 ? 's' : ''}.` : 'La mosaïque se remplit à chaque diffusion, à partir du premier épisode.'}</p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
            {tiles.map(v => (
              <li key={v.id + (v.day || '')}>
                <button onClick={() => setPlaying(v)} className="group block w-full text-left focus:outline-none focus-visible:ring-2" style={{ '--tw-ring-color': C.neon }}>
                  <span className="block aspect-[4/3] overflow-hidden bg-black">
                    {v.thumb_url
                      ? <img src={v.thumb_url} alt="" loading="lazy" className="w-full h-full object-cover opacity-90 group-hover:opacity-100" />
                      : <video src={`${v.file_url}#t=3`} preload="metadata" muted playsInline className="w-full h-full object-cover" />}
                  </span>
                  <span className="block mt-1 text-sm leading-tight group-hover:underline">{v.title}</span>
                  {v.day && <span className="block text-xs" style={{ color: C.amber }}>{longDate(v.day)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ background: C.paper, color: C.ink }}>
        <div className="max-w-5xl mx-auto px-4 py-14 grid md:grid-cols-[3fr_2fr] gap-12">
          <div>
            <h2 className="text-3xl font-extrabold mb-4" style={{ color: C.neon }}>Le programme</h2>
            <Text k="programme" className="text-lg leading-relaxed max-w-prose" rows={9} />
            <Text k="equipe" className="mt-6 leading-relaxed" rows={3} />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold mb-4" style={{ color: C.neon }}>Avec</h2>
            {editing
              ? <Text k="partenaires" rows={5} />
              : <ul className="space-y-3">{(texts.partenaires || '').split('\n').filter(Boolean).map(p => <li key={p} className="text-xl font-semibold border-b-2 pb-2" style={{ borderColor: C.tube }}>{p}</li>)}</ul>}
            <h2 className="text-3xl font-extrabold mt-10 mb-3" style={{ color: C.neon }}>Suivre SKROLL</h2>
            <Text k="reseaux" className="leading-relaxed" rows={3} />
          </div>
        </div>
      </section>

      {playing && (
        <div role="dialog" aria-modal="true" aria-label={playing.title} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPlaying(null)}>
          <div className="w-full max-w-4xl" style={{ maxWidth: 'min(56rem, 106vh)' }} onClick={e => e.stopPropagation()}>
            <video src={playing.file_url} controls autoPlay playsInline className="w-full aspect-[4/3] bg-black" />
            <div className="flex items-center justify-between mt-2">
              <p className="text-lg font-semibold">{playing.title}</p>
              <button onClick={() => setPlaying(null)} className="underline">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
