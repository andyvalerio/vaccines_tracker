import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    base: '/vaccines/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline', // Force injection into index.html
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        devOptions: {
          enabled: true
        },
        workbox: {
          importScripts: ['/vaccines/firebase-messaging-sw.js']
        },
        manifest: {
          name: 'Health Tracker',
          short_name: 'Health Tracker',
          description: 'A personal companion for tracking health, vaccines, diet, and gym sessions.',
          theme_color: '#ffffff',
          background_color: '#f8fafc',
          display: 'standalone',
          // FIX: Added /vaccines/ to the icon paths so mobile operating systems can find them
          icons: [
            {
              src: '/vaccines/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/vaccines/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      // API_KEY configuration space
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});