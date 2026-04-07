'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const [videos, setVideos] = useState([])
  const [videoTypes, setVideoTypes] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [mobileViewMode, setMobileViewMode] = useState('swipe')
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
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
  
  // Swipe state
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const swipeContainerRef = useRef(null)
  
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

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Swipe handlers
  const minSwipeDistance = 50
  
  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }
  
  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe && currentVideoIndex < filteredVideos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1)
    }
    if (isRightSwipe && currentVideoIndex > 0) {
      setCurrentVideoIndex(prev => prev - 1)
    }
  }

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
  
  async function deleteVideo(videoId) { 
    if (!confirm('Supprimer cette vidéo ?')) return
    await supabase.from('videos').delete().eq('id', videoId)
    loadVideos() 
  }

  async function updateVideoType(videoId, typeId) {
    await supabase.from('videos').update({ type_id: typeId || null }).eq('id', videoId)
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
    if (newSelection.has(videoId)) newSelection.delete(videoId)
    else newSelection.add(videoId)
    setSelectedVideos(newSelection)
  }
  
  function selectAllVideos() {
    if (selectedVideos.size === filteredVideos.length) setSelectedVideos(new Set())
    else setSelectedVideos(new Set(filteredVideos.map(v => v.id)))
  }
  
  async function downloadSelectedVideos() {
    for (const videoId of selectedVideos) {
      const video = videos.find(v => v.id === videoId)
      if (video) window.open(video.file_url, '_blank')
    }
  }

  async function loadTasks() { const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }); if (data) setTasks(data) }
  async function createTask() { if (!newTask.name.trim()) return; await supabase.from('tasks').insert([{ ...newTask, status: 'À faire' }]); setNewTask({ name: '', description: '', assignee: '', deadline: '', folder_name: 'Production' }); loadTasks() }
  async function deleteTask(taskId) { if (!confirm('Supprimer ?')) return; await supabase.from('tasks').delete().eq('id', taskId); loadTasks() }
  async function updateTaskStatus(taskId, status) { await supabase.from('tasks').update({ status }).eq('id', taskId); loadTasks() }

  async function loadIdeas() { const { data } = await supabase.from('ideas').select('*').order('created_at', { ascending: false }); if (data) setIdeas(data) }
  async function createIdea() { if (!newIdea.title.trim()) return; const tags = newIdea.tags.split(',').map(t => t.trim()).filter(t => t); await supabase.from('ideas').insert([{ ...newIdea, tags, status: 'Nouvelle' }]); setNewIdea({ title: '', description: '', tags: '' }); loadIdeas() }
  async function updateIdea(idea) { await supabase.from('ideas').update(idea).eq('id', idea.id); loadIdeas() }
  async function deleteIdea(ideaId) { if (!confirm('Supprimer ?')) return; await supabase.from('ideas').delete().eq('id', ideaId); loadIdeas() }

  async function loadContacts() { const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false }); if (data) setContacts(data) }
  async function createContact() { if (!newContact.name.trim()) return; await supabase.from('contacts').insert([newContact]); setNewContact({ name: '', type: 'Journaliste', contact: '', status: 'À contacter', notes: '' }); loadContacts() }
  async function updateContact(contact) { await supabase.from('contacts').update(contact).eq('id', contact.id); loadContacts() }
  async function deleteContact(contactId) { if (!confirm('Supprimer ?')) return; await supabase.from('contacts').delete().eq('id', contactId); loadContacts() }

  async function loadSharedFiles() { const { data } = await supabase.from('shared_files').select('*').order('uploaded_at', { ascending: false }); if (data) setSharedFiles(data) }
  async function handleFileUpload(event) {
    const file = event.target.files?.[0]; if (!file) return; setUploadingFile(true)
    const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { error } = await supabase.storage.from('files').upload(filePath, file)
    if (error) { alert(`Erreur: ${error.message}`); setUploadingFile(false); return }
    const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath)
    await supabase.from('shared_files').insert([{ name: file.name, file_url: urlData.publicUrl, file_type: file.type, uploaded_by: currentUser }])
    setUploadingFile(false); loadSharedFiles(); event.target.value = ''
  }
  async function deleteFile(fileId) { if (!confirm('Supprimer ?')) return; await supabase.from('shared_files').delete().eq('id', fileId); loadSharedFiles() }

  function formatDate(dateStr) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMin = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMs / 3600000)
    const diffD = Math.floor(diffMs / 86400000)
    if (diffMin < 1) return 'À l\'instant'
    if (diffMin < 60) return `${diffMin}min`
    if (diffH < 24) return `${diffH}h`
    if (diffD < 7) return `${diffD}j`
    return d.toLocaleDateString('fr-FR')
  }

  // Filters
  let filteredVideos = videos
  
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    filteredVideos = filteredVideos.filter(v => 
      v.title?.toLowerCase().includes(q) || 
      v.video_types?.name?.toLowerCase().includes(q) ||
      v.uploaded_by?.toLowerCase().includes(q)
    )
  }
  
  if (filterType !== 'all') {
    filteredVideos = filteredVideos.filter(v => v.type_id === filterType)
  }
  
  if (filterValidation === 'to_validate' && currentUser) {
    const f = userToColumn[currentUser]
    filteredVideos = filteredVideos.filter(v => !v[f])
  } else if (filterValidation === 'validated' && currentUser) {
    const f = userToColumn[currentUser]
    filteredVideos = filteredVideos.filter(v => v[f])
  }

  if (sortBy === 'recent_comments') {
    filteredVideos = [...filteredVideos].sort((a, b) => {
      const aDate = latestCommentByVideo[a.id] || '1970-01-01'
      const bDate = latestCommentByVideo[b.id] || '1970-01-01'
      return new Date(bDate) - new Date(aDate)
    })
  } else if (sortBy === 'most_comments') {
    filteredVideos = [...filteredVideos].sort((a, b) => (commentCounts[b.id] || 0) - (commentCounts[a.id] || 0))
  }

  const toValidateCount = currentUser ? videos.filter(v => { const f = userToColumn[currentUser]; return !v[f] }).length : 0
  const allValidatedVideos = videos.filter(v => v.bertrand_approved && v.sebastien_approved && v.pierreemmanuel_approved)

  // Mobile swipe view render
  const renderMobileSwipeView = () => {
    if (filteredVideos.length === 0) return <div className="text-center py-12 text-gray-500">Aucune vidéo</div>
    
    const video = filteredVideos[currentVideoIndex]
    if (!video) return null
    
    const myField = userToColumn[currentUser]
    const myApproval = video[myField]
    const allApproved = video.bertrand_approved && video.sebastien_approved && video.pierreemmanuel_approved
    
    return (
      <div 
        ref={swipeContainerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="bg-white rounded-2xl overflow-hidden shadow-lg"
      >
        <div className="relative">
          <div className="absolute top-2 left-2 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {currentVideoIndex + 1}/{filteredVideos.length}
          </div>
          {allApproved && <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-xs px-2 py-1 rounded-full">✅ Validée</div>}
          <video 
            src={video.file_url} 
            controls 
            preload="metadata"
            className="w-full aspect-video bg-gray-900"
            playsInline
          />
        </div>
        <div className="p-4">
          <h3 className="font-bold text-lg mb-2">{video.title}</h3>
          
          {/* Type selector */}
          <div className="flex gap-2 mb-3">
            <select 
              value={video.type_id || ''} 
              onChange={(e) => updateVideoType(video.id, e.target.value)}
              className="text-sm border rounded-lg px-2 py-1 flex-1"
            >
              <option value="">Type...</option>
              {videoTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          
          {/* Validation badges */}
          <div className="flex gap-2 mb-3">
            <span className={`px-2 py-1 rounded text-xs ${video.bertrand_approved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>B</span>
            <span className={`px-2 py-1 rounded text-xs ${video.sebastien_approved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>S</span>
            <span className={`px-2 py-1 rounded text-xs ${video.pierreemmanuel_approved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>P</span>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2 mb-3">
            <button 
              onClick={() => toggleMyApproval(video.id)} 
              className={`flex-1 py-3 rounded-xl font-semibold ${myApproval ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}
            >
              {myApproval ? '✓ Validée par moi' : 'Valider'}
            </button>
          </div>
          
          {/* Links row */}
          <div className="flex justify-between text-sm">
            <button onClick={() => router.push(`/video/${video.id}`)} className="text-blue-600">🎬 Détails</button>
            <a href={video.file_url} download className="text-green-600">⬇ Télécharger</a>
            <button onClick={() => deleteVideo(video.id)} className="text-red-600">🗑 Supprimer</button>
          </div>
          
          {/* Navigation buttons */}
          <div className="flex justify-between mt-4 pt-4 border-t">
            <button 
              onClick={() => setCurrentVideoIndex(prev => Math.max(0, prev - 1))}
              disabled={currentVideoIndex === 0}
              className={`px-4 py-2 rounded-lg ${currentVideoIndex === 0 ? 'bg-gray-100 text-gray-400' : 'bg-gray-200'}`}
            >
              ← Précédent
            </button>
            <button 
              onClick={() => setCurrentVideoIndex(prev => Math.min(filteredVideos.length - 1, prev + 1))}
              disabled={currentVideoIndex === filteredVideos.length - 1}
              className={`px-4 py-2 rounded-lg ${currentVideoIndex === filteredVideos.length - 1 ? 'bg-gray-100 text-gray-400' : 'bg-gray-200'}`}
            >
              Suivant →
            </button>
          </div>
        </div>
        <p className="text-center text-gray-400 text-sm pb-4">← Swipez pour naviguer →</p>
      </div>
    )
  }

  // Login screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">SKROLL.TV</h1>
          <p className="text-gray-600 mb-8 text-center">Connectez-vous</p>
          {loginError && <p className="text-red-500 text-center mb-4">{loginError}</p>}
          <div className="relative mb-4">
            <input type={showPassword ? "text" : "password"} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-lg px-4 py-3 pr-12" />
            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">{showPassword ? '🙈' : '👁'}</button>
          </div>
          <div className="space-y-3">
            {['Bertrand', 'Sébastien', 'Pierre Emmanuel'].map((name) => (
              <button key={name} onClick={() => handleLogin(name)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl">{name}</button>
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
              <input type={showNewPassword ? "text" : "password"} placeholder="Nouveau" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 pr-10" />
              <button onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showNewPassword ? '🙈' : '👁'}</button>
            </div>
            <input type={showNewPassword ? "text" : "password"} placeholder="Confirmer" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-3" />
            {passwordMessage && <p className={`text-sm mb-3 ${passwordMessage.includes('✓') ? 'text-green-600' : 'text-red-500'}`}>{passwordMessage}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowPasswordModal(false); setPasswordMessage('') }} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">Annuler</button>
              <button onClick={handleChangePassword} disabled={isChangingPassword} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">{isChangingPassword ? '...' : 'OK'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="bg-white w-64 h-full p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-blue-600">SKROLL.TV</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="text-2xl">✕</button>
            </div>
            <ul className="space-y-2">
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
                  <button onClick={() => { setCurrentSection(item.id); setMobileMenuOpen(false) }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${currentSection === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t">
              <p className="text-gray-600 mb-2">{currentUser}</p>
              <button onClick={() => setShowPasswordModal(true)} className="text-sm text-gray-500 mr-4">🔐 Mot de passe</button>
              <button onClick={handleLogout} className="text-sm text-red-500">Déconnexion</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-2xl">☰</button>
            <h1 className="text-xl md:text-2xl font-bold text-blue-600">SKROLL.TV</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {toValidateCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{toValidateCount}</span>}
            <span className="hidden md:inline text-gray-700">{currentUser}</span>
            <button onClick={() => setShowPasswordModal(true)} className="hidden md:block px-3 py-2 bg-gray-100 rounded-lg text-sm">🔐</button>
            <button onClick={handleLogout} className="hidden md:block px-4 py-2 bg-gray-100 rounded-lg text-sm">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <nav className="hidden md:block w-64 bg-white border-r fixed left-0 top-[65px] bottom-0 overflow-y-auto">
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
                <button onClick={() => setCurrentSection(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${currentSection === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <main className="md:ml-64 p-4 md:p-8 w-full">
          {currentSection === 'videos' && (
            <div>
              <div className="mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{filteredVideos.length} vidéos</h2>
                </div>
                
                {/* Mobile: toggle swipe/grid */}
                {isMobile && (
                  <div className="flex gap-2 w-full">
                    <button onClick={() => setMobileViewMode('swipe')} className={`flex-1 py-2 rounded-lg text-sm ${mobileViewMode === 'swipe' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>📱 Swipe</button>
                    <button onClick={() => setMobileViewMode('grid')} className={`flex-1 py-2 rounded-lg text-sm ${mobileViewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>⊞ Grille</button>
                  </div>
                )}
                
                {/* Desktop: grid/table toggle */}
                {!isMobile && (
                  <div className="flex gap-2">
                    <button onClick={() => setViewMode('grid')} className={`px-3 py-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Grille</button>
                    <button onClick={() => setViewMode('table')} className={`px-3 py-2 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Tableau</button>
                  </div>
                )}
              </div>

              {/* Upload zone */}
              <label className="block mb-4 cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-4 md:p-6 text-center bg-white transition-colors">
                  <input type="file" accept="video/*" multiple onChange={handleVideoUpload} disabled={uploading} className="hidden" />
                  <div className="text-2xl md:text-3xl mb-1">📤</div>
                  <div className="text-sm md:text-base font-medium text-gray-700">{uploading ? uploadStatus : 'Cliquez pour uploader des vidéos'}</div>
                  <div className="text-xs text-gray-500">MP4, MOV - Sélection multiple</div>
                  {uploading && (
                    <div className="mt-3 max-w-xs mx-auto">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full transition-all" style={{width:`${uploadProgress}%`}}></div>
                      </div>
                    </div>
                  )}
                </div>
              </label>
              
              {/* Search */}
              <div className="mb-4">
                <input type="text" placeholder="🔍 Rechercher..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentVideoIndex(0) }} className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500" />
              </div>
              
              {/* Filters */}
              <div className="mb-4 flex flex-wrap gap-2">
                <select value={filterValidation} onChange={(e) => { setFilterValidation(e.target.value); setCurrentVideoIndex(0) }} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="all">Toutes</option>
                  <option value="to_validate">🔴 À valider</option>
                  <option value="validated">✅ Validées par moi</option>
                </select>
                <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentVideoIndex(0) }} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="all">Tous types</option>
                  {videoTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentVideoIndex(0) }} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="recent">📅 Récentes</option>
                  <option value="recent_comments">💬 Commentaires récents</option>
                  <option value="most_comments">🔥 Plus commentées</option>
                </select>
              </div>

              {/* Types management (desktop only) */}
              {!isMobile && (
                <div className="mb-4 flex flex-wrap gap-2 items-center">
                  <input type="text" placeholder="Nouveau type..." value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                  <button onClick={addVideoType} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm">+ Ajouter</button>
                  {videoTypes.map(t => (
                    <span key={t.id} className="inline-flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm">
                      {t.name}
                      <button onClick={() => deleteVideoType(t.id)} className="text-red-500 ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Mobile swipe view */}
              {isMobile && mobileViewMode === 'swipe' && renderMobileSwipeView()}
              
              {/* Grid view (mobile grid or desktop) */}
              {((isMobile && mobileViewMode === 'grid') || (!isMobile && viewMode === 'grid')) && (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  {filteredVideos.map((video) => {
                    const myField = userToColumn[currentUser]
                    const myApproval = video[myField]
                    const allApproved = video.bertrand_approved && video.sebastien_approved && video.pierreemmanuel_approved
                    const commentCount = commentCounts[video.id] || 0
                    
                    return (
                      <div key={video.id} className={`bg-white rounded-xl overflow-hidden shadow-sm ${allApproved ? 'ring-2 ring-green-500' : ''}`}>
                        <div className="relative cursor-pointer" onClick={() => router.push(`/video/${video.id}`)}>
                          {allApproved && <div className="absolute top-1 right-1 z-10 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">✅</div>}
                          <video src={video.file_url} preload="metadata" className="w-full aspect-video bg-gray-900" muted />
                        </div>
                        <div className="p-2 md:p-4">
                          <h3 className="font-semibold text-sm md:text-base truncate mb-1">{video.title}</h3>
                          
                          {/* Type selector */}
                          <select 
                            value={video.type_id || ''} 
                            onChange={(e) => { e.stopPropagation(); updateVideoType(video.id, e.target.value) }}
                            className="text-xs border rounded px-1 py-0.5 mb-2 w-full"
                          >
                            <option value="">Type...</option>
                            {videoTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          
                          <div className="flex gap-1 mb-2">
                            {commentCount > 0 && <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">💬{commentCount}</span>}
                          </div>
                          
                          <button onClick={() => toggleMyApproval(video.id)} className={`w-full py-2 rounded-lg text-xs font-medium mb-2 ${myApproval ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>
                            {myApproval ? '✓ Validée' : 'Valider'}
                          </button>
                          
                          {/* Action links */}
                          <div className="flex justify-between text-xs">
                            <a href={video.file_url} download className="text-green-600">⬇ DL</a>
                            <button onClick={() => deleteVideo(video.id)} className="text-red-600">🗑</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {/* Desktop table view */}
              {!isMobile && viewMode === 'table' && (
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm">Titre</th>
                        <th className="px-4 py-3 text-left text-sm">Type</th>
                        <th className="px-4 py-3 text-left text-sm">💬</th>
                        <th className="px-4 py-3 text-left text-sm">Validations</th>
                        <th className="px-4 py-3 text-left text-sm">Ma validation</th>
                        <th className="px-4 py-3 text-left text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredVideos.map((video) => {
                        const myField = userToColumn[currentUser]
                        const myApproval = video[myField]
                        return (
                          <tr key={video.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3"><button onClick={() => router.push(`/video/${video.id}`)} className="text-blue-600 hover:underline">{video.title}</button></td>
                            <td className="px-4 py-3 text-sm">{video.video_types?.name || '-'}</td>
                            <td className="px-4 py-3 text-sm">{commentCounts[video.id] || 0}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={video.bertrand_approved ? 'text-green-600' : 'text-gray-400'}>B </span>
                              <span className={video.sebastien_approved ? 'text-green-600' : 'text-gray-400'}>S </span>
                              <span className={video.pierreemmanuel_approved ? 'text-green-600' : 'text-gray-400'}>P</span>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => toggleMyApproval(video.id)} className={`px-3 py-1 rounded text-xs ${myApproval ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{myApproval ? '✓' : 'Valider'}</button>
                            </td>
                            <td className="px-4 py-3 text-sm space-x-2">
                              <button onClick={() => router.push(`/video/${video.id}`)} className="text-blue-600">Ouvrir</button>
                              <a href={video.file_url} download className="text-green-600">⬇</a>
                              <button onClick={() => deleteVideo(video.id)} className="text-red-600">🗑</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              {filteredVideos.length === 0 && <div className="text-center py-12 text-gray-500">Aucune vidéo</div>}
            </div>
          )}

          {currentSection === 'comments' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{allComments.length} commentaires</h2>
              {allComments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Aucun commentaire</div>
              ) : (
                <div className="space-y-3">
                  {allComments.map(comment => (
                    <div key={comment.id} className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{comment.user_id}</span>
                        <span className="text-gray-400 text-sm">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="text-gray-700 mb-2">{comment.text}</p>
                      <button onClick={() => router.push(`/video/${comment.video_id}`)} className="text-sm text-blue-600">🎬 {comment.videos?.title}</button>
                      {replyTo === comment.id ? (
                        <div className="mt-3 flex gap-2">
                          <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Répondre..." className="flex-1 border rounded-lg px-3 py-2 text-sm" autoFocus />
                          <button onClick={() => addReply(comment.video_id)} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">OK</button>
                          <button onClick={() => setReplyTo(null)} className="text-gray-500 px-2">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setReplyTo(comment.id)} className="block mt-2 text-sm text-gray-500">↩ Répondre</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentSection === 'validated' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{allValidatedVideos.length} validées</h2>
              {allValidatedVideos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">Aucune vidéo validée par tous</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                  {allValidatedVideos.map((video) => (
                    <div key={video.id} className="bg-white rounded-xl overflow-hidden shadow-sm border-2 border-green-500 cursor-pointer" onClick={() => router.push(`/video/${video.id}`)}>
                      <div className="bg-green-500 text-white text-center py-1 text-xs">✅ Validée</div>
                      <video src={video.file_url} preload="metadata" className="w-full aspect-video bg-gray-900" muted />
                      <div className="p-2 md:p-4">
                        <h3 className="font-semibold text-sm md:text-base truncate">{video.title}</h3>
                        <div className="flex justify-between text-xs mt-2">
                          <a href={video.file_url} download onClick={(e) => e.stopPropagation()} className="text-green-600">⬇ DL</a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentSection === 'tasks' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Tâches</h2>
              <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
                <input type="text" placeholder="Nouvelle tâche..." value={newTask.name} onChange={(e) => setNewTask({...newTask, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 mb-2" />
                <div className="flex gap-2 mb-2">
                  <select value={newTask.assignee} onChange={(e) => setNewTask({...newTask, assignee: e.target.value})} className="flex-1 border rounded-lg px-3 py-2 text-sm"><option value="">Assigné à...</option><option>Bertrand</option><option>Sébastien</option><option>Pierre Emmanuel</option></select>
                  <button onClick={createTask} className="bg-blue-600 text-white px-4 py-2 rounded-lg">+</button>
                </div>
              </div>
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="bg-white rounded-lg p-3 shadow-sm flex items-center gap-3">
                    <select value={task.status} onChange={(e) => updateTaskStatus(task.id, e.target.value)} className={`text-xs px-2 py-1 rounded ${task.status === 'Terminée' ? 'bg-green-100' : task.status === 'En cours' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                      <option>À faire</option><option>En cours</option><option>Terminée</option>
                    </select>
                    <div className="flex-1"><p className="font-medium text-sm">{task.name}</p></div>
                    {task.assignee && <span className="text-xs text-gray-500">{task.assignee}</span>}
                    <button onClick={() => deleteTask(task.id)} className="text-red-500">🗑</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentSection === 'ideas' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Idées</h2>
              <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
                <input type="text" placeholder="Nouvelle idée..." value={newIdea.title} onChange={(e) => setNewIdea({...newIdea, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 mb-2" />
                <button onClick={createIdea} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Ajouter</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ideas.map(idea => (
                  <div key={idea.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <h3 className="font-semibold mb-2">{idea.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{idea.description}</p>
                    <div className="flex justify-between">
                      <select value={idea.status} onChange={(e) => updateIdea({...idea, status: e.target.value})} className="text-xs border rounded px-2 py-1"><option>Nouvelle</option><option>En réflexion</option><option>Validée</option><option>Rejetée</option></select>
                      <button onClick={() => deleteIdea(idea.id)} className="text-red-500 text-sm">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentSection === 'contacts' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Contacts</h2>
              <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
                <input type="text" placeholder="Nom..." value={newContact.name} onChange={(e) => setNewContact({...newContact, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 mb-2" />
                <input type="text" placeholder="Email/Tel..." value={newContact.contact} onChange={(e) => setNewContact({...newContact, contact: e.target.value})} className="w-full border rounded-lg px-3 py-2 mb-2" />
                <button onClick={createContact} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Ajouter</button>
              </div>
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-sm text-gray-500">{c.contact}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={c.status} onChange={(e) => updateContact({...c, status: e.target.value})} className="text-xs border rounded px-2 py-1">{contactStatuses.map(s => <option key={s}>{s}</option>)}</select>
                        <button onClick={() => deleteContact(c.id)} className="text-red-500">🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentSection === 'files' && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Fichiers</h2>
              <label className="block mb-6">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-white cursor-pointer">
                  <input type="file" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
                  <div className="text-3xl mb-2">📎</div>
                  <div className="font-medium">{uploadingFile ? 'Upload...' : 'Uploader'}</div>
                </div>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sharedFiles.map(f => (
                  <div key={f.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-2xl mb-1">{f.file_type?.includes('image') ? '🖼' : '📄'}</div>
                    <p className="font-medium text-sm truncate">{f.name}</p>
                    <div className="flex gap-2 mt-2">
                      <a href={f.file_url} target="_blank" className="text-xs text-blue-600">Ouvrir</a>
                      <button onClick={() => deleteFile(f.id)} className="text-xs text-red-600">🗑</button>
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
