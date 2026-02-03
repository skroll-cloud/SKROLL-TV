'use client';

import { useState } from 'react';

export default function Home() {
  const [currentSection, setCurrentSection] = useState('videos');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-50 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">SKROLL.TV</div>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">Bertrand</span>
            <button className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <nav className="w-60 bg-white border-r border-gray-200 fixed left-0 top-[73px] bottom-0 p-6">
          <ul className="space-y-2">
            {[
              { id: 'videos', icon: '🎬', label: 'Vidéos' },
              { id: 'tasks', icon: '✅', label: 'Tâches' },
              { id: 'ideas', icon: '💡', label: 'Idées' },
              { id: 'contacts', icon: '👥', label: 'Contacts' }
            ].map(item => (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    currentSection === item.id
                      ? 'bg-gray-50 text-blue-600 border-r-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="ml-60 p-8 w-full">
          {currentSection === 'videos' && <VideosSection />}
          {currentSection === 'tasks' && <TasksSection />}
          {currentSection === 'ideas' && <IdeasSection />}
          {currentSection === 'contacts' && <ContactsSection />}
        </main>
      </div>

      <button className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full text-2xl shadow-lg hover:bg-blue-700 hover:scale-110 transition-all">
        +
      </button>
    </div>
  );
}

function VideosSection() {
  const videos = [
    { id: 1, title: 'Le marché de Morlaix 1952', duration: '0:28', uploaded: 'Il y a 2 jours', approvals: { bertrand: true, sebastien: true, pierreEmmanuel: false } },
    { id: 2, title: 'Les goémoniers à Carantec', duration: '0:15', uploaded: 'Il y a 4 jours', approvals: { bertrand: true, sebastien: false, pierreEmmanuel: false } },
    { id: 3, title: 'Fest-noz années 60', duration: '0:32', uploaded: 'Hier', approvals: { bertrand: false, sebastien: false, pierreEmmanuel: false } }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vidéos</h1>
        <p className="text-gray-600">Gérez vos shorts en cours et validés</p>
      </div>

      <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center mb-8 cursor-pointer hover:border-blue-600 hover:bg-gray-50 transition-all">
        <div className="text-5xl mb-4">📤</div>
        <div className="text-gray-600 mb-2">Glissez une vidéo ici ou cliquez pour uploader</div>
        <div className="text-gray-500 text-sm">MP4, MOV, AVI • Max 500 MB</div>
      </div>

      <div className="flex gap-4 mb-8 border-b-2 border-gray-200">
        <button className="px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600 -mb-0.5">
          En cours (8)
        </button>
        <button className="px-6 py-3 font-medium text-gray-600 hover:text-gray-900">
          Validées (23)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map(video => (
          <div key={video.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-blue-600 text-2xl">
                  ▶
                </div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{video.title}</h3>
              <div className="flex gap-4 text-sm text-gray-600 mb-4">
                <span>📅 {video.uploaded}</span>
                <span>⏱️ {video.duration}</span>
              </div>
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
                Voir & Commenter
              </button>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${video.approvals.bertrand ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {video.approvals.bertrand ? '✓' : '○'} Bertrand
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${video.approvals.sebastien ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {video.approvals.sebastien ? '✓' : '○'} Sébastien
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${video.approvals.pierreEmmanuel ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {video.approvals.pierreEmmanuel ? '✓' : '○'} Pierre Emmanuel
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksSection() {
  const folders = [
    { 
      id: 1, 
      icon: '🎬', 
      name: 'Production vidéo', 
      count: 5,
      tasks: [
        { name: 'Monter le short "Marché Morlaix"', assignee: 'Bertrand', deadline: 'Pour demain', status: 'progress' },
        { name: 'Étalonnage vidéo goémoniers', assignee: 'Sébastien', deadline: 'Cette semaine', status: 'todo' }
      ]
    },
    { 
      id: 2, 
      icon: '🎨', 
      name: 'Identité visuelle', 
      count: 3,
      tasks: [
        { name: 'Créer le logo Skroll', assignee: 'Pierre Emmanuel', deadline: 'Urgent', status: 'progress' }
      ]
    },
    { 
      id: 3, 
      icon: '📣', 
      name: 'Lancement & Communication', 
      count: 7,
      tasks: [
        { name: 'Lister les journalistes bretons', assignee: 'Bertrand', deadline: 'Fin de semaine', status: 'todo' }
      ]
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion de projet</h1>
        <p className="text-gray-600">Organisez vos tâches par dossiers</p>
      </div>

      <div className="space-y-6">
        {folders.map(folder => (
          <div key={folder.id} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{folder.icon}</span>
                <h2 className="text-lg font-semibold">{folder.name}</h2>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-semibold">
                  {folder.count}
                </span>
              </div>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                + Ajouter une tâche
              </button>
            </div>
            <div className="space-y-2">
              {folder.tasks.map((task, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="w-5 h-5 border-2 border-gray-300 rounded cursor-pointer"></div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">{task.name}</div>
                    <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
                      <span>👤 {task.assignee}</span>
                      <span>📅 {task.deadline}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        task.status === 'progress' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status === 'progress' ? 'En cours' : 'À faire'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IdeasSection() {
  const ideas = [
    { title: 'Breton qui découvre TikTok', description: 'Utiliser des images d\'archives de paysans bretons qui regardent un écran de télé pour la première fois', tags: ['Meme potentiel', 'Réaction'] },
    { title: 'Le fest-noz devient un festival techno', description: 'Montage avec musique électro sur des images de fest-noz traditionnel', tags: ['Humour', 'Musique'] },
    { title: 'POV : tu ghostes un pêcheur breton', description: 'Séquence d\'un pêcheur qui attend sur le port avec des sous-titres moderne', tags: ['Trending', 'POV'] }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Banque d'idées</h1>
        <p className="text-gray-600">Toutes vos idées de vidéos et séquences à détourner</p>
      </div>

      <div className="flex gap-4 mb-8 border-b-2 border-gray-200">
        <button className="px-6 py-3 font-medium text-blue-600 border-b-2 border-blue-600 -mb-0.5">
          Idées de vidéos (12)
        </button>
        <button className="px-6 py-3 font-medium text-gray-600 hover:text-gray-900">
          Séquences repérées (8)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ideas.map((idea, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-600">
            <h3 className="font-semibold mb-2">{idea.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{idea.description}</p>
            <div className="flex gap-2 flex-wrap">
              {idea.tags.map((tag, tagIdx) => (
                <span key={tagIdx} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactsSection() {
  const contacts = [
    { name: 'Marie Dupont', type: 'Journaliste', contact: 'marie.dupont@ouestfrance.fr', status: 'progress' },
    { name: 'Théâtre de Morlaix', type: 'Partenaire', contact: 'contact@theatre-morlaix.fr', status: 'todo' },
    { name: '@breizh_humor', type: 'Influenceur', contact: 'Instagram - 45k abonnés', status: 'done' }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contacts</h1>
        <p className="text-gray-600">Journalistes, partenaires et influenceurs</p>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        {['Tous (34)', 'Journalistes (12)', 'Partenaires (8)', 'Influenceurs (14)'].map((filter, idx) => (
          <button key={idx} className={`px-4 py-2 rounded-lg text-sm font-medium ${
            idx === 0 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-blue-600 hover:text-white'
          }`}>
            {filter}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nom</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contact</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Statut</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{contact.name}</td>
                <td className="px-6 py-4 text-gray-600">{contact.type}</td>
                <td className="px-6 py-4 text-gray-600">{contact.contact}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    contact.status === 'done' ? 'bg-green-100 text-green-800' :
                    contact.status === 'progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {contact.status === 'done' ? 'Partenariat OK' :
                     contact.status === 'progress' ? 'Contactée' : 'À contacter'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                    Éditer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
