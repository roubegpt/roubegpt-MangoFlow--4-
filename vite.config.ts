import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "client",
  base: "/roubegpt-MangoFlow--4-/",  // 실제 GitHub Pages repo 이름과 맞춰서 변경하세요.
  build: {
    outDir: "../dist"
  },
  plugins: [react()]
});
