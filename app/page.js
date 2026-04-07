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

const userToVoteColumn = {
  'Bertrand': 'bertrand_vote',
  'Sébastien': 'sebastien_vote',
  'Pierre Emmanuel': 'pierreemmanuel_vote'
}

// Calcule le statut global d'une vidéo
// En attente → tous n'ont pas encore approuvé le concept
// À terminer → les 3 ont approuvé le concept, travail technique en cours
// PAD        → le référent a déclaré la vidéo prête à diffuser
// Statut calculé à partir des votes Oui/Non + is_pad
// En attente  → pas encore 3 votes Oui, et aucun Non
// À terminer  → les 3 ont voté Oui
// À supprimer → au moins un Non
// PAD         → référent a déclaré la vidéo prête
function getVideoStatus(video) {
  if (!video) return 'En attente'
  if (video.is_pad) return 'PAD'
  const votes = [video.bertrand_vote, video.sebastien_vote, video.pierreemmanuel_vote]
  if (votes.some(v => v === 'non')) return 'À supprimer'
  if (votes.every(v => v === 'oui')) return 'À terminer'
  return 'En attente'
}

function statusLabel(status) {
  if (status === 'PAD') return 'PAD'
  if (status === 'À terminer') return 'À terminer'
  if (status === 'À supprimer') return 'À supprimer'
  return 'En attente'
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
  const [newIdea, setNewIdea] = useState({ title: '', description: '', tags: '', link_url: '' })
  
  const [contacts, setContacts] = useState([])
  const [newContact, setNewContact] = useState({ name: '', type: 'Journaliste', contact: '', status: 'À contacter', notes: '' })
  const contactTypes = ['Journaliste', 'Partenaire', 'Influenceur', 'Autre']
  const contactStatuses = ['À contacter', 'Contacté', 'En discussion', 'Partenaire', 'Refusé']
  
  const [sharedFiles, setSharedFiles] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)

  // Demande de voix
  const [voixRequestVideoId, setVoixRequestVideoId] = useState(null)
  const [voixTarget, setVoixTarget] = useState('')
  const [voixNote, setVoixNote] = useState('')

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

  // Rafraîchir les commentaires et les vidéos à chaque changement de section
  useEffect(() => {
    if (!currentUser) return
    if (currentSection === 'comments') {
      loadAllComments()
      loadCommentCounts()
    }
    if (currentSection === 'mes-videos') {
      loadVideos()
    }
  }, [currentSection])

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
          referent: currentUser,
          status: 'En cours'
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
  
  // Vote : 'oui' | 'non' | null
  async function castVote(videoId, vote) {
    if (!currentUser) return
    const voteCol = userToVoteColumn[currentUser]
    await supabase.from('videos').update({ [voteCol]: vote }).eq('id', videoId)
    loadVideos()
  }

  // Marquer PAD — réservé au référent depuis la page ou le détail
  async function markAsPad(videoId) {
    await supabase.from('videos').update({ is_pad: true }).eq('id', videoId)
    loadVideos()
  }

  async function unmarkAsPad(videoId) {
    await supabase.from('videos').update({ is_pad: false }).eq('id', videoId)
    loadVideos()
  }

  // Demande de voix : poste un commentaire formaté
  async function submitVoixRequest(videoId) {
    if (!voixTarget || !videoId) return
    const msg = `🎙️ ${currentUser} demande une voix à ${voixTarget}${voixNote ? ` — ${voixNote}` : ''}`
    await supabase.from('comments').insert([{ video_id: videoId, user_id: currentUser, text: msg }])
    setVoixRequestVideoId(null)
    setVoixTarget('')
    setVoixNote('')
    loadCommentCounts()
    loadAllComments()
    if (expandedComments !== videoId) toggleComments(videoId)
    else loadVideoComments(videoId)
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
  async function createIdea() { if (!newIdea.title.trim()) return; const tags = newIdea.tags.split(',').map(t => t.trim()).filter(t => t); await supabase.from('ideas').insert([{ ...newIdea, tags, status: 'Nouvelle' }]); setNewIdea({ title: '', description: '', tags: '', link_url: '' }); loadIdeas() }
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

  async function claimReferent(videoId) {
    await supabase.from('videos').update({ referent: currentUser }).eq('id', videoId)
    loadVideos()
  }

  async function releaseReferent(videoId) {
    await supabase.from('videos').update({ referent: null }).eq('id', videoId)
    loadVideos()
  }

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

  function renderLinkPreview(url) {
    if (!url) return null
    try {
      const u = new URL(url)
      const host = u.hostname.replace('www.', '')
      // YouTube
      if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') {
        let videoId = null
        if (host === 'youtu.be') videoId = u.pathname.slice(1).split('?')[0]
        else if (u.pathname.startsWith('/shorts/')) videoId = u.pathname.replace('/shorts/', '').split('?')[0]
        else videoId = u.searchParams.get('v')
        if (videoId) return (
          <div className="mt-3 rounded-xl overflow-hidden border border-red-200">
            <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full aspect-video" allowFullScreen title="YouTube" />
          </div>
        )
      }
      // Instagram
      if (host === 'instagram.com') return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-pink-200 rounded-xl hover:shadow-sm transition-shadow no-underline">
          <span className="text-2xl">📸</span>
          <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-pink-700">Instagram</p><p className="text-xs text-gray-500 truncate">{url}</p></div>
          <span className="text-pink-500 text-sm">→</span>
        </a>
      )
      // Facebook
      if (host === 'facebook.com' || host === 'fb.watch' || host === 'fb.com') return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl hover:shadow-sm transition-shadow no-underline">
          <span className="text-2xl">📘</span>
          <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-blue-700">Facebook</p><p className="text-xs text-gray-500 truncate">{url}</p></div>
          <span className="text-blue-500 text-sm">→</span>
        </a>
      )
      // TikTok
      if (host === 'tiktok.com' || host === 'vm.tiktok.com') return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-3 p-3 bg-gray-900 border border-gray-700 rounded-xl hover:shadow-sm transition-shadow no-underline">
          <span className="text-2xl">🎵</span>
          <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-white">TikTok</p><p className="text-xs text-gray-400 truncate">{url}</p></div>
          <span className="text-white text-sm">→</span>
        </a>
      )
      // Lien générique
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow no-underline">
          <span className="text-2xl">🔗</span>
          <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-700">{host}</p><p className="text-xs text-gray-500 truncate">{url}</p></div>
          <span className="text-gray-500 text-sm">→</span>
        </a>
      )
    } catch { return null }
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
    const vc = userToVoteColumn[currentUser]
    filteredVideos = filteredVideos.filter(v => !v[vc])
  } else if (filterValidation === 'validated' && currentUser) {
    const vc = userToVoteColumn[currentUser]
    filteredVideos = filteredVideos.filter(v => !!v[vc])
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

  const toValidateCount = currentUser ? videos.filter(v => { const vc = userToVoteColumn[currentUser]; return !v[vc] && getVideoStatus(v) === 'En attente' }).length : 0
  const enAttenteCount  = videos.filter(v => getVideoStatus(v) === 'En attente').length
  const aTerminerCount  = videos.filter(v => getVideoStatus(v) === 'À terminer').length
  const aSupprimerCount = videos.filter(v => getVideoStatus(v) === 'À supprimer').length
  const padCount        = videos.filter(v => getVideoStatus(v) === 'PAD').length

  // Mobile swipe view
  const renderMobileSwipeView = () => {
    if (filteredVideos.length === 0) return <div className="text-center py-12 text-gray-400">Aucune vidéo</div>
    const video = filteredVideos[currentVideoIndex]
    if (!video) return null
    const vs = getVideoStatus(video)
    const myVote = currentUser ? video[userToVoteColumn[currentUser]] : null
    const isReferent = video.referent === currentUser
    return (
      <div ref={swipeContainerRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <div className="relative">
          <div className="absolute top-2 left-2 z-10 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">{currentVideoIndex + 1}/{filteredVideos.length}</div>
          <video src={video.file_url} controls preload="metadata" className="w-full aspect-video bg-gray-900" playsInline />
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-base flex-1 pr-2">{video.title}</h3>
            <span className="text-xs text-gray-400 shrink-0">{vs}</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">Prise en charge : {video.referent || '—'}</p>

          {/* Votes */}
          <div className="flex gap-2 mb-3">
            {[['Bertrand', 'B', 'bertrand_vote'], ['Sébastien', 'S', 'sebastien_vote'], ['Pierre Emmanuel', 'P', 'pierreemmanuel_vote']].map(([name, initial, col]) => {
              const v = video[col]
              return (
                <span key={col} title={name}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${v === 'oui' ? 'bg-gray-900 text-white' : v === 'non' ? 'bg-gray-200 text-gray-500 line-through' : 'bg-gray-100 text-gray-400'}`}>
                  {initial} {v === 'oui' ? '✓' : v === 'non' ? '✗' : ''}
                </span>
              )
            })}
          </div>

          {/* Vote Oui/Non (En attente uniquement) */}
          {vs === 'En attente' && (
            <div className="flex gap-2 mb-3">
              <button onClick={() => castVote(video.id, myVote === 'oui' ? null : 'oui')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${myVote === 'oui' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'}`}>
                Oui
              </button>
              <button onClick={() => castVote(video.id, myVote === 'non' ? null : 'non')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${myVote === 'non' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'}`}>
                Non
              </button>
            </div>
          )}
          {vs === 'À terminer' && isReferent && (
            <button onClick={() => markAsPad(video.id)} className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white mb-3">Marquer PAD</button>
          )}
          {vs === 'PAD' && isReferent && (
            <button onClick={() => unmarkAsPad(video.id)} className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-500 mb-3">Annuler PAD</button>
          )}

          <div className="flex justify-between text-sm text-gray-400 pt-3 border-t border-gray-100">
            <button onClick={() => router.push(`/video/${video.id}`)} className="text-gray-700">Détails</button>
            <a href={video.file_url} download>Télécharger</a>
          </div>
          <div className="flex justify-between mt-3">
            <button onClick={() => setCurrentVideoIndex(p => Math.max(0, p - 1))} disabled={currentVideoIndex === 0} className={`px-4 py-2 rounded-lg text-sm ${currentVideoIndex === 0 ? 'text-gray-300' : 'text-gray-600'}`}>← Précédent</button>
            <button onClick={() => setCurrentVideoIndex(p => Math.min(filteredVideos.length - 1, p + 1))} disabled={currentVideoIndex === filteredVideos.length - 1} className={`px-4 py-2 rounded-lg text-sm ${currentVideoIndex === filteredVideos.length - 1 ? 'text-gray-300' : 'text-gray-600'}`}>Suivant →</button>
          </div>
        </div>
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
                {id:'videos', icon:'🎬', label:'Toutes les vidéos'},
                {id:'en-attente', icon:'◦', label:`En attente (${enAttenteCount})`},
                {id:'a-terminer', icon:'◦', label:`À terminer (${aTerminerCount})`},
                {id:'a-supprimer', icon:'◦', label:`À supprimer (${aSupprimerCount})`},
                {id:'pad', icon:'◦', label:`PAD (${padCount})`},
                {id:'mes-videos', icon:'◦', label:'Mes vidéos'},
                {id:'comments', icon:'◦', label:`Commentaires (${allComments.length})`},
                {id:'tasks', icon:'◦', label:'Tâches'},
                {id:'ideas', icon:'◦', label:'Idées'},
                {id:'contacts', icon:'◦', label:'Contacts'},
                {id:'files', icon:'◦', label:'Fichiers'}
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
              {id:'videos', icon:'🎬', label:'Toutes les vidéos'},
              {id:'en-attente', icon:'⏳', label:`En attente (${enAttenteCount})`},
              {id:'a-terminer', icon:'🔧', label:`À terminer (${aTerminerCount})`},
              {id:'pad', icon:'✅', label:`PAD (${padCount})`},
              {id:'mes-videos', icon:'🎯', label:'Mes vidéos'},
              {id:'comments', icon:'💬', label:`Commentaires (${allComments.length})`},
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
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {filteredVideos.map((video) => {
                    const vs = getVideoStatus(video)
                    const myVote = currentUser ? video[userToVoteColumn[currentUser]] : null
                    const commentCount = commentCounts[video.id] || 0
                    const isReferent = video.referent === currentUser

                    return (
                      <div key={video.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                        <div className="relative cursor-pointer" onClick={() => router.push(`/video/${video.id}`)}>
                          <video src={video.file_url} preload="metadata" className="w-full aspect-video bg-gray-900" muted />
                        </div>
                        <div className="p-3">
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="font-semibold text-sm leading-tight flex-1 pr-2 truncate">{video.title}</h3>
                            <span className="text-xs text-gray-400 shrink-0">{vs}</span>
                          </div>
                          <p className="text-xs text-gray-400 mb-2 truncate">{video.referent || 'Pas de prise en charge'}</p>

                          {/* Votes B / S / P */}
                          <div className="flex gap-1 mb-2">
                            {[['B','bertrand_vote'],['S','sebastien_vote'],['P','pierreemmanuel_vote']].map(([init, col]) => {
                              const v = video[col]
                              return (
                                <span key={col} className={`px-1.5 py-0.5 rounded text-xs font-medium ${v === 'oui' ? 'bg-green-100 text-green-800' : v === 'non' ? 'bg-red-50 text-red-400 line-through' : 'bg-gray-100 text-gray-400'}`}>
                                  {init}{v === 'oui' ? '✓' : v === 'non' ? '✗' : ''}
                                </span>
                              )
                            })}
                            <button onClick={() => toggleComments(video.id)}
                              className={`ml-auto text-xs px-1.5 py-0.5 rounded ${expandedComments === video.id ? 'bg-gray-900 text-white' : commentCount > 0 ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
                              {commentCount > 0 ? commentCount : '+'} 💬
                            </button>
                          </div>

                          {/* Inline comments */}
                          {expandedComments === video.id && (
                            <div className="mb-2 rounded-xl border border-gray-100 p-2 bg-gray-50">
                              <div className="space-y-1 mb-2 max-h-24 overflow-y-auto">
                                {(videoComments[video.id] || []).length === 0
                                  ? <p className="text-xs text-gray-400">Aucun commentaire</p>
                                  : (videoComments[video.id] || []).map(c => (
                                    <div key={c.id} className="text-xs">
                                      <span className="font-medium mr-1 text-gray-700">{c.user_id?.split(' ')[0]}</span>
                                      <span className="text-gray-500">{c.text}</span>
                                    </div>
                                  ))}
                              </div>
                              <div className="flex gap-1">
                                <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addQuickComment(video.id) }} placeholder="Commenter..." className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white" />
                                <button onClick={() => addQuickComment(video.id)} className="text-xs bg-gray-900 text-white px-2 py-1 rounded-lg">→</button>
                              </div>
                            </div>
                          )}

                          {/* Action selon statut */}
                          {vs === 'En attente' && (
                            <div className="flex gap-1 mb-2">
                              <button onClick={() => castVote(video.id, myVote === 'oui' ? null : 'oui')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${myVote === 'oui' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'}`}>
                                Oui
                              </button>
                              <button onClick={() => castVote(video.id, myVote === 'non' ? null : 'non')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${myVote === 'non' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'}`}>
                                Non
                              </button>
                            </div>
                          )}
                          {vs === 'À terminer' && isReferent && (
                            <button onClick={() => markAsPad(video.id)} className="w-full py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white mb-2">Marquer PAD</button>
                          )}
                          {vs === 'PAD' && isReferent && (
                            <button onClick={() => unmarkAsPad(video.id)} className="w-full py-1.5 rounded-lg text-xs text-gray-500 border border-gray-200 mb-2">Annuler PAD</button>
                          )}

                          <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
                            <a href={video.file_url} download>Télécharger</a>
                            <button onClick={() => deleteVideo(video.id)}>Supprimer</button>
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
                        <th className="px-4 py-3 text-left text-sm">🎯 Référent</th>
                        <th className="px-4 py-3 text-left text-sm">Ma validation</th>
                        <th className="px-4 py-3 text-left text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredVideos.map((video) => {
                        const myField = userToColumn[currentUser]
                        const myApproval = video[myField]
                        const rowStatus = getVideoStatus(video)
                        const myVoteRow = currentUser ? video[userToVoteColumn[currentUser]] : null
                        return (
                          <tr key={video.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3"><button onClick={() => router.push(`/video/${video.id}`)} className="text-blue-600 hover:underline">{video.title}</button></td>
                            <td className="px-4 py-3 text-sm">{video.video_types?.name || '-'}</td>
                            <td className="px-4 py-3 text-sm">{commentCounts[video.id] || 0}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{rowStatus}</span>
                              <div className="flex gap-1 mt-1">
                                {[['B', 'bertrand_vote'], ['S', 'sebastien_vote'], ['P', 'pierreemmanuel_vote']].map(([init, col]) => {
                                  const v = video[col]
                                  return <span key={col} className={`text-xs px-1 rounded ${v === 'oui' ? 'text-green-700 font-bold' : v === 'non' ? 'text-red-400 line-through' : 'text-gray-300'}`}>{init}{v === 'oui' ? '✓' : v === 'non' ? '✗' : ''}</span>
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                {video.referent ? (
                                  <span className="text-purple-600 font-medium">{video.referent}</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                                {video.referent === currentUser ? (
                                  <button onClick={() => releaseReferent(video.id)} className="text-xs text-red-400 hover:text-red-600">Libérer</button>
                                ) : !video.referent ? (
                                  <button onClick={() => claimReferent(video.id)} className="text-xs text-blue-500 hover:text-blue-700">Prendre</button>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                {rowStatus === 'En attente' && (
                                  <>
                                    <button onClick={() => castVote(video.id, myVoteRow === 'oui' ? null : 'oui')}
                                      className={`px-2 py-1 rounded text-xs border ${myVoteRow === 'oui' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'}`}>
                                      Oui
                                    </button>
                                    <button onClick={() => castVote(video.id, myVoteRow === 'non' ? null : 'non')}
                                      className={`px-2 py-1 rounded text-xs border ${myVoteRow === 'non' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'}`}>
                                      Non
                                    </button>
                                  </>
                                )}
                                {rowStatus === 'À terminer' && video.referent === currentUser && (
                                  <button onClick={() => markAsPad(video.id)} className="px-2 py-1 rounded text-xs bg-gray-900 text-white">PAD</button>
                                )}
                                {rowStatus === 'PAD' && video.referent === currentUser && (
                                  <button onClick={() => unmarkAsPad(video.id)} className="px-2 py-1 rounded text-xs border border-gray-200 text-gray-500">Annuler</button>
                                )}
                              </div>
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
                <div className="space-y-6">
                  {/* Group comments by video */}
                  {(() => {
                    const videoIds = [...new Set(allComments.map(c => c.video_id))]
                    const videoCommentGroups = videoIds.map(videoId => {
                      const videoComments = allComments.filter(c => c.video_id === videoId)
                      const latestComment = videoComments[0]
                      return { videoId, videoTitle: latestComment?.videos?.title, comments: videoComments, latestDate: latestComment?.created_at }
                    }).sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate))
                    
                    return videoCommentGroups.map(group => (
                      <div key={group.videoId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        {/* Video header */}
                        <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                          <button onClick={() => router.push(`/video/${group.videoId}`)} className="font-semibold text-blue-600 hover:underline">
                            🎬 {group.videoTitle || 'Vidéo sans titre'}
                          </button>
                          <span className="text-sm text-gray-500">{group.comments.length} message{group.comments.length > 1 ? 's' : ''}</span>
                        </div>
                        
                        {/* Comments thread */}
                        <div className="p-4 space-y-3">
                          {group.comments.slice().reverse().map(comment => (
                            <div key={comment.id} className="flex gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                comment.user_id === 'Bertrand' ? 'bg-blue-500' : 
                                comment.user_id === 'Sébastien' ? 'bg-green-500' : 'bg-purple-500'
                              }`}>
                                {comment.user_id?.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{comment.user_id}</span>
                                  <span className="text-gray-400 text-xs">{formatDate(comment.created_at)}</span>
                                </div>
                                <p className="text-gray-700 text-sm mt-0.5">{comment.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Reply input */}
                        <div className="px-4 pb-4">
                          {replyTo === group.videoId ? (
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={replyText} 
                                onChange={(e) => setReplyText(e.target.value)} 
                                placeholder="Ajouter un commentaire..." 
                                className="flex-1 border rounded-lg px-3 py-2 text-sm" 
                                autoFocus 
                                onKeyDown={(e) => { if (e.key === 'Enter') addReply(group.videoId) }}
                              />
                              <button onClick={() => addReply(group.videoId)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Envoyer</button>
                              <button onClick={() => setReplyTo(null)} className="text-gray-500 px-2">✕</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setReplyTo(group.videoId)} 
                              className="w-full text-left text-sm text-gray-400 border border-dashed rounded-lg px-3 py-2 hover:border-blue-400 hover:text-blue-500"
                            >
                              + Ajouter un commentaire...
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
          )}

          {(['en-attente', 'a-terminer', 'a-supprimer', 'pad'].includes(currentSection)) && (() => {
            const meta = {
              'en-attente':   { title: 'En attente', desc: 'Votez Oui ou Non. Quand les 3 votent Oui, la vidéo passe en "À terminer".' },
              'a-terminer':   { title: 'À terminer', desc: 'Les 3 ont voté Oui. La prise en charge peut la marquer PAD quand elle est prête.' },
              'a-supprimer':  { title: 'À supprimer', desc: 'Au moins un Non a été voté. À discuter ou supprimer.' },
              'pad':          { title: 'PAD — Prêt à diffuser', desc: 'Vidéos déclarées prêtes par la prise en charge.' }
            }
            const sl = currentSection === 'en-attente' ? 'En attente' : currentSection === 'a-terminer' ? 'À terminer' : currentSection === 'a-supprimer' ? 'À supprimer' : 'PAD'
            const sectionVideos = videos.filter(v => getVideoStatus(v) === sl)
            const { title, desc } = meta[currentSection]

            // Carte commune Apple-style
            const renderCard = (video) => {
              const myVote = currentUser ? video[userToVoteColumn[currentUser]] : null
              const isReferent = video.referent === currentUser
              const commentCount = commentCounts[video.id] || 0
              return (
                <div key={video.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="relative cursor-pointer" onClick={() => router.push(`/video/${video.id}`)}>
                    <video src={video.file_url} preload="metadata" className="w-full aspect-video bg-gray-900" muted />
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-sm leading-tight flex-1 pr-2 truncate">{video.title}</h3>
                      {video.referent && <span className="text-xs text-gray-400 shrink-0 truncate max-w-[80px]">{video.referent.split(' ')[0]}</span>}
                    </div>

                    {/* Votes */}
                    <div className="flex gap-1 mb-2">
                      {[['B','bertrand_vote'],['S','sebastien_vote'],['P','pierreemmanuel_vote']].map(([init, col]) => {
                        const v = video[col]
                        return (
                          <span key={col} className={`px-1.5 py-0.5 rounded text-xs font-medium ${v === 'oui' ? 'bg-green-100 text-green-800' : v === 'non' ? 'bg-red-50 text-red-400 line-through' : 'bg-gray-100 text-gray-400'}`}>
                            {init}{v === 'oui' ? '✓' : v === 'non' ? '✗' : ''}
                          </span>
                        )
                      })}
                      <button onClick={() => toggleComments(video.id)}
                        className={`ml-auto text-xs px-1.5 py-0.5 rounded ${expandedComments === video.id ? 'bg-gray-900 text-white' : commentCount > 0 ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
                        {commentCount > 0 ? commentCount : '+'} 💬
                      </button>
                    </div>

                    {/* Commentaires inline */}
                    {expandedComments === video.id && (
                      <div className="mb-2 rounded-xl border border-gray-100 p-2 bg-gray-50">
                        <div className="space-y-1 mb-2 max-h-24 overflow-y-auto">
                          {(videoComments[video.id] || []).length === 0
                            ? <p className="text-xs text-gray-400">Aucun commentaire</p>
                            : (videoComments[video.id] || []).map(c => (
                              <div key={c.id} className="text-xs">
                                <span className="font-medium mr-1 text-gray-700">{c.user_id?.split(' ')[0]}</span>
                                <span className="text-gray-500">{c.text}</span>
                              </div>
                            ))}
                        </div>
                        <div className="flex gap-1">
                          <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addQuickComment(video.id) }} placeholder="Commenter..." className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white" />
                          <button onClick={() => addQuickComment(video.id)} className="text-xs bg-gray-900 text-white px-2 py-1 rounded-lg">→</button>
                        </div>
                      </div>
                    )}

                    {/* Action */}
                    {sl === 'En attente' && (
                      <div className="flex gap-1 mb-2">
                        <button onClick={() => castVote(video.id, myVote === 'oui' ? null : 'oui')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${myVote === 'oui' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'}`}>
                          Oui
                        </button>
                        <button onClick={() => castVote(video.id, myVote === 'non' ? null : 'non')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${myVote === 'non' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'}`}>
                          Non
                        </button>
                      </div>
                    )}
                    {sl === 'À terminer' && isReferent && (
                      <button onClick={() => markAsPad(video.id)} className="w-full py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white mb-2">Marquer PAD</button>
                    )}
                    {sl === 'PAD' && isReferent && (
                      <button onClick={() => unmarkAsPad(video.id)} className="w-full py-1.5 rounded-lg text-xs text-gray-500 border border-gray-200 mb-2">Annuler PAD</button>
                    )}
                    {sl === 'À supprimer' && (
                      <button onClick={() => deleteVideo(video.id)} className="w-full py-1.5 rounded-lg text-xs text-gray-500 border border-gray-200 mb-2">Supprimer</button>
                    )}

                    <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
                      <a href={video.file_url} download>Télécharger</a>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">{title}</h2>
                  <p className="text-gray-400 text-sm">{desc}</p>
                </div>
                {sectionVideos.length === 0 ? (
                  <div className="text-center py-16 text-gray-300 text-sm">Aucune vidéo</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {sectionVideos.map(renderCard)}
                  </div>
                )}
              </div>
            )
          })()}

          {currentSection === 'mes-videos' && (() => {
            const myVideos = videos.filter(v => v.referent === currentUser)
            const renderMyCard = (video) => {
              const myVote = currentUser ? video[userToVoteColumn[currentUser]] : null
              const vs = getVideoStatus(video)
              const commentCount = commentCounts[video.id] || 0
              return (
                <div key={video.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="relative cursor-pointer" onClick={() => router.push(`/video/${video.id}`)}>
                    <video src={video.file_url} preload="metadata" className="w-full aspect-video bg-gray-900" muted />
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-sm leading-tight flex-1 pr-2 truncate">{video.title}</h3>
                      <span className="text-xs text-gray-400 shrink-0">{vs}</span>
                    </div>
                    <div className="flex gap-1 mb-2">
                      {[['B','bertrand_vote'],['S','sebastien_vote'],['P','pierreemmanuel_vote']].map(([init, col]) => {
                        const v = video[col]
                        return <span key={col} className={`px-1.5 py-0.5 rounded text-xs font-medium ${v === 'oui' ? 'bg-green-100 text-green-800' : v === 'non' ? 'bg-red-50 text-red-400 line-through' : 'bg-gray-100 text-gray-400'}`}>{init}{v === 'oui' ? '✓' : v === 'non' ? '✗' : ''}</span>
                      })}
                      <button onClick={() => toggleComments(video.id)} className={`ml-auto text-xs px-1.5 py-0.5 rounded ${expandedComments === video.id ? 'bg-gray-900 text-white' : commentCount > 0 ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
                        {commentCount > 0 ? commentCount : '+'} 💬
                      </button>
                    </div>
                    {expandedComments === video.id && (
                      <div className="mb-2 rounded-xl border border-gray-100 p-2 bg-gray-50">
                        <div className="space-y-1 mb-2 max-h-24 overflow-y-auto">
                          {(videoComments[video.id] || []).length === 0 ? <p className="text-xs text-gray-400">Aucun commentaire</p> : (videoComments[video.id] || []).map(c => (
                            <div key={c.id} className="text-xs"><span className="font-medium mr-1 text-gray-700">{c.user_id?.split(' ')[0]}</span><span className="text-gray-500">{c.text}</span></div>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addQuickComment(video.id) }} placeholder="Commenter..." className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white" />
                          <button onClick={() => addQuickComment(video.id)} className="text-xs bg-gray-900 text-white px-2 py-1 rounded-lg">→</button>
                        </div>
                      </div>
                    )}
                    {vs === 'En attente' && (
                      <div className="flex gap-1 mb-2">
                        <button onClick={() => castVote(video.id, myVote === 'oui' ? null : 'oui')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${myVote === 'oui' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'}`}>Oui</button>
                        <button onClick={() => castVote(video.id, myVote === 'non' ? null : 'non')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${myVote === 'non' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200'}`}>Non</button>
                      </div>
                    )}
                    {vs === 'À terminer' && (
                      <button onClick={() => markAsPad(video.id)} className="w-full py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white mb-2">Marquer PAD</button>
                    )}
                    {vs === 'PAD' && (
                      <button onClick={() => unmarkAsPad(video.id)} className="w-full py-1.5 rounded-lg text-xs text-gray-500 border border-gray-200 mb-2">Annuler PAD</button>
                    )}
                    <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
                      <a href={video.file_url} download>Télécharger</a>
                      <button onClick={() => releaseReferent(video.id)} className="text-gray-400">Libérer</button>
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">Mes vidéos</h2>
                  <p className="text-gray-400 text-sm">Vidéos dont vous avez la prise en charge.</p>
                </div>
                {myVideos.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                    <p className="text-gray-400 text-sm">Aucune vidéo en prise en charge.</p>
                    <p className="text-gray-300 text-xs mt-1">Les vidéos que vous uploadez vous sont automatiquement attribuées.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">{myVideos.map(renderMyCard)}</div>
                )}
              </div>
            )
          })()}

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
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">💡 Idées</h2>

              {/* Formulaire nouvelle idée */}
              <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
                <input
                  type="text"
                  placeholder="Titre de l'idée..."
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({...newIdea, title: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 mb-2 font-medium"
                />
                <textarea
                  placeholder="Description, contexte, détails..."
                  value={newIdea.description}
                  onChange={(e) => setNewIdea({...newIdea, description: e.target.value})}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 mb-2 text-sm resize-none"
                />
                <input
                  type="url"
                  placeholder="🔗 Lien de référence (YouTube, Instagram, Facebook, TikTok...)"
                  value={newIdea.link_url}
                  onChange={(e) => setNewIdea({...newIdea, link_url: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 mb-2 text-sm"
                />
                {newIdea.link_url && (
                  <div className="mb-2">{renderLinkPreview(newIdea.link_url)}</div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tags (séparés par virgules)"
                    value={newIdea.tags}
                    onChange={(e) => setNewIdea({...newIdea, tags: e.target.value})}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <button onClick={createIdea} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium">Ajouter</button>
                </div>
              </div>

              {/* Liste des idées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ideas.map(idea => (
                  <div key={idea.id} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${idea.status === 'Validée' ? 'border-green-400' : idea.status === 'Rejetée' ? 'border-red-300' : idea.status === 'En réflexion' ? 'border-yellow-400' : 'border-blue-300'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-base leading-tight flex-1 pr-2">{idea.title}</h3>
                      <button onClick={() => deleteIdea(idea.id)} className="text-red-400 hover:text-red-600 shrink-0">🗑</button>
                    </div>
                    {idea.description && (
                      <p className="text-gray-600 text-sm mb-3 leading-relaxed">{idea.description}</p>
                    )}
                    {idea.tags && idea.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(Array.isArray(idea.tags) ? idea.tags : idea.tags.split(',')).filter(t => t).map((tag, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag.trim()}</span>
                        ))}
                      </div>
                    )}
                    {idea.link_url && renderLinkPreview(idea.link_url)}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                      <select
                        value={idea.status}
                        onChange={(e) => updateIdea({...idea, status: e.target.value})}
                        className={`text-xs border rounded px-2 py-1 font-medium ${idea.status === 'Validée' ? 'bg-green-50 text-green-700 border-green-200' : idea.status === 'Rejetée' ? 'bg-red-50 text-red-600 border-red-200' : idea.status === 'En réflexion' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}
                      >
                        <option>Nouvelle</option>
                        <option>En réflexion</option>
                        <option>Validée</option>
                        <option>Rejetée</option>
                      </select>
                      <span className="text-xs text-gray-400">{formatDate(idea.created_at)}</span>
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
