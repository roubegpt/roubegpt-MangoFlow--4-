import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/roubegpt-MangoFlow--4-/', // 깃허브 페이지 경로에 맞게
  root: 'client',  // root 디렉토리를 client로 지정
  plugins: [react()],
  server: {
    port: 5173,
  },
})
