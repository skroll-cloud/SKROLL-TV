// Télécharge toutes les vidéos du site et les range par statut.
//
//   npm run sync-videos                    → ~/Movies/SKROLL TV
//   npm run sync-videos -- "/Volumes/Disque/SKROLL"
//
// Relançable : ne télécharge que les vidéos pas encore présentes. Les fichiers déjà
// là ne sont jamais touchés (le dossier local fait foi, cf. npm run atelier).
//   npm run sync-videos -- --reorganiser   → reclasse / renomme tout selon les votes du site
// Ne supprime jamais rien : les vidéos retirées du site sont seulement signalées.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { normalizeTitle, displayTitle, safeFileName } from '../lib/videoName.mjs'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)

const args = process.argv.slice(2)
const REORGANISE = args.includes('--reorganiser')
const ROOT = args.find(a => !a.startsWith('--')) || path.join(os.homedir(), 'Movies', 'SKROLL TV')
const MANIFEST = path.join(ROOT, '.skroll-sync.json')
const CONCURRENCY = 4

// Même règle que getVideoStatus() dans app/page.js
function folderFor(video) {
  const votes = [video.bertrand_vote, video.sebastien_vote, video.pierreemmanuel_vote]
  if (votes.some(v => v === 'non')) return 'À supprimer'
  if (votes.every(v => v === 'pad')) return 'PAD'
  if (votes.some(v => v != null)) return 'En cours'
  return 'Brouillon'
}

function fileNameFor(video) {
  const ext = path.extname(new URL(video.file_url).pathname) || '.mp4'
  const base = video.pad_number != null ? displayTitle(video) : normalizeTitle(video.title)
  return safeFileName(base) + ext.toLowerCase()
}

const { data: videos, error } = await supabase
  .from('videos')
  .select('id, title, file_url, pad_number, bertrand_vote, sebastien_vote, pierreemmanuel_vote')
  .order('uploaded_at')
if (error) { console.error('Erreur Supabase :', error.message); process.exit(1) }

for (const f of ['PAD', 'Brouillon', 'En cours', 'À supprimer']) fs.mkdirSync(path.join(ROOT, f), { recursive: true })
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {}

// Chemins cibles, avec suffixe _2, _3… si deux vidéos ont le même nom dans un dossier
const taken = new Set()
const plan = videos.map(video => {
  const folder = folderFor(video)
  const name = fileNameFor(video)
  let rel = path.join(folder, name), i = 2
  while (taken.has(rel.toLowerCase())) rel = path.join(folder, name.replace(/(\.\w+)$/, `_${i++}$1`))
  taken.add(rel.toLowerCase())
  return { video, rel }
})

const stats = { downloaded: 0, moved: 0, ok: 0, failed: [] }
const saveManifest = () => fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2))

// 1. Déplacements / renommages (via un nom temporaire pour éviter les collisions croisées)
const moves = !REORGANISE ? [] : plan.filter(({ video, rel }) => manifest[video.id] && manifest[video.id] !== rel && fs.existsSync(path.join(ROOT, manifest[video.id])))
for (const m of moves) {
  m.tmp = path.join(ROOT, `.tmp-${m.video.id}`)
  fs.renameSync(path.join(ROOT, manifest[m.video.id]), m.tmp)
}
for (const m of moves) {
  fs.renameSync(m.tmp, path.join(ROOT, m.rel))
  console.log(`↪ ${manifest[m.video.id]}  →  ${m.rel}`)
  manifest[m.video.id] = m.rel
  stats.moved++
}
saveManifest()

// 2. Téléchargements
const todo = plan.filter(({ video }) => {
  if (manifest[video.id] && fs.existsSync(path.join(ROOT, manifest[video.id]))) { stats.ok++; return false }
  return true
})
console.log(`${videos.length} vidéos sur le site — ${todo.length} à télécharger, ${stats.moved} déplacées, ${stats.ok} déjà à jour.\n`)

let done = 0
async function download({ video, rel }) {
  const dest = path.join(ROOT, rel), part = dest + '.part'
  try {
    const res = await fetch(video.file_url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(part))
    fs.renameSync(part, dest)
    manifest[video.id] = rel
    saveManifest()
    stats.downloaded++
    console.log(`[${++done}/${todo.length}] ✓ ${rel}`)
  } catch (e) {
    fs.rmSync(part, { force: true })
    stats.failed.push(`${rel} (${e.message})`)
    console.log(`[${++done}/${todo.length}] ✗ ${rel} — ${e.message}`)
  }
}
const queue = [...todo]
await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (queue.length) await download(queue.shift()) }))

// 3. Vidéos retirées du site
const ids = new Set(videos.map(v => v.id))
const orphans = Object.entries(manifest).filter(([id]) => !ids.has(id))

console.log(`\nTerminé dans « ${ROOT} » : ${stats.downloaded} téléchargées, ${stats.moved} déplacées, ${stats.ok} déjà à jour.`)
for (const f of ['PAD', 'Brouillon', 'En cours', 'À supprimer']) console.log(`  ${f.padEnd(12)} ${plan.filter(p => p.rel.startsWith(f + path.sep)).length}`)
if (stats.failed.length) console.log(`\n⚠ ${stats.failed.length} échec(s) — relancer le script :\n  ` + stats.failed.join('\n  '))
if (orphans.length) console.log(`\nℹ Plus sur le site (fichiers conservés) :\n  ` + orphans.map(([, rel]) => rel).join('\n  '))
