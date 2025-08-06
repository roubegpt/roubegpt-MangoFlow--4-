import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  root: "client",
  base: "/roubegpt-MangoFlow--4-/",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  plugins: [react(), tsconfigPaths()],
});
