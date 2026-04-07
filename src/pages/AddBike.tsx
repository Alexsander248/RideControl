import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { getOptimizedImageDataUrl } from "../lib/image";

export const AddBike: React.FC = () => {
  const navigate = useNavigate();
  const { addBike } = useApp();
  const [formData, setFormData] = useState({
    name: "",
    model: "",
    year: new Date().getFullYear(),
    currentKm: 0,
    photoUrl: "",
    purchasePrice: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name || !formData.model) {
        alert("Nome e Modelo são obrigatórios");
        return;
      }
      addBike(formData);
      navigate("/garagem");
    } catch (error) {
      console.error("Erro ao salvar moto:", error);
      alert("Erro ao salvar moto. Verifique o console para mais detalhes.");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimizedPhoto = await getOptimizedImageDataUrl(file);
      setFormData((prev) => ({ ...prev, photoUrl: optimizedPhoto }));
    } catch (error) {
      console.error("Erro ao processar foto da moto:", error);
    }
  };

  return (
    <div className="p-6 pb-32">
      <header className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-900 shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Adicionar nova moto</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 space-y-6">
          <div className="flex flex-col items-center mb-4">
            <div className="w-32 h-32 bg-gray-50 rounded-[40px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 text-gray-400 overflow-hidden relative group">
              {formData.photoUrl ? (
                <img
                  src={formData.photoUrl}
                  alt="Pré-visualização"
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
            <p className="text-[10px] text-gray-400 mt-2 font-medium">
              Toque para escolher uma imagem
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Nome da moto
              </label>
              <input
                required
                type="text"
                placeholder="e.g. BMW R 1250 GS"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Modelo
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Adventure"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  Ano
                </label>
                <input
                  required
                  type="number"
                  placeholder="2024"
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                  value={formData.year || ""}
                  onChange={(e) => {
                    const nextYear = Number(e.target.value);
                    setFormData({
                      ...formData,
                      year: Number.isNaN(nextYear)
                        ? new Date().getFullYear()
                        : nextYear,
                    });
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  KM atual
                </label>
                <input
                  required
                  type="number"
                  placeholder="0"
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                  value={formData.currentKm === 0 ? "" : formData.currentKm}
                  onChange={(e) => {
                    const nextCurrentKm = Number(e.target.value);
                    setFormData({
                      ...formData,
                      currentKm: Number.isNaN(nextCurrentKm)
                        ? 0
                        : nextCurrentKm,
                    });
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Preço de compra (R$)
              </label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                value={
                  formData.purchasePrice === 0 ? "" : formData.purchasePrice
                }
                onChange={(e) => {
                  const nextPrice = Number(e.target.value);
                  setFormData({
                    ...formData,
                    purchasePrice: Number.isNaN(nextPrice) ? 0 : nextPrice,
                  });
                }}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-5 rounded-[24px] font-bold text-lg shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-transform active:scale-95"
        >
          <Save size={24} />
          <span>Salvar moto</span>
        </button>
      </form>
    </div>
  );
};
