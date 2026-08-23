import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Calculator Led Pro',
        short_name: 'LED Pro',
        description:
          'Calculadora de campo para técnicos de pantallas LED: geometría, carga eléctrica, cables y esquemáticos de ruteo.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0F0F0F',
        theme_color: '#0F0F0F',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The whole app is precached: a venue has no usable signal, so a cache
        // miss is a dead tool rather than a slow one.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // jsPDF and its dependencies are lazy chunks worth ~600 kB; they still
        // have to be there when someone exports a report with no connection.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // No runtime caching: the app makes no network requests at all now that
        // the fonts are self-hosted, so the `woff2` glob above precaches them
        // like any other asset instead of hoping for a first online load.
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
