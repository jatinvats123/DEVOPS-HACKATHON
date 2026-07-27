import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The Express backend serves the SPA from Backend/public/dist. Emitting the
    // build straight there means `npm run build` reproduces exactly what the
    // deployment serves — so the bundle never needs to be committed to git.
    outDir: '../Backend/public/dist',
    emptyOutDir: true,
  },
});
