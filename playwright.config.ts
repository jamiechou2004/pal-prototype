import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  expect: { timeout: 8000 },
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:5173/pal-prototype/",
    viewport: { width: 1200, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5173",
    url: "http://127.0.0.1:5173/pal-prototype/",
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "webkit-mobile",
      use: { ...devices["iPhone 13"], viewport: { width: 402, height: 874 } },
    },
  ],
});
