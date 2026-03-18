'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [currentSection, setCurrentSection] = useState('videos')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [videos, setVideos] = useState([])
  const [videoTypes, setVideoTypes] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [filterType, setFilterType] = useState('all')
  const [filterValidation, setFilterValidation] = useState('all')
  const [newTypeName, setNewTypeName] = useState('')
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
  const [comments, setComments] = useState({})
  const [newComment, setNewComment] = useState('')
  const [selectedVideoForComment, setSelectedVideoForComment] = useState(null)

  useEffect(() => { const saved = localStorage.getItem('skroll_user'); if (saved) setCurrentUser(saved) }, [])
  useEffect(() => { if (currentUser) { localStorage.setItem('skroll_user', currentUser); loadVideos(); loadVideoTypes(); loadTasks(); loadIdeas(); loadContacts(); loadSharedFiles() } }, [currentUser])

  async function handleLogin(userName) {
    const { data } = await supabase.from('users').select('*').eq('name', userName).eq('password', password).single()
    if (data) { setCurrentUser(userName); setLoginError(''); setPassword('') } else { setLoginError('Mot de passe incorrect') }
  }
  function handleLogout() { localStorage.removeItem('skroll_user'); setCurrentUser(null) }
  async function handleChangePassword() {
    if (newPassword !== confirmPassword) { setPasswordMessage('Les mots de passe ne correspondent pas'); return }
    if (newPassword.length < 4) { setPasswordMessage('Minimum 4 caractères'); return }
    const { error } = await supabase.from('users').update({ password: newPassword }).eq('name', currentUser)
    if (error) { setPasswordMessage('Erreur: ' + error.message) } else { setPasswordMessage('Mot de passe changé !'); setTimeout(() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); setPasswordMessage('') }, 1500) }
  }

  async function loadVideos() { const { data } = await supabase.from('videos').select('*, video_types(name)').order('uploaded_at', { ascending: false }); if (data) setVideos(data) }
  async function loadVideoTypes() { const { data } = await supabase.from('video_types').select('*').order('name'); if (data) setVideoTypes(data) }
  async function handleVideoUpload(event) {
    const files = Array.from(event.target.files || []); if (files.length === 0) return; setUploading(true); setUploadProgress(0)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]; setUploadProgress(Math.round(((i + 1) / files.length) * 100)); setUploadStatus(`Upload ${i + 1}/${files.length}: ${file.name}`)
      try {
        const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { error } = await supabase.storage.from('Videos').upload(filePath, file, { cacheControl: '3600', upsert: false }); if (error) { alert(`Erreur: ${error.message}`); continue }
        const { data: urlData } = supabase.storage.from('Videos').getPublicUrl(filePath)
        await supabase.from('videos').insert([{ title: file.name.replace(/\.[^/.]+$/, ''), file_url: urlData.publicUrl, uploaded_by: currentUser, status: 'En cours', bertrand_approved: false, sebastien_approved: false, pierreemmanuel_approved: false }])
      } catch (error) { alert(`Erreur: ${error.message}`) }
    }
    setUploadProgress(100); setUploadStatus('Terminé !'); setUploading(false); loadVideos(); setTimeout(() => { setUploadProgress(0); setUploadStatus('') }, 2000); event.target.value = ''
  }
  async function toggleApproval(videoId, userName) { const video = videos.find(v => v.id === videoId); if (!video) return; const field = `${userName.toLowerCase().replace(' ', '')}_approved`; await supabase.from('videos').update({ [field]: !video[field] }).eq('id', videoId); loadVideos() }
  async function updateVideoType(videoId, typeId) { await supabase.from('videos').update({ type_id: typeId || null }).eq('id', videoId); loadVideos() }
  async function updateVideoDuration(videoId, duration) { await supabase.from('videos').update({ duration }).eq('id', videoId); loadVideos() }
  async function deleteVideo(videoId) { if (!confirm('Supprimer cette vidéo ?')) return; await supabase.from('videos').delete().eq('id', videoId); loadVideos() }
  async function addVideoType() { if (!newTypeName.trim()) return; await supabase.from('video_types').insert([{ name: newTypeName.trim() }]); setNewTypeName(''); loadVideoTypes() }
  async function deleteVideoType(typeId) { if (!confirm('Supprimer ce type ?')) return; await supabase.from('video_types').delete().eq('id', typeId); loadVideoTypes() }

  async function loadTasks() { const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }); if (data) setTasks(data) }
  async function createTask() { if (!newTask.name.trim()) return; await supabase.from('tasks').insert([{ ...newTask, status: 'À faire' }]); setNewTask({ name: '', description: '', assignee: '', deadline: '', folder_name: 'Production' }); loadTasks() }
  async function deleteTask(taskId) { if (!confirm('Supprimer cette tâche ?')) return; await supabase.from('tasks').delete().eq('id', taskId); loadTasks() }
  async function updateTaskStatus(taskId, status) { await supabase.from('tasks').update({ status }).eq('id', taskId); loadTasks() }

  async function loadIdeas() { const { data } = await supabase.from('ideas').select('*').order('created_at', { ascending: false }); if (data) setIdeas(data) }
  async function createIdea() { if (!newIdea.title.trim()) return; const tags = newIdea.tags.split(',').map(t => t.trim()).filter(t => t); await supabase.from('ideas').insert([{ ...newIdea, tags, status: 'Nouvelle' }]); setNewIdea({ title: '', description: '', tags: '' }); loadIdeas() }
  async function updateIdea(idea) { await supabase.from('ideas').update(idea).eq('id', idea.id); loadIdeas() }
  async function deleteIdea(ideaId) { if (!confirm('Supprimer cette idée ?')) return; await supabase.from('ideas').delete().eq('id', ideaId); loadIdeas() }

  async function loadContacts() { const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false }); if (data) setContacts(data) }
  async function createContact() { if (!newContact.name.trim()) return; await supabase.from('contacts').insert([newContact]); setNewContact({ name: '', type: 'Journaliste', contact: '', status: 'À contacter', notes: '' }); loadContacts() }
  async function updateContact(contact) { await supabase.from('contacts').update(contact).eq('id', contact.id); loadContacts() }
  async function deleteContact(contactId) { if (!confirm('Supprimer ce contact ?')) return; await supabase.from('contacts').delete().eq('id', contactId); loadContacts() }

  async function loadSharedFiles() { const { data } = await supabase.from('shared_files').select('*').order('uploaded_at', { ascending: false }); if (data) setSharedFiles(data) }
  async function handleFileUpload(event) {
    const file = event.target.files?.[0]; if (!file) return; setUploadingFile(true)
    const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { error } = await supabase.storage.from('files').upload(filePath, file); if (error) { alert(`Erreur: ${error.message}`); setUploadingFile(false); return }
    const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath)
    await supabase.from('shared_files').insert([{ name: file.name, file_url: urlData.publicUrl, file_type: file.type, uploaded_by: currentUser }])
    setUploadingFile(false); loadSharedFiles(); event.target.value = ''
  }
  async function deleteFile(fileId) { if (!confirm('Supprimer ce fichier ?')) return; await supabase.from('shared_files').delete().eq('id', fileId); loadSharedFiles() }

  async function loadComments(videoId) { const { data } = await supabase.from('comments').select('*').eq('video_id', videoId).order('created_at', { ascending: true }); if (data) setComments(prev => ({ ...prev, [videoId]: data })) }
  async function addComment(videoId) { if (!newComment.trim()) return; await supabase.from('comments').insert([{ video_id: videoId, user_id: currentUser, text: newComment }]); setNewComment(''); loadComments(videoId) }

  function getFilteredVideos() {
    let filtered = videos
    if (filterType !== 'all') filtered = filtered.filter(v => v.type_id === filterType)
    if (filterValidation === 'to_validate' && currentUser) { const f = `${currentUser.toLowerCase().replace(' ', '')}_approved`; filtered = filtered.filter(v => !v[f]) }
    else if (filterValidation === 'validated' && currentUser) { const f = `${currentUser.toLowerCase().replace(' ', '')}_approved`; filtered = filtered.filter(v => v[f]) }
    else if (filterValidation === 'all_validated') filtered = filtered.filter(v => v.bertrand_approved && v.sebastien_approved && v.pierreemmanuel_approved)
    return filtered
  }
  const filteredVideos = getFilteredVideos()
  const toValidateCount = currentUser ? videos.filter(v => { const f = `${currentUser.toLowerCase().replace(' ', '')}_approved`; return !v[f] }).length : 0

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">SKROLL.TV</h1>
          <p className="text-gray-600 mb-8 text-center">Connectez-vous</p>
          {loginError && <p className="text-red-500 text-center mb-4">{loginError}</p>}
          <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4" />
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
            <input type="password" placeholder="Nouveau mot de passe" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-3" />
            <input type="password" placeholder="Confirmer" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-3" />
            {passwordMessage && <p className={`text-sm mb-3 ${passwordMessage.includes('changé') ? 'text-green-600' : 'text-red-500'}`}>{passwordMessage}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setShowPasswordModal(false); setPasswordMessage('') }} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">Annuler</button>
              <button onClick={handleChangePassword} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">Changer</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">SKROLL.TV</h1>
          <div className="flex items-center gap-4">
            {toValidateCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{toValidateCount} à valider</span>}
            <span className="text-gray-700 font-medium">{currentUser}</span>
            <button onClick={() => setShowPasswordModal(true)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">🔐</button>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Déconnexion</button>
          </div>
        </div>
      </header>

      <div className="flex">
        <nav className="w-64 bg-white border-r border-gray-200 fixed left-0 top-[73px] bottom-0 overflow-y-auto">
          <ul className="p-4 space-y-2">
            {[{id:'videos',icon:'🎬',label:'Vidéos'},{id:'tasks',icon:'✅',label:'Tâches'},{id:'ideas',icon:'💡',label:'Idées'},{id:'contacts',icon:'👥',label:'Contacts'},{id:'files',icon:'📁',label:'Fichiers'}].map((item) => (
              <li key={item.id}><button onClick={() => setCurrentSection(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${currentSection === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}><span className="text-xl">{item.icon}</span><span>{item.label}</span></button></li>
            ))}
          </ul>
        </nav>

        <main className="ml-64 p-8 w-full">
          {currentSection === 'videos' && (
            <div>
              <div className="mb-6 flex justify-between items-start">
                <div><h2 className="text-3xl font-bold text-gray-900 mb-2">Vidéos</h2><p className="text-gray-600">Uploadez et validez vos shorts collectivement</p></div>
                <div className="flex gap-2">
                  <button onClick={() => setViewMode('grid')} className={`px-3 py-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Grille</button>
                  <button onClick={() => setViewMode('table')} className={`px-3 py-2 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Tableau</button>
                </div>
              </div>
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800"><strong>📹 Format optimal :</strong> MP4 H.264 • 720p (1280×720) • Débit 5-8 Mbps • Audio AAC 128kbps</p>
                <p className="text-xs text-blue-600 mt-1">Utilisez HandBrake ou FFmpeg pour convertir vos vidéos avant upload.</p>
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
                <div className="flex gap-2 items-center ml-auto">
                  <input type="text" placeholder="Nouveau type..." value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                  <button onClick={addVideoType} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm">+ Ajouter</button>
                </div>
              </div>
              <div className="mb-6 flex flex-wrap gap-2">
                {videoTypes.map(t => (<span key={t.id} className="inline-flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full text-sm">{t.name}<button onClick={() => deleteVideoType(t.id)} className="text-red-500 hover:text-red-700 ml-1">×</button></span>))}
              </div>
              <label className="block mb-8 cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-8 text-center bg-white transition-colors">
                  <input type="file" accept="video/*" multiple onChange={handleVideoUpload} disabled={uploading} className="hidden" />
                  <div className="text-4xl mb-2">📤</div>
                  <div className="text-lg font-medium text-gray-700">{uploading ? uploadStatus : 'Cliquez pour sélectionner des vidéos'}</div>
                  <div className="text-sm text-gray-500">MP4, MOV - Max 50 MB - Sélection multiple</div>
                  {uploading && (<div className="mt-4 max-w-md mx-auto"><div className="w-full bg-gray-200 rounded-full h-3"><div className="bg-blue-600 h-3 rounded-full transition-all" style={{width:`${uploadProgress}%`}}></div></div><p className="text-sm text-gray-600 mt-2">{uploadProgress}%</p></div>)}
                </div>
              </label>
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVideos.map((video) => (
                    <div key={video.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <video src={video.file_url} controls preload="metadata" className="w-full aspect-video bg-gray-900" onLoadedMetadata={(e) => { if (!video.duration) { const dur = e.target.duration; updateVideoDuration(video.id, `${Math.floor(dur/60)}:${Math.floor(dur%60).toString().padStart(2,'0')}`) }}} />
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{video.title}</h3>
                        <div className="flex gap-2 mb-3">
                          <select value={video.type_id || ''} onChange={(e) => updateVideoType(video.id, e.target.value)} className="text-xs border rounded px-2 py-1"><option value="">Type...</option>{videoTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                          <input type="text" placeholder="Durée" value={video.duration || ''} onChange={(e) => updateVideoDuration(video.id, e.target.value)} className="text-xs border rounded px-2 py-1 w-20" />
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {['Bertrand','Sébastien','PierreEmmanuel'].map((name) => { const approved = video[`${name.toLowerCase()}_approved`]; return <button key={name} onClick={() => toggleApproval(video.id, name)} className={`px-3 py-1 rounded-full text-xs font-medium ${approved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{approved ? '✓' : '○'} {name === 'PierreEmmanuel' ? 'Pierre E.' : name}</button> })}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => { setSelectedVideoForComment(video.id); loadComments(video.id) }} className="text-xs text-blue-600 hover:underline">💬 Commentaires</button>
                          <a href={video.file_url} download className="text-xs text-green-600 hover:underline">⬇ Télécharger</a>
                          <a href={video.file_url} target="_blank" className="text-xs text-purple-600 hover:underline">▶ Ouvrir</a>
                          <button onClick={() => deleteVideo(video.id)} className="text-xs text-red-600 hover:underline ml-auto">🗑 Supprimer</button>
                        </div>
                        {selectedVideoForComment === video.id && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="space-y-2 max-h-32 overflow-y-auto mb-2">{(comments[video.id] || []).map(c => (<div key={c.id} className="text-xs bg-gray-50 p-2 rounded"><span className="font-medium">{c.user_id}:</span> {c.text}</div>))}</div>
                            <div className="flex gap-2"><input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Commenter..." className="flex-1 text-xs border rounded px-2 py-1" /><button onClick={() => addComment(video.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Envoyer</button></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {viewMode === 'table' && (
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Titre</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Durée</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Uploadé par</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Validations</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredVideos.map((video) => (
                        <tr key={video.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{video.title}</td>
                          <td className="px-4 py-3 text-sm">{video.video_types?.name || '-'}</td>
                          <td className="px-4 py-3 text-sm">{video.duration || '-'}</td>
                          <td className="px-4 py-3 text-sm">{video.uploaded_by}</td>
                          <td className="px-4 py-3 text-sm"><span className={video.bertrand_approved ? 'text-green-600' : 'text-gray-400'}>B</span><span className={video.sebastien_approved ? 'text-green-600' : 'text-gray-400'}> S</span><span className={video.pierreemmanuel_approved ? 'text-green-600' : 'text-gray-400'}> P</span></td>
                          <td className="px-4 py-3 text-sm space-x-2"><a href={video.file_url} target="_blank" className="text-blue-600 hover:underline">▶ Lire</a><a href={video.file_url} download className="text-green-600 hover:underline">⬇ DL</a><button onClick={() => deleteVideo(video.id)} className="text-red-600 hover:underline">Supprimer</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {filteredVideos.length === 0 && <div className="text-center py-12 text-gray-500">Aucune vidéo</div>}
            </div>
          )}

          {currentSection === 'tasks' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Tâches</h2>
              <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
                <h3 className="font-semibold mb-4">Nouvelle tâche</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input type="text" placeholder="Nom de la tâche" value={newTask.name} onChange={(e) => setNewTask({...newTask, name: e.target.value})} className="border rounded-lg px-3 py-2" />
                  <select value={newTask.folder_name} onChange={(e) => setNewTask({...newTask, folder_name: e.target.value})} className="border rounded-lg px-3 py-2">{taskFolders.map(f => <option key={f} value={f}>{f}</option>)}</select>
                  <select value={newTask.assignee} onChange={(e) => setNewTask({...newTask, assignee: e.target.value})} className="border rounded-lg px-3 py-2"><option value="">Assigné à...</option><option value="Bertrand">Bertrand</option><option value="Sébastien">Sébastien</option><option value="Pierre Emmanuel">Pierre Emmanuel</option></select>
                  <input type="date" value={newTask.deadline} onChange={(e) => setNewTask({...newTask, deadline: e.target.value})} className="border rounded-lg px-3 py-2" />
                </div>
                <textarea placeholder="Description..." value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-4" rows={2} />
                <button onClick={createTask} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg">Créer</button>
              </div>
              {taskFolders.map(folder => { const folderTasks = tasks.filter(t => t.folder_name === folder); if (folderTasks.length === 0) return null; return (
                <div key={folder} className="mb-8"><h3 className="font-semibold text-lg mb-4">{folder}</h3><div className="space-y-3">
                  {folderTasks.map(task => (<div key={task.id} className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-4">
                    <select value={task.status} onChange={(e) => updateTaskStatus(task.id, e.target.value)} className={`text-xs px-2 py-1 rounded ${task.status === 'Terminée' ? 'bg-green-100 text-green-800' : task.status === 'En cours' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}`}><option value="À faire">À faire</option><option value="En cours">En cours</option><option value="Terminée">Terminée</option></select>
                    <div className="flex-1"><p className="font-medium">{task.name}</p>{task.description && <p className="text-sm text-gray-500">{task.description}</p>}</div>
                    {task.assignee && <span className="text-sm text-gray-600">{task.assignee}</span>}
                    {task.deadline && <span className="text-sm text-gray-500">{task.deadline}</span>}
                    <button onClick={() => deleteTask(task.id)} className="text-red-500 hover:text-red-700">🗑</button>
                  </div>))}
                </div></div>
              )})}
            </div>
          )}

          {currentSection === 'ideas' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Idées</h2>
              <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
                <h3 className="font-semibold mb-4">Nouvelle idée</h3>
                <input type="text" placeholder="Titre de l'idée" value={newIdea.title} onChange={(e) => setNewIdea({...newIdea, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 mb-4" />
                <textarea placeholder="Description..." value={newIdea.description} onChange={(e) => setNewIdea({...newIdea, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 mb-4" rows={3} />
                <input type="text" placeholder="Tags (séparés par des virgules)" value={newIdea.tags} onChange={(e) => setNewIdea({...newIdea, tags: e.target.value})} className="w-full border rounded-lg px-3 py-2 mb-4" />
                <button onClick={createIdea} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Ajouter</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ideas.map(idea => (<div key={idea.id} className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-lg mb-2">{idea.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{idea.description}</p>
                  {idea.tags && <div className="flex flex-wrap gap-2 mb-4">{idea.tags.map((tag, i) => <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{tag}</span>)}</div>}
                  <div className="flex justify-between items-center">
                    <select value={idea.status} onChange={(e) => updateIdea({...idea, status: e.target.value})} className="text-xs border rounded px-2 py-1"><option value="Nouvelle">Nouvelle</option><option value="En réflexion">En réflexion</option><option value="Validée">Validée</option><option value="Rejetée">Rejetée</option></select>
                    <button onClick={() => deleteIdea(idea.id)} className="text-red-500 hover:text-red-700 text-sm">Supprimer</button>
                  </div>
                </div>))}
              </div>
            </div>
          )}

          {currentSection === 'contacts' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Contacts</h2>
              <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
                <h3 className="font-semibold mb-4">Nouveau contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input type="text" placeholder="Nom" value={newContact.name} onChange={(e) => setNewContact({...newContact, name: e.target.value})} className="border rounded-lg px-3 py-2" />
                  <select value={newContact.type} onChange={(e) => setNewContact({...newContact, type: e.target.value})} className="border rounded-lg px-3 py-2">{contactTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  <input type="text" placeholder="Email/Téléphone" value={newContact.contact} onChange={(e) => setNewContact({...newContact, contact: e.target.value})} className="border rounded-lg px-3 py-2" />
                  <select value={newContact.status} onChange={(e) => setNewContact({...newContact, status: e.target.value})} className="border rounded-lg px-3 py-2">{contactStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
                </div>
                <textarea placeholder="Notes..." value={newContact.notes} onChange={(e) => setNewContact({...newContact, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2 mt-4" rows={2} />
                <button onClick={createContact} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg">Ajouter</button>
              </div>
              <div className="bg-white rounded-xl shadow overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nom</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Contact</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Statut</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Notes</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th></tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {contacts.map(contact => (<tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{contact.name}</td>
                      <td className="px-4 py-3 text-sm">{contact.type}</td>
                      <td className="px-4 py-3 text-sm">{contact.contact}</td>
                      <td className="px-4 py-3 text-sm"><select value={contact.status} onChange={(e) => updateContact({...contact, status: e.target.value})} className="text-xs border rounded px-2 py-1">{contactStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                      <td className="px-4 py-3 text-sm text-gray-500">{contact.notes}</td>
                      <td className="px-4 py-3 text-sm"><button onClick={() => deleteContact(contact.id)} className="text-red-600 hover:underline">Supprimer</button></td>
                    </tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentSection === 'files' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Fichiers partagés</h2>
              <label className="block mb-8 cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-8 text-center bg-white">
                  <input type="file" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
                  <div className="text-4xl mb-2">📎</div>
                  <div className="text-lg font-medium text-gray-700">{uploadingFile ? 'Upload en cours...' : 'Cliquez pour uploader un fichier'}</div>
                  <div className="text-sm text-gray-500">PDF, Images, Documents...</div>
                </div>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {sharedFiles.map(file => (<div key={file.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-3xl mb-2">{file.file_type?.includes('image') ? '🖼' : file.file_type?.includes('pdf') ? '📄' : '📎'}</div>
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 mb-3">{file.uploaded_by}</p>
                  <div className="flex gap-2"><a href={file.file_url} target="_blank" className="text-xs text-blue-600 hover:underline">Ouvrir</a><button onClick={() => deleteFile(file.id)} className="text-xs text-red-600 hover:underline">Supprimer</button></div>
                </div>))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
