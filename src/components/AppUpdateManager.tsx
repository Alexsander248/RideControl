import React from "react";

import {
  checkForAppUpdate,
  currentAppVersion,
  type AppUpdateManifest,
} from "../lib/appUpdate";
import { AppUpdateModal } from "./AppUpdateModal";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const LAST_CHECK_AT_KEY = "ridecontrol_update_last_checked_at";
const LAST_CHECKED_VERSION_KEY = "ridecontrol_update_last_checked_version";

export const AppUpdateManager: React.FC = () => {
  const [manifest, setManifest] = React.useState<AppUpdateManifest | null>(
    null,
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const isCheckingRef = React.useRef(false);
  const dismissedVersionRef = React.useRef<string | null>(
    localStorage.getItem("ridecontrol_update_dismissed_version"),
  );

  const shouldSkipCheck = () => {
    const lastCheckedAt = Number(localStorage.getItem(LAST_CHECK_AT_KEY));
    const lastCheckedVersion =
      localStorage.getItem(LAST_CHECKED_VERSION_KEY) || "";

    if (lastCheckedVersion !== currentAppVersion) {
      return false;
    }

    if (Number.isFinite(lastCheckedAt)) {
      const elapsed = Date.now() - lastCheckedAt;
      if (elapsed >= 0 && elapsed < CHECK_INTERVAL_MS) {
        return true;
      }
    }

    return false;
  };

  const runCheck = React.useCallback(async () => {
    if (import.meta.env.DEV || isCheckingRef.current || shouldSkipCheck()) {
      return;
    }

    isCheckingRef.current = true;

    try {
      const result = await checkForAppUpdate();
      localStorage.setItem(LAST_CHECK_AT_KEY, String(Date.now()));
      localStorage.setItem(
        LAST_CHECKED_VERSION_KEY,
        result.manifest?.version ?? currentAppVersion,
      );

      if (
        result.available &&
        result.manifest &&
        result.manifest.version !== dismissedVersionRef.current
      ) {
        setManifest(result.manifest);
        setIsOpen(true);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  React.useEffect(() => {
    void runCheck();

    const onFocus = () => {
      void runCheck();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void runCheck();
      }
    };

    const intervalId = window.setInterval(() => {
      void runCheck();
    }, 30 * 60 * 1000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [runCheck]);

  return (
    <AppUpdateModal
      isOpen={isOpen}
      currentVersion={currentAppVersion}
      manifest={manifest}
      onClose={() => {
        if (manifest) {
          dismissedVersionRef.current = manifest.version;
          localStorage.setItem(
            "ridecontrol_update_dismissed_version",
            manifest.version,
          );
        }

        setIsOpen(false);
      }}
    />
  );
};
