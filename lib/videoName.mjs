// Nomenclature des vidéos : #01_SKROLL_NUMERO ARCHIVE_TITRE VIDEO
// Partagé par le site (app/) et le script de synchro (scripts/sync-videos.mjs).

// "SKROLL poésie vache" / "Skroll_33983_Bigoudènes meme" / "32823_touché coulé"
// → "SKROLL_0000_poésie_vache" / "SKROLL_33983_Bigoudènes_meme" / "SKROLL_32823_touché_coulé"
export function normalizeTitle(title) {
  let rest = (title || '').trim().replace(/^skroll?(?=[\s_\-\d]|$)[\s_-]*/i, '')
  const numbers = []
  let m
  while ((m = rest.match(/^(\d+)(?:[\s_-]+|$)/))) {
    numbers.push(m[1])
    rest = rest.slice(m[0].length)
  }
  rest = rest.trim().replace(/[\s_]+/g, '_').replace(/^[_-]+|[_-]+$/g, '')
  return ['SKROLL', numbers.length ? numbers.join('_') : '0000', rest].filter(Boolean).join('_')
}

// Titre affiché : préfixe #NN pour les vidéos PAD numérotées
export function displayTitle(video) {
  if (!video) return ''
  if (video.pad_number == null) return video.title
  return `#${String(video.pad_number).padStart(2, '0')}_${video.title}`
}

// Nom de fichier sûr (macOS / Windows / clés USB)
export function safeFileName(name) {
  return name.replace(/[\/\\:*?"<>|]/g, '').replace(/\s+/g, '_').trim()
}
