import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Cast process to any to avoid TypeScript error about missing cwd()
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    // This is critical for hosting in a subfolder (e.g. example.com/vaccines)
    base: './',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'Health Tracker',
          short_name: 'Health Tracker',
          description: 'A personal companion for tracking health, vaccines, diet, and gym sessions.',
          theme_color: '#ffffff',
          background_color: '#f8fafc',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      // API_KEY is no longer exposed to the client bundle.
      // Logic is handled in Firebase Functions.
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});