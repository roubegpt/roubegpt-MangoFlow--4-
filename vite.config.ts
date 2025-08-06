import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/roubegpt-MangoFlow--4-/",
  root: "client",
  plugins: [react()]
});
