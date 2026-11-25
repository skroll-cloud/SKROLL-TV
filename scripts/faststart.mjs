// Optimise un fichier vidéo pour le web (index au début, voir lib/faststart.mjs).
// Usage : node scripts/faststart.mjs entrée.mp4 sortie.mp4
import fs from 'node:fs'
import { faststart } from '../lib/faststart.mjs'
export { faststart }

if (process.argv[1]?.endsWith('faststart.mjs')) {
  const [inp, out] = process.argv.slice(2)
  const res = faststart(fs.readFileSync(inp))
  if (!res) console.log('déjà optimisé')
  else { fs.writeFileSync(out, res); console.log('ok', out) }
}
