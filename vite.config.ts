import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // This is critical for hosting in a subfolder (e.g. example.com/vaccines)
  base: './', 
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});