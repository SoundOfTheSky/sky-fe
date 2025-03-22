import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression2';
import { VitePWA } from 'vite-plugin-pwa';
import Solid from 'vite-plugin-solid';
import { viteStaticCopy } from 'vite-plugin-static-copy';

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
    viteStaticCopy({
      targets: [
        {
          src: [
            './node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.js',
            './node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.wasm',
            './node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.worker.js',
          ],
          dest: 'ffmpeg'
        }
      ]
    }),
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
  ],
  server: {
    allowedHosts: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
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
  optimizeDeps: {
    exclude: ['@ffmpeg/core', '@ffmpeg/ffmpeg', '@ffmpeg/util']
  }
});
