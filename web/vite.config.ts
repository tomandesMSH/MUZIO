import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// One id per build: the commit on Vercel, otherwise the build time. The app
// carries it (__APP_VERSION__) and the build writes it to /version.json, so an
// open app can tell a newer version was deployed (src/lib/appVersion.ts).
const APP_VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || `b${Date.now()}`

function versionFile(): Plugin {
  return {
    name: 'muzio-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: APP_VERSION }) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), versionFile()],
  define: {
    // 'dev' while developing: no version checks then.
    __APP_VERSION__: JSON.stringify(command === 'build' ? APP_VERSION : 'dev'),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
}))
