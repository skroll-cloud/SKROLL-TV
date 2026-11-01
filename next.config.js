/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // the home page moved to / and the team workspace to /equipe
      { source: '/accueil', destination: '/', permanent: false },
    ]
  },
}

module.exports = nextConfig
