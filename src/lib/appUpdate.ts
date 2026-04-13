import appPackage from "../../package.json";

export type AppUpdateManifest = {
  version: string;
  apkUrl: string;
  notes?: string;
  force?: boolean;
};

export type AppUpdateState = {
  available: boolean;
  manifest: AppUpdateManifest | null;
  currentVersion: string;
};

export type ApkDownloadResult = {
  url: string;
  revokeUrl?: () => void;
};

const DEFAULT_MANIFEST_URL = "/app-update.json";

const parseVersion = (value: string) =>
  value
    .trim()
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));

export const currentAppVersion = appPackage.version;

export const compareVersions = (left: string, right: string): number => {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;

    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
};

export const getUpdateManifestUrl = () => {
  const configuredUrl = import.meta.env.VITE_UPDATE_MANIFEST_URL as
    | string
    | undefined;

  return configuredUrl && configuredUrl.trim()
    ? configuredUrl.trim()
    : DEFAULT_MANIFEST_URL;
};

export const fetchAppUpdateManifest =
  async (): Promise<AppUpdateManifest | null> => {
    try {
      const response = await fetch(
        `${getUpdateManifestUrl()}?t=${Date.now()}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return null;
      }

      const manifest = (await response.json()) as Partial<AppUpdateManifest>;

      if (
        typeof manifest.version !== "string" ||
        !manifest.version.trim() ||
        typeof manifest.apkUrl !== "string" ||
        !manifest.apkUrl.trim()
      ) {
        return null;
      }

      return {
        version: manifest.version.trim(),
        apkUrl: manifest.apkUrl.trim(),
        notes:
          typeof manifest.notes === "string"
            ? manifest.notes.trim()
            : undefined,
        force: Boolean(manifest.force),
      };
    } catch {
      return null;
    }
  };

export const checkForAppUpdate = async (): Promise<AppUpdateState> => {
  const manifest = await fetchAppUpdateManifest();

  if (!manifest) {
    return {
      available: false,
      manifest: null,
      currentVersion: currentAppVersion,
    };
  }

  return {
    available: compareVersions(manifest.version, currentAppVersion) > 0,
    manifest,
    currentVersion: currentAppVersion,
  };
};

export const prepareApkInstall = async (
  apkUrl: string,
): Promise<ApkDownloadResult> => {
  try {
    const response = await fetch(apkUrl, { cache: "no-store" });

    if (!response.ok) {
      return { url: apkUrl };
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);

    return {
      url: objectUrl,
      revokeUrl: () => window.URL.revokeObjectURL(objectUrl),
    };
  } catch {
    return { url: apkUrl };
  }
};

export const openApkUrl = (apkUrl: string) => {
  const link = document.createElement("a");
  link.href = apkUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
};
