import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Download, ShieldAlert, X, LoaderCircle } from "lucide-react";

import type { AppUpdateManifest } from "../lib/appUpdate";
import { openApkUrl, prepareApkInstall } from "../lib/appUpdate";

interface AppUpdateModalProps {
  isOpen: boolean;
  currentVersion: string;
  manifest: AppUpdateManifest | null;
  onClose: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  currentVersion,
  manifest,
  onClose,
}) => {
  const [isDownloading, setIsDownloading] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (typeof document === "undefined") {
    return null;
  }

  const handleDownload = async () => {
    if (!manifest) return;

    setIsDownloading(true);

    let revokeUrl: (() => void) | undefined;

    try {
      const result = await prepareApkInstall(manifest.apkUrl);
      revokeUrl = result.revokeUrl;
      openApkUrl(result.url);
    } finally {
      setIsDownloading(false);

      if (revokeUrl) {
        window.setTimeout(() => {
          revokeUrl?.();
        }, 60_000);
      }
    }

    if (!manifest.force) {
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && manifest && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => {
              if (!manifest.force) {
                onClose();
              }
            }}
            aria-label="Fechar atualização"
          />

          <motion.div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-[32px] border border-white/50 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="relative px-7 pt-8 pb-6 bg-gradient-to-br from-blue-600 via-cyan-500 to-sky-400 text-white overflow-hidden">
              <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/10" />
              <div className="absolute -left-8 bottom-0 w-28 h-28 rounded-full bg-white/10" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em]">
                    <ShieldAlert size={14} />
                    Atualização disponível
                  </div>
                  <h2 className="mt-4 text-3xl font-black leading-tight">
                    Nova versão pronta
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/90">
                    Versão atual: {currentVersion}
                    <br />
                    Nova versão: {manifest.version}
                  </p>
                </div>

                {!manifest.force && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/25"
                    aria-label="Fechar"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <p className="text-sm leading-relaxed text-gray-600">
                {manifest.notes ||
                  "Existe uma versão mais recente do APK. Baixe agora para continuar usando a versão atualizada do app."}
              </p>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Toque em atualizar e instale o APK baixado no seu celular.
              </div>

              <div className="flex gap-3">
                {!manifest.force && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Depois
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  disabled={isDownloading}
                  className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-200 transition-transform active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isDownloading ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  {isDownloading ? "Baixando..." : "Atualizar APK"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
