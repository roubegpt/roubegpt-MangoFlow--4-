import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./client/src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      // 예: 커스텀 컬러, 폰트 등 추가 가능
    }
  },
  plugins: []
};

export default config;
