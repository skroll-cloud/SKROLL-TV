// Atelier local : lister, lire, renommer et classer les vidéos de ~/Movies/SKROLL TV.
//
//   npm run atelier                         → http://localhost:4321
//   npm run atelier -- "/Volumes/Disque/SKROLL"
//
// Le dossier local fait foi : l'état de chaque vidéo est lu dans son nom de fichier
// et son dossier. Aucun fichier n'est supprimé. Seule écriture sur le site : cocher
// « résolu » sur un commentaire (comme le bouton du site).

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { safeFileName } from '../lib/videoName.mjs'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)

const ROOT = process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(os.homedir(), 'Movies', 'SKROLL TV')
const PORT = Number(process.env.PORT) || 4321
const FOLDERS = ['Brouillon', 'En cours', 'PAD', 'À supprimer']
const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm'])
const SYNC_MANIFEST = path.join(ROOT, '.skroll-sync.json')   // id du site → chemin (écrit par sync-videos)
const NOTES_FILE = path.join(ROOT, '.skroll-atelier.json')   // clé vidéo → { mixe, modifie, final, note }
const HTML = path.join(path.dirname(new URL(import.meta.url).pathname), 'atelier.html')

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return {} } }
const writeJson = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2))

// "#03_SKROLL_33983_7591_Maarthe_NFT.mov" → { pad: 3, archives: ['33983','7591'], title: 'Maarthe_NFT', ext: '.mov' }
function parseName(file) {
  const ext = path.extname(file)
  let base = file.slice(0, -ext.length).normalize('NFC')
  let pad = null
  const p = base.match(/^#(\d+)_/)
  if (p) { pad = Number(p[1]); base = base.slice(p[0].length) }
  const archives = []
  const s = base.match(/^SKROLL_/i)
  if (s) {
    base = base.slice(s[0].length)
    let m
    while ((m = base.match(/^(\d+)(?:_|$)/))) {
      base = base.slice(m[0].length)
      if (m[1] === '0000') break
      archives.push(m[1])
    }
  }
  return { pad, archives, title: base, ext }
}

function buildName({ pad, archives, title, ext }) {
  const prefix = pad != null ? `#${String(pad).padStart(2, '0')}_` : ''
  const nums = archives.length ? archives.join('_') : '0000'
  const t = (title || '').trim().replace(/[\s_]+/g, '_').replace(/^[_-]+|[_-]+$/g, '')
  return safeFileName(`${prefix}SKROLL_${nums}${t ? '_' + t : ''}`) + ext.toLowerCase()
}

function listVideos() {
  const sync = readJson(SYNC_MANIFEST)
  const idByRel = Object.fromEntries(Object.entries(sync).map(([id, rel]) => [rel.normalize('NFC'), id]))
  const notes = readJson(NOTES_FILE)
  const out = []
  for (const folder of FOLDERS) {
    const dir = path.join(ROOT, folder)
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir)) {
      if (file.startsWith('.') || !VIDEO_EXT.has(path.extname(file).toLowerCase())) continue
      const rel = path.join(folder, file).normalize('NFC')
      const id = idByRel[rel] || null
      const key = id || 'fichier:' + rel
      const st = fs.statSync(path.join(dir, file))
      out.push({ key, id, folder, file: file.normalize('NFC'), size: st.size, mtime: st.mtimeMs, ...parseName(file), notes: notes[key] || {} })
    }
  }
  return out
}

// Déplace / renomme un fichier (physiquement depuis `srcRel`) et garde les manifestes à jour
function moveFile(fromRel, toRel, srcRel = fromRel) {
  if (fromRel === toRel && srcRel === fromRel) return
  const to = path.join(ROOT, toRel)
  if (fs.existsSync(to) && fromRel.toLowerCase() !== toRel.toLowerCase()) throw new Error(`« ${toRel} » existe déjà`)
  fs.renameSync(path.join(ROOT, srcRel), to)
  const sync = readJson(SYNC_MANIFEST)
  for (const id of Object.keys(sync)) if (sync[id].normalize('NFC') === fromRel) sync[id] = toRel
  writeJson(SYNC_MANIFEST, sync)
  const notes = readJson(NOTES_FILE)
  if (notes['fichier:' + fromRel]) { notes['fichier:' + toRel] = notes['fichier:' + fromRel]; delete notes['fichier:' + fromRel]; writeJson(NOTES_FILE, notes) }
}

// Commentaires du site, regroupés par id de vidéo
async function loadComments() {
  const { data, error } = await supabase.from('comments')
    .select('id, video_id, user_id, text, assignee, resolved, created_at')
    .order('created_at')
  if (error) throw new Error('Commentaires : ' + error.message)
  const byVideo = {}
  for (const c of data) (byVideo[c.video_id] ||= []).push(c)
  return byVideo
}

const nextPad = (videos) => Math.max(0, ...videos.filter(v => v.folder === 'PAD' && v.pad != null).map(v => v.pad)) + 1

// Applique { folder, archives, title, pad } à la vidéo `rel`.
// - entrer dans PAD sans numéro → numéro suivant ; sortir de PAD → numéro retiré
// - numéro PAD déjà pris → les deux vidéos échangent leur numéro
function updateVideo(rel, changes) {
  const videos = listVideos()
  const v = videos.find(x => path.join(x.folder, x.file) === rel)
  if (!v) throw new Error('Vidéo introuvable (renommée dans le Finder ?) — recharge la page')
  const folder = FOLDERS.includes(changes.folder) ? changes.folder : v.folder
  const archives = changes.archives !== undefined
    ? String(changes.archives).split(/[^\d]+/).filter(n => n && n !== '0000')
    : v.archives
  const title = changes.title !== undefined ? changes.title : v.title
  let pad = null
  if (folder === 'PAD') {
    if (changes.pad !== undefined && changes.pad !== null && changes.pad !== '') pad = Math.max(1, parseInt(changes.pad, 10) || 1)
    else pad = v.folder === 'PAD' && v.pad != null ? v.pad : nextPad(videos)
  }
  const plan = []
  const newRel = path.join(folder, buildName({ pad, archives, title, ext: v.ext }))
  if (pad != null && pad !== v.pad) {
    const other = videos.find(x => x !== v && x.folder === 'PAD' && x.pad === pad)
    if (other) {
      const swap = v.folder === 'PAD' && v.pad != null ? v.pad : nextPad(videos)
      plan.push([path.join(other.folder, other.file), path.join('PAD', buildName({ ...other, pad: swap }))])
    }
  }
  plan.push([rel, newRel])
  applyPlan(plan)
  return newRel
}

// Renommages groupés en deux temps (tout vers des noms temporaires, puis vers la cible),
// pour que les échanges de numéros ne se marchent pas dessus
function applyPlan(plan) {
  plan = plan.filter(([from, to]) => from !== to)
  const taken = plan.find(([from, to]) => fs.existsSync(path.join(ROOT, to)) && !plan.some(([f]) => f.toLowerCase() === to.toLowerCase()) && from.toLowerCase() !== to.toLowerCase())
  if (taken) throw new Error(`« ${taken[1]} » existe déjà`)
  const stamp = Date.now()
  const tmp = plan.map(([from], i) => {
    const t = path.join(path.dirname(from), `.atelier-tmp-${stamp}-${i}`)
    fs.renameSync(path.join(ROOT, from), path.join(ROOT, t))
    return t
  })
  plan.forEach(([from, to], i) => moveFile(from, to, tmp[i]))
}

// Refait #01, #02… sans trous, dans l'ordre actuel
function renumberPad() {
  const pads = listVideos().filter(v => v.folder === 'PAD').sort((a, b) => (a.pad ?? 1e9) - (b.pad ?? 1e9) || a.file.localeCompare(b.file))
  const plan = pads.map((v, i) => [path.join('PAD', v.file), path.join('PAD', buildName({ ...v, pad: i + 1 }))]).filter(([a, b]) => a !== b)
  applyPlan(plan)
  return plan.length
}

function setNotes(key, patch) {
  const notes = readJson(NOTES_FILE)
  notes[key] = { ...(notes[key] || {}), ...patch }
  writeJson(NOTES_FILE, notes)
}

// Sert un fichier vidéo avec support des Range (nécessaire pour avancer dans la lecture)
function serveMedia(req, res, rel) {
  const file = path.join(ROOT, rel)
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return }
  const size = fs.statSync(file).size
  const type = path.extname(file).toLowerCase() === '.mov' ? 'video/quicktime' : 'video/mp4'
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/)
  if (range) {
    const start = range[1] ? Number(range[1]) : size - Number(range[2])
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 })
    fs.createReadStream(file, { start, end }).pipe(res)
  } else {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' })
    fs.createReadStream(file).pipe(res)
  }
}

const body = (req) => new Promise((ok, ko) => { let d = ''; req.on('data', c => d += c); req.on('end', () => { try { ok(JSON.parse(d || '{}')) } catch (e) { ko(e) } }) })
const json = (res, code, data) => res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(data))

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  // En-tête obligatoire : empêche un autre site ouvert dans le navigateur d'appeler l'atelier
  if (req.method === 'POST' && req.headers['x-atelier'] !== '1') { res.writeHead(403).end(); return }
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(fs.readFileSync(HTML))
    } else if (req.method === 'GET' && url.pathname === '/api/videos') {
      const videos = listVideos()
      let commentsError = null
      try {
        const byVideo = await loadComments()
        for (const v of videos) v.comments = (v.id && byVideo[v.id]) || []
      } catch (e) { commentsError = e.message; for (const v of videos) v.comments = [] }
      json(res, 200, { root: ROOT, folders: FOLDERS, videos, commentsError })
    } else if (req.method === 'GET' && url.pathname.startsWith('/media/')) {
      serveMedia(req, res, decodeURIComponent(url.pathname.slice('/media/'.length)).normalize('NFC'))
    } else if (req.method === 'POST' && url.pathname === '/api/update') {
      const { rel, ...changes } = await body(req)
      json(res, 200, { rel: updateVideo(rel.normalize('NFC'), changes) })
    } else if (req.method === 'POST' && url.pathname === '/api/renumber') {
      json(res, 200, { renamed: renumberPad() })
    } else if (req.method === 'POST' && url.pathname === '/api/comment-resolved') {
      const { id, resolved } = await body(req)
      const { error } = await supabase.from('comments').update({ resolved: !!resolved }).eq('id', id)
      if (error) throw new Error(error.message)
      json(res, 200, { ok: true })
    } else if (req.method === 'POST' && url.pathname === '/api/notes') {
      const { key, ...patch } = await body(req)
      setNotes(key, patch); json(res, 200, { ok: true })
    } else if (req.method === 'POST' && url.pathname === '/api/reveal') {
      const file = path.join(ROOT, (await body(req)).rel)
      if (!file.startsWith(ROOT + path.sep)) throw new Error('Chemin invalide')
      execFile('open', ['-R', file]); json(res, 200, { ok: true })
    } else {
      res.writeHead(404).end()
    }
  } catch (e) {
    json(res, 400, { error: e.message })
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Atelier SKROLL → http://localhost:${PORT}   (dossier : ${ROOT})`)
  if (!process.argv.includes('--no-open')) execFile('open', [`http://localhost:${PORT}`])
})
