import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.FIRE_DB_URL': JSON.stringify(
        process.env.FIRE_DB_URL ||
          process.env.VITE_FIRE_DB_URL ||
          'https://d4v5cc8g91htqli3veng.baseapi.memfiredb.com'
      ),
      'process.env.FIRE_DB_ANON': JSON.stringify(
        process.env.FIRE_DB_ANON ||
          process.env.VITE_FIRE_DB_ANON ||
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzM0MjQ5Mjk3NywiaWF0IjoxNzY1NjkyOTc3LCJpc3MiOiJzdXBhYmFzZSJ9.8WvEQ-9X7R5r2g-M1tnjOzYhRPcxiqzRKwQAH66NDG4'
      ),
      'import.meta.env.VITE_FIRE_DB_URL': JSON.stringify(
        process.env.FIRE_DB_URL ||
          process.env.VITE_FIRE_DB_URL ||
          'https://d4v5cc8g91htqli3veng.baseapi.memfiredb.com'
      ),
      'import.meta.env.VITE_FIRE_DB_ANON': JSON.stringify(
        process.env.FIRE_DB_ANON ||
          process.env.VITE_FIRE_DB_ANON ||
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzM0MjQ5Mjk3NywiaWF0IjoxNzY1NjkyOTc3LCJpc3MiOiJzdXBhYmFzZSJ9.8WvEQ-9X7R5r2g-M1tnjOzYhRPcxiqzRKwQAH66NDG4'
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
