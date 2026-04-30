import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import { SITE, BASE_PATH } from "./site.config.ts";

export default defineConfig({
  site: SITE,
  base: BASE_PATH,
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
});
