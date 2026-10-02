import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Allow importing the shared complaint config from ../backend
    fs: { allow: [".."] },
  },
});
