import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://openriskplatform.github.io",
  base: "/plugin-sdk",
  integrations: [
    react(),
    starlight({
      title: "OpenRisk Plugin SDK",
      description: "Interactive reference for OpenRisk plugin data model authors.",
      logo: {
        src: "./public/openrisk-mark.svg",
        alt: "OpenRisk",
      },
      customCss: ["./src/styles/docs.css"],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/OpenRiskPlatform/plugin-sdk",
        },
      ],
      sidebar: [
        {
          label: "Start",
          items: [
            { label: "Overview", slug: "guides/overview" },
            { label: "Single-file plugins", slug: "guides/single-file-plugins" },
          ],
        },
        {
          label: "Data Model 0.0.1",
          autogenerate: { directory: "v0-0-1" },
        },
      ],
    }),
  ],
});
