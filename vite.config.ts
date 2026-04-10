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

      VitePWA({
        registerType: "autoUpdate",

        includeAssets: ["icons/icon.png"],

        // 👇 CORREÇÃO DO ERRO "Unexpected token export"
        workbox: {
          globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
        },

        // 👇 EVITA BUG NO DEV
        devOptions: {
          enabled: false,
        },
        manifest: false,
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
