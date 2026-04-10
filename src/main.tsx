import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// @ts-ignore
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
// @ts-ignore
import "./index.css";

const dispatchSplashEvent = (type: string, message?: string) => {
  window.dispatchEvent(
    new CustomEvent(type, {
      detail: message ? { message } : undefined,
    }),
  );
};

// Registra o SW e força verificacoes frequentes de atualizacao.
// Assim o app sempre tenta buscar nova versao ao abrir e ao voltar ao foco.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    dispatchSplashEvent(
      "app:update-check-start",
      "Atualização encontrada, aplicando",
    );
    updateSW(true);
  },
  onRegisteredSW(
    _swUrl: string,
    registration: ServiceWorkerRegistration | undefined,
  ) {
    if (!registration) {
      dispatchSplashEvent("app:update-check-complete", "Aplicativo pronto");
      return;
    }

    const checkForUpdates = () => {
      return registration.update().catch((error: unknown) => {
        console.error("Falha ao verificar atualizacao do app:", error);
      });
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    dispatchSplashEvent("app:update-check-start", "Verificando atualizações");

    checkForUpdates().finally(() => {
      dispatchSplashEvent("app:update-check-complete", "Tudo pronto");
    });

    window.addEventListener("focus", checkForUpdates);
    document.addEventListener("visibilitychange", onVisible);

    const periodicCheckId = window.setInterval(checkForUpdates, 5 * 60 * 1000);

    window.addEventListener(
      "beforeunload",
      () => {
        window.clearInterval(periodicCheckId);
        window.removeEventListener("focus", checkForUpdates);
        document.removeEventListener("visibilitychange", onVisible);
      },
      { once: true },
    );
  },
  onRegisterError(error: unknown) {
    console.error("Erro ao registrar service worker:", error);
  },
});

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
