'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)

const PEOPLE = ['Bertrand', 'Sébastien', 'Pierre Emmanuel']
const OWNERS = [...PEOPLE, 'Tous', 'Claude']
const LAUNCH = new Date(2026, 10, 1)

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function countdown() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const j = Math.round((LAUNCH - today) / 86400000)
  if (j > 0) return `J−${j}`
  if (j === 0) return 'Jour J'
  return `J+${-j}`
}

export default function RetroplanningPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [who, setWho] = useState('all')
  const [hideDone, setHideDone] = useState(false)
  const [newWeek, setNewWeek] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('skroll_user')
    if (!saved) { router.push('/'); return }
    setCurrentUser(saved)
    setWho(localStorage.getItem('skroll_retro_who') || 'all')
    setHideDone(localStorage.getItem('skroll_retro_hide') === '1')
    loadTasks()
    const onFocus = () => loadTasks()
    window.addEventListener('focus', onFocus)
    const timer = setInterval(loadTasks, 30000)
    return () => { window.removeEventListener('focus', onFocus); clearInterval(timer) }
  }, [])

  async function loadTasks() {
    const { data, error } = await supabase.from('launch_tasks').select('*').order('sort', { ascending: true })
    if (error) setError("Impossible de charger les tâches. Rechargez la page.")
    else { setTasks(data); setError('') }
    setLoading(false)
  }

  async function updateTask(id, patch) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t))
    const { error } = await supabase.from('launch_tasks').update(patch).eq('id', id)
    if (error) { setError("Pas enregistré. Vérifiez la connexion et réessayez."); loadTasks() }
  }

  async function addTask(week) {
    const inWeek = tasks.filter(t => t.week === week).map(t => t.sort)
    const sort = (inWeek.length ? Math.max(...inWeek) : Math.max(0, ...tasks.map(t => t.sort))) + 1
    const owner = PEOPLE.includes(who) ? who : ''
    const { error } = await supabase.from('launch_tasks').insert([{ title: '', week, owner, sort }])
    if (error) setError("Tâche non ajoutée. Réessayez.")
    loadTasks()
  }

  async function addWeek() {
    const name = newWeek.trim()
    if (!name) return
    const open = tasks.filter(t => t.week !== 'Déjà fait').map(t => t.sort)
    const sort = (open.length ? Math.max(...open) : 0) + 100
    const { error } = await supabase.from('launch_tasks').insert([{ title: '', week: name, sort }])
    if (error) setError("Section non ajoutée. Réessayez.")
    setNewWeek('')
    loadTasks()
  }

  async function deleteTask(task) {
    if (!confirm(`Supprimer « ${task.title || 'tâche sans titre'} » ?`)) return
    setTasks(ts => ts.filter(t => t.id !== task.id))
    const { error } = await supabase.from('launch_tasks').delete().eq('id', task.id)
    if (error) { setError("Suppression impossible."); loadTasks() }
  }

  function changeWho(v) { setWho(v); localStorage.setItem('skroll_retro_who', v) }
  function changeHide(v) { setHideDone(v); localStorage.setItem('skroll_retro_hide', v ? '1' : '0') }

  const today = todayIso()
  const matches = t => who === 'all' || (who === 'none' ? !t.owner : t.owner === who || t.owner === 'Tous')
  const visible = tasks.filter(t => matches(t) && !(hideDone && t.done))
  const weeks = []
  visible.forEach(t => { if (!weeks.includes(t.week)) weeks.push(t.week) })
  const doneCount = tasks.filter(t => t.done).length
  const lateCount = tasks.filter(t => matches(t) && !t.done && t.due && t.due < today).length

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="px-4 md:px-6 py-3 flex justify-between items-center">
          <button onClick={() => router.push('/')} className="text-sm text-gray-500 hover:text-gray-800">← Espace de travail</button>
          <h1 className="text-lg font-bold text-blue-600 tracking-tight">SKROLL.TV</h1>
          <span className="text-sm text-gray-500 hidden md:inline">{currentUser}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Rétroplanning du lancement</h2>
            <p className="text-sm text-gray-500 mt-1">Tout ce qu'il reste à faire d'ici le dimanche 1er novembre. Cochez, choisissez qui s'en occupe, ajoutez ou supprimez des tâches.</p>
          </div>
          <div className="flex gap-6">
            <div><p className="text-2xl font-bold text-gray-900 tabular-nums">{countdown()}</p><p className="text-xs text-gray-500">avant le lancement</p></div>
            <div><p className="text-2xl font-bold text-gray-900 tabular-nums">{doneCount}/{tasks.length}</p><p className="text-xs text-gray-500">tâches faites</p></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 shadow-sm mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            Afficher les tâches de
            <select value={who} onChange={e => changeWho(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="all">tout le monde</option>
              {PEOPLE.map(p => <option key={p} value={p}>{p}</option>)}
              <option value="none">personne (à prendre)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={hideDone} onChange={e => changeHide(e.target.checked)} className="w-4 h-4" />
            Masquer ce qui est fait
          </label>
          {lateCount > 0 && <span className="ml-auto text-sm font-semibold text-red-600">{lateCount} {lateCount > 1 ? 'tâches en retard' : 'tâche en retard'}</span>}
        </div>

        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {loading && <p className="text-gray-500">Chargement…</p>}
        {!loading && weeks.length === 0 && <p className="text-gray-500">{tasks.length ? 'Rien à afficher avec ce filtre.' : 'Aucune tâche pour l\'instant.'}</p>}

        {weeks.map(week => {
          const all = tasks.filter(t => t.week === week)
          return (
            <section key={week} className="mb-8">
              <div className="flex items-baseline justify-between border-b-2 border-gray-900 pb-1.5 mb-1">
                <h3 className="font-bold text-gray-900">{week}</h3>
                <span className="text-xs text-gray-500 tabular-nums">{all.filter(t => t.done).length} / {all.length}</span>
              </div>
              {visible.filter(t => t.week === week).map(task => {
                const late = !task.done && task.due && task.due < today
                return (
                  <div key={task.id} className="grid grid-cols-[28px_1fr_36px] lg:grid-cols-[28px_1fr_170px_150px_36px] gap-2 items-center py-1.5 border-b border-dashed border-gray-200">
                    <input type="checkbox" aria-label="Fait" checked={task.done} onChange={e => updateTask(task.id, { done: e.target.checked })} className="w-[18px] h-[18px] mx-auto accent-green-600" />
                    <TitleInput task={task} onSave={title => updateTask(task.id, { title })} />
                    <div className="col-start-2 flex gap-2 lg:contents">
                    <select aria-label="Qui s'en occupe" value={task.owner} onChange={e => updateTask(task.id, { owner: e.target.value })}
                      className={`flex-1 lg:flex-none border rounded-lg px-2 py-1.5 text-sm ${task.owner ? 'text-gray-800' : 'text-orange-600 font-semibold'}`}>
                      <option value="">Qui ?</option>
                      {OWNERS.map(o => <option key={o} value={o}>{o === 'Tous' ? 'Tous les trois' : o}</option>)}
                    </select>
                    <input type="date" aria-label="Échéance" value={task.due || ''} onChange={e => updateTask(task.id, { due: e.target.value || null })}
                      className={`flex-1 lg:flex-none border rounded-lg px-2 py-1.5 text-sm ${late ? 'border-red-400 text-red-600 font-semibold' : 'text-gray-700'}`} />
                    </div>
                    <button onClick={() => deleteTask(task)} aria-label="Supprimer la tâche" className="row-start-1 col-start-3 lg:row-start-auto lg:col-start-auto text-gray-400 hover:text-red-500 text-sm">✕</button>
                  </div>
                )
              })}
              <button onClick={() => addTask(week)} className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800">+ Ajouter une tâche</button>
            </section>
          )
        })}

        {!loading && (
          <div className="bg-white rounded-xl p-3 shadow-sm flex flex-wrap gap-2 items-center">
            <input value={newWeek} onChange={e => setNewWeek(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWeek()}
              placeholder="Nouvelle section (ex. 2 → 8 nov. · Après le lancement)" className="flex-1 min-w-[220px] border rounded-lg px-3 py-2 text-sm" />
            <button onClick={addWeek} disabled={!newWeek.trim()} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40">Ajouter la section</button>
          </div>
        )}
      </main>
    </div>
  )
}

function TitleInput({ task, onSave }) {
  const [value, setValue] = useState(task.title)
  const [focused, setFocused] = useState(false)
  useEffect(() => { if (!focused) setValue(task.title) }, [task.title, focused])
  return (
    <input value={value} title={value} aria-label="Tâche" placeholder="Nouvelle tâche…"
      autoFocus={!task.title}
      onFocus={() => setFocused(true)}
      onChange={e => setValue(e.target.value)}
      onBlur={() => { setFocused(false); if (value !== task.title) onSave(value) }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className={`min-w-0 bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none rounded-lg px-2 py-1.5 text-sm ${task.done ? 'line-through text-gray-400' : 'text-gray-900'}`} />
  )
}
