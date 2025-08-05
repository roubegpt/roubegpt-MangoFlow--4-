import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/roubegpt-MangoFlow--4-/', // 깃허브 저장소 이름과 맞게 설정
  plugins: [react()],
  server: {
    port: 5173,
  },
})
