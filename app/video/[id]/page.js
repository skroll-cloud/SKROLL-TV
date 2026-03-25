'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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

export default function VideoPage() {
  const params = useParams()
  const router = useRouter()
  const videoId = params.id

  const [currentUser, setCurrentUser] = useState(null)
  const [video, setVideo] = useState(null)
  const [videoTypes, setVideoTypes] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [audioTracks, setAudioTracks] = useState([])
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('skroll_user')
    if (saved) {
      setCurrentUser(saved)
    } else {
      router.push('/')
    }
  }, [])

  useEffect(() => {
    if (currentUser && videoId) {
      loadVideo()
      loadVideoTypes()
      loadComments()
      loadAudioTracks()
    }
  }, [currentUser, videoId])

  async function loadVideo() {
    setLoading(true)
    const { data } = await supabase
      .from('videos')
      .select('*, video_types(name)')
      .eq('id', videoId)
      .single()
    if (data) setVideo(data)
    setLoading(false)
  }

  async function loadVideoTypes() {
    const { data } = await supabase.from('video_types').select('*').order('name')
    if (data) setVideoTypes(data)
  }

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true })
    if (data) setComments(data)
  }

  async function loadAudioTracks() {
    const { data } = await supabase
      .from('audio_tracks')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })
    if (data) setAudioTracks(data)
  }

  async function toggleMyApproval() {
    if (!video || !currentUser) return
    const field = userToColumn[currentUser]
    if (!field) return
    const newValue = !video[field]
    await supabase.from('videos').update({ [field]: newValue }).eq('id', videoId)
    loadVideo()
  }

  async function updateVideoType(typeId) {
    await supabase.from('videos').update({ type_id: typeId || null }).eq('id', videoId)
    loadVideo()
  }

  async function updateVideoTitle(title) {
    await supabase.from('videos').update({ title }).eq('id', videoId)
    loadVideo()
  }

  async function addComment() {
    if (!newComment.trim()) return
    await supabase.from('comments').insert([{
      video_id: videoId,
      user_id: currentUser,
      text: newComment
    }])
    setNewComment('')
    loadComments()
  }

  async function deleteComment(commentId) {
    if (!confirm('Supprimer ce commentaire ?')) return
    await supabase.from('comments').delete().eq('id', commentId)
    loadComments()
  }

  async function handleAudioUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadingAudio(true)

    const filePath = `audio/${videoId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { error } = await supabase.storage.from('files').upload(filePath, file)
    
    if (error) {
      alert(`Erreur: ${error.message}`)
      setUploadingAudio(false)
      return
    }

    const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath)
    
    await supabase.from('audio_tracks').insert([{
      video_id: videoId,
      name: file.name,
      file_url: urlData.publicUrl,
      track_type: file.name.toLowerCase().includes('edl') ? 'edl' : 'audio',
      uploaded_by: currentUser
    }])

    setUploadingAudio(false)
    loadAudioTracks()
    event.target.value = ''
  }

  async function deleteAudioTrack(trackId) {
    if (!confirm('Supprimer cette piste ?')) return
    await supabase.from('audio_tracks').delete().eq('id', trackId)
    loadAudioTracks()
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Vidéo introuvable</p>
          <button onClick={() => router.push('/')} className="text-blue-600 hover:underline">← Retour</button>
        </div>
      </div>
    )
  }

  const myField = userToColumn[currentUser]
  const myApproval = video[myField]
  const allApproved = video.bertrand_approved && video.sebastien_approved && video.pierreemmanuel_approved

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">← Retour</button>
            <h1 className="text-xl font-bold text-blue-600">SKROLL.TV</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">{currentUser}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Colonne principale : Vidéo */}
          <div className="lg:col-span-2">
            {/* Lecteur vidéo */}
            <div className="bg-black rounded-xl overflow-hidden mb-6">
              <video 
                src={video.file_url} 
                controls 
                className="w-full aspect-video"
                preload="metadata"
              />
            </div>

            {/* Infos vidéo */}
            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <input
                type="text"
                value={video.title}
                onChange={(e) => updateVideoTitle(e.target.value)}
                className="text-2xl font-bold text-gray-900 w-full border-0 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none pb-2 mb-4"
              />
              
              <div className="flex flex-wrap gap-4 items-center mb-4">
                <select 
                  value={video.type_id || ''} 
                  onChange={(e) => updateVideoType(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                >
                  <option value="">Type...</option>
                  {videoTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                
                <span className="text-sm text-gray-500">
                  Uploadé par {video.uploaded_by} • {video.duration || '?'}
                </span>
              </div>

              {/* Validations */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Validations</h3>
                <div className="flex flex-wrap gap-3">
                  {['Bertrand', 'Sébastien', 'Pierre Emmanuel'].map((name) => {
                    const field = userToColumn[name]
                    const approved = video[field]
                    const isMe = name === currentUser

                    return (
                      <button
                        key={name}
                        onClick={isMe ? toggleMyApproval : undefined}
                        disabled={!isMe}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                          ${approved 
                            ? 'bg-green-100 text-green-800 ring-2 ring-green-500' 
                            : 'bg-gray-100 text-gray-600'
                          }
                          ${isMe 
                            ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' 
                            : 'cursor-not-allowed opacity-70'
                          }
                        `}
                      >
                        {approved ? '✓' : '○'} 
                        {name === 'Pierre Emmanuel' ? 'Pierre E.' : name}
                        {isMe && <span className="text-xs">(vous)</span>}
                      </button>
                    )
                  })}
                </div>
                {allApproved && (
                  <div className="mt-3 bg-green-50 text-green-800 px-4 py-2 rounded-lg text-sm">
                    ✅ Vidéo validée par tous ! Prête pour export.
                  </div>
                )}
              </div>
            </div>

            {/* Commentaires */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">💬 Commentaires ({comments.length})</h3>
              
              {/* Liste des commentaires */}
              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucun commentaire pour l'instant</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-gray-900">{comment.user_id}</span>
                          <span className="text-xs text-gray-500 ml-2">{formatDate(comment.created_at)}</span>
                        </div>
                        {comment.user_id === currentUser && (
                          <button 
                            onClick={() => deleteComment(comment.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                      <p className="text-gray-700">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Nouveau commentaire */}
              <div className="flex gap-2 border-t pt-4">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addComment()}
                  placeholder="Ajouter un commentaire..."
                  className="flex-1 border rounded-lg px-4 py-2"
                />
                <button 
                  onClick={addComment}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Envoyer
                </button>
              </div>
            </div>
          </div>

          {/* Colonne latérale : Pistes audio */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <h3 className="font-semibold mb-4">🎵 Pistes audio & fichiers ({audioTracks.length})</h3>
              
              {/* Upload */}
              <label className="block mb-4 cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-lg p-4 text-center transition-colors">
                  <input
                    type="file"
                    accept="audio/*,.edl,.xml,.aaf"
                    onChange={handleAudioUpload}
                    disabled={uploadingAudio}
                    className="hidden"
                  />
                  <div className="text-2xl mb-1">{uploadingAudio ? '⏳' : '📤'}</div>
                  <div className="text-sm text-gray-600">
                    {uploadingAudio ? 'Upload en cours...' : 'Ajouter une piste'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">WAV, MP3, AAC, EDL, XML...</div>
                </div>
              </label>

              {/* Liste des pistes */}
              <div className="space-y-3">
                {audioTracks.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Aucune piste audio</p>
                ) : (
                  audioTracks.map(track => (
                    <div key={track.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {track.track_type === 'edl' ? '📋' : '🎵'}
                            </span>
                            <p className="font-medium text-sm truncate">{track.name}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            par {track.uploaded_by} • {formatDate(track.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <a
                            href={track.file_url}
                            download
                            className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 bg-blue-50 rounded"
                          >
                            ⬇
                          </a>
                          <button
                            onClick={() => deleteAudioTrack(track.id)}
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1 bg-red-50 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      
                      {/* Lecteur audio si c'est un fichier audio */}
                      {track.track_type === 'audio' && (
                        <audio 
                          src={track.file_url} 
                          controls 
                          className="w-full mt-2 h-8"
                          preload="metadata"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Actions groupées */}
              {audioTracks.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => {
                      audioTracks.forEach(track => {
                        const a = document.createElement('a')
                        a.href = track.file_url
                        a.download = track.name
                        a.click()
                      })
                    }}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm"
                  >
                    ⬇ Télécharger toutes les pistes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
