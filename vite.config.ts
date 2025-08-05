import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";

// 배포 경로(base) 설정 필요
export default defineConfig({
  base: "/roubegpt-MangoFlow--4-/",
  plugins: [react(), tsconfigPaths()],
  build: {
    outDir: "../dist"
  }
});
