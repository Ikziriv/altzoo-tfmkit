import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    "name": "zoojelly",
    "compatibilityDate": "2026-09-21",
    "observability": {
      "enabled": true
    },
    "assets": {
      "notFoundHandling": "single-page-application"
    }
  }
});
