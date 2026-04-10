'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)

const userToColumn = {
  'Bertrand': 'bertrand_approved',
  'Sébastien': 'sebastien_approved',
  'Pierre Emmanuel': 'pierreemmanuel_approved'
}

const userToVoteColumn = {
  'Bertrand': 'bertrand_vote',
  'Sébastien': 'sebastien_vote',
  'Pierre Emmanuel': 'pierreemmanuel_vote'
}

function getVideoStatus(video) {
  if (!video) return 'En attente'
  const votes = [video.bertrand_vote, video.sebastien_vote, video.pierreemmanuel_vote]
  if (votes.some(v => v === 'non')) return 'À supprimer'
  if (votes.every(v => v === 'pad')) return 'PAD'
  if (votes.some(v => v !== null)) return 'En cours'
  return 'En attente'
}

function voteStyle(v) {
  if (v === 'pad') return 'bg-green-100 text-green-700'
  if (v === 'ameliorer') return 'bg-orange-100 text-orange-600'
  if (v === 'non') return 'bg-red-100 text-red-500 line-through'
  return 'bg-gray-100 text-gray-400'
}

function voteIcon(v) {
  if (v === 'pad') return ' ✓'
  if (v === 'ameliorer') return ' ~'
  if (v === 'non') return ' ✗'
  return ''
}

function cycleVote(current) {
  if (current === 'ameliorer') return 'pad'
  if (current === 'pad') return 'non'
  if (current === 'non') return null
  return 'ameliorer' // null/undefined → démarrer
}

export default function VideoPage({ params }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromFilter = searchParams.get('from') || 'all'
  const { id } = use(params)
  
  const [currentUser, setCurrentUser] = useState(null)
  const [video, setVideo] = useState(null)
  const [allVideos, setAllVideos] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentAssignee, setCommentAssignee] = useState('')
  const [audioTracks, setAudioTracks] = useState([])
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [videoTypes, setVideoTypes] = useState([])
  
  // Swipe state
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const minSwipeDistance = 50

  useEffect(() => {
    const saved = localStorage.getItem('skroll_user')
    if (saved) setCurrentUser(saved)
    else router.push('/')
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadAllVideos()
      loadVideoTypes()
    }
  }, [currentUser])

  useEffect(() => {
    if (allVideos.length > 0 && id) {
      const navList = fromFilter !== 'all'
        ? allVideos.filter(v => getVideoStatus(v) === fromFilter)
        : allVideos
      const index = navList.findIndex(v => v.id === id)
      if (index !== -1) {
        setCurrentIndex(index)
        setVideo(navList[index])
        loadComments(id)
        loadAudioTracks(id)
      } else {
        // vidéo pas dans le filtre, on la charge quand même mais sans contexte de nav
        const v = allVideos.find(v => v.id === id)
        if (v) { setVideo(v); loadComments(id); loadAudioTracks(id) }
      }
    }
  }, [allVideos, id])

  async function loadAllVideos() {
    const { data } = await supabase.from('videos').select('*, video_types(name)').order('uploaded_at', { ascending: false })
    if (data) setAllVideos(data)
  }

  async function loadVideoTypes() {
    const { data } = await supabase.from('video_types').select('*').order('name')
    if (data) setVideoTypes(data)
  }

  async function loadComments(videoId) {
    const { data } = await supabase.from('comments').select('*').eq('video_id', videoId).order('created_at', { ascending: true })
    if (data) setComments(data)
  }

  async function loadAudioTracks(videoId) {
    const { data } = await supabase.from('audio_tracks').select('*').eq('video_id', videoId).order('created_at', { ascending: false })
    if (data) setAudioTracks(data)
  }

  // Swipe handlers
  const onTouchStart = (e) => {
    if (isAnimating) return
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    if (isAnimating || !touchStart) return
    const currentX = e.targetTouches[0].clientX
    setTouchEnd(currentX)
    const diff = currentX - touchStart
    // Limit swipe offset
    const maxOffset = window.innerWidth * 0.4
    setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, diff)))
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || isAnimating) {
      setSwipeOffset(0)
      return
    }
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentIndex < allVideos.length - 1) {
      navigateToVideo(currentIndex + 1)
    } else if (isRightSwipe && currentIndex > 0) {
      navigateToVideo(currentIndex - 1)
    } else {
      setSwipeOffset(0)
    }
  }

  function navigateToVideo(newIndex) {
    if (newIndex < 0 || newIndex >= navigationVideos.length) return
    setIsAnimating(true)
    const direction = newIndex > currentIndex ? -1 : 1
    setSwipeOffset(direction * window.innerWidth)
    const fromParam = fromFilter !== 'all' ? `?from=${encodeURIComponent(fromFilter)}` : ''
    setTimeout(() => {
      router.push(`/video/${navigationVideos[newIndex].id}${fromParam}`)
      setSwipeOffset(0)
      setIsAnimating(false)
    }, 200)
  }

  async function addComment() {
    if (!newComment.trim() || !video) return
    const payload = { video_id: video.id, user_id: currentUser, text: newComment }
    if (commentAssignee) payload.assignee = commentAssignee
    await supabase.from('comments').insert([payload])
    setNewComment('')
    setCommentAssignee('')
    loadComments(video.id)
  }

  async function claimReferent() {
    if (!video || !currentUser) return
    await supabase.from('videos').update({ referent: currentUser }).eq('id', video.id)
    loadAllVideos()
  }

  async function releaseReferent() {
    if (!video) return
    await supabase.from('videos').update({ referent: null }).eq('id', video.id)
    loadAllVideos()
  }

  async function castVote(vote) {
    // vote: 'pad' | 'ameliorer' | 'non' | null
    if (!video || !currentUser) return
    const voteCol = userToVoteColumn[currentUser]
    await supabase.from('videos').update({ [voteCol]: vote }).eq('id', video.id)
    loadAllVideos()
  }

  function navigateToSection(sectionId) {
    localStorage.setItem('skroll_section', sectionId)
    router.push('/')
  }

  async function updateVideoType(typeId) {
    if (!video) return
    await supabase.from('videos').update({ type_id: typeId || null }).eq('id', video.id)
    loadAllVideos()
  }

  async function handleAudioUpload(event) {
    const file = event.target.files?.[0]
    if (!file || !video) return
    setUploadingAudio(true)
    const filePath = `audio/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { error } = await supabase.storage.from('files').upload(filePath, file)
    if (error) { alert(`Erreur: ${error.message}`); setUploadingAudio(false); return }
    const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath)
    await supabase.from('audio_tracks').insert([{
      video_id: video.id,
      name: file.name,
      file_url: urlData.publicUrl,
      track_type: file.name.split('.').pop()?.toUpperCase() || 'AUDIO',
      uploaded_by: currentUser
    }])
    setUploadingAudio(false)
    loadAudioTracks(video.id)
    event.target.value = ''
  }

  async function deleteAudioTrack(trackId) {
    if (!confirm('Supprimer cette piste ?')) return
    await supabase.from('audio_tracks').delete().eq('id', trackId)
    loadAudioTracks(video.id)
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return "À l'instant"
    if (minutes < 60) return `${minutes}min`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  if (!video) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500">Chargement...</div></div>
  }

  const videoStatus = getVideoStatus(video)
  const myVote = currentUser ? video[userToVoteColumn[currentUser]] : null

  // Liste de navigation filtrée selon le contexte d'origine
  const navigationVideos = fromFilter !== 'all'
    ? allVideos.filter(v => getVideoStatus(v) === fromFilter)
    : allVideos
  const prevVideo = currentIndex > 0 ? navigationVideos[currentIndex - 1] : null
  const nextVideo = currentIndex < navigationVideos.length - 1 ? navigationVideos[currentIndex + 1] : null

  const navItems = [
    {id:'videos', label:'Vidéos'},
    {id:'comments', label:'Commentaires'},
    {id:'tasks', label:'Tâches'},
    {id:'ideas', label:'Idées'},
    {id:'contacts', label:'Contacts'},
    {id:'files', label:'Fichiers'},
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="md:hidden flex items-center gap-1 text-gray-600">
              <span className="text-xl">←</span>
            </button>
            <h1 className="text-xl font-bold text-blue-600 hidden md:block">SKROLL.TV</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{currentIndex + 1} / {navigationVideos.length}{fromFilter !== 'all' ? ` · ${fromFilter}` : ''}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => prevVideo && navigateToVideo(currentIndex - 1)}
              disabled={!prevVideo}
              className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-30"
            >←</button>
            <button
              onClick={() => nextVideo && navigateToVideo(currentIndex + 1)}
              disabled={!nextVideo}
              className="px-3 py-1 bg-gray-100 rounded-lg disabled:opacity-30"
            >→</button>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-100 flex">
        {navigationVideos.map((_, i) => (
          <div
            key={i}
            className={`flex-1 transition-colors ${i === currentIndex ? 'bg-blue-500' : i < currentIndex ? 'bg-blue-200' : 'bg-gray-100'}`}
          />
        ))}
      </div>

      <div className="flex">
        {/* Sidebar desktop — identique à la page principale */}
        <nav className="hidden md:flex flex-col w-48 bg-white border-r fixed left-0 top-[49px] bottom-0">
          <ul className="p-3 space-y-0.5 flex-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <button onClick={() => navigateToSection(item.id)} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-800 transition-colors">
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="p-3 border-t border-gray-100">
            <button onClick={() => navigateToSection('espace-perso')} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Espace perso
            </button>
          </div>
        </nav>

        {/* Contenu principal */}
        <div
          className="md:ml-48 flex-1 min-w-0"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transition: isAnimating ? 'transform 0.2s ease-out' : 'none'
          }}
        >
          {/* Vidéo */}
          <div className="relative bg-black">
            <div className="absolute top-3 right-3 z-10 bg-black/50 text-white px-2.5 py-1 rounded-full text-xs font-medium">
              {videoStatus}
            </div>
            <video src={video.file_url} controls className="w-full max-h-[60vh] object-contain" preload="metadata" />
          </div>

          <div className="md:hidden text-center py-2 text-gray-400 text-xs bg-gray-100">
            Swipez pour changer de vidéo
          </div>

          <div className="p-4 md:p-6">
            {/* Titre + type */}
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{video.title}</h1>
              <div className="flex flex-wrap gap-2 items-center">
                <select value={video.type_id || ''} onChange={(e) => updateVideoType(e.target.value)} className="border rounded-lg px-3 py-1 text-sm">
                  <option value="">Sans type</option>
                  {videoTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <span className="text-sm text-gray-400">par {video.uploaded_by} · {formatDate(video.uploaded_at)}</span>
              </div>
            </div>

            {/* Bloc validation : noms cliquables + prise en charge sur la même ligne */}
            <div className="mb-5 bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                {/* Noms cliquables — clic = toggle son propre vote */}
                {[
                  ['Bertrand', 'bertrand_vote', 'Bertrand'],
                  ['Sébastien', 'sebastien_vote', 'Sébastien'],
                  ['Pierre E.', 'pierreemmanuel_vote', 'Pierre Emmanuel']
                ].map(([label, col, fullName]) => {
                  const v = video[col]
                  const isMe = currentUser === fullName
                  return (
                    <button
                      key={col}
                      onClick={() => { if (isMe) castVote(cycleVote(v)) }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${voteStyle(v)} ${isMe ? 'cursor-pointer hover:opacity-75' : 'cursor-default'}`}
                      title={isMe ? 'Cliquer pour changer votre vote' : ''}
                    >
                      {label}{voteIcon(v)}
                    </button>
                  )
                })}

                {/* Séparateur */}
                <span className="text-gray-200 select-none mx-1">|</span>

                {/* Prise en charge */}
                <span className="text-xs text-gray-400 mr-1">En charge :</span>
                {video.referent ? (
                  <>
                    <span className="text-sm font-medium text-gray-700">{video.referent}</span>
                    {video.referent === currentUser && (
                      <button onClick={releaseReferent} className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded-lg ml-1">Libérer</button>
                    )}
                  </>
                ) : (
                  <button onClick={claimReferent} className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded-lg">Prendre</button>
                )}
              </div>

            </div>

            {/* 2 — Commentaires */}
            <div className="mb-5 bg-white rounded-2xl p-4 border border-gray-100">
              <h2 className="font-semibold text-base mb-3">Commentaires {comments.length > 0 && <span className="text-gray-400 font-normal text-sm">({comments.length})</span>}</h2>
              {comments.length > 0 && (
                <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${c.user_id === 'Bertrand' ? 'bg-blue-400' : c.user_id === 'Sébastien' ? 'bg-emerald-400' : 'bg-violet-400'}`}>
                        {c.user_id?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                          <span className="font-medium text-sm">{c.user_id}</span>
                          {c.assignee && <span className="text-xs bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">→ {c.assignee.split(' ')[0]}</span>}
                          <span className="text-gray-400 text-xs">{formatDate(c.created_at)}</span>
                        </div>
                        <p className="text-gray-700 text-sm">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mb-2">
                <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyPress={e => e.key === 'Enter' && addComment()} placeholder="Commenter..." className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300" />
                <button onClick={addComment} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm">Envoyer</button>
              </div>
              <div className="flex gap-1 items-center">
                <span className="text-xs text-gray-400">Assigner :</span>
                {['Bertrand', 'Sébastien', 'Pierre Emmanuel'].map(name => (
                  <button key={name} onClick={() => setCommentAssignee(commentAssignee === name ? '' : name)}
                    className={`text-xs px-2 py-0.5 rounded-full ${commentAssignee === name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* 3 — Pistes audio */}
            <div className="mb-5 bg-white rounded-2xl p-4 border border-gray-100">
              <h2 className="font-semibold text-base mb-3">Pistes audio {audioTracks.length > 0 && <span className="text-gray-400 font-normal text-sm">({audioTracks.length})</span>}</h2>
              {audioTracks.length > 0 && (
                <div className="space-y-2 mb-3">
                  {audioTracks.map(track => (
                    <div key={track.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <div>
                        <p className="font-medium text-sm">{track.name}</p>
                        <p className="text-xs text-gray-400">{track.track_type} · {track.uploaded_by}</p>
                      </div>
                      <div className="flex gap-3">
                        <a href={track.file_url} download className="text-gray-500 text-sm">⬇</a>
                        <button onClick={() => deleteAudioTrack(track.id)} className="text-gray-400 text-sm">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <label className="block">
                <div className="border border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-gray-400 transition-colors">
                  <input type="file" accept="audio/*,.wav,.mp3,.aac,.edl,.xml" onChange={handleAudioUpload} disabled={uploadingAudio} className="hidden" />
                  <span className="text-sm text-gray-400">{uploadingAudio ? 'Upload...' : '+ Ajouter une piste audio'}</span>
                </div>
              </label>
            </div>

            {/* Télécharger */}
            <div className="mb-4">
              <a href={video.file_url} download={`${video.title}.mp4`} className="inline-flex items-center gap-2 text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-xl hover:border-gray-400 transition-colors">
                ⬇ Télécharger la vidéo
              </a>
            </div>

            {/* Navigation mobile (bas de page) */}
            <div className="md:hidden flex justify-between text-sm text-gray-400 mt-2 pb-2">
              {prevVideo ? <button onClick={() => navigateToVideo(currentIndex - 1)} className="truncate max-w-[45%]">← {prevVideo.title}</button> : <span />}
              {nextVideo ? <button onClick={() => navigateToVideo(currentIndex + 1)} className="truncate max-w-[45%] text-right">{nextVideo.title} →</button> : <span />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
