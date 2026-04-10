(() => {
  const splash = document.getElementById("app-splash");
  const statusText = document.getElementById("splash-status");
  const progressFill = document.getElementById("splash-progress");

  if (!splash) {
    return;
  }

  const splashDurationMs = 5800;
  const exitDurationMs = 600;
  const forceCloseMs = 10000;
  let minimumTimeElapsed = false;
  let appReady = false;
  let updateCheckComplete = false;
  let closed = false;

  const setStatus = (message) => {
    if (statusText && typeof message === "string" && message.trim()) {
      statusText.textContent = message;
    }
  };

  const setProgress = (value) => {
    if (!progressFill) {
      return;
    }

    const boundedValue = Math.max(12, Math.min(100, value));
    progressFill.style.width = `${boundedValue}%`;
  };

  const progressStages = [
    { delay: 0, progress: 16 },
    { delay: 700, progress: 28 },
    { delay: 1400, progress: 40 },
    { delay: 2100, progress: 54 },
    { delay: 2800, progress: 68 },
    { delay: 3500, progress: 82 },
  ];

  progressStages.forEach((stage) => {
    window.setTimeout(() => {
      setProgress(stage.progress);
    }, stage.delay);
  });

  const closeSplash = () => {
    if (closed || !minimumTimeElapsed || !appReady || !updateCheckComplete)
      return;
    closed = true;
    setProgress(100);

    splash.classList.add("exit");

    window.setTimeout(() => {
      splash.remove();
    }, exitDurationMs);
  };

  window.setTimeout(() => {
    minimumTimeElapsed = true;
    setProgress(88);
    closeSplash();
  }, splashDurationMs);
  window.setTimeout(() => {
    updateCheckComplete = true;
    setStatus("Aplicativo pronto");
    setProgress(96);
    closeSplash();
  }, forceCloseMs);

  window.addEventListener(
    "app:ready",
    () => {
      appReady = true;
      setProgress(92);
      closeSplash();
    },
    { once: true },
  );

  window.addEventListener(
    "app:update-check-start",
    (event) => {
      const message =
        event instanceof CustomEvent ? event.detail?.message : undefined;
      setStatus(message || "Verificando atualizações");
    },
    { once: true },
  );

  window.addEventListener(
    "app:update-check-complete",
    (event) => {
      updateCheckComplete = true;
      const message =
        event instanceof CustomEvent ? event.detail?.message : undefined;
      setStatus(message || "Tudo pronto");
      setProgress(96);
      closeSplash();
    },
    { once: true },
  );
})();
