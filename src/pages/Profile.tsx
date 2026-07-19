import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useApp } from "../context/AppContext";
import {
  User,
  Bell,
  Moon,
  LogOut,
  ChevronRight,
  BookOpen,
  Repeat2,
  Download,
  X,
} from "lucide-react";

import { cn } from "../lib/utils";
import { ImageViewerModal } from "../components/ImageViewerModal";
import { currentAndroidVersionName } from "../lib/appUpdate";
import { getAppBaseUrl, supabase } from "../lib/supabase";
import {
  endOfMonth,
  format,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { parseLocalDate } from "../lib/date";

const DEFAULT_PROFILE_PHOTO = "/icons/perfil.png";

type MenuItem = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  color: string;
  isToggle?: boolean;
  path?: string;
  action?: () => void;
};

type ExportPeriodPreset = "all" | "30d" | "90d" | "365d" | "custom";

const EXPORT_PERIOD_OPTIONS: Array<{
  value: ExportPeriodPreset;
  label: string;
}> = [
  { value: "all", label: "Todo o período" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 3 meses" },
  { value: "365d", label: "Últimos 12 meses" },
  { value: "custom", label: "Personalizado" },
];

const getDefaultCustomRange = () => ({
  start: format(startOfMonth(subMonths(new Date(), 11)), "yyyy-MM-dd"),
  end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
});

const resolveExportRange = (
  preset: ExportPeriodPreset,
  customStart: string,
  customEnd: string,
) => {
  const now = new Date();

  switch (preset) {
    case "30d":
      return {
        start: subDays(now, 30),
        end: now,
      };
    case "90d":
      return {
        start: subMonths(now, 3),
        end: now,
      };
    case "365d":
      return {
        start: subMonths(now, 12),
        end: now,
      };
    case "custom": {
      const start = parseLocalDate(customStart);
      const end = parseLocalDate(customEnd);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
      }

      return start <= end ? { start, end } : { start: end, end: start };
    }
    case "all":
    default:
      return null;
  }
};

const formatExportRangeLabel = (
  preset: ExportPeriodPreset,
  customStart: string,
  customEnd: string,
) => {
  const range = resolveExportRange(preset, customStart, customEnd);

  if (!range) {
    return "Todo o período";
  }

  return `${format(range.start, "dd/MM/yyyy")} até ${format(
    range.end,
    "dd/MM/yyyy",
  )}`;
};

export const Profile: React.FC = () => {
  const {
    bikes,
    expenses,
    userProfile,
    startTutorial,
    isCloudConfigured,
    isCloudAuthenticated,
    cloudUserEmail,
    cloudSyncStatus,
    cloudSyncError,
    signInCloud,
    signUpCloud,
    deleteAccount,
    signOutCloud,
    syncNow,
  } = useApp();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportBikeId, setExportBikeId] = useState("all");
  const [exportPeriodPreset, setExportPeriodPreset] =
    useState<ExportPeriodPreset>("all");
  const [exportCustomStart, setExportCustomStart] = useState(
    getDefaultCustomRange().start,
  );
  const [exportCustomEnd, setExportCustomEnd] = useState(
    getDefaultCustomRange().end,
  );
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const profilePhoto = userProfile.photoUrl || DEFAULT_PROFILE_PHOTO;

  const selectedExportBikeName = useMemo(() => {
    if (exportBikeId === "all") {
      return "Todas as motos";
    }

    return bikes.find((bike) => bike.id === exportBikeId)?.name || "Moto";
  }, [bikes, exportBikeId]);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("ridecontrol_dark_mode");
    if (savedDarkMode === "true") {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", isDarkMode);
    localStorage.setItem("ridecontrol_dark_mode", String(isDarkMode));
  }, [isDarkMode]);

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir sua conta e todos os dados associados? Esta ação não pode ser desfeita.",
    );

    if (!confirmed) {
      return;
    }

    const error = await deleteAccount();

    if (error) {
      setAuthMessage(`Erro ao excluir conta: ${error}`);
      return;
    }

    setAuthMessage("Conta excluída. Seus dados foram removidos.");
    navigate("/auth", { replace: true });
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setAuthMessage("Informe email e senha.");
      return;
    }

    setAuthLoading(true);
    const error = await signInCloud(email.trim(), password);
    setAuthLoading(false);
    setAuthMessage(error ? `Erro ao entrar: ${error}` : "Login realizado.");
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setAuthMessage("Informe email e senha.");
      return;
    }

    setAuthLoading(true);
    const error = await signUpCloud(email.trim(), password);
    setAuthLoading(false);
    setAuthMessage(
      error
        ? `Erro ao criar conta: ${error}`
        : "Conta criada. Confira seu email para confirmar, se solicitado.",
    );
  };

  const handleSignOut = async () => {
    await signOutCloud();
    setAuthMessage("Conta desconectada.");
  };

  const handleExportDiagnostics = async () => {
    if (!isCloudAuthenticated) {
      setExportMessage("Entre na conta para exportar os dados por e-mail.");
      return;
    }

    if (!supabase) {
      setExportMessage("Exportação indisponível sem conexão com a nuvem.");
      return;
    }

    if (
      exportPeriodPreset === "custom" &&
      !resolveExportRange(exportPeriodPreset, exportCustomStart, exportCustomEnd)
    ) {
      setExportMessage("Informe um período válido para a exportação.");
      return;
    }

    const range = resolveExportRange(
      exportPeriodPreset,
      exportCustomStart,
      exportCustomEnd,
    );

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      setExportMessage("Não foi possível obter a sessão atual.");
      return;
    }

    setExportLoading(true);
    setExportMessage(null);

    try {
      const exportDiagnosticsUrl = `${getAppBaseUrl()}/api/export-diagnostics`;
      const response = await fetch(
        exportDiagnosticsUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            bikes,
            expenses: expenses.map(({ receiptImageUrl, ...expense }) => expense),
            filters: {
              bikeId: exportBikeId,
              periodPreset: exportPeriodPreset,
              periodStart: range ? format(range.start, "yyyy-MM-dd") : null,
              periodEnd: range ? format(range.end, "yyyy-MM-dd") : null,
            },
          }),
        },
      );

      if (!response.ok) {
        let message = "Falha ao enviar a planilha por e-mail.";

        try {
          const payload = (await response.json()) as { error?: string };
          if (typeof payload.error === "string" && payload.error.trim()) {
            message = payload.error.trim();
          }
        } catch {
          // Keep the default message.
        }

        throw new Error(message);
      }

      setExportMessage(
        `Planilha enviada para ${cloudUserEmail || "o email cadastrado"}.`,
      );
    } catch (error) {
      setExportMessage(
        error instanceof Error ? error.message : "Falha ao exportar dados.",
      );
    } finally {
      setExportLoading(false);
    }
  };

  const menuItems: MenuItem[] = [
    {
      icon: User,
      label: "Informações pessoais",
      color: "bg-blue-50",
      path: "/perfil/informacoes",
    },
    {
      icon: Bell,
      label: "Notificações",
      color: "bg-orange-50",
      path: "/perfil/notificacoes",
    },
    {
      icon: Repeat2,
      label: "Gastos recorrentes",
      color: "bg-amber-50",
      path: "/perfil/recorrencias",
    },
    {
      icon: Download,
      label: "Exportar dados",
      color: "bg-sky-50",
      action: () => {
        if (!isCloudAuthenticated) {
          setAuthMessage("Entre na conta para exportar os dados por e-mail.");
          return;
        }

        setExportMessage(null);
        setIsExportModalOpen(true);
      },
    },
    { icon: Moon, label: "Modo escuro", color: "bg-purple-50", isToggle: true },
    {
      icon: BookOpen,
      label: "Tutorial",
      color: "bg-green-50",
      action: () => startTutorial(true),
    },
  ];

  return (
    <div className="p-6 pb-24">
      <header className="flex flex-col items-center mb-10">
        <button
          type="button"
          onClick={() => setIsPhotoViewerOpen(true)}
          className="w-24 h-24 rounded-[32px] bg-blue-500 p-1 mb-4 shadow-xl shadow-blue-100 transition-transform active:scale-95"
          aria-label="Ampliar foto de perfil"
        >
          <div className="w-full h-full rounded-[28px] overflow-hidden border-4 border-white">
            <img
              src={profilePhoto}
              alt="Foto de perfil"
              className="w-full h-full object-cover"
            />
          </div>
        </button>
        <h1 className="text-2xl font-black">{userProfile.name}</h1>
        <p className="text-gray-400 font-bold text-sm">
          Piloto desde {userProfile.memberSince} - {bikes.length} motos
        </p>
      </header>

      <div className="space-y-4">
        <div className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-50">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
            Nuvem
          </p>

          {!isCloudConfigured ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="text-xs font-black uppercase tracking-[0.2em] mb-1">
                Supabase ausente
              </p>
              <p className="text-sm font-medium leading-relaxed">
                Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na
                Vercel para ativar backup e sincronização entre dispositivos.
              </p>
            </div>
          ) : isCloudAuthenticated ? (
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-700">
                Conectado como {cloudUserEmail}
              </p>
              <p className="text-xs text-gray-500 font-medium">
                Status:{" "}
                {cloudSyncStatus === "syncing" ? "Sincronizando" : "Pronto"}
              </p>
              {cloudSyncError && (
                <p className="text-xs text-red-500 font-medium">
                  {cloudSyncError}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => void syncNow()}
                  className="px-4 py-3 rounded-2xl bg-blue-500 text-white font-bold text-sm"
                >
                  Sincronizar agora
                </button>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm"
                >
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-medium border border-gray-100"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-medium border border-gray-100"
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => void handleSignIn()}
                  className="px-4 py-3 rounded-2xl bg-blue-500 text-white font-bold text-sm disabled:opacity-60"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={() => void handleSignUp()}
                  className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm disabled:opacity-60"
                >
                  Criar conta
                </button>
              </div>
            </div>
          )}

          {authMessage && (
            <p className="text-xs text-gray-500 font-medium mt-3">
              {authMessage}
            </p>
          )}
        </div>

        {menuItems.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              if (item.isToggle) {
                setIsDarkMode((prev) => !prev);
                return;
              }

              if (item.action) {
                item.action();
                return;
              }

              if (item.path) {
                navigate(item.path);
              }
            }}
            className="w-full bg-white p-5 rounded-[28px] flex items-center justify-between shadow-sm border border-gray-50 transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  item.color,
                )}
              >
                <item.icon
                  size={20}
                  className={cn(
                    item.color.replace("bg-", "text-").replace("-50", "-500"),
                  )}
                />
              </div>
              <span className="font-bold text-gray-700">{item.label}</span>
            </div>
            {item.isToggle ? (
              <div
                className={cn(
                  "w-12 h-6 rounded-full relative transition-colors",
                  isDarkMode ? "bg-blue-500" : "bg-gray-100",
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                    isDarkMode ? "left-7" : "left-1",
                  )}
                />
              </div>
            ) : (
              <ChevronRight size={20} className="text-gray-300" />
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={() => void handleDeleteAccount()}
          className="w-full bg-red-50 p-5 rounded-[28px] flex items-center justify-between border border-red-100 mt-8 transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-500">
              <LogOut size={20} />
            </div>
            <span className="font-bold text-red-600">Excluir conta</span>
          </div>
        </button>
      </div>

      <div className="mt-12 text-center">
        <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em]">
          RideControl v{currentAndroidVersionName} <br />
          Criado por:{" "}
          <a
            href="https://www.linkedin.com/in/alexsander-alcantara/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 transition-colors"
          >
            Alexsander Alcantara
          </a>
        </p>
      </div>

      {isExportModalOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Fechar exportação"
          />

          <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 max-h-[88vh] overflow-y-auto rounded-[32px] border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-500 mb-2">
                  Exportação
                </p>
                <h2 className="text-2xl font-black text-gray-900">
                  Enviar diagnóstico por e-mail
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  A planilha será enviada para {cloudUserEmail || "seu e-mail"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-2 rounded-xl bg-gray-100 text-gray-500"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  Motocicleta
                </label>
                <select
                  value={exportBikeId}
                  onChange={(e) => setExportBikeId(e.target.value)}
                  className="w-full h-12 bg-gray-50 border-none rounded-2xl px-4 font-bold"
                >
                  <option value="all">Todas as motos</option>
                  {bikes.map((bike) => (
                    <option key={bike.id} value={bike.id}>
                      {bike.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  Período
                </label>
                <select
                  value={exportPeriodPreset}
                  onChange={(e) =>
                    setExportPeriodPreset(e.target.value as ExportPeriodPreset)
                  }
                  className="w-full h-12 bg-gray-50 border-none rounded-2xl px-4 font-bold"
                >
                  {EXPORT_PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {exportPeriodPreset === "custom" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                      Data inicial
                    </label>
                    <input
                      type="date"
                      value={exportCustomStart}
                      onChange={(e) => setExportCustomStart(e.target.value)}
                      className="w-full h-12 bg-gray-50 border-none rounded-2xl px-4 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                      Data final
                    </label>
                    <input
                      type="date"
                      value={exportCustomEnd}
                      onChange={(e) => setExportCustomEnd(e.target.value)}
                      className="w-full h-12 bg-gray-50 border-none rounded-2xl px-4 font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
                <p className="font-bold mb-1">Prévia</p>
                <p>
                  {selectedExportBikeName} · {formatExportRangeLabel(
                    exportPeriodPreset,
                    exportCustomStart,
                    exportCustomEnd,
                  )}
                </p>
              </div>

              {exportMessage && (
                <div className="rounded-[24px] border border-gray-100 bg-gray-50 p-4 text-sm font-medium text-gray-700">
                  {exportMessage}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleExportDiagnostics()}
                disabled={exportLoading || !isCloudAuthenticated}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-4 font-bold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-60"
              >
                <Download size={18} />
                {exportLoading ? "Enviando..." : "Enviar planilha por e-mail"}
              </button>

              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                A exportação usa o e-mail cadastrado da conta logada e envia a
                planilha em formato .xlsx.
              </p>
            </div>
          </div>
        </div>
      )}

      <ImageViewerModal
        isOpen={isPhotoViewerOpen}
        src={profilePhoto}
        alt="Foto de perfil"
        onClose={() => setIsPhotoViewerOpen(false)}
      />
    </div>
  );
};
