// Optimise pour le web (faststart) tous les fichiers du catalogue PAD : télécharge chaque 4:3 et 9:16,
// déplace l'index au début, renvoie le fichier sous un nouveau chemin (…/web/<nom>, l'anon ne peut pas écraser)
// et écrit la correspondance ancien → nouveau dans le fichier JSON donné. La base n'est PAS modifiée ici.
// Usage : node scripts/faststart-pad.mjs correspondance.json
import fs from 'node:fs'
import { faststart } from './faststart.mjs'

const src = fs.readFileSync(new URL('../app/accueil/page.js', import.meta.url), 'utf8')
const URL_ = src.match(/SUPABASE_URL = '([^']+)'/)[1]
const KEY = src.match(/SUPABASE_KEY = '([^']+)'/)[1]
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const out = process.argv[2]
const done = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {}

const rows = await (await fetch(`${URL_}/rest/v1/pad_videos?select=id,number,file_url,vertical_url`, { headers: H })).json()
const jobs = rows.flatMap(r => [['file_url', r.file_url], ['vertical_url', r.vertical_url]]
  .filter(([, u]) => u && !u.includes('/web/')).map(([col, u]) => ({ id: r.id, number: r.number, col, u })))
console.log(jobs.length, 'fichiers')

const PUB = '/storage/v1/object/public/Videos/'
async function one(j) {
  const key = `${j.id}:${j.col}`
  if (done[key]) return
  const res = await fetch(j.u)
  if (!res.ok) throw new Error(`téléchargement ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const fast = faststart(buf)
  if (!fast) { done[key] = { ...j, new: j.u, already: true }; return }
  const path = decodeURIComponent(j.u.split(PUB)[1])
  const i = path.lastIndexOf('/')
  const dest = `${path.slice(0, i)}/web/${path.slice(i + 1)}`
  const up = await fetch(`${URL_}/storage/v1/object/Videos/${dest.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { ...H, 'Content-Type': 'video/mp4', 'x-upsert': 'false' }, body: fast })
  if (!up.ok && up.status !== 409 && !(await up.text()).includes('already exists')) throw new Error(`envoi ${up.status}`)
  done[key] = { ...j, new: `${URL_}${PUB}${dest.split('/').map(encodeURIComponent).join('/')}` }
}

let k = 0, errors = 0
async function worker() {
  while (k < jobs.length) {
    const j = jobs[k++]
    try { await one(j); process.stdout.write(`#${j.number} ${j.col} ok\n`) }
    catch (e) { errors++; console.log(`#${j.number} ${j.col} ERREUR ${e.message}`) }
    fs.writeFileSync(out, JSON.stringify(done, null, 1))
  }
}
await Promise.all([worker(), worker()])
console.log('fini', Object.keys(done).length, 'traités,', errors, 'erreurs')
