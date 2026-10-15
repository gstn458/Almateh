import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // hls.js (the video player) is large; this silences a harmless size warning.
  build: { chunkSizeWarningLimit: 1500 },
});
