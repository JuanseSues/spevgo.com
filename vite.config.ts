import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Spevgo',
        short_name: 'Spevgo',
        description: 'Tu próxima aventura deportiva te espera',
        theme_color: '#059669',
        background_color: '#ecfdf5',
        display: 'standalone',
        start_url: '/',
        lang: 'es-CO',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
})
