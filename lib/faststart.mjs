// « Optimisé pour le web » (faststart) : met l'index d'un MP4/MOV (atome moov) avant les données (mdat),
// pour que le navigateur affiche la première image dès les premiers octets au lieu d'aller chercher la fin du fichier.
// L'image et le son ne sont pas touchés (aucun réencodage). Marche dans le navigateur et dans Node (Buffer est un Uint8Array).

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'udta', 'mvex'])
const type4 = (u8, o) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3])

function atoms(u8, dv, start, end) {
  const out = []
  let o = start
  while (o + 8 <= end) {
    let size = dv.getUint32(o)
    const type = type4(u8, o + 4)
    let header = 8
    if (size === 1) { size = Number(dv.getBigUint64(o + 8)); header = 16 }
    else if (size === 0) size = end - o
    if (size < header || o + size > end) throw new Error(`atome ${type} invalide à ${o}`)
    out.push({ type, start: o, size, header })
    o += size
  }
  return out
}

// décale tous les offsets de morceaux (stco 32 bits, co64 64 bits) contenus dans moov
function shiftOffsets(moov, delta) {
  const dv = new DataView(moov.buffer, moov.byteOffset, moov.byteLength)
  const walk = (start, end) => {
    for (const a of atoms(moov, dv, start, end)) {
      if (CONTAINERS.has(a.type)) walk(a.start + a.header, a.start + a.size)
      else if (a.type === 'stco' || a.type === 'co64') {
        const n = dv.getUint32(a.start + 12)
        for (let k = 0; k < n; k++) {
          if (a.type === 'stco') {
            const p = a.start + 16 + 4 * k, v = dv.getUint32(p) + delta
            if (v > 0xffffffff) throw new Error('offset > 4 Go, conversion co64 non gérée')
            dv.setUint32(p, v)
          } else {
            const p = a.start + 16 + 8 * k
            dv.setBigUint64(p, dv.getBigUint64(p) + BigInt(delta))
          }
        }
      }
    }
  }
  walk(8, moov.length)
}

// Uint8Array → Uint8Array réordonné, ou null si le fichier est déjà optimisé
export function faststart(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  const top = atoms(u8, dv, 0, u8.length)
  const moov = top.find(a => a.type === 'moov')
  const mdat = top.find(a => a.type === 'mdat')
  if (!moov || !mdat) throw new Error('moov ou mdat absent')
  if (moov.start < mdat.start) return null
  if (moov.header !== 8) throw new Error('moov 64 bits non géré')
  const moovCopy = u8.slice(moov.start, moov.start + moov.size)
  shiftOffsets(moovCopy, moov.size)
  const parts = [
    ...top.filter(a => a.start < mdat.start && a.type !== 'moov').map(a => u8.subarray(a.start, a.start + a.size)),
    moovCopy,
    ...top.filter(a => a.start >= mdat.start && a.type !== 'moov').map(a => u8.subarray(a.start, a.start + a.size)),
  ]
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

// Pour un envoi depuis le site : renvoie le fichier optimisé (même nom, même type), ou l'original si déjà optimisé
// ou si le format n'est pas reconnu — l'envoi ne doit jamais échouer à cause de ça.
export async function webReady(file) {
  try {
    const fast = faststart(new Uint8Array(await file.arrayBuffer()))
    return fast ? new File([fast], file.name, { type: file.type || 'video/mp4', lastModified: file.lastModified }) : file
  } catch (e) {
    console.warn('faststart ignoré :', e.message)
    return file
  }
}
