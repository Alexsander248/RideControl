import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { motion } from "motion/react";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CircleCheck,
  Database,
  Lock,
  MailCheck,
  AlertTriangle,
} from "lucide-react";

import { useApp } from "../context/AppContext";

const PASSWORD_MIN_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthTab = "login" | "signup";

const mapAuthError = (rawError: string, mode: AuthTab) => {
  const normalized = rawError.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("invalid_grant") ||
    normalized.includes("senha")
  ) {
    return "Email ou senha incorretos. Confira os dados e tente novamente.";
  }

  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("not confirmed")
  ) {
    return "Seu email ainda não foi confirmado. Verifique sua caixa de entrada.";
  }

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("duplicate")
  ) {
    return "Já existe uma conta com este email. Faça login ou recupere a senha.";
  }

  if (normalized.includes("password should be")) {
    return `A senha precisa ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Muitas tentativas em sequência. Aguarde um momento e tente novamente.";
  }

  if (mode === "signup") {
    return "Não foi possível criar sua conta agora. Tente novamente em instantes.";
  }

  return "Não foi possível concluir o login agora. Tente novamente em instantes.";
};

export const Auth: React.FC = () => {
  const {
    isCloudReady,
    isCloudAuthenticated,
    isCloudConfigured,
    cloudSyncStatus,
    cloudSyncError,
    signInCloud,
    signUpCloud,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [messageType, setMessageType] = useState<"info" | "error">("info");
  const isSignUp = activeTab === "signup";

  const fromPath =
    (location.state as { from?: { pathname?: string } } | undefined)?.from
      ?.pathname || "/";

  useEffect(() => {
    if (isCloudAuthenticated && isCloudReady) {
      navigate(fromPath, { replace: true });
    }
  }, [fromPath, isCloudAuthenticated, isCloudReady, navigate]);

  const validateForm = () => {
    if (!email.trim() || !password.trim()) {
      setMessageType("error");
      setMessage("Informe email e senha.");
      return false;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setMessageType("error");
      setMessage("Informe um email válido.");
      return false;
    }

    if (isSignUp && password.length < PASSWORD_MIN_LENGTH) {
      setMessageType("error");
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return false;
    }

    if (isSignUp && !confirmPassword.trim()) {
      setMessageType("error");
      setMessage("Confirme sua senha para concluir o cadastro.");
      return false;
    }

    if (isSignUp && password !== confirmPassword) {
      setMessageType("error");
      setMessage("As senhas não coincidem. Revise e tente novamente.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!isCloudConfigured) {
      setMessageType("error");
      setMessage(
        "O Supabase não está configurado neste ambiente. Configure as variáveis na Vercel para habilitar login e cadastro.",
      );
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    setMessage(null);

    let error: string | null = null;

    try {
      error =
        activeTab === "login"
          ? await signInCloud(email.trim(), password)
          : await signUpCloud(email.trim(), password);
    } catch {
      error = "Falha inesperada ao autenticar. Tente novamente.";
    } finally {
      setLoading(false);
    }

    if (error) {
      setMessageType("error");
      setMessage(mapAuthError(error, activeTab));
      return;
    }

    if (isSignUp) {
      setActiveTab("login");
      setPassword("");
      setConfirmPassword("");
      setVerificationSent(true);
      setMessageType("info");
      setMessage(
        "Conta criada. Verifique seu email para confirmar e depois entre no app.",
      );
      return;
    }

    setVerificationSent(false);
    setMessageType("info");
    setMessage("Login concluído. Sincronizando dados...");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-6 py-8 flex items-center justify-center">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="mb-6 flex items-center gap-3 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-200">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              RideControl
            </h1>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">
              Acesso seguro
            </p>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-[36px] border border-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] overflow-hidden">
          <div className="px-7 pt-8 pb-6 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 text-white relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -left-6 bottom-0 w-24 h-24 rounded-full bg-white/10" />
            <div className="relative z-10 flex items-center gap-2 mb-4 text-white/90 text-xs font-black uppercase tracking-[0.22em]">
              <Sparkles size={14} />
              {isSignUp ? "Cadastro" : "Login"}
            </div>
            <h2 className="text-3xl font-black leading-tight max-w-[12ch]">
              {isSignUp ? "Crie sua conta" : "Entre para liberar o app"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/90 max-w-[28ch]">
              {isSignUp
                ? "Crie seu acesso para sincronizar seus dados entre dispositivos com segurança."
                : "Seus dados ficam sincronizados em nuvem e disponíveis em qualquer aparelho quando você entra com sua conta."}
            </p>
          </div>

          <div className="p-6 space-y-5">
            {verificationSent && activeTab === "login" && (
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-emerald-900 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shrink-0">
                    <MailCheck size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black mb-1">
                      Conta criada com sucesso
                    </p>
                    <p className="text-sm leading-relaxed text-emerald-900/80">
                      Confirme o email enviado e depois faça login aqui para
                      sincronizar seus dados.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setMessage(null);
                }}
                className={`h-11 rounded-2xl text-sm font-black transition-colors ${
                  activeTab === "login"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signup");
                  setMessage(null);
                }}
                className={`h-11 rounded-2xl text-sm font-black transition-colors ${
                  activeTab === "signup"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                Cadastro
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="w-full h-14 rounded-2xl bg-gray-50 border border-gray-100 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                autoComplete={
                  activeTab === "login" ? "current-password" : "new-password"
                }
                className="w-full h-14 rounded-2xl bg-gray-50 border border-gray-100 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {isSignUp && (
                <>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmar senha"
                    autoComplete="new-password"
                    className="w-full h-14 rounded-2xl bg-gray-50 border border-gray-100 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                    A senha precisa ter no mínimo {PASSWORD_MIN_LENGTH}{" "}
                    caracteres.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              disabled={loading || !isCloudConfigured}
              onClick={() => void handleSubmit()}
              className="w-full h-14 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                "Aguarde..."
              ) : !isSignUp ? (
                <>
                  <Lock size={18} />
                  Entrar e sincronizar
                </>
              ) : (
                <>
                  <ArrowRight size={18} />
                  Criar conta
                </>
              )}
            </button>

            <div className="grid grid-cols-1 gap-3 rounded-3xl bg-blue-50/70 p-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-blue-600 shrink-0">
                  <Database size={16} />
                </div>
                <p className="text-sm font-medium text-blue-950/80 leading-relaxed">
                  As informações são salvas localmente e também sincronizadas na
                  nuvem quando você entra.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-blue-600 shrink-0">
                  <CircleCheck size={16} />
                </div>
                <p className="text-sm font-medium text-blue-950/80 leading-relaxed">
                  Ao trocar de aparelho, basta logar na mesma conta para
                  restaurar os dados.
                </p>
              </div>
            </div>

            {!isCloudConfigured && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <p className="text-xs font-black uppercase tracking-[0.2em] mb-1">
                  Supabase ausente
                </p>
                <p className="text-xs font-medium leading-relaxed">
                  A build publicada não encontrou as variáveis do Supabase. Sem
                  isso, login, cadastro e sincronização não conseguem operar.
                </p>
              </div>
            )}

            {message &&
              (messageType === "error" ? (
                <div className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-2xl p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-[2px] shrink-0" />
                  <span>{message}</span>
                </div>
              ) : (
                <p className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded-2xl p-3">
                  {message}
                </p>
              ))}

            {cloudSyncError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl p-3">
                {cloudSyncError}
              </p>
            )}

            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
              <span>
                {cloudSyncStatus === "syncing" ? "Sincronizando" : "Pronto"}
              </span>
              <span>RideControl Cloud</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
