import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * `npm run dev` also runs the signals pipeline: once at startup (only when the
 * data is missing or older than 6 hours), then every 15 minutes while the server runs
 * (every 5 minutes while no stock could be scored, e.g. when offline).
 * The page polls for the file, so it fills in as soon as the first run finishes.
 */
const HOUR = 15 * 60 * 1000 // refresh interval (15 min keeps pre-market / after-hours prices current)
const RETRY = 5 * 60 * 1000

function hasRecommendations(): boolean {
  try {
    return JSON.parse(readFileSync('public/data/signals.json', 'utf8')).recommendations.length > 0
  } catch {
    return false
  }
}

function signalsPipeline(): Plugin {
  let running = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const run = (ifMissing: boolean) => {
    if (running) return
    running = true
    const args = ['scripts/build-signals.mjs', ...(ifMissing ? ['--if-missing'] : [])]
    const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env })
    const done = () => {
      running = false
      const ok = hasRecommendations()
      if (!ok) console.log('[signals] no stocks scored, retrying in 5 minutes')
      clearTimeout(timer)
      timer = setTimeout(() => run(false), ok ? HOUR : RETRY)
    }
    child.on('exit', done)
    child.on('error', done)
  }
  return {
    name: 'signals-pipeline',
    apply: 'serve',
    configureServer(server) {
      run(true)
      server.httpServer?.on('close', () => clearTimeout(timer))
    },
  }
}

export default defineConfig({
  base: '/TradingBot/',
  plugins: [react(), signalsPipeline()],
  server: {
    port: 5173,
    open: '/TradingBot/',
  },
})
