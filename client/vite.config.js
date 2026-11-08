import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The proxy keeps API calls same-origin so the session cookie just works.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } },
});
