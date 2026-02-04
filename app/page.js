'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null)
  const [currentSection, setCurrentSection] = useState('videos')
  const [videos, setVideos] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (currentUser) {
      loadVideos()
    }
  }, [currentUser])

  async function loadVideos() {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('uploaded_at', { ascending: false })
    
    if (data) setVideos(data)
  }

  async function handleVideoUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      // Upload via API Route (contourne CORS)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', currentUser)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        alert('Erreur upload: ' + data.error)
        setUploading(false)
        return
      }

      // Enregistrer dans la base de données
      const { error: dbError } = await supabase.from('videos').insert([{
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_url: data.url,
        uploaded_by: currentUser,
        status: 'En cours',
        bertrand_approved: false,
        sebastien_approved: false,
        pierreemmanuel_approved: false
      }])

      if (dbError) {
        alert('Erreur base de données: ' + dbError.message)
      }

      setUploading(false)
      loadVideos()

    } catch (error) {
      alert('Erreur: ' + error.message)
      setUploading(false)
    }
  }

  async function toggleApproval(videoId, userName) {
    const video = videos.find(v => v.id === videoId)
    if (!video) return

    const field = `${userName.toLowerCase().replace(' ', '')}_approved`
    const newValue = !video[field]

    await supabase
      .from('videos')
      .update({ [field]: newValue })
      .eq('id', videoId)

    loadVideos()
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">SKROLL.TV</h1>
          <p className="text-gray-600 mb-8 text-center">Choisissez votre profil</p>
          <div className="space-y-3">
            {['Bertrand', 'Sébastien', 'Pierre Emmanuel'].map((name) => (
              <button
                key={name}
                onClick={() => setCurrentUser(name)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">SKROLL.TV</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">{currentUser}</span>
            <button
              onClick={() => setCurrentUser(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <nav className="w-64 bg-white border-r border-gray-200 fixed left-0 top-[73px] bottom-0 overflow-y-auto">
          <ul className="p-4 space-y-2">
            {[
              { id: 'videos', icon: '🎬', label: 'Vidéos' },
              { id: 'tasks', icon: '✅', label: 'Tâches' },
              { id: 'ideas', icon: '💡', label: 'Idées' },
              { id: 'contacts', icon: '👥', label: 'Contacts' }
            ].map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    currentSection === item.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="ml-64 p-8 w-full">
          {currentSection === 'videos' && (
            <div>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Vidéos</h2>
                <p className="text-gray-600">Uploadez et validez vos shorts collectivement</p>
              </div>

              <label className="block mb-8 cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-12 text-center bg-white transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <div className="text-5xl mb-4">📤</div>
                  <div className="text-lg font-medium text-gray-700 mb-2">
                    {uploading ? 'Upload en cours...' : 'Cliquez ou glissez une vidéo'}
                  </div>
                  <div className="text-sm text-gray-500">MP4, MOV • Max 50 MB</div>
                </div>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video) => (
                  <div key={video.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <video src={video.file_url} controls className="w-full aspect-video bg-gray-900" />
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">{video.title}</h3>
                      <div className="flex flex-wrap gap-2">
                        {['Bertrand', 'Sébastien', 'PierreEmmanuel'].map((name) => {
                          const field = `${name.toLowerCase()}_approved`
                          const approved = video[field]
                          return (
                            <button
                              key={name}
                              onClick={() => toggleApproval(video.id, name)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                approved
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-600 hover:bg-blue-50'
                              }`}
                            >
                              {approved ? '✓' : '○'} {name === 'PierreEmmanuel' ? 'Pierre E.' : name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {videos.length === 0 && !uploading && (
                <div className="text-center py-12 text-gray-500">
                  Aucune vidéo pour le moment. Uploadez-en une !
                </div>
              )}
            </div>
          )}

          {currentSection === 'tasks' && (
            <div className="text-center py-12 text-gray-500">Section Tâches - À venir</div>
          )}
          {currentSection === 'ideas' && (
            <div className="text-center py-12 text-gray-500">Section Idées - À venir</div>
          )}
          {currentSection === 'contacts' && (
            <div className="text-center py-12 text-gray-500">Section Contacts - À venir</div>
          )}
        </main>
      </div>
    </div>
  )
}
