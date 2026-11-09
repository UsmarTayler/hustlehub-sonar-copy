import { defineConfig, devices } from '@playwright/test'

// Browser tests run against the production build of the frontend, served by
// `vite preview`. VITE_API_URL=/api makes the app call its own origin, and the
// preview server forwards /api to the backend (see server.proxy in
// vite.config.js), so the tests need the API running on https://localhost:5443.
const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: { VITE_API_URL: '/api' },
  },
})
