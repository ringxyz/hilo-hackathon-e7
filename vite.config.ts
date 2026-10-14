import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sites } from './build/sites-vite-plugin';
export default defineConfig({ plugins: [react(), sites()], server: { host:'127.0.0.1', port:5173, proxy:{ '/api': { target:'http://127.0.0.1:8787', changeOrigin:false } } }, build:{outDir:'dist/client',emptyOutDir:false}, css:{devSourcemap:true} });
