// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://edtoast.me",
  trailingSlash: "ignore",
  build: { format: "directory" },
});
