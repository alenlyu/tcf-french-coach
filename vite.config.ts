import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Base path matches a GitHub Pages project site: https://<user>.github.io/<repo>/
// Change base to '/' if deploying to a custom domain or a user/org root page.
export default defineConfig({
  base: '/tcf-french-coach/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'TCF French Coach',
        short_name: 'TCF Coach',
        description: 'Personal French training for TCF Canada',
        theme_color: '#f5efe6',
        background_color: '#f5efe6',
        display: 'standalone',
        start_url: '/tcf-french-coach/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
