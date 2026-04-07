import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  loadEnv(mode, ".", "");

  return {
    plugins: [
      react(),
      tailwindcss(),

      // 👇 PWA AQUI
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/icon.png"],
        manifest: {
          name: "RideControl",
          short_name: "RideControl",
          description: "Gerencie sua moto",
          theme_color: "#22C55E",
          background_color: "#0f172a",
          display: "standalone",
          start_url: "/",
          orientation: "portrait",
          icons: [
            {
              src: "/icons/icon.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable",
            },
            {
              src: "/icons/icon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },

    server: {
      host: true,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== "true",
    },
  };
});
