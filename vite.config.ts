import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "client",
  base: "/roubegpt-MangoFlow--4-/",
  plugins: [react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});
