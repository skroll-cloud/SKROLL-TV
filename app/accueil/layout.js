export const metadata = {
  title: 'SKROLL · Des images vraies, des histoires fausses',
  description: "Des tutos, des pranks, des influenceurs et des POV… tournés il y a cinquante ans. SKROLL détourne les films amateurs de la Cinémathèque de Bretagne pour parodier les réseaux sociaux. Un nouvel épisode chaque soir à 18 h 30.",
  openGraph: {
    title: 'SKROLL · Des images vraies, des histoires fausses',
    description: 'Les films amateurs de la Cinémathèque de Bretagne détournés en vidéos de réseaux sociaux. Un nouvel épisode chaque soir à 18 h 30.',
    url: 'https://www.skroll.tv/accueil',
    images: ['/banniere-skroll.jpg'],
    locale: 'fr_FR',
    type: 'website',
  },
}

export default function AccueilLayout({ children }) {
  return children
}
