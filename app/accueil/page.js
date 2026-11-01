'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Bricolage_Grotesque, Montserrat } from 'next/font/google'
import { LAUNCH } from '../../lib/launch'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)
const font = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] })
const baselineFont = Montserrat({ subsets: ['latin'], weight: ['600'] })

// Public home page from LAUNCH on (before that, team only). Logged-in team members get the pink bar: preview and texts editable in place (table site_content).
// The feed shows the 9 latest shorts already broadcast (broadcast_schedule, day + post time Paris passed), the mosaic all of them;
// "Aperçu" counts everything planned up to tonight as broadcast. Phones get the 9:16 versions, computers the 4:3.
const C = { film: '#1A0E17', neon: '#FF2E9A', tube: '#FFD3EC', amber: '#F0A957', paper: '#FBEAF2', ink: '#2A1424' }
const SOCIALS = [
  { name: 'Instagram', url: 'https://www.instagram.com/skroll_tv/', icon: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" /></> },
  { name: 'TikTok', url: 'https://www.tiktok.com/@skroll_tv', icon: <path fill="currentColor" d="M16.6 3c.4 2.4 1.9 3.9 4.4 4.1v3.4c-1.6 0-3.1-.5-4.4-1.3v6.3a6 6 0 1 1-6-6v3.4a2.6 2.6 0 1 0 2.6 2.6V3h3.4z" /> },
  { name: 'YouTube', url: 'https://www.youtube.com/@skroll_tv', icon: <><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" /><path d="M10 9l5 3-5 3z" fill="var(--social-bg)" /></> },
  { name: 'Facebook', url: 'https://www.facebook.com/61596024961357/', icon: <path fill="currentColor" d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3V14h2.8v8h3.4z" /> },
]

function Socials({ size = 28, className = '', color, bg }) {
  return (
    <ul className={`flex gap-4 ${className}`} style={{ color, '--social-bg': bg }}>
      {SOCIALS.map(n => (
        <li key={n.name}>
          <a href={n.url} target="_blank" rel="noopener noreferrer" aria-label={`SKROLL sur ${n.name}`} title={n.name}
            className="block transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 rounded" style={{ color: 'inherit' }}>
            <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>{n.icon}</svg>
          </a>
        </li>
      ))}
    </ul>
  )
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function longDate(day) {
  const [y, m, d] = day.split('-').map(Number)
  return `${d}${d === 1 ? 'er' : ''} ${MONTHS[m - 1]}`
}

// no episode titles on the public page: they would give the joke away
function num(v) {
  return `#${String(v.number).padStart(2, '0')}`
}

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

function broadcastDone(e, now) {
  const at = new Date(`${e.day}T${e.post_time || '18:30'}:00+01:00`)
  return at <= now
}

export default function Accueil() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [texts, setTexts] = useState({})
  const [videos, setVideos] = useState([])
  const [shorts, setShorts] = useState([])
  const [editing, setEditing] = useState(false)
  const [preview, setPreview] = useState(false)
  const [playing, setPlaying] = useState(null)
  const [phone, setPhone] = useState(false)
  const [random, setRandom] = useState(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setPhone(mq.matches)
    on(); mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('skroll_user')
    if (!saved && new Date() < LAUNCH) { router.push('/'); return }
    setUser(saved)
    setReady(true)
    Promise.all([
      supabase.from('site_content').select('key,value'),
      supabase.from('pad_videos').select('id,number,file_url,vertical_url,thumb_url,status').order('number'),
      supabase.from('broadcast_schedule').select('day,post_time,pad_ids,home_rank').eq('format', 'short').order('day').order('post_time').order('created_at'),
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

  if (!ready) return null

  const byId = Object.fromEntries(videos.map(v => [v.id, v]))
  const now = new Date()
  // preview: as if it were tonight after the last post of the day
  const cutoff = preview ? new Date(`${now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })}T23:59:00+01:00`) : now
  // newest day first; inside a day, the order chosen for the home page (home_rank), else latest post first
  const tiles = shorts.filter(e => broadcastDone(e, cutoff) && byId[e.pad_ids[0]]).map((e, i) => ({ ...byId[e.pad_ids[0]], day: e.day, rank: e.home_rank, i }))
    .sort((a, b) => b.day.localeCompare(a.day) || (a.rank ?? 1e6) - (b.rank ?? 1e6) || b.i - a.i)
  const latest = tiles[0]
  const feed = tiles.slice(0, 9)
  // "Aléatoire" (only once 30 episodes are out) draws 9 among all the aired ones, a new draw at each click
  const canRandom = tiles.length >= 30
  const shown = canRandom && random && random.every(v => tiles.some(t => t.id === v.id)) ? random : feed

  const Text = ({ k, as: Tag = 'p', className = '', rows = 4 }) => editing
    ? <textarea defaultValue={texts[k] || ''} rows={rows} onBlur={e => e.target.value !== texts[k] && save(k, e.target.value)}
        className={`w-full rounded-md border-2 border-dashed p-2 bg-white/70 text-inherit ${className}`} style={{ borderColor: C.neon }} />
    : <Tag className={`whitespace-pre-line ${className}`}>{texts[k]}</Tag>

  return (
    <div className={font.className} style={{ background: C.film, color: C.tube }}>
      {user && <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 px-4 py-2 text-sm" style={{ background: C.neon, color: C.film }}>
        <span className="font-semibold flex-1 min-w-[200px]">Aperçu privé : cette page n'est visible que par l'équipe.</span>
        <button onClick={() => setPreview(p => !p)} className="rounded-full border-2 px-3 py-0.5 font-semibold" style={{ borderColor: C.film }}>
          {preview ? 'Voir seulement les épisodes déjà diffusés' : 'Aperçu de ce soir (tout ce qui est programmé aujourd\'hui)'}
        </button>
        <button onClick={() => setEditing(e => !e)} className="rounded-full px-3 py-0.5 font-semibold" style={{ background: C.film, color: C.tube }}>
          {editing ? 'Terminer la modification' : 'Modifier les textes'}
        </button>
        <button onClick={() => router.push('/')} className="underline">Espace de travail</button>
      </div>}

      <header>
        {/* bannière d'origine, baseline effacée de l'image et réécrite en vrai texte (nette à toutes les tailles) ;
            sur téléphone l'image est recadrée sur les côtés, le texte suit car il est placé en unités du cadre (cqw) */}
        <div className="relative overflow-hidden h-[58vw] md:h-auto">
          <div className="absolute left-1/2 -translate-x-1/2 h-full aspect-[2059/764] md:static md:translate-x-0 md:w-full md:h-auto" style={{ containerType: 'inline-size' }}>
            <img src="/banniere-skroll-sans-baseline.jpg" alt="" width="2059" height="764" className="block w-full h-full" />
            <h1 className={`${baselineFont.className} absolute right-0 text-center text-white leading-none whitespace-nowrap`}
              style={{ top: '67.6%', left: '0.48%', fontSize: '2.41cqw' }}>
              <span className="sr-only">SKROLL : </span>Des images vraies, des histoires fausses
            </h1>
          </div>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 pt-10 pb-12 text-center">
        <Text k="accroche" className="text-xl md:text-2xl leading-relaxed" rows={4} />
        <p className="mt-6 text-lg md:text-xl" style={{ color: C.amber }}>Un nouvel épisode chaque soir à 18 h 30.</p>
        <Socials size={30} className="mt-5 justify-center" color={C.neon} bg={C.film} />
      </section>

      {latest && (
        <section className="max-w-3xl mx-auto px-4 pb-14">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-1" style={{ color: C.neon }}>Les épisodes</h2>
          <p className="mb-4 text-sm" style={{ color: C.amber }}>{canRandom ? 'Du plus récent au plus ancien, ou en aléatoire.' : 'Du plus récent au plus ancien.'} Faites défiler vers le haut, ou laissez-les s'enchaîner.</p>
          <Feed items={shown} phone={phone} random={canRandom ? !!random : null} onRandom={() => setRandom(shuffle(tiles).slice(0, 9))} onOrdered={() => setRandom(null)} />
          {tiles.length > 1 && <a href="#tous" className="inline-block mt-1 underline" style={{ color: C.tube }}>Voir tous les épisodes ({tiles.length}) ↓</a>}
        </section>
      )}

      <section id="tous" aria-label="Tous les épisodes" className="relative py-6" style={{ background: '#0F070D' }}>
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
                  <span className="block mt-1 text-sm leading-tight group-hover:underline">{num(v)}{v.day && <span style={{ color: C.amber }}> · {longDate(v.day)}</span>}</span>
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
            <Socials size={34} className="mt-4" color={C.ink} bg={C.paper} />
          </div>
        </div>
      </section>

      <footer className="px-4 py-6 text-center text-xs" style={{ background: C.film, color: C.tube }}>
        <span className="opacity-60">SKROLL · des images vraies, des histoires fausses · </span>
        <a href="/?equipe" className="opacity-40 hover:opacity-80 underline">Espace équipe</a>
      </footer>

      {playing && (
        <div role="dialog" aria-modal="true" aria-label={`Épisode ${num(playing)}`} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPlaying(null)}>
          <div className="w-full max-w-4xl" style={{ maxWidth: 'min(56rem, 106vh)' }} onClick={e => e.stopPropagation()}>
            {phone && playing.vertical_url
              ? <video src={playing.vertical_url} controls autoPlay playsInline className="w-full max-h-[80svh] aspect-[9/16] bg-black" />
              : <video src={playing.file_url} controls autoPlay playsInline className="w-full aspect-[4/3] bg-black" />}
            <div className="flex items-center justify-between mt-2">
              <p className="text-lg font-semibold">{num(playing)}{playing.day && <span className="font-normal" style={{ color: C.amber }}> · diffusé le {longDate(playing.day)}</span>}</p>
              <button onClick={() => setPlaying(null)} className="underline">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Player central en défilement vertical, comme un fil Instagram : une vidéo par écran (scroll-snap),
// celle qui est à l'écran joue, et à la fin la suivante monte par le bas. Le son est actif par défaut ; si le navigateur
// refuse la lecture automatique avec le son (avant tout clic sur la page), on joue sans le son et on le rétablit au premier geste.
function Feed({ items, phone, random, onRandom, onOrdered }) {
  const box = useRef(null)
  const vids = useRef([])
  const [current, setCurrent] = useState(0)
  const [muted, setMuted] = useState(false)
  const [full, setFull] = useState(false)
  const [progress, setProgress] = useState(0)

  // the episode on screen is the one the scroll snapped to
  function onScroll() {
    const el = box.current
    const i = Math.round(el.scrollTop / el.clientHeight)
    if (i !== current && Math.abs(el.scrollTop - i * el.clientHeight) < el.clientHeight * 0.2) setCurrent(i)
  }

  const ids = items.map(v => v.id).join()
  useEffect(() => { box.current.scrollTop = 0; setCurrent(0) }, [ids])

  useEffect(() => {
    vids.current.forEach((v, i) => {
      if (!v) return
      if (i !== current) { v.pause(); return }
      v.currentTime = 0
      v.play().catch(() => { v.muted = true; setMuted(true); v.play().catch(() => {}) })
    })
    setProgress(0)
  }, [current, ids])

  // muted only because autoplay with sound was refused: the first tap or key on the page brings the sound back
  useEffect(() => {
    if (!muted) return
    const unmute = () => setMuted(false)
    window.addEventListener('pointerdown', unmute, { once: true })
    window.addEventListener('keydown', unmute, { once: true })
    return () => { window.removeEventListener('pointerdown', unmute); window.removeEventListener('keydown', unmute) }
  }, [muted])

  useEffect(() => {
    const on = () => {
      setFull(document.fullscreenElement === wrap.current)
      requestAnimationFrame(() => box.current && (box.current.scrollTop = current * box.current.clientHeight))
    }
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [current])

  const wrap = useRef(null)
  function toggleFull() {
    if (document.fullscreenElement) return document.exitFullscreen()
    if (wrap.current.requestFullscreen) return wrap.current.requestFullscreen()
    vids.current[current]?.webkitEnterFullscreen?.()   // iPhone : seule la vidéo peut passer en plein écran
  }

  function go(i) {
    const n = (i + items.length) % items.length
    const v = vids.current[current]
    if (n === current) { if (v) { v.currentTime = 0; v.play().catch(() => {}) } return }   // un seul épisode : il reboucle
    box.current.scrollTo({ top: n * box.current.clientHeight, behavior: 'smooth' })
  }

  function onKey(ev) {
    if (ev.key === 'ArrowDown' || ev.key === 'PageDown') { ev.preventDefault(); go(current + 1) }
    if (ev.key === 'ArrowUp' || ev.key === 'PageUp') { ev.preventDefault(); go(current - 1) }
    if (ev.key === ' ') { ev.preventDefault(); const v = vids.current[current]; v && (v.paused ? v.play() : v.pause()) }
  }

  return (
    <div>
      <div ref={wrap} className={`relative bg-black ${phone ? '-mx-4' : ''}`}>
        <div ref={box} tabIndex={0} onKeyDown={onKey} onScroll={onScroll} aria-label="Épisodes, flèches haut et bas pour changer"
          className={`${full ? 'h-screen' : phone ? 'h-[85svh]' : 'aspect-[4/3]'} w-full overflow-y-scroll snap-y snap-mandatory bg-black rounded-sm focus:outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
          {items.map((v, i) => (
            <div key={v.id + (v.day || '')} data-i={i} className="relative h-full w-full snap-start snap-always">
              {Math.abs(i - current) <= 1
                ? <video ref={el => (vids.current[i] = el)} src={phone && v.vertical_url ? v.vertical_url : v.file_url} poster={v.thumb_url || undefined} muted={muted} playsInline preload="auto"
                    onClick={e => (e.target.paused ? e.target.play() : e.target.pause())}
                    onTimeUpdate={e => i === current && setProgress(e.target.currentTime / (e.target.duration || 1))}
                    onEnded={() => go(i + 1)}
                    className="h-full w-full object-contain cursor-pointer" />
                : v.thumb_url ? <img src={v.thumb_url} alt="" className="h-full w-full object-contain" /> : null}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 md:p-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.75))' }}>
                <p className="text-lg md:text-xl font-semibold text-white">{num(v)}{v.day && <span className="text-sm font-normal" style={{ color: C.amber }}> · diffusé le {longDate(v.day)}</span>}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute left-0 right-0 bottom-0 h-0.5 pointer-events-none" style={{ background: 'rgba(255,255,255,.15)' }}>
          <div className="h-full" style={{ width: `${progress * 100}%`, background: C.neon }} />
        </div>
        <div className="absolute top-3 right-3 flex gap-2">
          {random !== null && <button onClick={onRandom} title="Mélanger les épisodes" className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: random ? C.neon : 'rgba(0,0,0,.6)', color: random ? C.film : C.tube }}>
            Aléatoire
          </button>}
          {random && <button onClick={onOrdered} title="Revenir du plus récent au plus ancien" className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: 'rgba(0,0,0,.6)', color: C.tube }}>Dans l'ordre</button>}
          <button onClick={e => { e.stopPropagation(); setMuted(m => !m) }} className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: 'rgba(0,0,0,.6)', color: C.tube }}>
            {muted ? 'Activer le son' : 'Couper le son'}
          </button>
          <button onClick={toggleFull} aria-label={full ? 'Quitter le plein écran' : 'Plein écran'} title={full ? 'Quitter le plein écran' : 'Plein écran'}
            className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,.6)', color: C.tube }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {full
                ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
                : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
            </svg>
          </button>
        </div>
        <div className={`absolute top-1/2 -translate-y-1/2 ${full ? 'right-4' : '-right-1 md:-right-12'} hidden sm:flex flex-col gap-2`}>
          <button onClick={() => go(current - 1)} aria-label="Épisode précédent" className="w-9 h-9 rounded-full font-bold" style={{ background: C.tube, color: C.film }}>↑</button>
          <button onClick={() => go(current + 1)} aria-label="Épisode suivant" className="w-9 h-9 rounded-full font-bold" style={{ background: C.neon, color: C.film }}>↓</button>
        </div>
      </div>
      <p className="mt-2 text-sm tabular-nums" style={{ color: C.amber }}>{current + 1} / {items.length}</p>
    </div>
  )
}
