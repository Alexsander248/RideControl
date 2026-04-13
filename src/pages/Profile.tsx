import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useApp } from "../context/AppContext";
import { User, Bell, Moon, LogOut, ChevronRight, BookOpen } from "lucide-react";

import { cn } from "../lib/utils";
import { ImageViewerModal } from "../components/ImageViewerModal";
import { currentAppVersion } from "../lib/appUpdate";

const DEFAULT_PROFILE_PHOTO = "/icons/perfil.png";

type MenuItem = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  color: string;
  isToggle?: boolean;
  path?: string;
  action?: () => void;
};

export const Profile: React.FC = () => {
  const {
    bikes,
    userProfile,
    startTutorial,
    isCloudConfigured,
    isCloudAuthenticated,
    cloudUserEmail,
    cloudSyncStatus,
    cloudSyncError,
    signInCloud,
    signUpCloud,
    signOutCloud,
    syncNow,
  } = useApp();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const profilePhoto = userProfile.photoUrl || DEFAULT_PROFILE_PHOTO;

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

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita e todos os seus dados serão apagados permanentemente.",
    );

    if (!confirmed) {
      return;
    }

    try {
      // Limpar todos os dados do localStorage
      localStorage.removeItem("motocontrol_data");
      localStorage.removeItem("ridecontrol_install_year");
      localStorage.removeItem("ridecontrol_dark_mode");

      // Recarregar a página para resetar o app
      window.location.href = "/";
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      alert("Erro ao excluir sua conta. Tente novamente.");
    }
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
          onClick={handleDeleteAccount}
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
          RideControl v{currentAppVersion} <br />
          Criado por: Alexsander Alcantara
        </p>
      </div>

      <ImageViewerModal
        isOpen={isPhotoViewerOpen}
        src={profilePhoto}
        alt="Foto de perfil"
        onClose={() => setIsPhotoViewerOpen(false)}
      />
    </div>
  );
};
