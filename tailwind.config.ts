import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./client/src/**/*.{ts,tsx,js,jsx}", "./client/index.html"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
