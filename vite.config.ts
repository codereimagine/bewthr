import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/bewthr/',
  // Dev-only: allow tunneled hosts (cloudflare quick-tunnels) so the
  // running dev/preview server can be reached from a laptop/phone for
  // in-context review. Does not affect production builds.
  server: {
    allowedHosts: ['.trycloudflare.com'],
  },
  preview: {
    allowedHosts: ['.trycloudflare.com'],
  },
  build: {
    // Always emit SVGs as same-origin files (not base64 data: URIs). The
    // app's CSP is `img-src 'self'` with no `data:` source, so inlined
    // assets would be blocked. Other asset types keep Vite's default
    // 4096-byte inline threshold.
    assetsInlineLimit: (filePath: string) =>
      filePath.endsWith('.svg') ? false : undefined,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' = the new SW installs but waits for the user to confirm
      // before activating. Pairs with the in-app UpdateBanner + the
      // Settings "Check for updates" button so the user always controls
      // when to apply an update. Replaces the previous 'autoUpdate' which
      // applied silently on the second open.
      //
      // SECURITY-NOTE — `dist/workbox-*.js` (the precache runtime bundled by
      // this plugin) contains the literal string `https://bit.ly/wb-precache`
      // inside a `console.warn(...)` call from upstream workbox-precaching.
      // It is declarative-only — never fetched, never used as src/href —
      // and resolves (verified 2026-05-24 via curl -IL) to
      // `developer.chrome.com/docs/workbox/` (Google's workbox docs).
      // Any security scan that flags `bit.ly` in `dist/` can skip this hit.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      },
      manifest: {
        name: 'bewthr — get better at weather',
        short_name: 'bewthr',
        description: 'Local-first weather and sky PWA',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        scope: '/bewthr/',
        start_url: '/bewthr/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
