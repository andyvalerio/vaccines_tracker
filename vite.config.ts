import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // This is critical for hosting in a subfolder (e.g. example.com/vaccines)
    base: './', 
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY for the client code (Gemini Service)
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});