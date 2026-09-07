import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Kök domainde yayınlanıyor; /oyun/... gibi alt yollarda assetlerin doğru
  // yüklenmesi için base mutlak olmalı.
  base: '/',
})
