import { defineConfig } from "@playwright/test";
import path from "node:path";

const testDataDirectory = path.join(process.cwd(), ".playwright-data");

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
  },
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      HEALTH_DOSSIER_DATA_DIR: testDataDirectory,
      HEALTH_DOSSIER_TEST_MODE: "1",
    },
  },
});
