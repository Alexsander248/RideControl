import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  ArrowLeft,
  Save,
  Fuel,
  Wrench,
  Package,
  MoreHorizontal,
} from "lucide-react";

import { useApp } from "../context/AppContext";
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
    date: isTutorialMode
      ? "2026-04-09"
      : new Date().toISOString().split("T")[0],
    amount: isTutorialMode ? 25 : 0,
    km: isTutorialMode
      ? 100
      : bikes.find((b) => b.id === initialBikeId)?.currentKm || 0,
    liters: isTutorialMode ? 3 : 0,
    notes: isTutorialMode ? "Abastecimento tutorial" : "",
  });
  const [amountInput, setAmountInput] = useState(
    isTutorialMode ? "R$ 25,00" : "",
  );

  const formatBrlCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const handleAmountChange = (rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, "");
    const nextAmount = digitsOnly ? Number(digitsOnly) / 100 : 0;

    setAmountInput(digitsOnly ? formatBrlCurrency(nextAmount) : "");
    setFormData((prev) => ({
      ...prev,
      amount: nextAmount,
    }));
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
    { id: "Outros", icon: MoreHorizontal, color: "bg-gray-500" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bikeId || formData.amount <= 0) {
      alert("Preencha uma motocicleta e um valor maior que zero.");
      return;
    }

    if (isTutorialMode) {
      navigate("/diagnostico?tutorial=1");
      return;
    }

    addExpense(formData as any);
    navigate(`/moto/${formData.bikeId}`);
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
                  required
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
                  placeholder="0"
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                  value={formData.km === 0 ? "" : formData.km}
                  onChange={(e) => {
                    const nextKm = Number(e.target.value);
                    setFormData({
                      ...formData,
                      km: Number.isNaN(nextKm) ? 0 : nextKm,
                    });
                  }}
                />
              </div>
            </div>

            {formData.type === "Combustivel" ? (
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
