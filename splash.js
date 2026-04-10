(() => {
  const splash = document.getElementById("app-splash");

  if (!splash) {
    return;
  }

  const splashDurationMs = 1800;
  const exitDurationMs = 600;
  const forceCloseMs = 5000;
  let minimumTimeElapsed = false;
  let appReady = false;
  let closed = false;

  const closeSplash = () => {
    if (closed || !minimumTimeElapsed || !appReady) return;
    closed = true;

    splash.classList.add("exit");

    window.setTimeout(() => {
      splash.remove();
    }, exitDurationMs);
  };

  window.setTimeout(() => {
    minimumTimeElapsed = true;
    closeSplash();
  }, splashDurationMs);
  window.setTimeout(closeSplash, forceCloseMs);

  window.addEventListener(
    "app:ready",
    () => {
      appReady = true;
      closeSplash();
    },
    { once: true },
  );
})();
