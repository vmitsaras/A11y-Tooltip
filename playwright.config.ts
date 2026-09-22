import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./test/browser",
  fullyParallel: false,
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node scripts/serve-tests.mjs",
    url: `${baseURL}/examples/hint-popover/`,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    }
  ]
});
