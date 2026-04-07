import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  ArrowLeft,
  Save,
  Fuel,
  Wrench,
  Package,
  MoreHorizontal,
} from "lucide-react";
import { ExpenseCategory } from "../types";
import { cn } from "../lib/utils";

export const AddExpense: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { bikes, addExpense } = useApp();

  const initialBikeId =
    searchParams.get("bikeId") || (bikes.length > 0 ? bikes[0].id : "");
  const initialType =
    (searchParams.get("type") as ExpenseCategory) || "Combustivel";

  const [formData, setFormData] = useState({
    bikeId: initialBikeId,
    type: initialType,
    date: new Date().toISOString().split("T")[0],
    amount: 0,
    km: bikes.find((b) => b.id === initialBikeId)?.currentKm || 0,
    liters: 0,
    notes: "",
  });

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
    if (!formData.bikeId) return;
    addExpense(formData as any);
    navigate(`/moto/${formData.bikeId}`);
  };

  const getBikeCurrentKm = (bikeId: string) => {
    return bikes.find((bike) => bike.id === bikeId)?.currentKm || 0;
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
        <h1 className="text-2xl font-bold">Adicionar Gastos</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full flex flex-col items-center gap-2 min-w-0"
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
                {bikes.map((b) => (
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
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                  value={formData.amount === 0 ? "" : formData.amount}
                  onChange={(e) => {
                    const nextAmount = Number(e.target.value);
                    setFormData({
                      ...formData,
                      amount: Number.isNaN(nextAmount) ? 0 : nextAmount,
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

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-5 rounded-[24px] font-bold text-lg shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-transform active:scale-95"
        >
          <Save size={24} />
          <span>Salvar gasto</span>
        </button>
      </form>
    </div>
  );
};
