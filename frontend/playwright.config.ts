import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PW_CHANNEL || undefined,
      },
    },
  ],
  webServer: [
    {
      command: `${process.env.E2E_PYTHON || "../backend/.venv/bin/python"} ../scripts/serve_frontend_test_api.py`,
      url: "http://127.0.0.1:8001/health/ready",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --port 5174",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: "http://127.0.0.1:8001" },
    },
  ],
});
