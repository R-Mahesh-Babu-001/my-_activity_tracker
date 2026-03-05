import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "avatar-rookie.svg",
        "avatar-warrior.svg",
        "avatar-elite.svg",
        "avatar-sage.svg",
        "pwa-icon.svg"
      ],
      manifest: {
        name: "LevelUp Daily Tracker",
        short_name: "LevelUp",
        description: "Track daily coding consistency for 5 months with levels and progress charts.",
        theme_color: "#0f172a",
        background_color: "#0b1020",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml"
          }
        ]
      }
    })
  ]
});
