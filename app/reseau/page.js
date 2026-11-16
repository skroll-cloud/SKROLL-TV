'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://riotdlbdywxuouvdgqpt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpb3RkbGJkeXd4dW91dmRncXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTIxOTAsImV4cCI6MjA4NTcyODE5MH0.DymkDS6E-ouapVQerRjZSHDEeUbV81GY-5i7d5kOQ1w'
)

// Instagram network: accounts to follow and comment on (table reseau_instagram), plus the daily routine.
// No automation: the team follows / comments by hand; the page only keeps track of who did what.
const CATS = [
  ['archives', 'Archives et patrimoine'],
  ['medias', 'Médias bretons'],
  ['humour', 'Humour et créateurs'],
  ['festivals', 'Festivals et lieux'],
  ['nostalgie', 'Nostalgie'],
  ['autre', 'Autres'],
]

const ROUTINE = [
  'Le jour de sortie, entre 18 h et 19 h : répondre à tous les commentaires sous l\'épisode, dans le ton SKROLL (fausse info sur l\'archive bienvenue).',
  '5 à 10 vrais commentaires drôles par jour chez les comptes ci-dessous (pas d\'emoji seul, pas de « allez voir notre page »). Cochez « commenté aujourd\'hui ».',
  'Message privé à la main seulement pour ceux qui partagent un épisode, commentent souvent ou sont un compte local un peu connu. Jamais de message automatique.',
  'Repartager en story ceux qui repartagent nos épisodes.',
  'Pas d\'abonnements en masse, pas d\'achat d\'abonnés, pas de groupes d\'entraide ni d\'outils automatiques.',
]

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
const daysAgo = d => d ? Math.round((new Date(today()) - new Date(d)) / 86400000) : null

export default function Reseau() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [rows, setRows] = useState([])
  const [cat, setCat] = useState('tous')
  const [onlyCollab, setOnlyCollab] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ handle: '', nom: '', categorie: 'archives', pourquoi: '', collab: false })
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('skroll_user')
    if (!saved) { router.push('/equipe'); return }
    setUser(saved)
    load()
  }, [])

  async function load() {
    const { data, error } = await supabase.from('reseau_instagram').select('*').order('categorie').order('nom')
    if (error) setError(error.message); else setRows(data || [])
  }

  async function patch(id, fields) {
    setRows(r => r.map(x => x.id === id ? { ...x, ...fields } : x))
    const { error } = await supabase.from('reseau_instagram').update(fields).eq('id', id)
    if (error) { setError(error.message); load() }
  }

  async function add(e) {
    e.preventDefault()
    const handle = form.handle.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '').toLowerCase()
    if (!handle) return
    const { error } = await supabase.from('reseau_instagram').insert({ ...form, handle, nom: form.nom.trim() || handle, ajoute_par: user })
    if (error) { setError(error.code === '23505' ? `@${handle} est déjà dans la liste.` : error.message); return }
    setForm({ handle: '', nom: '', categorie: form.categorie, pourquoi: '', collab: false })
    setAdding(false); setError(''); load()
  }

  async function remove(r) {
    if (!confirm(`Retirer @${r.handle} de la liste ?`)) return
    const { error } = await supabase.from('reseau_instagram').delete().eq('id', r.id)
    if (error) setError(error.message); else load()
  }

  if (!user) return null
  const shown = rows.filter(r => (cat === 'tous' || r.categorie === cat) && (!onlyCollab || r.collab))
  const doneToday = rows.filter(r => r.dernier_commentaire === today()).length
  const suivis = rows.filter(r => r.suivi).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="px-4 md:px-6 py-3 flex justify-between items-center">
          <button onClick={() => router.push('/equipe')} className="text-sm text-gray-500 hover:text-gray-800">← Espace de travail</button>
          <h1 className="text-lg font-bold text-blue-600 tracking-tight">SKROLL.TV</h1>
          <button onClick={() => router.push('/stats')} className="text-sm text-gray-500 hover:text-gray-800">Statistiques →</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Réseau Instagram</h2>
        <p className="text-sm text-gray-600 mt-1 mb-6">Les comptes où laisser de vrais commentaires et chercher des collaborations. Tout se fait à la main sur Instagram ; ici on note qui suit et qui a commenté.</p>

        <section className="bg-white rounded-xl border p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">La routine (20 min par jour, à tour de rôle)</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700">{ROUTINE.map(i => <li key={i}>{i}</li>)}</ul>
          <p className="text-sm text-gray-900 mt-3"><span className="font-semibold">{doneToday}</span> compte{doneToday > 1 ? 's' : ''} commenté{doneToday > 1 ? 's' : ''} aujourd'hui · <span className="font-semibold">{suivis}</span>/{rows.length} suivis</p>
        </section>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[['tous', 'Tous'], ...CATS].map(([id, label]) => {
            const n = id === 'tous' ? rows.length : rows.filter(r => r.categorie === id).length
            if (id !== 'tous' && !n) return null
            return <button key={id} onClick={() => setCat(id)} className={`text-sm rounded-full px-3 py-1 border ${cat === id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>{label} <span className="opacity-70">{n}</span></button>
          })}
          <label className="text-sm text-gray-700 flex items-center gap-1.5 ml-1"><input type="checkbox" checked={onlyCollab} onChange={e => setOnlyCollab(e.target.checked)} /> Pistes de collab</label>
          <button onClick={() => setAdding(a => !a)} className="ml-auto text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700 hover:bg-gray-100">+ Ajouter un compte</button>
        </div>

        {adding && (
          <form onSubmit={add} className="bg-white rounded-xl border p-4 mb-4 grid gap-2 md:grid-cols-2">
            <input required placeholder="@identifiant ou lien Instagram" value={form.handle} onChange={e => setForm({ ...form, handle: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Nom" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} className="border rounded-lg px-3 py-2 text-sm bg-white">{CATS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select>
            <label className="text-sm text-gray-700 flex items-center gap-1.5"><input type="checkbox" checked={form.collab} onChange={e => setForm({ ...form, collab: e.target.checked })} /> Piste de collab</label>
            <input placeholder="Pourquoi ce compte" value={form.pourquoi} onChange={e => setForm({ ...form, pourquoi: e.target.value })} className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />
            <div className="md:col-span-2 flex gap-2"><button className="text-sm rounded-lg px-3 py-1.5 bg-blue-600 text-white">Ajouter</button><button type="button" onClick={() => setAdding(false)} className="text-sm rounded-lg px-3 py-1.5 border">Annuler</button></div>
          </form>
        )}

        <ul className="space-y-2">
          {shown.map(r => {
            const d = daysAgo(r.dernier_commentaire)
            return (
              <li key={r.id} className="bg-white rounded-xl border p-3 md:p-4">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <div className="min-w-0 flex-1">
                    <a href={`https://www.instagram.com/${r.handle}/`} target="_blank" rel="noreferrer" className="font-semibold text-gray-900 hover:text-blue-600">{r.nom || r.handle}</a>
                    <span className="text-sm text-gray-500"> @{r.handle}{r.abonnes ? ` · ${r.abonnes} abonnés` : ''}</span>
                    {r.collab && <span className="ml-2 text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">collab</span>}
                    {r.pourquoi && <p className="text-sm text-gray-600 mt-0.5">{r.pourquoi}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <label className="flex items-center gap-1.5 text-gray-700" title={r.suivi_par ? `par ${r.suivi_par}` : ''}>
                      <input type="checkbox" checked={r.suivi} onChange={e => patch(r.id, { suivi: e.target.checked, suivi_par: e.target.checked ? user : null })} /> Suivi
                    </label>
                    <button onClick={() => patch(r.id, { dernier_commentaire: today(), commente_par: user })} disabled={d === 0}
                      className={`rounded-lg px-2.5 py-1 border ${d === 0 ? 'bg-green-50 text-green-700 border-green-200' : 'text-gray-700 hover:bg-gray-100'}`}>
                      {d === 0 ? `Commenté aujourd'hui${r.commente_par ? ` (${r.commente_par})` : ''}` : 'Commenté aujourd\'hui'}
                    </button>
                    {d > 0 && <span className="text-xs text-gray-500">dernier il y a {d} j{r.commente_par ? ` (${r.commente_par})` : ''}</span>}
                    <button onClick={() => remove(r)} className="text-xs text-gray-400 hover:text-red-600" title="Retirer de la liste">✕</button>
                  </div>
                </div>
                <input defaultValue={r.note || ''} placeholder="Note (contact, idée de collab…)" onBlur={e => e.target.value !== (r.note || '') && patch(r.id, { note: e.target.value })}
                  className="mt-2 w-full text-sm border-0 border-t pt-2 text-gray-600 placeholder-gray-400 focus:outline-none" />
              </li>
            )
          })}
          {!shown.length && <li className="text-sm text-gray-500">Aucun compte.</li>}
        </ul>
      </main>
    </div>
  )
}
