import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getOptimizedImageDataUrl } from "../lib/image";

const DEFAULT_PROFILE_PHOTO = "https://picsum.photos/seed/rider/200/200";

export const PersonalInfo: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, updateUserProfile } = useApp();

  const [name, setName] = useState(userProfile.name);
  const [photoUrl, setPhotoUrl] = useState(userProfile.photoUrl);

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

    const safeName = name.trim() || userProfile.name;
    const safePhotoUrl = photoUrl.trim() || DEFAULT_PROFILE_PHOTO;

    updateUserProfile({
      name: safeName,
      photoUrl: safePhotoUrl,
    });

    navigate("/perfil");
  };

  return (
    <div className="p-6 pb-24">
      <header className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-900 shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Informações pessoais</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 space-y-6">
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 bg-gray-50 rounded-[40px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 text-gray-400 overflow-hidden relative">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <Camera size={32} className="mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Adicionar foto
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handlePhotoUpload}
              />
            </div>
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
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-5 rounded-[24px] font-bold text-lg shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-transform active:scale-95"
        >
          <Save size={24} />
          <span>Salvar perfil</span>
        </button>
      </form>
    </div>
  );
};
