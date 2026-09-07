import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.FIRE_DB_URL': JSON.stringify(process.env.FIRE_DB_URL || 'https://d4v5cc8g91htqli3veng.baseapi.memfiredb.com'),
      'process.env.FIRE_DB_ANON': JSON.stringify(process.env.FIRE_DB_ANON || ''),
      'process.env.FIRE_DB_SERV': JSON.stringify(process.env.FIRE_DB_SERV || ''),
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
