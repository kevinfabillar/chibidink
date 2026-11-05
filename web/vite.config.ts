import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { networkInterfaces } from 'node:os'
import { defineConfig } from 'vite'

// In development the API runs on :5299; the proxy keeps everything same-origin.
const apiTarget = process.env.API_URL ?? 'http://localhost:5299'

/** This PC's address on the local network, so phones scanning a session QR can reach the dev server. */
function lanAddress(): string {
  for (const list of Object.values(networkInterfaces()))
    for (const net of list ?? []) if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) return net.address
  return ''
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 800 },
  define: { 'import.meta.env.VITE_LAN_HOST': JSON.stringify(lanAddress()) },
  server: {
    host: true, // also listen on the local network (phones on the same Wi-Fi)
    proxy: {
      '/api': apiTarget,
      '/hubs': { target: apiTarget, ws: true },
    },
  },
})
