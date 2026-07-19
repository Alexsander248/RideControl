import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { motion } from "motion/react";
import {
  ArrowRight,
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  MailCheck,
  Phone,
  RotateCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { useApp } from "../context/AppContext";
import { getAuthRedirectUrl, supabase } from "../lib/supabase";

const PASSWORD_MIN_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAVED_ACCOUNTS_KEY = "ridecontrol_saved_accounts";
const DEFAULT_SIGNUP_COOLDOWN_SECONDS = 60;

type AuthTab = "login" | "signup";
type LoginMethod = "email" | "phone";

const isRateLimitError = (rawError: string) => {
  const normalized = rawError.toLowerCase();
  return normalized.includes("rate limit") || normalized.includes("too many");
};

const getRateLimitCooldownSeconds = (rawError: string) => {
  const message = rawError.toLowerCase();
  const match = message.match(/(\d+)\s*(second|seconds|segundo|segundos)/i);

  if (!match) return DEFAULT_SIGNUP_COOLDOWN_SECONDS;

  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SIGNUP_COOLDOWN_SECONDS;
  }

  return parsed;
};

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

  if (normalized.includes("phone") && normalized.includes("invalid")) {
    return "Informe um número de celular válido.";
  }

  if (isRateLimitError(rawError)) {
    return "Muitas tentativas em sequência. Aguarde um momento e tente novamente.";
  }

  if (mode === "signup") {
    return "Não foi possível criar sua conta agora. Tente novamente em instantes.";
  }

  return "Não foi possível concluir o login agora. Tente novamente em instantes.";
};

const getSavedAccounts = () => {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item, index, arr) => item && arr.indexOf(item) === index);
  } catch {
    return [];
  }
};

const persistSavedAccounts = (accounts: string[]) => {
  localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
};

const getRecoveryRedirectUrl = () => {
  const base = getAuthRedirectUrl();
  if (!base) return "";
  return `${base}${base.includes("?") ? "&" : "?"}mode=recovery`;
};

const normalizePhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  if (value.trim().startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.startsWith("55")) {
    return `+${digits}`;
  }

  return `+55${digits}`;
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
    signInDev,
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryPasswordConfirm, setRecoveryPasswordConfirm] = useState("");
  const [devPassword, setDevPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDevPassword, setShowDevPassword] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [messageType, setMessageType] = useState<"info" | "error">("info");
  const [signupCooldownUntil, setSignupCooldownUntil] = useState(0);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const isSignUp = activeTab === "signup";
  const isDevMode = import.meta.env.DEV;
  const signupCooldownSeconds = Math.max(
    0,
    Math.ceil((signupCooldownUntil - Date.now()) / 1000),
  );

  const fromPath =
    (location.state as { from?: { pathname?: string } } | undefined)?.from
      ?.pathname || "/";
  const postLoginPath =
    fromPath === "/auth" || fromPath === "/perfil/informacoes" ? "/" : fromPath;

  useEffect(() => {
    const mode = new URLSearchParams(location.search).get("mode");
    setIsRecoveryMode(mode === "recovery");
  }, [location.search]);

  useEffect(() => {
    if (isRecoveryMode) {
      setActiveTab("login");
      setLoginMethod("email");
      setMessageType("info");
      setMessage("Redefina sua senha para concluir o acesso à conta recuperada.");
      return;
    }

    setRecoveryPassword("");
    setRecoveryPasswordConfirm("");
  }, [isRecoveryMode]);

  useEffect(() => {
    const accounts = getSavedAccounts();
    setSavedAccounts(accounts);

    if (!email.trim() && accounts.length > 0) {
      setEmail(accounts[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isCloudAuthenticated && isCloudReady && !isRecoveryMode) {
      navigate(postLoginPath, { replace: true });
    }
  }, [isCloudAuthenticated, isCloudReady, isRecoveryMode, navigate, postLoginPath]);

  useEffect(() => {
    if (signupCooldownSeconds <= 0) return;

    const intervalId = window.setInterval(() => {
      setSignupCooldownUntil((current) => (current <= Date.now() ? 0 : current));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [signupCooldownSeconds]);

  const validateEmailForm = () => {
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
      setMessage(`A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`);
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

    if (isSignUp && signupCooldownSeconds > 0) {
      setMessageType("error");
      setMessage(`Aguarde ${signupCooldownSeconds}s para tentar criar a conta novamente.`);
      return false;
    }

    return true;
  };

  const handleEmailAuth = async () => {
    if (!isCloudConfigured) {
      setMessageType("error");
      setMessage(
        "O Supabase não está configurado neste ambiente. Configure as variáveis na Vercel para habilitar login e cadastro.",
      );
      return;
    }

    if (!validateEmailForm()) return;

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
      if (isSignUp && isRateLimitError(error)) {
        const cooldownSeconds = getRateLimitCooldownSeconds(error);
        setSignupCooldownUntil(Date.now() + cooldownSeconds * 1000);
      }

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
      setMessage("Conta criada. Verifique seu email para confirmar e depois entre no app.");
      return;
    }

    if (EMAIL_REGEX.test(email.trim())) {
      const normalizedEmail = email.trim().toLowerCase();

      if (!savedAccounts.includes(normalizedEmail)) {
        const shouldSave = window.confirm(
          "Deseja salvar esta conta neste aparelho para preencher o email automaticamente nos próximos logins?",
        );

        if (shouldSave) {
          setSavedAccounts((prev) => {
            const next = [normalizedEmail, ...prev.filter((item) => item !== normalizedEmail)].slice(0, 5);
            persistSavedAccounts(next);
            return next;
          });
        }
      }
    }

    setVerificationSent(false);
    setMessageType("info");
    setMessage("Login concluído. Sincronizando dados...");
  };

  const handleGoogleSignIn = async () => {
    if (!isCloudConfigured || !supabase) {
      setMessageType("error");
      setMessage("O Supabase não está configurado neste ambiente.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const redirectTo = getAuthRedirectUrl() || undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          ...(redirectTo ? { redirectTo } : {}),
        },
      });

      if (error) throw error;
      if (data.url) window.location.assign(data.url);
    } catch {
      setMessageType("error");
      setMessage("Não foi possível iniciar com o Google no momento.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!EMAIL_REGEX.test(email.trim())) {
      setMessageType("error");
      setMessage("Informe um email válido para recuperar a senha.");
      return;
    }

    if (!isCloudConfigured || !supabase) {
      setMessageType("error");
      setMessage("O Supabase não está configurado neste ambiente.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const redirectTo = getRecoveryRedirectUrl() || undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        ...(redirectTo ? { redirectTo } : {}),
      });

      if (error) throw error;

      setMessageType("info");
      setMessage("Enviamos um link para redefinir a senha no email cadastrado.");
    } catch {
      setMessageType("error");
      setMessage("Não foi possível enviar a recuperação de senha.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    if (!isCloudConfigured || !supabase) {
      setMessageType("error");
      setMessage("O Supabase não está configurado neste ambiente.");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      setMessageType("error");
      setMessage("Informe um número de celular válido.");
      return;
    }

    if (phoneOtpSent && !phoneOtp.trim()) {
      setMessageType("error");
      setMessage("Informe o código enviado por SMS.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (!phoneOtpSent) {
        const { error } = await supabase.auth.signInWithOtp({ phone: normalizedPhone });
        if (error) throw error;

        setPhoneOtpSent(true);
        setMessageType("info");
        setMessage("Enviamos um código por SMS para o seu celular.");
      } else {
        const { error } = await supabase.auth.verifyOtp({
          phone: normalizedPhone,
          token: phoneOtp.trim(),
          type: "sms",
        });

        if (error) throw error;

        setMessageType("info");
        setMessage("Login por celular concluído.");
      }
    } catch {
      setMessageType("error");
      setMessage("Não foi possível autenticar com o celular agora.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async () => {
    if (recoveryPassword.length < PASSWORD_MIN_LENGTH) {
      setMessageType("error");
      setMessage(`A nova senha precisa ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
      return;
    }

    if (recoveryPassword !== recoveryPasswordConfirm) {
      setMessageType("error");
      setMessage("As senhas não coincidem.");
      return;
    }

    if (!isCloudConfigured || !supabase) {
      setMessageType("error");
      setMessage("O Supabase não está configurado neste ambiente.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: recoveryPassword });
      if (error) throw error;

      setMessageType("info");
      setMessage("Senha atualizada. Entrando no app...");
      navigate("/", { replace: true });
    } catch {
      setMessageType("error");
      setMessage("Não foi possível atualizar a senha agora.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrimaryAction = () => {
    if (isRecoveryMode) {
      void handleRecoverySubmit();
      return;
    }

    if (activeTab === "login" && loginMethod === "phone") {
      void handlePhoneAuth();
      return;
    }

    void handleEmailAuth();
  };

  const mainButtonLabel = () => {
    if (loading) return "Aguarde...";
    if (isRecoveryMode) return "Atualizar senha";
    if (activeTab === "login" && loginMethod === "phone") {
      return phoneOtpSent ? "Verificar código" : "Enviar código";
    }
    if (isSignUp && signupCooldownSeconds > 0) {
      return `Aguarde ${signupCooldownSeconds}s...`;
    }
    return isSignUp ? "Criar conta" : "Entrar e sincronizar";
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-6 py-8 flex items-center justify-center">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="bg-white/95 backdrop-blur rounded-[36px] border border-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] overflow-hidden">
          <div className="px-7 pt-8 pb-6 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 text-white relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -left-6 bottom-0 w-24 h-24 rounded-full bg-white/10" />
            <div className="relative z-10 flex items-center gap-2 mb-4 text-white/90 text-xs font-black uppercase tracking-[0.22em]">
              <Sparkles size={14} />
              {isRecoveryMode ? "Recuperação" : isSignUp ? "Cadastro" : "Login"}
            </div>
            <h2 className="text-3xl font-black leading-tight max-w-[12ch]">
              {isRecoveryMode
                ? "Redefina sua senha"
                : isSignUp
                ? "Crie sua conta"
                : "Entre para liberar o app"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/90 max-w-[28ch]">
              {isRecoveryMode
                ? "Escolha uma nova senha para continuar usando sua conta."
                : isSignUp
                ? "Crie seu acesso para sincronizar seus dados entre dispositivos com segurança."
                : "Seus dados ficam sincronizados em nuvem e disponíveis em qualquer aparelho quando você entra com sua conta."}
            </p>
          </div>

          <div className="p-6 space-y-5">
            {verificationSent && activeTab === "login" && !isRecoveryMode && (
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-emerald-900 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shrink-0">
                    <MailCheck size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black mb-1">Conta criada com sucesso</p>
                    <p className="text-sm leading-relaxed text-emerald-900/80">
                      Confirme o email enviado e depois faça login aqui para sincronizar seus dados.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isRecoveryMode ? (
              <div className="space-y-3 rounded-3xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-blue-600 shrink-0">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-blue-950">Redefinir senha</p>
                    <p className="text-xs text-blue-900/70 mt-1">
                      Escolha uma nova senha para concluir a recuperação da sua conta.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={recoveryPassword}
                    onChange={(e) => setRecoveryPassword(e.target.value)}
                    placeholder="Nova senha"
                    autoComplete="new-password"
                    className="w-full h-14 rounded-2xl bg-white border border-blue-100 px-4 pr-12 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 h-14 px-4 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={recoveryPasswordConfirm}
                    onChange={(e) => setRecoveryPasswordConfirm(e.target.value)}
                    placeholder="Confirmar nova senha"
                    autoComplete="new-password"
                    className="w-full h-14 rounded-2xl bg-white border border-blue-100 px-4 pr-12 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 h-14 px-4 text-gray-500 hover:text-gray-700"
                    aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("login");
                      setLoginMethod("email");
                      setPhoneOtpSent(false);
                      setPhoneOtp("");
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

                {activeTab === "login" && (
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-1 border border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod("email");
                        setPhoneOtpSent(false);
                        setPhoneOtp("");
                      }}
                      className={`h-11 rounded-2xl text-sm font-black transition-colors ${
                        loginMethod === "email"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-500"
                      }`}
                    >
                      E-mail
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod("phone");
                        setMessage(null);
                      }}
                      className={`h-11 rounded-2xl text-sm font-black transition-colors ${
                        loginMethod === "phone"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-500"
                      }`}
                    >
                      Celular
                    </button>
                  </div>
                )}

                {activeTab === "login" && loginMethod === "phone" ? (
                  <div className="space-y-3 rounded-3xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-blue-600 shrink-0">
                        <Phone size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Acesso por celular</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Envie um código por SMS e confirme para entrar.
                        </p>
                      </div>
                    </div>

                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+55 11 99999-9999"
                      autoComplete="tel"
                      className="w-full h-14 rounded-2xl bg-white border border-gray-100 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />

                    {phoneOtpSent && (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        placeholder="Código SMS"
                        autoComplete="one-time-code"
                        className="w-full h-14 rounded-2xl bg-white border border-gray-100 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      autoComplete="email"
                      className="w-full h-14 rounded-2xl bg-gray-50 border border-gray-100 px-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                    />

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Senha"
                        autoComplete={activeTab === "login" ? "current-password" : "new-password"}
                        className="w-full h-14 rounded-2xl bg-gray-50 border border-gray-100 px-4 pr-12 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 h-14 px-4 text-gray-500 hover:text-gray-700"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {activeTab === "login" && (
                      <button
                        type="button"
                        onClick={() => void handleSendPasswordReset()}
                        className="text-left text-xs font-bold text-blue-600"
                      >
                        Esqueci minha senha
                      </button>
                    )}

                    {isSignUp && (
                      <>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirmar senha"
                            autoComplete="new-password"
                            className="w-full h-14 rounded-2xl bg-gray-50 border border-gray-100 px-4 pr-12 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            className="absolute inset-y-0 right-0 h-14 px-4 text-gray-500 hover:text-gray-700"
                            aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                          A senha precisa ter no mínimo {PASSWORD_MIN_LENGTH} caracteres.
                        </p>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            <button
              type="button"
              disabled={
                loading ||
                !isCloudConfigured ||
                (isSignUp && signupCooldownSeconds > 0)
              }
              onClick={handlePrimaryAction}
              className="w-full h-14 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Aguarde...
                </>
              ) : isRecoveryMode ? (
                <>
                  <RotateCw size={18} />
                  Atualizar senha
                </>
              ) : activeTab === "login" && loginMethod === "phone" ? (
                <>
                  {phoneOtpSent ? <KeyRound size={18} /> : <Send size={18} />}
                  {phoneOtpSent ? "Verificar código" : "Enviar código"}
                </>
              ) : isSignUp && signupCooldownSeconds > 0 ? (
                `Aguarde ${signupCooldownSeconds}s...`
              ) : isSignUp ? (
                <>
                  <ArrowRight size={18} />
                  Criar conta
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Entrar e sincronizar
                </>
              )}
            </button>

            {!isRecoveryMode && (
              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={loading || !isCloudConfigured}
                className="w-full h-14 rounded-2xl bg-white border border-gray-100 text-gray-800 font-black flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
              >
                <Sparkles size={18} className="text-blue-600" />
                Continuar com Google
              </button>
            )}

            {isDevMode && (
              <div className="space-y-3 rounded-3xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Conta de dev
                </p>
                <div className="relative">
                  <input
                    type={showDevPassword ? "text" : "password"}
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    placeholder="Senha da conta de dev"
                    autoComplete="off"
                    className="w-full h-14 rounded-2xl bg-white border border-gray-100 px-4 pr-12 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDevPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 h-14 px-4 text-gray-500 hover:text-gray-700"
                    aria-label={showDevPassword ? "Ocultar senha dev" : "Mostrar senha dev"}
                  >
                    {showDevPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    setMessage(null);

                    try {
                      const error = await signInDev(devPassword);
                      if (error) {
                        setMessageType("error");
                        setMessage(error);
                        return;
                      }

                      setMessageType("info");
                      setMessage("Conta de dev ativa. Você já pode testar o app com dados locais.");
                    } catch {
                      setMessageType("error");
                      setMessage("Não foi possível ativar a conta de dev.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full h-14 rounded-2xl bg-gray-900 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-gray-200 transition-transform active:scale-[0.99] disabled:opacity-60"
                >
                  <ShieldCheck size={18} />
                  Entrar como dev
                </button>
                <p className="text-[11px] font-medium text-gray-500 leading-relaxed">
                  Use a senha padrão para abrir a conta de testes local.
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
              <span>{cloudSyncStatus === "syncing" ? "Sincronizando" : "Pronto"}</span>
              <span>RideControl Cloud</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
