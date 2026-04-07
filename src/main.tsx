import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// @ts-ignore
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
// @ts-ignore
import "./index.css";

// 👇 ATIVA O PWA (FALTAVA ISSO)
registerSW({ immediate: true });

const savedDarkMode = localStorage.getItem("ridecontrol_dark_mode");
if (savedDarkMode === "true") {
  document.documentElement.classList.add("dark-mode");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

window.dispatchEvent(new Event("app:ready"));
