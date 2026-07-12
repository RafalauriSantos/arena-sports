
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
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8 MiB (permite fazer cache da imagem grande)
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // ✅ IMPORTANTE: Não fazer cache de chamadas da API (Supabase)
        navigateFallback: null, // Desabilita fallback para evitar cache de rotas dinâmicas
        runtimeCaching: [
          {
            // Cache de assets estáticos (imagens, fontes, etc)
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // ⚠️ NÃO FAZER CACHE de chamadas do Supabase
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly', // Sempre busca do servidor
          },
          {
            // Cache de navegação (HTML) com revalidação
            urlPattern: /^https?:\/\/.*\/agendar\/.*/i,
            handler: 'NetworkFirst', // Tenta rede primeiro, depois cache
            options: {
              cacheName: 'pages-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutos apenas
              },
              networkTimeoutSeconds: 3,
            }
          }
        ],
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
        // Nome de arquivo com hash para cache infinito
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
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
        passes: 2,
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    // CSS code splitting e minificação
    cssCodeSplit: true,
    cssMinify: true,
    // Tamanho alvo dos chunks para melhor cache
    target: 'es2020',
    // Reportar tamanho dos chunks comprimidos
    reportCompressedSize: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  // Performance: compressão e cache
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
}));
