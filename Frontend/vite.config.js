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

    // Source maps for production debugging. Without them a stack trace from a
    // real user is minified nonsense, and Lighthouse flags their absence under
    // Best Practices. They are emitted as separate .map files, so they cost
    // nothing on the critical path — a browser only fetches them when devtools
    // is open.
    sourcemap: true,

    rollupOptions: {
      output: {
        /**
         * Split the heavy, rarely-changing vendors into their own chunks.
         *
         * Route-level splitting alone still puts React, Redux and Recharts in
         * the entry bundle. Recharts in particular is large and only used on
         * two screens, so bundling it with the entry means the login page pays
         * for a charting library it never renders.
         *
         * Separate chunks also cache far better: a change to application code
         * no longer invalidates the vendor bundle in every user's browser.
         */
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('react-router')) return 'router';
          if (id.includes('@reduxjs') || id.includes('react-redux'))
            return 'state';
          if (id.includes('socket.io-client') || id.includes('engine.io'))
            return 'realtime';
          if (id.includes('react') || id.includes('scheduler'))
            return 'react-vendor';
          return 'vendor';
        },
      },
    },

    // The entry chunk should stay small now that routes and vendors are split;
    // if it creeps back over this, that is worth noticing rather than ignoring.
    chunkSizeWarningLimit: 300,
  },
});
