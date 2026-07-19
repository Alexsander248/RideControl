import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  ArrowLeft,
  Camera,
  Save,
  Fuel,
  Wrench,
  Package,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

import { useApp } from "../context/AppContext";
import { getTodayLocalIsoDate } from "../lib/date";
import { getOptimizedImageDataUrl } from "../lib/image";
import { cn } from "../lib/utils";
import type { ExpenseCategory } from "../types";

export const AddExpense: React.FC = () => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { bikes, addExpense } = useApp();
  const isTutorialMode = searchParams.get("tutorial") === "1";

  const tutorialBike = bikes.find(
    (bike) =>
      bike.name === "YAMAHA YZF R-3 321/ABS" &&
      bike.model === "YZF R-3 321/ABS",
  );

  const tutorialBikeOption = {
    id: "tutorial-bike",
    name: "YAMAHA YZF R-3 321/ABS",
    currentKm: 100,
  };

  const bikeOptions = isTutorialMode
    ? [
        tutorialBikeOption,
        ...bikes.filter((b) => b.id !== tutorialBikeOption.id),
      ]
    : bikes;

  const initialBikeId =
    searchParams.get("bikeId") ||
    tutorialBike?.id ||
    (bikeOptions.length > 0 ? bikeOptions[0].id : "");
  const initialType =
    (searchParams.get("type") as ExpenseCategory) || "Combustivel";

  const [formData, setFormData] = useState({
    bikeId: initialBikeId,
    type: initialType,
    date: isTutorialMode ? "2026-04-09" : getTodayLocalIsoDate(),
    amount: isTutorialMode ? 25 : 0,
    km: isTutorialMode
      ? 100
      : bikes.find((b) => b.id === initialBikeId)?.currentKm || 0,
    liters: isTutorialMode ? 3 : 0,
    fullTank: isTutorialMode,
    notes: isTutorialMode ? "Abastecimento tutorial" : "",
    receiptImageUrl: "",
  });
  const [amountInput, setAmountInput] = useState(
    isTutorialMode ? "R$ 25,00" : "",
  );
  const [isProcessingReceiptImage, setIsProcessingReceiptImage] =
    useState(false);

  const formatBrlCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const MAX_AMOUNT = 10000000; // 10 milhões

  const handleAmountChange = (rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, "");
    const nextAmount = digitsOnly ? Number(digitsOnly) / 100 : 0;

    // Limita a 1 milhão
    if (nextAmount > MAX_AMOUNT) {
      return;
    }

    setAmountInput(digitsOnly ? formatBrlCurrency(nextAmount) : "");
    setFormData((prev) => ({
      ...prev,
      amount: nextAmount,
    }));
  };

  const handleReceiptImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingReceiptImage(true);
      const optimizedReceiptImage = await getOptimizedImageDataUrl(file);
      setFormData((prev) => ({
        ...prev,
        receiptImageUrl: optimizedReceiptImage,
      }));
    } catch (error) {
      console.error("Erro ao processar imagem da nota fiscal:", error);
      alert("Não foi possível carregar a imagem da nota fiscal.");
    } finally {
      setIsProcessingReceiptImage(false);
    }
  };

  const categories = [
    {
      id: "Combustivel",
      label: "Combustível",
      icon: Fuel,
      color: "bg-orange-500",
    },
    {
      id: "Manutencao",
      label: "Manutenção",
      icon: Wrench,
      color: "bg-blue-500",
    },
    { id: "Pecas", label: "Peças", icon: Package, color: "bg-purple-500" },
    {
      id: "Equipamentos",
      label: "Equipamentos",
      icon: Package,
      color: "bg-violet-500",
    },
    { id: "Outros", icon: MoreHorizontal, color: "bg-gray-500" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bikeId) {
      alert("Selecione uma motocicleta.");
      return;
    }

    if (formData.amount < 0) {
      alert("O valor não pode ser negativo.");
      return;
    }

    if (formData.km < 0) {
      alert("Informe um KM atual válido (zero ou maior).");
      return;
    }

    if (formData.type === "Combustivel" && formData.liters <= 0) {
      alert("Para combustível, informe litros maiores que zero.");
      return;
    }

    if (isTutorialMode) {
      navigate("/diagnostico?tutorial=1");
      return;
    }

    const payload = {
      ...formData,
      liters: formData.type === "Combustivel" ? formData.liters : undefined,
      fullTank: formData.type === "Combustivel" ? formData.fullTank : undefined,
      receiptImageUrl: formData.receiptImageUrl.trim() || undefined,
    };

    addExpense(payload as any);
    navigate(-1);
  };

  const getBikeCurrentKm = (bikeId: string) => {
    return bikeOptions.find((bike) => bike.id === bikeId)?.currentKm || 0;
  };

  useEffect(() => {
    const submitFromQuickAction = () => {
      formRef.current?.requestSubmit();
    };

    window.addEventListener("app:submit-add-expense", submitFromQuickAction);

    return () => {
      window.removeEventListener(
        "app:submit-add-expense",
        submitFromQuickAction,
      );
    };
  }, []);

  return (
    <div className="tutorial-add-expense p-6 pb-32">
      <header className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-900 shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Adicionar Gastos</h1>
      </header>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 space-y-8">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 ml-1">
              Categoria
            </label>
            <div className="grid grid-cols-4 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      type: cat.id as ExpenseCategory,
                    })
                  }
                  className={`w-full flex flex-col items-center gap-2 min-w-0 tutorial-expense-category-${cat.id}`}
                >
                  <div
                    className={cn(
                      "p-4 rounded-2xl transition-all",
                      formData.type === cat.id
                        ? `${cat.color} text-white shadow-lg scale-110`
                        : "bg-gray-50 text-gray-400",
                    )}
                  >
                    <cat.icon size={20} />
                  </div>
                  <span
                    className={cn(
                      "w-full text-[10px] font-bold text-center leading-tight",
                      formData.type === cat.id
                        ? "text-gray-900"
                        : "text-gray-400",
                    )}
                  >
                    {cat.label || cat.id}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Motocicleta
              </label>
              <select
                required
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                value={formData.bikeId}
                onChange={(e) => {
                  const selectedBikeId = e.target.value;
                  setFormData({
                    ...formData,
                    bikeId: selectedBikeId,
                    km: getBikeCurrentKm(selectedBikeId),
                  });
                }}
              >
                <option value="">Selecione uma moto</option>
                {bikeOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  Valor (R$)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                  value={amountInput}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
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
                  value={formData.km}
                  onChange={(e) => {
                    const nextKm = Number(e.target.value);
                    setFormData({
                      ...formData,
                      km: Number.isNaN(nextKm) ? 0 : Math.max(0, nextKm),
                    });
                  }}
                />
              </div>
            </div>

            {formData.type === "Combustivel" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-[0.9fr_1.1fr] gap-4 items-end">
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                      Litros
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                      value={formData.liters === 0 ? "" : formData.liters}
                      onChange={(e) => {
                        const nextLiters = Number(e.target.value);
                        setFormData({
                          ...formData,
                          liters: Number.isNaN(nextLiters) ? 0 : nextLiters,
                        });
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                      Data
                    </label>
                    <input
                      required
                      type="date"
                      className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      fullTank: !prev.fullTank,
                    }))
                  }
                  className={cn(
                    "w-full rounded-2xl border px-5 py-4 text-left transition-colors",
                    formData.fullTank
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-gray-200 bg-gray-50 text-gray-600",
                  )}
                >
                  <p className="text-xs font-bold uppercase tracking-wider">
                    Tanque cheio
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formData.fullTank
                      ? "Sim, completei o tanque neste abastecimento"
                      : "Nao, foi abastecimento parcial"}
                  </p>
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  Data
                </label>
                <input
                  required
                  type="date"
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Observações (opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Adicione alguns detalhes..."
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20 resize-none"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Nota fiscal / imagem (opcional)
              </label>
              <div className="rounded-[28px] border border-dashed border-gray-200 bg-gray-50 p-4">
                {formData.receiptImageUrl ? (
                  <div className="space-y-3">
                    <img
                      src={formData.receiptImageUrl}
                      alt="Pré-visualização da nota fiscal"
                      className="w-full h-56 object-cover rounded-2xl border border-gray-100"
                    />
                    <div className="flex gap-3">
                      <label className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold text-blue-700 border border-blue-100 shadow-sm cursor-pointer">
                        <Camera size={18} />
                        Trocar imagem
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleReceiptImageUpload}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            receiptImageUrl: "",
                          }))
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold text-gray-700 border border-gray-200 shadow-sm"
                      >
                        <Trash2 size={18} />
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center">
                    <Camera size={28} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-700">
                      Toque para tirar foto ou escolher uma imagem
                    </span>
                    <span className="text-[11px] font-medium text-gray-400">
                      A nota fiscal ficará salva junto com o gasto.
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleReceiptImageUpload}
                      disabled={isProcessingReceiptImage}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="text-sm font-semibold text-emerald-800">
            Use o botão central da barra inferior para salvar este gasto.
          </p>
          <button
            type="submit"
            className="mt-3 w-full bg-white text-emerald-700 py-3 rounded-xl font-bold border border-emerald-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Save size={18} />
            <span>Salvar aqui (alternativo)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
