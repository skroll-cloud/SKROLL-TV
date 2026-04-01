'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

export default function Home() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [currentSection, setCurrentSection] = useState('videos')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  const [videos, setVideos] = useState([])
  const [videoTypes, setVideoTypes] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [filterType, setFilterType] = useState('all')
  const [filterValidation, setFilterValidation] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [searchQuery, setSearchQuery] = useState('')
  const [newTypeName, setNewTypeName] = useState('')
  const [selectedVideos, setSelectedVideos] = useState(new Set())
  const [commentCounts, setCommentCounts] = useState({})
  const [audioCounts, setAudioCounts] = useState({})
  const [expandedComments, setExpandedComments] = useState(null)
  const [videoComments, setVideoComments] = useState({})
  const [newComment, setNewComment] = useState('')
  const [allComments, setAllComments] = useState([])
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [latestCommentByVideo, setLatestCommentByVideo] = useState({})
  
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState({ name: '', description: '', assignee: '', deadline: '', folder_name: 'Production' })
  const taskFolders = ['Production', 'Visual Identity', 'Communication', 'Admin', 'Autre']
  
  const [ideas, setIdeas] = useState([])
  const [newIdea, setNewIdea] = useState({ title: '', description: '', tags: '' })
  
  const [contacts, setContacts] = useState([])
  const [newContact, setNewContact] = useState({ name: '', type: 'Journaliste', contact: '', status: 'À contacter', notes: '' })
  const contactTypes = ['Journaliste', 'Partenaire', 'Influenceur', 'Autre']
  const contactStatuses = ['À contacter', 'Contacté', 'En discussion', 'Partenaire', 'Refusé']
  
  const [sharedFiles, setSharedFiles] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)

  useEffect(() => { 
    const saved = localStorage.getItem('skroll_user')
    if (saved) setCurrentUser(saved) 
  }, [])
  
  useEffect(() => { 
    if (currentUser) { 
      localStorage.setItem('skroll_user', currentUser)
      loadVideos()
      loadVideoTypes()
      loadTasks()
      loadIdeas()
      loadContacts()
      loadSharedFiles()
      loadCommentCounts()
      loadAudioCounts()
      loadAllComments()
    } 
  }, [currentUser])

  async function handleLogin(userName) {
    const { data } = await supabase.from('users').select('*').eq('name', userName).eq('password', password).single()
    if (data) { setCurrentUser(userName); setLoginError(''); setPassword('') } 
    else { setLoginError('Mot de passe incorrect') }
  }
  
  function handleLogout() { 
    localStorage.removeItem('skroll_user')
    setCurrentUser(null) 
  }
  
  async function handleChangePassword() {
    if (newPassword !== confirmPassword) { setPasswordMessage('Les mots de passe ne correspondent pas'); return }
    if (newPassword.length < 4) { setPasswordMessage('Minimum 4 caractères'); return }
    setIsChangingPassword(true)
    const { error } = await supabase.from('users').update({ password: newPassword }).eq('name', currentUser)
    setIsChangingPassword(false)
    if (error) { setPasswordMessage('Erreur: ' + error.message) } 
    else { 
      setPasswordMessage('✓ Mot de passe changé !') 
      setTimeout(() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); setPasswordMessage('') }, 1500) 
    }
  }

  async function loadVideos() { 
    const { data } = await supabase.from('videos').select('*, video_types(name)').order('uploaded_at', { ascending: false })
    if (data) setVideos(data) 
  }
  
  async function loadVideoTypes() { 
    const { data } = await supabase.from('video_types').select('*').order('name')
    if (data) setVideoTypes(data) 
  }
  
  async function loadCommentCounts() {
    const { data } = await supabase.from('comments').select('video_id, created_at').order('created_at', { ascending: false })
    if (data) {
      const counts = {}
      const latest = {}
      data.forEach(c => { 
        counts[c.video_id] = (counts[c.video_id] || 0) + 1
        if (!latest[c.video_id]) latest[c.video_id] = c.created_at
      })
      setCommentCounts(counts)
      setLatestCommentByVideo(latest)
    }
  }
  
  async function loadAudioCounts() {
    const { data } = await supabase.from('audio_tracks').select('video_id')
    if (data) {
      const counts = {}
      data.forEach(a => { counts[a.video_id] = (counts[a.video_id] || 0) + 1 })
      setAudioCounts(counts)
    }
  }

  async function loadAllComments() {
    const { data } = await supabase.from('comments').select('*, videos(title)').order('created_at', { ascending: false })
    if (data) setAllComments(data)
  }

  async function loadVideoComments(videoId) {
    const { data } = await supabase.from('comments').select('*').eq('video_id', videoId).order('created_at', { ascending: true })
    if (data) setVideoComments(prev => ({ ...prev, [videoId]: data }))
  }

  async function addQuickComment(videoId) {
    if (!newComment.trim()) return
    await supabase.from('comments').insert([{ video_id: videoId, user_id: currentUser, text: newComment }])
    setNewComment('')
    loadVideoComments(videoId)
    loadCommentCounts()
    loadAllComments()
  }

  async function addReply(videoId) {
    if (!replyText.trim()) return
    await supabase.from('comments').insert([{ video_id: videoId, user_id: currentUser, text: replyText }])
    setReplyText('')
    setReplyTo(null)
    loadAllComments()
    loadCommentCounts()
  }

  function toggleComments(videoId) {
    if (expandedComments === videoId) {
      setExpandedComments(null)
    } else {
      setExpandedComments(videoId)
      loadVideoComments(videoId)
    }
  }
  
  async function handleVideoUpload(event) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    setUploadProgress(0)
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgress(Math.round(((i + 1) / files.length) * 100))
      setUploadStatus(`Upload ${i + 1}/${files.length}: ${file.name}`)
      
      try {
        const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { error } = await supabase.storage.from('Videos').upload(filePath, file, { cacheControl: '3600', upsert: false })
        if (error) { alert(`Erreur: ${error.message}`); continue }
        
        const { data: urlData } = supabase.storage.from('Videos').getPublicUrl(filePath)
        await supabase.from('videos').insert([{ 
          title: file.name.replace(/\.[^/.]+$/, ''), 
          file_url: urlData.publicUrl, 
          uploaded_by: currentUser, 
          status: 'En cours', 
          bertrand_approved: false, 
          sebastien_approved: false, 
          pierreemmanuel_approved: false 
        }])
      } catch (error) { alert(`Erreur: ${error.message}`) }
    }
    
    setUploadProgress(100)
    setUploadStatus('Terminé !')
    setUploading(false)
    loadVideos()
    setTimeout(() => { setUploadProgress(0); setUploadStatus('') }, 2000)
    event.target.value = ''
  }
  
  async function toggleMyApproval(videoId) { 
    const video = videos.find(v => v.id === videoId)
    if (!video || !currentUser) return
    const field = userToColumn[currentUser]
    if (!field) return
    const newValue = !video[field]
    await supabase.from('videos').update({ [field]: newValue }).eq('id', videoId)
    loadVideos() 
  }
  
  async function updateVideoType(videoId, typeId) { 
    await supabase.from('videos').update({ type_id: typeId || null }).eq('id', videoId)
    loadVideos() 
  }
  
  async function deleteVideo(videoId) { 
    if (!confirm('Supprimer cette vidéo ?')) return
    await supabase.from('videos').delete().eq('id', videoId)
    loadVideos() 
  }
  
  async function addVideoType() { 
    if (!newTypeName.trim()) return
    await supabase.from('video_types').insert([{ name: newTypeName.trim() }])
    setNewTypeName('')
    loadVideoTypes() 
  }
  
  async function deleteVideoType(typeId) { 
    if (!confirm('Supprimer ce type ?')) return
    await supabase.from('video_types').delete().eq('id', typeId)
    loadVideoTypes() 
  }

  function toggleVideoSelection(videoId) {
    const newSelection = new Set(selectedVideos)
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId)
    } else {
      newSelection.add(videoId)
    }
    setSelectedVideos(newSelection)
  }
  
  function selectAllVideos() {
    if (selectedVideos.size === filteredVideos.length) {
      setSelectedVideos(new Set())
    } else {
      setSelectedVideos(new Set(filteredVideos.map(v => v.id)))
    }
  }
  
  async function downloadSelectedVideos() {
    if (selectedVideos.size === 0) return
    const selectedVideosList = videos.filter(v => selectedVideos.has(v.id))
    const videoIds = Array.from(selectedVideos)
    const { data: audioTracks } = await supabase.from('audio_tracks').select('*').in('video_id', videoIds)
    
    for (const video of selectedVideosList) {
      const a = document.createElement('a')
      a.href = video.file_url
      a.download = `${video.title}.mp4`
      a.click()
      await new Promise(r => setTimeout(r, 500))
    }
    
    if (audioTracks && audioTracks.length > 0) {
      for (const track of audioTracks) {
        const a = document.createElement('a')
        a.href = track.file_url
        a.download = track.name
        a.click()
        await new Promise(r => setTimeout(r, 500))
      }
    }
    
    alert(`${selectedVideosList.length} vidéo(s) et ${audioTracks?.length || 0} piste(s) audio téléchargées !`)
  }

  async function loadTasks() { 
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (data) setTasks(data) 
  }
  async function createTask() { 
    if (!newTask.name.trim()) return
    await supabase.from('tasks').insert([{ ...newTask, status: 'À faire' }])
    setNewTask({ name: '', description: '', assignee: '', deadline: '', folder_name: 'Production' })
    loadTasks() 
  }
  async function deleteTask(taskId) { 
    if (!confirm('Supprimer cette tâche ?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    loadTasks() 
  }
  async function updateTaskStatus(taskId, status) { 
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    loadTasks() 
  }

  async function loadIdeas() { 
    const { data } = await supabase.from('ideas').select('*').order('created_at', { ascending: false })
    if (data) setIdeas(data) 
  }
  async function createIdea() { 
    if (!newIdea.title.trim()) return
    const tags = newIdea.tags.split(',').map(t => t.trim()).filter(t => t)
    await supabase.from('ideas').insert([{ ...newIdea, tags, status: 'Nouvelle' }])
    setNewIdea({ title: '', description: '', tags: '' })
    loadIdeas() 
  }
  async function updateIdea(idea) { 
    await supabase.from('ideas').update(idea).eq('id', idea.id)
    loadIdeas() 
  }
  async function deleteIdea(ideaId) { 
    if (!confirm('Supprimer cette idée ?')) return
    await supabase.from('ideas').delete().eq('id', ideaId)
    loadIdeas() 
  }

  async function loadContacts() { 
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
    if (data) setContacts(data) 
  }
  async function createContact() { 
    if (!newContact.name.trim()) return
    await supabase.from('contacts').insert([newContact])
    setNewContact({ name: '', type: 'Journaliste', contact: '', status: 'À contacter', notes: '' })
    loadContacts() 
  }
  async function updateContact(contact) { 
    await supabase.from('contacts').update(contact).eq('id', contact.id)
    loadContacts() 
  }
  async function deleteContact(contactId) { 
    if (!confirm('Supprimer ce contact ?')) return
    await supabase.from('contacts').delete().eq('id', contactId)
    loadContacts() 
  }

  async function loadSharedFiles() { 
    const { data } = await supabase.from('shared_files').select('*').order('uploaded_at', { ascending: false })
    if (data) setSharedFiles(data) 
  }
  async function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { error } = await supabase.storage.from('files').upload(filePath, file)
    if (error) { alert(`Erreur: ${error.message}`); setUploadingFile(false); return }
    const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath)
    await supabase.from('shared_files').insert([{ name: file.name, file_url: urlData.publicUrl, file_type: file.type, uploaded_by: currentUser }])
    setUploadingFile(false)
    loadSharedFiles()
    event.target.value = ''
  }
  async function deleteFile(fileId) { 
    if (!confirm('Supprimer ce fichier ?')) return
    await supabase.from('shared_files').delete().eq('id', fileId)
    loadSharedFiles() 
  }

  function formatDate(dateString) {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return "À l'instant"
    if (minutes < 60) return `Il y a ${minutes}min`
    if (hours < 24) return `Il y a ${hours}h`
    if (days < 7) return `Il y a ${days}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  function getFilteredVideos() {
    let filtered = videos
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(v => 
        v.title.toLowerCase().includes(query) ||
        v.video_types?.name?.toLowerCase().includes(query) ||
        v.uploaded_by?.toLowerCase().includes(query)
      )
    }
    
    if (filterType !== 'all') filtered = filtered.filter(v => v.type_id === filterType)
    if (filterValidation === 'to_validate' && currentUser) { 
      const f = userToColumn[currentUser]
      filtered = filtered.filter(v => !v[f]) 
    }
    else if (filterValidation === 'validated' && currentUser) { 
      const f = userToColumn[currentUser]
      filtered = filtered.filter(v => v[f]) 
    }
    else if (filterValidation === 'all_validated') {
      filtered = filtered.filter(v => v.bertrand_approved && v.sebastien_approved && v.pierreemmanuel_approved)
    }

    // Tri
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
    } else if (sortBy === 'recent_comments') {
      filtered.sort((a, b) => {
        const aDate = latestCommentByVideo[a.id] ? new Date(latestCommentByVideo[a.id]) : new Date(0)
        const bDate = latestCommentByVideo[b.id] ? new Date(latestCommentByVideo[b.id]) : new Date(0)
        return bDate - aDate
      })
    } else if (sortBy === 'most_comments') {
      filtered.sort((a, b) => (commentCounts[b.id] || 0) - (commentCounts[a.id] || 0))
    }

    return filtered
  }
  
  const filteredVideos = getFilteredVideos()
  const toValidateCount = currentUser ? videos.filter(v => { const f = userToColumn[currentUser]; return f && !v[f] }).length : 0
  const allValidatedVideos = videos.filter(v => v.bertrand_approved && v.sebastien_approved && v.pierreemmanuel_approved)

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">SKROLL.TV</h1>
          <p className="text-gray-600 mb-8 text-center">Connectez-vous</p>
          {loginError && <p className="text-red-500 text-center mb-4">{loginError}</p>}
          <div className="relative mb-4">
            <input type={showPassword ? "text" : "password"} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">{showPassword ? '🙈' : '👁'}</button>
          </div>
          <div className="space-y-3">
            {['Bertrand', 'Sébastien', 'Pierre Emmanuel'].map((name) => (
              <button key={name} onClick={() => handleLogin(name)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors">{name}</button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Changer le mot de passe</h3>
            <div className="relative mb-3">
              <input type={showNewPassword ? "text" : "password"} placeholder="Nouveau mot de passe" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 pr-10" />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showNewPassword ? '🙈' : '👁'}</button>
            </div>
            <input type={showNewPassword ? "text" : "password"} placeholder="Confirmer" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-3" />
            {passwordMessage && <p className={`text-sm mb-3 ${passwordMessage.includes('✓') ? 'text-green-600' : 'text-red-500'}`}>{passwordMessage}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowPasswordModal(false); setPasswordMessage(''); setNewPassword(''); setConfirmPassword('') }} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Annuler</button>
              <button onClick={handleChangePassword} disabled={isChangingPassword} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{isChangingPassword ? '...' : 'Changer'}</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">SKROLL.TV</h1>
          <div className="flex items-center gap-4">
            {toValidateCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{toValidateCount} à valider</span>}
            {allValidatedVideos.length > 0 && <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">{allValidatedVideos.length} validée{allValidatedVideos.length > 1 ? 's' : ''}</span>}
            <span className="text-gray-700 font-medium">{currentUser}</span>
            <button onClick={() => setShowPasswordModal(true)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">🔐</button>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="flex">
        <nav className="w-64 bg-white border-r border-gray-200 fixed left-0 top-[73px] bottom-0 overflow-y-auto">
          <ul className="p-4 space-y-2">
            {[
              {id:'videos', icon:'🎬', label:'Vidéos'},
              {id:'comments', icon:'💬', label:`Commentaires (${allComments.length})`},
              {id:'validated', icon:'✅', label:`Validées (${allValidatedVideos.length})`},
              {id:'tasks', icon:'📋', label:'Tâches'},
              {id:'ideas', icon:'💡', label:'Idées'},
              {id:'contacts', icon:'👥', label:'Contacts'},
              {id:'files', icon:'📁', label:'Fichiers'}
            ].map((item) => (
              <li key={item.id}>
                <button onClick={() => setCurrentSection(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${currentSection === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}>
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
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Vidéos</h2>
                  <p className="text-gray-600">{videos.length} vidéos • {filteredVideos.length} affichées</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setViewMode('grid')} className={`px-3 py-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Grille</button>
                  <button onClick={() => setViewMode('table')} className={`px-3 py-2 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Tableau</button>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="relative">
                  <input type="text" placeholder="🔍 Rechercher par titre, type, auteur..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 pl-12 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>}
                </div>
              </div>
              
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800"><strong>📹 Format optimal :</strong> MP4 H.264/H.265 • 1080p ou 720p • 8-12 Mbps • AAC 128kbps</p>
              </div>
              
              <div className="mb-6 flex flex-wrap gap-4 items-center">
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2">
                  <option value="all">Tous les types</option>
                  {videoTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={filterValidation} onChange={(e) => setFilterValidation(e.target.value)} className="border rounded-lg px-3 py-2">
                  <option value="all">Toutes les vidéos</option>
                  <option value="to_validate">🔴 À valider par moi</option>
                  <option value="validated">✅ Validées par moi</option>
                  <option value="all_validated">✅✅✅ Validées par tous</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border rounded-lg px-3 py-2">
                  <option value="recent">📅 Plus récentes</option>
                  <option value="recent_comments">💬 Commentaires récents</option>
                  <option value="most_comments">🔥 Plus commentées</option>
                </select>
                <div className="flex gap-2 items-center ml-auto">
                  <input type="text" placeholder="Nouveau type..." value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                  <button onClick={addVideoType} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm">+ Ajouter</button>
                </div>
              </div>
              
              <div className="mb-6 flex flex-wrap gap-2">
                {videoTypes.map(t => (
                  <span key={t.id} className="inline-flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm">
                    {t.name}<button onClick={() => deleteVideoType(t.id)} className="text-red-500 hover:text-red-700 ml-1">×</button>
                  </span>
                ))}
              </div>
              
              {selectedVideos.size > 0 && (
                <div className="mb-6 bg-blue-100 border border-blue-300 rounded-lg p-4 flex items-center justify-between">
                  <span className="font-medium text-blue-800">{selectedVideos.size} vidéo{selectedVideos.size > 1 ? 's' : ''} sélectionnée{selectedVideos.size > 1 ? 's' : ''}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedVideos(new Set())} className="px-3 py-1 bg-white text-gray-700 rounded-lg text-sm">Désélectionner</button>
                    <button onClick={downloadSelectedVideos} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">⬇ Télécharger</button>
                  </div>
                </div>
              )}
              
              <label className="block mb-8 cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-8 text-center bg-white transition-colors">
                  <input type="file" accept="video/*" multiple onChange={handleVideoUpload} disabled={uploading} className="hidden" />
                  <div className="text-4xl mb-2">📤</div>
                  <div className="text-lg font-medium text-gray-700">{uploading ? uploadStatus : 'Cliquez pour uploader'}</div>
                  <div className="text-sm text-gray-500">MP4, MOV - Sélection multiple</div>
                  {uploading && <div className="mt-4 max-w-md mx-auto"><div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-blue-600 h-3 rounded-full" style={{width:`${uploadProgress}%`}}></div></div></div>}
                </div>
              </label>
              
              {filteredVideos.length > 0 && (
                <div className="mb-4 flex items-center gap-2">
                  <input type="checkbox" checked={selectedVideos.size === filteredVideos.length} onChange={selectAllVideos} className="w-5 h-5 rounded" />
                  <span className="text-sm text-gray-600">Tout sélectionner</span>
                </div>
              )}
              
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVideos.map((video) => {
                    const myField = userToColumn[currentUser]
                    const myApproval = video[myField]
                    const allApproved = video.bertrand_approved && video.sebastien_approved && video.pierreemmanuel_approved
                    const commentCount = commentCounts[video.id] || 0
                    const audioCount = audioCounts[video.id] || 0
                    const isExpanded = expandedComments === video.id
                    const comments = videoComments[video.id] || []
                    
                    return (
                      <div key={video.id} className={`bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${selectedVideos.has(video.id) ? 'ring-2 ring-blue-500' : ''} ${allApproved ? 'ring-2 ring-green-500' : ''}`}>
                        <div className="relative">
                          <div className="absolute top-2 left-2 z-10">
                            <input type="checkbox" checked={selectedVideos.has(video.id)} onChange={() => toggleVideoSelection(video.id)} className="w-5 h-5 rounded bg-white/80" />
                          </div>
                          {allApproved && <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-xs px-2 py-1 rounded-full">✅</div>}
                          <div className="cursor-pointer" onClick={() => router.push(`/video/${video.id}`)}>
                            <video src={video.file_url} preload="metadata" className="w-full aspect-video bg-gray-900" muted />
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">{video.title}</h3>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {video.video_types?.name && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{video.video_types.name}</span>}
                            <button onClick={() => toggleComments(video.id)} className={`text-xs px-2 py-1 rounded transition-colors ${commentCount > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                              💬 {commentCount > 0 ? commentCount : 'Commenter'}
                            </button>
                            {audioCount > 0 && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">🎵 {audioCount}</span>}
                          </div>
                          
                          <button onClick={() => toggleMyApproval(video.id)} className={`w-full mb-3 px-4 py-2 rounded-lg text-sm font-medium ${myApproval ? 'bg-green-100 text-green-800 ring-2 ring-green-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {myApproval ? '✓ Validée par moi' : '○ Valider'}
                          </button>
                          
                          <div className="flex gap-2 mb-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${video.bertrand_approved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>B{video.bertrand_approved ? '✓' : ''}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${video.sebastien_approved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>S{video.sebastien_approved ? '✓' : ''}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${video.pierreemmanuel_approved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>P{video.pierreemmanuel_approved ? '✓' : ''}</span>
                          </div>
                          
                          {isExpanded && (
                            <div className="border-t pt-3 mt-3">
                              {comments.length > 0 && (
                                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                                  {comments.map(c => (
                                    <div key={c.id} className="bg-gray-50 rounded p-2 text-sm">
                                      <span className="font-medium">{c.user_id}</span>
                                      <span className="text-gray-400 text-xs ml-2">{formatDate(c.created_at)}</span>
                                      <p className="text-gray-600">{c.text}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addQuickComment(video.id)} placeholder="Commenter..." className="flex-1 text-sm border rounded-lg px-3 py-2" />
                                <button onClick={() => addQuickComment(video.id)} className="bg-blue-600 text-white px-3 py-2 rounded-lg">↑</button>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2 text-xs mt-3 pt-3 border-t">
                            <button onClick={() => router.push(`/video/${video.id}`)} className="text-blue-600 hover:underline">📝 Détails</button>
                            <a href={video.file_url} download className="text-green-600 hover:underline">⬇ DL</a>
                            <button onClick={() => deleteVideo(video.id)} className="text-red-600 hover:underline ml-auto">🗑</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {viewMode === 'table' && (
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left w-10"><input type="checkbox" checked={selectedVideos.size === filteredVideos.length} onChange={selectAllVideos} /></th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Titre</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">💬</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Validations</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Ma validation</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredVideos.map((video) => {
                        const myField = userToColumn[currentUser]
                        const myApproval = video[myField]
                        return (
                          <tr key={video.id} className={`hover:bg-gray-50 ${selectedVideos.has(video.id) ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3"><input type="checkbox" checked={selectedVideos.has(video.id)} onChange={() => toggleVideoSelection(video.id)} /></td>
                            <td className="px-4 py-3 text-sm"><button onClick={() => router.push(`/video/${video.id}`)} className="text-blue-600 hover:underline">{video.title}</button></td>
                            <td className="px-4 py-3 text-sm">{video.video_types?.name || '-'}</td>
                            <td className="px-4 py-3 text-sm">{commentCounts[video.id] || 0}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={video.bertrand_approved ? 'text-green-600' : 'text-gray-400'}>B </span>
                              <span className={video.sebastien_approved ? 'text-green-600' : 'text-gray-400'}>S </span>
                              <span className={video.pierreemmanuel_approved ? 'text-green-600' : 'text-gray-400'}>P</span>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleMyApproval(video.id)} className={`px-3 py-1 rounded text-xs ${myApproval ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                                {myApproval ? '✓' : 'Valider'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm space-x-2">
                              <button onClick={() => router.push(`/video/${video.id}`)} className="text-blue-600">Ouvrir</button>
                              <a href={video.file_url} download className="text-green-600">DL</a>
                              <button onClick={() => deleteVideo(video.id)} className="text-red-600">Suppr</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              {filteredVideos.length === 0 && <div className="text-center py-12 text-gray-500">{searchQuery ? `Aucun résultat pour "${searchQuery}"` : 'Aucune vidéo'}</div>}
            </div>
          )}

          {currentSection === 'comments' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Commentaires</h2>
              <p className="text-gray-600 mb-6">{allComments.length} commentaire{allComments.length > 1 ? 's' : ''}</p>
              
              {allComments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Aucun commentaire</div>
              ) : (
                <div className="space-y-4">
                  {allComments.map(comment => (
                    <div key={comment.id} className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{comment.user_id}</span>
                            <span className="text-gray-400 text-sm">•</span>
                            <span className="text-gray-500 text-sm">{formatDate(comment.created_at)}</span>
                          </div>
                          <p className="text-gray-700 mb-2">{comment.text}</p>
                          <button 
                            onClick={() => router.push(`/video/${comment.video_id}`)}
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            🎬 {comment.videos?.title || 'Voir la vidéo'}
                          </button>
                          
                          {replyTo === comment.id ? (
                            <div className="mt-3 flex gap-2">
                              <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addReply(comment.video_id)}
                                placeholder="Votre réponse..."
                                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                                autoFocus
                              />
                              <button onClick={() => addReply(comment.video_id)} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">Répondre</button>
                              <button onClick={() => { setReplyTo(null); setReplyText('') }} className="text-gray-500 px-3 py-2">Annuler</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setReplyTo(comment.id)}
                              className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                            >
                              ↩ Répondre
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentSection === 'validated' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Vidéos validées</h2>
              <p className="text-gray-600 mb-6">Prêtes pour export</p>
              {allValidatedVideos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Aucune vidéo validée par tous</div>
              ) : (
                <>
                  <button onClick={async () => { for (const v of allValidatedVideos) { const a = document.createElement('a'); a.href = v.file_url; a.download = `${v.title}.mp4`; a.click(); await new Promise(r => setTimeout(r, 500)) }}} className="mb-6 bg-green-600 text-white px-4 py-2 rounded-lg">⬇ Tout télécharger</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allValidatedVideos.map((video) => (
                      <div key={video.id} className="bg-white rounded-xl overflow-hidden shadow-sm border-2 border-green-500 cursor-pointer" onClick={() => router.push(`/video/${video.id}`)}>
                        <div className="bg-green-500 text-white text-center py-1 text-sm">✅ Validée</div>
                        <video src={video.file_url} preload="metadata" className="w-full aspect-video bg-gray-900" muted />
                        <div className="p-4">
                          <h3 className="font-semibold">{video.title}</h3>
                          <p className="text-sm text-gray-500">{video.video_types?.name || 'Sans type'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {currentSection === 'tasks' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Tâches</h2>
              <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input type="text" placeholder="Nom" value={newTask.name} onChange={(e) => setNewTask({...newTask, name: e.target.value})} className="border rounded-lg px-3 py-2" />
                  <select value={newTask.folder_name} onChange={(e) => setNewTask({...newTask, folder_name: e.target.value})} className="border rounded-lg px-3 py-2">{taskFolders.map(f => <option key={f}>{f}</option>)}</select>
                  <select value={newTask.assignee} onChange={(e) => setNewTask({...newTask, assignee: e.target.value})} className="border rounded-lg px-3 py-2"><option value="">Assigné à...</option><option>Bertrand</option><option>Sébastien</option><option>Pierre Emmanuel</option></select>
                  <input type="date" value={newTask.deadline} onChange={(e) => setNewTask({...newTask, deadline: e.target.value})} className="border rounded-lg px-3 py-2" />
                </div>
                <textarea placeholder="Description..." value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-4" rows={2} />
                <button onClick={createTask} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg">Créer</button>
              </div>
              {taskFolders.map(folder => { 
                const folderTasks = tasks.filter(t => t.folder_name === folder)
                if (folderTasks.length === 0) return null
                return (
                  <div key={folder} className="mb-8">
                    <h3 className="font-semibold text-lg mb-4">{folder}</h3>
                    <div className="space-y-3">
                      {folderTasks.map(task => (
                        <div key={task.id} className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4">
                          <select value={task.status} onChange={(e) => updateTaskStatus(task.id, e.target.value)} className={`text-xs px-2 py-1 rounded ${task.status === 'Terminée' ? 'bg-green-100 text-green-800' : task.status === 'En cours' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}`}>
                            <option>À faire</option><option>En cours</option><option>Terminée</option>
                          </select>
                          <div className="flex-1"><p className="font-medium">{task.name}</p>{task.description && <p className="text-sm text-gray-500">{task.description}</p>}</div>
                          {task.assignee && <span className="text-sm text-gray-600">{task.assignee}</span>}
                          {task.deadline && <span className="text-sm text-gray-500">{task.deadline}</span>}
                          <button onClick={() => deleteTask(task.id)} className="text-red-500">🗑</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {currentSection === 'ideas' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Idées</h2>
              <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
                <input type="text" placeholder="Titre" value={newIdea.title} onChange={(e) => setNewIdea({...newIdea, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 mb-4" />
                <textarea placeholder="Description..." value={newIdea.description} onChange={(e) => setNewIdea({...newIdea, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 mb-4" rows={3} />
                <input type="text" placeholder="Tags (virgules)" value={newIdea.tags} onChange={(e) => setNewIdea({...newIdea, tags: e.target.value})} className="w-full border rounded-lg px-3 py-2 mb-4" />
                <button onClick={createIdea} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Ajouter</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ideas.map(idea => (
                  <div key={idea.id} className="bg-white rounded-xl p-6 shadow-sm">
                    <h3 className="font-semibold text-lg mb-2">{idea.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{idea.description}</p>
                    {idea.tags && <div className="flex flex-wrap gap-2 mb-4">{idea.tags.map((tag, i) => <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{tag}</span>)}</div>}
                    <div className="flex justify-between">
                      <select value={idea.status} onChange={(e) => updateIdea({...idea, status: e.target.value})} className="text-xs border rounded px-2 py-1"><option>Nouvelle</option><option>En réflexion</option><option>Validée</option><option>Rejetée</option></select>
                      <button onClick={() => deleteIdea(idea.id)} className="text-red-500 text-sm">Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentSection === 'contacts' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Contacts</h2>
              <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input type="text" placeholder="Nom" value={newContact.name} onChange={(e) => setNewContact({...newContact, name: e.target.value})} className="border rounded-lg px-3 py-2" />
                  <select value={newContact.type} onChange={(e) => setNewContact({...newContact, type: e.target.value})} className="border rounded-lg px-3 py-2">{contactTypes.map(t => <option key={t}>{t}</option>)}</select>
                  <input type="text" placeholder="Email/Tel" value={newContact.contact} onChange={(e) => setNewContact({...newContact, contact: e.target.value})} className="border rounded-lg px-3 py-2" />
                  <select value={newContact.status} onChange={(e) => setNewContact({...newContact, status: e.target.value})} className="border rounded-lg px-3 py-2">{contactStatuses.map(s => <option key={s}>{s}</option>)}</select>
                </div>
                <textarea placeholder="Notes..." value={newContact.notes} onChange={(e) => setNewContact({...newContact, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-4" rows={2} />
                <button onClick={createContact} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg">Ajouter</button>
              </div>
              <div className="bg-white rounded-xl shadow overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-sm">Nom</th><th className="px-4 py-3 text-left text-sm">Type</th><th className="px-4 py-3 text-left text-sm">Contact</th><th className="px-4 py-3 text-left text-sm">Statut</th><th className="px-4 py-3 text-left text-sm">Notes</th><th className="px-4 py-3 text-left text-sm">Actions</th></tr></thead>
                  <tbody className="divide-y">
                    {contacts.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-sm">{c.type}</td>
                        <td className="px-4 py-3 text-sm">{c.contact}</td>
                        <td className="px-4 py-3"><select value={c.status} onChange={(e) => updateContact({...c, status: e.target.value})} className="text-xs border rounded px-2 py-1">{contactStatuses.map(s => <option key={s}>{s}</option>)}</select></td>
                        <td className="px-4 py-3 text-sm text-gray-500">{c.notes}</td>
                        <td className="px-4 py-3"><button onClick={() => deleteContact(c.id)} className="text-red-600 text-sm">Supprimer</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentSection === 'files' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Fichiers</h2>
              <label className="block mb-8 cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-8 text-center bg-white">
                  <input type="file" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
                  <div className="text-4xl mb-2">📎</div>
                  <div className="text-lg font-medium">{uploadingFile ? 'Upload...' : 'Uploader'}</div>
                </div>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {sharedFiles.map(f => (
                  <div key={f.id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-3xl mb-2">{f.file_type?.includes('image') ? '🖼' : f.file_type?.includes('pdf') ? '📄' : '📎'}</div>
                    <p className="font-medium text-sm truncate">{f.name}</p>
                    <p className="text-xs text-gray-500 mb-3">{f.uploaded_by}</p>
                    <div className="flex gap-2">
                      <a href={f.file_url} target="_blank" className="text-xs text-blue-600">Ouvrir</a>
                      <button onClick={() => deleteFile(f.id)} className="text-xs text-red-600">Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
