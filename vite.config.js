import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "Fleet Ops Console",
        short_name: "Fleet Ops",
        description:
          "Dispatch, fleet, and " +
          "accounting console " +
          "for the team.",
        theme_color: "#0F1620",
        background_color: "#0F1620",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg}",
        ],
        // Raised from the 2 MiB default
        // for the mapbox-gl bundle.
        maximumFileSizeToCacheInBytes:
          5 * 1024 * 1024,
      },
    }),
  ],
});
