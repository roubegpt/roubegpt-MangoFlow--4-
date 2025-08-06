import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/roubegpt-MangoFlow--4-/',  // GitHub Pages 경로 맞춤 설정
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client'),
    },
  },
  root: 'client',
  build: {
    outDir: '../dist',
  },
})
