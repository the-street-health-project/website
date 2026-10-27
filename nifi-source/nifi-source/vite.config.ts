import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Vite builds the app. The PWA plugin adds the offline "service worker" and the install manifest.
export default defineConfig({
  // Relative paths, so the built app works from any folder (for example a GitHub Pages project page).
  base: './',
  build: {
    rolldownOptions: {
      output: {
        // Font files get short names ("font-<hash>.woff2"). Their package names are so long that
        // Windows' built-in unzip refuses them ("path too long") once the app sits inside another site.
        assetFileNames: (asset) => (/\.woff2?$/.test(asset.names[0] ?? '') ? 'assets/font-[hash][extname]' : 'assets/[name]-[hash][extname]'),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'NiFi',
        short_name: 'NiFi',
        description: 'Understand and reduce nitrate in Iowa waters, using public water data.',
        theme_color: '#020604',
        background_color: '#020604',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs to start offline, including the bundled demo data and fonts.
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Live water data: try the network first, fall back to the last saved copy.
            urlPattern: ({ url }) => url.hostname === 'waterservices.usgs.gov' || url.hostname === 'api.waterdata.usgs.gov',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'usgs-data',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 80, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'api.open-meteo.com',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 20, maxAgeSeconds: 2 * 24 * 60 * 60 },
            },
          },
          // OpenStreetMap map tiles are deliberately NOT cached for offline use: OSM's tile policy
          // forbids offline use. Offline, the map draws Iowa's counties from bundled data instead.
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
