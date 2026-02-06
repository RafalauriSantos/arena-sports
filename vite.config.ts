
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
  plugins: [
    react(),
    // Keep the plugin enabled in dev so `virtual:pwa-register` resolves,
    // but only register SW in production (see `src/main.tsx`).
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto', // Injetar automaticamente o manifest e service worker
      devOptions: {
        enabled: false, // Desabilitar PWA em dev para evitar problemas
        type: 'module',
      },
      includeAssets: ['favicon.ico', 'placeholder.svg'],
      strategies: 'generateSW', // Gerar service worker
      filename: 'sw.js',
      manifest: {
        name: 'ArenaSys',
        short_name: 'ArenaSys',
        description: 'Gestão inteligente de quadras esportivas.',
        start_url: '.',
        display: 'standalone',
        background_color: '#0F1115',
        theme_color: '#10b981',
        orientation: 'portrait',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon',
          },
          {
            src: '/placeholder.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/placeholder.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-toast'],
          'date-vendor': ['date-fns'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development',
    // Performance: otimizações de build
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    // CSS code splitting
    cssCodeSplit: true,
    // Tamanho alvo dos chunks para melhor cache
    target: 'es2020',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  // Performance: compressão e cache
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
}));
