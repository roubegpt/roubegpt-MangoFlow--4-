import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "client",                   // index.html이 위치한 폴더 경로
  base: "/roubegpt-MangoFlow--4-/", // GitHub Pages repo 경로와 정확히 일치시킬 것
  build: {
    outDir: "../dist",              // 빌드 결과물 위치 (루트 /dist)
  },
  plugins: [react()]
});
