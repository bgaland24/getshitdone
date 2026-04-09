import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Output du build React vers le dossier static de Flask
    outDir: '../backend/static',
    emptyOutDir: true,
  },
  server: {
    // Proxy API vers Flask en dev (flask tourne sur 5000)
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
