import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// @ts-ignore -- side-effect CSS import may not have ambient module declarations in this setup
import "./index.css";

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
