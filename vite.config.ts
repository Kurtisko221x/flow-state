import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // relative base so the build works on GitHub Pages under /flow-state/
  base: "./",
  plugins: [react(), tailwindcss()],
});
