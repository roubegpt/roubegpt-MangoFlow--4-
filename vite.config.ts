import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 실제 GitHub Pages 경로에 맞춰 base 경로 지정 (사용자명/저장소명)
export default defineConfig({
  base: '/roubegpt-MangoFlow--4-/',
  plugins: [react()],
  build: {
    outDir: '../dist',  // package.json build 스크립트와 동일하게 맞춤
  },
});
