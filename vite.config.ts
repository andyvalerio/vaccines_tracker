import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Cast process to any to avoid TypeScript error about missing cwd()
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    // This is critical for hosting in a subfolder (e.g. example.com/vaccines)
    base: './', 
    plugins: [react()],
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