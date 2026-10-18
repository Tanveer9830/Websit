import type { Config } from "tailwindcss";

// Tailwind v4 is configured in CSS via @theme, so this file only declares
// the source detection roots for tooling that reads a config file.
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
};

export default config;
