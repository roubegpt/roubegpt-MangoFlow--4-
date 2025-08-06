import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./client/src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderColor: {
        border: "hsl(20, 5.9%, 90%)", // --border 커스텀 컬러 정의
      },
      colors: {
        primary: "hsl(200, 95%, 55%)", // 필요에 따라 추가 가능
      },
    },
  },
  plugins: [],
};

export default config;
