import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['offline.html', 'offline.js', 'icons/favicon.svg', 'icons/apple-touch-icon.png', 'icons/badge-72.png'],
      manifest: {
        id: '/',
        name: 'ConsejoScout - Asistente SAAC',
        short_name: 'ConsejoScout',
        description:
          'Asistente operativo, administrativo y normativo offline-first para Jefaturas de Grupo de Scouts de Argentina Asociacion Civil (SAAC).',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#4D207A',
        background_color: '#F8FAFC',
        lang: 'es-AR',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ]
});
