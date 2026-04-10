import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { getOptimizedImageDataUrl } from "../lib/image";
import {
  getFipePriceForYear,
  getMotorcycleSuggestions,
  getMotorcycleYearOptions,
  MotorcycleSuggestion,
  MotorcycleYearOption,
} from "../lib/motorcycleAutocomplete";

type SelectedFipeModel = {
  brandCode: string;
  modelCode: number;
};

const validateYear = (year: number): number => {
  const currentYear = new Date().getFullYear();
  if (year >= 1990 && year <= currentYear) {
    return year;
  }
  return currentYear;
};

export const AddBike: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addBike } = useApp();
  const isTutorialMode = searchParams.get("tutorial") === "1";

  const [formData, setFormData] = useState({
    name: isTutorialMode ? "YAMAHA YZF R-3 321/ABS" : "",
    model: isTutorialMode ? "YZF R-3 321/ABS" : "",
    year: isTutorialMode ? 2021 : new Date().getFullYear(),
    currentKm: 0,
    photoUrl: isTutorialMode ? "/icons/motoTutorial.jpg" : "",
    purchasePrice: isTutorialMode ? 26317 : 0,
  });
  const [currentKmInput, setCurrentKmInput] = useState("0");
  const [nameSuggestions, setNameSuggestions] = useState<
    MotorcycleSuggestion[]
  >([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFipeModel, setSelectedFipeModel] =
    useState<SelectedFipeModel | null>(null);
  const [yearOptions, setYearOptions] = useState<MotorcycleYearOption[]>([]);
  const [selectedYearCode, setSelectedYearCode] = useState("");
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  useEffect(() => {
    if (isTutorialMode) {
      setNameSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    const query = formData.name.trim();
    if (query.length < 2) {
      setNameSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoadingSuggestions(true);
        const suggestions = await getMotorcycleSuggestions(query);
        if (!isCancelled) {
          setNameSuggestions(suggestions);
        }
      } catch (error) {
        if (!isCancelled) {
          setNameSuggestions([]);
        }
        console.error("Erro ao buscar sugestoes de moto:", error);
      } finally {
        if (!isCancelled) {
          setIsLoadingSuggestions(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [formData.name, isTutorialMode]);

  useEffect(() => {
    setCurrentKmInput(
      formData.currentKm === 0 ? "0" : String(formData.currentKm),
    );
  }, [formData.currentKm]);

  const applySelectedYearPrice = async (
    fipeModel: SelectedFipeModel,
    yearCode: string,
  ) => {
    try {
      setIsLoadingPrice(true);
      const fipePrice = await getFipePriceForYear(
        fipeModel.brandCode,
        fipeModel.modelCode,
        yearCode,
      );
      setFormData((prev) => ({ ...prev, purchasePrice: fipePrice }));
    } catch (error) {
      console.error("Erro ao buscar valor FIPE:", error);
      setFormData((prev) => ({ ...prev, purchasePrice: 0 }));
    } finally {
      setIsLoadingPrice(false);
    }
  };

  const handleSelectSuggestion = async (suggestion: MotorcycleSuggestion) => {
    const fipeModel: SelectedFipeModel = {
      brandCode: suggestion.brandCode,
      modelCode: suggestion.modelCode,
    };

    setFormData((prev) => ({
      ...prev,
      name: suggestion.name,
      model: suggestion.model,
      purchasePrice: 0,
      year: new Date().getFullYear(),
    }));
    setShowSuggestions(false);
    setSelectedFipeModel(fipeModel);
    setSelectedYearCode("");
    setYearOptions([]);

    try {
      setIsLoadingYears(true);
      const options = await getMotorcycleYearOptions(
        suggestion.brandCode,
        suggestion.modelCode,
      );
      setYearOptions(options);

      if (options.length > 0) {
        const currentYear = new Date().getFullYear();
        const preferredOption =
          options.find((item) => item.year === currentYear) || options[0];

        setSelectedYearCode(preferredOption.code);
        const validYear = validateYear(preferredOption.year);
        setFormData((prev) => ({
          ...prev,
          year: validYear,
        }));
        await applySelectedYearPrice(fipeModel, preferredOption.code);
      } else {
        setSelectedYearCode("");
        setFormData((prev) => ({ ...prev, purchasePrice: 0 }));
      }
    } catch (error) {
      console.error("Erro ao carregar anos da moto selecionada:", error);
      setYearOptions([]);
      setSelectedYearCode("");
      setFormData((prev) => ({ ...prev, purchasePrice: 0 }));
    } finally {
      setIsLoadingYears(false);
    }
  };

  const handleYearSelectionChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const yearCode = e.target.value;
    const selectedYearOption = yearOptions.find(
      (item) => item.code === yearCode,
    );

    setSelectedYearCode(yearCode);
    if (selectedYearOption) {
      const validYear = validateYear(selectedYearOption.year);
      setFormData((prev) => ({ ...prev, year: validYear }));
    } else {
      setFormData((prev) => ({ ...prev, purchasePrice: 0 }));
    }

    if (selectedFipeModel && yearCode) {
      await applySelectedYearPrice(selectedFipeModel, yearCode);
    }
  };

  const handleNameInputChange = (nextName: string) => {
    setFormData((prev) => ({ ...prev, name: nextName }));
    setSelectedFipeModel(null);
    setYearOptions([]);
    setSelectedYearCode("");
    setIsLoadingPrice(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.name || !formData.model) {
        alert("Nome e Modelo são obrigatórios");
        return;
      }

      if (isTutorialMode) {
        navigate("/garagem?tutorial=1");
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
    <div className="tutorial-add-bike p-6 pb-32">
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
              <div className="relative">
                <input
                  required
                  type="text"
                  placeholder="e.g. Yamaha R15"
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                  value={formData.name}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    window.setTimeout(() => setShowSuggestions(false), 120);
                  }}
                  onChange={(e) => handleNameInputChange(e.target.value)}
                />

                {showSuggestions &&
                  (isLoadingSuggestions || nameSuggestions.length > 0) && (
                    <div className="absolute z-20 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-lg max-h-56 overflow-y-auto">
                      {isLoadingSuggestions && (
                        <p className="px-4 py-3 text-sm text-gray-400">
                          Buscando sugestoes...
                        </p>
                      )}

                      {!isLoadingSuggestions &&
                        nameSuggestions.map((suggestion) => (
                          <button
                            key={`${suggestion.brandCode}-${suggestion.modelCode}`}
                            type="button"
                            className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-blue-50 transition-colors"
                            onClick={() => handleSelectSuggestion(suggestion)}
                          >
                            {suggestion.label}
                          </button>
                        ))}
                    </div>
                  )}
              </div>
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
                {yearOptions.length > 0 ? (
                  <select
                    required
                    value={selectedYearCode}
                    onChange={handleYearSelectionChange}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                  >
                    {yearOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    type="number"
                    placeholder="2024"
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                    value={validateYear(formData.year) || ""}
                    onChange={(e) => {
                      const nextYear = Number(e.target.value);
                      setFormData({
                        ...formData,
                        year:
                          Number.isNaN(nextYear) ||
                          nextYear < 1990 ||
                          nextYear > new Date().getFullYear()
                            ? new Date().getFullYear()
                            : nextYear,
                      });
                    }}
                  />
                )}
                {isLoadingYears && (
                  <p className="text-[10px] text-gray-400 mt-2 ml-1">
                    Carregando anos FIPE...
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  KM atual
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                  value={currentKmInput === "0" ? "" : currentKmInput}
                  onFocus={() => {
                    if (currentKmInput === "0") {
                      setCurrentKmInput("");
                    }
                  }}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    const normalizedValue = rawValue.replace(/^0+(?=\d)/, "");
                    setCurrentKmInput(normalizedValue);

                    const nextCurrentKm = Number(normalizedValue);
                    setFormData({
                      ...formData,
                      currentKm: Number.isNaN(nextCurrentKm)
                        ? 0
                        : nextCurrentKm,
                    });
                  }}
                  onBlur={() => {
                    if (currentKmInput.trim() === "") {
                      setCurrentKmInput("0");
                      setFormData((prev) => ({ ...prev, currentKm: 0 }));
                    }
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
              {selectedFipeModel && (
                <p className="text-[10px] text-gray-400 mt-2 ml-1">
                  {isLoadingPrice
                    ? "Buscando valor FIPE..."
                    : "Valor preenchido automaticamente pela FIPE."}
                </p>
              )}
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
