import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Camera, CheckCircle2, Sparkles, Save } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getOptimizedImageDataUrl } from "../lib/image";

const DEFAULT_PROFILE_PHOTO = "https://picsum.photos/seed/rider/200/200";

export const PersonalInfo: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, updateUserProfile, isProfileComplete } = useApp();

  const [name, setName] = useState(userProfile.name);
  const [photoUrl, setPhotoUrl] = useState(userProfile.photoUrl);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const trimmedName = name.trim();
  const isNameValid = trimmedName.length > 0;
  const requiresMandatorySetup = !isProfileComplete;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimizedPhoto = await getOptimizedImageDataUrl(file);
      setPhotoUrl(optimizedPhoto);
    } catch (error) {
      console.error("Erro ao processar foto de perfil:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNameValid) {
      return;
    }

    const safeName = trimmedName;
    const safePhotoUrl = photoUrl.trim() || DEFAULT_PROFILE_PHOTO;

    updateUserProfile({
      name: safeName,
      photoUrl: safePhotoUrl,
    });

    if (!requiresMandatorySetup) {
      navigate("/perfil", { replace: true });
      return;
    }

    setIsCompletingProfile(true);

    window.setTimeout(() => {
      navigate("/", {
        replace: true,
        state: { fromProfileComplete: true },
      });
    }, 1250);
  };

  return (
    <>
      <AnimatePresence>
        {isCompletingProfile && (
          <motion.div
            className="fixed inset-0 z-[120] overflow-hidden bg-gradient-to-br from-blue-700 via-blue-500 to-sky-400 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.div
              className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-white/15 blur-3xl"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
            <motion.div
              className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.08 }}
            />

            <motion.div
              className="relative z-10 w-full max-w-sm text-center text-white"
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <motion.div
                className="mx-auto w-24 h-24 rounded-[30px] bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl shadow-blue-950/20"
                initial={{ rotate: -8, scale: 0.7 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <CheckCircle2 size={52} strokeWidth={2.4} />
              </motion.div>

              <motion.div
                className="absolute inset-x-1/2 top-10 -translate-x-1/2 w-36 h-36 rounded-full border border-white/30"
                animate={{ scale: [0.85, 1.2], opacity: [0.9, 0] }}
                transition={{
                  duration: 1.1,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeOut",
                }}
              />

              <motion.div
                className="absolute inset-x-1/2 top-10 -translate-x-1/2 w-48 h-48 rounded-full border border-white/15"
                animate={{ scale: [0.75, 1.3], opacity: [0.8, 0] }}
                transition={{
                  duration: 1.2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeOut",
                  delay: 0.18,
                }}
              />

              <motion.div
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
              >
                <Sparkles size={14} />
                Perfil concluído
              </motion.div>

              <motion.div
                className="mt-8 h-2 rounded-full bg-white/20 overflow-hidden"
                initial={{ opacity: 0, scaleX: 0.8 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.25 }}
              >
                <motion.div
                  className="h-full w-full origin-left rounded-full bg-white"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.1, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 pb-24">
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={() => {
              if (!requiresMandatorySetup) {
                navigate(-1);
              }
            }}
            disabled={requiresMandatorySetup || isCompletingProfile}
            className={`p-3 border rounded-2xl shadow-sm transition-transform ${
              requiresMandatorySetup || isCompletingProfile
                ? "bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed"
                : "bg-white border-gray-100 text-gray-900 active:scale-95"
            }`}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">Informações pessoais</h1>
        </header>

        {requiresMandatorySetup && (
          <p className="mb-6 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 px-4 py-3 text-sm font-semibold">
            Complete seu nome para liberar a navegação do app.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 space-y-6">
            <div className="flex flex-col items-center">
              <label className="w-full max-w-[240px] cursor-pointer select-none">
                <div className="w-full h-52 bg-gray-50 rounded-[36px] border-2 border-dashed border-gray-200 text-gray-400 overflow-hidden relative shadow-sm transition-transform active:scale-[0.99]">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center px-6 text-center">
                      <div className="w-16 h-16 rounded-[22px] bg-white flex items-center justify-center shadow-sm border border-gray-100 mb-4 text-blue-500">
                        <Camera size={30} />
                      </div>
                      <span className="text-sm font-black text-gray-700">
                        Adicionar foto
                      </span>
                      <span className="mt-1 text-[11px] font-semibold text-gray-400 leading-relaxed">
                        Toque para enviar ou trocar a imagem do perfil.
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent px-4 py-3 flex items-end justify-between gap-3">
                    <div className="text-white">
                      <p className="text-sm font-black">
                        {photoUrl ? "Foto atual" : "Foto do perfil"}
                      </p>
                      <p className="text-[11px] font-semibold text-white/80">
                        Toque para alterar
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white border border-white/20 shrink-0">
                      <Camera size={18} />
                    </div>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handlePhotoUpload}
                    disabled={isCompletingProfile}
                  />
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Nome completo
              </label>
              <input
                required
                type="text"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCompletingProfile}
              />
              {!isNameValid && (
                <p className="mt-2 text-xs font-semibold text-red-500 ml-1">
                  Informe seu nome completo para continuar.
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!isNameValid || isCompletingProfile}
            className={`w-full py-5 rounded-[24px] font-bold text-lg flex items-center justify-center gap-3 transition-transform ${
              isNameValid && !isCompletingProfile
                ? "bg-blue-500 text-white shadow-xl shadow-blue-200 active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isCompletingProfile ? (
              <motion.span
                className="inline-flex items-center gap-3"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.25,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "reverse",
                }}
              >
                <motion.span
                  className="w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.8,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                />
                Preparando seu painel
              </motion.span>
            ) : (
              <>
                <Save size={24} />
                <span>Salvar perfil</span>
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
};
