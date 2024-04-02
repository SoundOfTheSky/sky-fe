import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression2';
import { VitePWA } from 'vite-plugin-pwa';
import Solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [
    Solid(),
    VitePWA({
      injectRegister: null,
      workbox: {
        globPatterns: ['**/*.{html,js,css,mp3,png,jpg,webp,ico,svg,ttf,otf}'],
        navigateFallbackDenylist: [/^\/api/, /^\/static/],
        maximumFileSizeToCacheInBytes: 10485760,
      },
      manifest: {
        name: 'Sky',
        short_name: 'Sky',
        description: 'Collection of tools for everyday life',
        theme_color: '#0f172b',
        background_color: '#0f172b',
        icons: [
          {
            src: '/icons/192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    compression({ algorithm: 'brotliCompress', exclude: [/\.(br)$/, /\.(gz)$/] }),
  ],
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
});
