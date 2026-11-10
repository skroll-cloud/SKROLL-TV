'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// The finishing pack: so that Sébastien and Pierre Emmanuel can deliver finished episodes (mixed + dressed) themselves.
// Files live in the public Videos bucket under habillage/v1/; reference episode = #117 COP 31 (finished by Claude on 10 Nov 2026).
const BASE = 'https://riotdlbdywxuouvdgqpt.supabase.co/storage/v1/object/public/Videos/'
const FILES = [
  { path: 'habillage/v1/SKROLL_logo_haut_droite_boucle15s.mov', name: 'Logo animé (boucle 15 s)', info: 'ProRes 4444 avec transparence, 1920×1080' },
  { path: 'habillage/v1/SKROLL_eclair_fin_slide_up.mov', name: 'Éclair de fin (image + son)', info: 'ProRes 4444 avec transparence + son, 1,2 s' },
  { path: 'habillage/v1/SKROLL_son_eclair_fin.wav', name: 'Son de l\'éclair seul', info: 'WAV 48 kHz 24 bits, 1,2 s' },
  { path: 'pad/20261110-0830-_117_SKROLL_23318_COP_31.mp4', name: 'Exemple fini en 4:3 : #117 COP 31', info: 'à prendre comme modèle' },
  { path: 'pad/916/20261110-0830-_117_SKROLL_23318_COP_31.mp4', name: 'Exemple fini en 9:16 : #117 COP 31', info: 'à prendre comme modèle' },
]

const STEPS = [
  ['1. Le montage', [
    'Séquence 25 images/s (même si les archives sont en 24 : on finit toujours en 25).',
    'Format 4:3 : 1440×1080. Les archives sont en 4:3 dans des fichiers 16:9 : remplissez le cadre (pas de bandes noires sur les côtés), zoomez légèrement si l\'image est plus étroite.',
    'Nom : #NN_SKROLL_<numéros d\'archives>_<Titre>, par exemple #117_SKROLL_23318_COP_31 (0000 s\'il n\'y a pas d\'archive). Le numéro NN est donné par le site au moment de l\'envoi : mettez XX en attendant.',
  ]],
  ['2. Le mix', [
    'Volume final : -14 LUFS intégré (entre -14,5 et -13,5), crête vraie au maximum -1 dB. Dans DaVinci : compteur Loudness de Fairlight. Dans Premiere : effet « Loudness Radar » ou, à l\'export, normalisation ITU BS.1770-3 à -14 LUFS, crête -1 dB.',
    'Les gens regardent sur téléphone : la voix passe devant. Pendant qu\'on parle, la musique et les ambiances restent au moins 18 dB sous la voix. On ne baisse que le fond, jamais la voix ; les bruitages (claque, pet, moteur…) gardent leur niveau.',
    'Pas de silence absolu entre les répliques : gardez l\'ambiance de fond.',
  ]],
  ['3. L\'habillage', [
    'Logo : « Logo animé » sur la piste au-dessus de l\'image, du début à la fin, à 100 % et centré. Sur une séquence 1440×1080, les bords du fichier 1920 sont coupés et le logo tombe en haut à droite de l\'image.',
    'Fin : le son de l\'éclair (-3 dB) démarre 13 images avant la fin. Il ne doit jamais manger le dernier mot : s\'il y a une voix à la fin, il démarre APRÈS la fin du mot (décroissance comprise). Au besoin, prolongez la dernière image par un arrêt sur image, ne prenez pas la suite du rush.',
    'Sur les 7 dernières images : transition « Slide Up » (DaVinci, Fusion) sur l\'image et sur le logo. Dans Premiere : « Pousser » vers le haut, 7 images. Le fichier « Éclair de fin » contient déjà image + son, posé au-dessus des dernières images : solution la plus simple si vous n\'avez pas Slide Up.',
    'Exception : une coupe en plein mot voulue pour le gag est possible ; dites-le dans la note de l\'épisode.',
  ]],
  ['4. Les exports', [
    '4:3 : MP4 H.264, 1440×1080, 25 i/s, son AAC 48 kHz stéréo.',
    '9:16 : MP4 H.264, 1080×1920, 25 i/s : la même séquence 4:3 posée au centre, bandes noires en haut et en bas (voir l\'exemple). C\'est elle qui part sur Instagram, Facebook, TikTok et YouTube.',
    'Revoyez les deux fichiers en entier sur téléphone avant l\'envoi : son présent partout, dernier mot entendu, logo visible.',
  ]],
  ['5. Sur le site', [
    'Page Épisodes → « + Ajouter un épisode fini » : titre, numéros d\'archives, les deux fichiers, quelques mots-clés (lieu, époque, personnages, sujet, la blague) pour la légende. Le site donne le numéro suivant et fait la vignette.',
    'Regardez-le dans « À voir », puis passez-le en PAD.',
    'Planning de diffusion : glissez-le sur un jour, ouvrez la case et cliquez « Mettre en ligne via Claude ». Claude le programme dans Metricool sur les 4 réseaux (titre SKROLL #NN, légende, collaborateurs Instagram) ; il apparaît sur skroll.tv à l\'heure prévue.',
    'Si la case affiche une erreur ou « Pas branché » trop longtemps, prévenez Bertrand.',
  ]],
]

export default function Habillage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  useEffect(() => {
    const saved = localStorage.getItem('skroll_user')
    if (!saved) { router.push('/equipe'); return }
    setUser(saved)
  }, [])
  if (!user) return null
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="px-4 md:px-6 py-3 flex justify-between items-center">
          <button onClick={() => router.push('/equipe')} className="text-sm text-gray-500 hover:text-gray-800">← Espace de travail</button>
          <h1 className="text-lg font-bold text-blue-600 tracking-tight">SKROLL.TV</h1>
          <button onClick={() => router.push('/pad')} className="text-sm text-gray-500 hover:text-gray-800">Épisodes →</button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Habillage et mix</h2>
        <p className="text-sm text-gray-600 mt-1 mb-6">Pour livrer un épisode fini sans passer par Bertrand : les fichiers d'habillage, les normes de mix et d'export, et comment le mettre en ligne.</p>

        <section className="bg-white rounded-xl border p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Fichiers à télécharger</h3>
          <ul className="divide-y">
            {FILES.map(f => (
              <li key={f.path} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm"><span className="font-medium text-gray-900">{f.name}</span> <span className="text-gray-500">· {f.info}</span></span>
                <a href={`${BASE}${f.path}?download=${encodeURIComponent(f.path.split('/').pop())}`} className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-100">Télécharger</a>
              </li>
            ))}
          </ul>
        </section>

        {STEPS.map(([title, items]) => (
          <section key={title} className="bg-white rounded-xl border p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700">{items.map(i => <li key={i}>{i}</li>)}</ul>
          </section>
        ))}

        <section className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900 mb-2">L'exemple</h3>
          <video src={`${BASE}pad/20261110-0830-_117_SKROLL_23318_COP_31.mp4`} controls playsInline preload="metadata" className="w-full bg-black rounded-lg aspect-[4/3]" />
        </section>
      </main>
    </div>
  )
}
