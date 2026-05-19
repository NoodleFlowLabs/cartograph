import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  build: {
    assetsDir: 'assets',
    emptyOutDir: true,
    outDir: '../skills/cartograph/ui',
  },
  plugins: [react()],
})
