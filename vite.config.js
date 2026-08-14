import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Deploy alt klasörde (örn. GitHub Pages /repo-adi/) ise base'i değiştir.
  base: './',
})
