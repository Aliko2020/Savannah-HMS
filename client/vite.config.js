import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allow phones/laptops on the shop's Wi-Fi to open the app.
    host: true,
    // During development, send /api calls to the Node server.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
