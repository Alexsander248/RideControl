import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, CalendarDays, Repeat2 } from "lucide-react";

import { useApp } from "../context/AppContext";
import { cn } from "../lib/utils";

const RECURRING_CATEGORIES = [
  "Seguro",
  "IPVA",
  "Licenciamento",
  "Manutenção",
  "Outros",
] as const;

export const AddRecurringExpense: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { bikes, subscriptions, addSubscription, updateSubscription } =
    useApp();
  const editingId = searchParams.get("id");

  const initialBikeId =
    searchParams.get("bikeId") || (bikes.length > 0 ? bikes[0].id : "");

  const editingSubscription = useMemo(
    () => subscriptions.find((item) => item.id === editingId),
    [subscriptions, editingId],
  );

  const isEditing = Boolean(editingSubscription);

  const [formData, setFormData] = useState({
    motoId: initialBikeId,
    name: "",
    amount: 0,
    dueDay: new Date().getDate(),
    category: "Seguro",
    active: true,
  });

  useEffect(() => {
    if (!editingSubscription) {
      return;
    }

    setFormData({
      motoId: editingSubscription.motoId,
      name: editingSubscription.name,
      amount: editingSubscription.amount,
      dueDay: editingSubscription.dueDay,
      category: editingSubscription.category,
      active: editingSubscription.active,
    });
  }, [editingSubscription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();

    if (!formData.motoId || !name || formData.amount <= 0) {
      return;
    }

    if (editingSubscription) {
      updateSubscription({
        ...editingSubscription,
        motoId: formData.motoId,
        name,
        amount: formData.amount,
        dueDay: formData.dueDay,
        category: formData.category,
        active: formData.active,
      });
    } else {
      addSubscription({
        motoId: formData.motoId,
        name,
        amount: formData.amount,
        dueDay: formData.dueDay,
        category: formData.category,
        active: formData.active,
      });
    }

    navigate("/perfil/recorrencias");
  };

  return (
    <div className="p-6 pb-32">
      <header className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-900 shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar recorrência" : "Gasto recorrente"}
          </h1>
          <p className="text-gray-500 text-sm font-medium">
            {isEditing
              ? "Atualize os dados da recorrência selecionada."
              : "Cadastre seguro, IPVA, licenciamento e outras cobranças mensais."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Nome da recorrência
            </label>
            <input
              required
              type="text"
              placeholder="ex: Seguro anual"
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Valor (R$)
              </label>
              <input
                required
                type="number"
                min="0"
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
                Dia de vencimento
              </label>
              <input
                required
                type="number"
                min="1"
                max="31"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                value={formData.dueDay}
                onChange={(e) => {
                  const nextDueDay = Number(e.target.value);
                  setFormData({
                    ...formData,
                    dueDay: Number.isNaN(nextDueDay)
                      ? 1
                      : Math.min(31, Math.max(1, nextDueDay)),
                  });
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Motocicleta
            </label>
            <select
              required
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
              value={formData.motoId}
              onChange={(e) =>
                setFormData({ ...formData, motoId: e.target.value })
              }
            >
              <option value="">Selecione uma moto</option>
              {bikes.map((bike) => (
                <option key={bike.id} value={bike.id}>
                  {bike.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 ml-1">
              Categoria
            </label>
            <div className="grid grid-cols-2 gap-3">
              {RECURRING_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFormData({ ...formData, category })}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left font-bold transition-all",
                    formData.category === category
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-100 bg-gray-50 text-gray-600",
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setFormData({ ...formData, active: !formData.active })
            }
            className={cn(
              "w-full rounded-2xl border px-5 py-4 text-left transition-colors",
              formData.active
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-gray-200 bg-gray-50 text-gray-600",
            )}
          >
            <p className="text-xs font-bold uppercase tracking-wider">
              Recorrência ativa
            </p>
            <p className="mt-1 text-sm font-semibold">
              {formData.active
                ? "O sistema vai lançar esse gasto automaticamente todo mês."
                : "Esse gasto ficará salvo, mas não vai gerar lançamentos automáticos."}
            </p>
          </button>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 flex items-start gap-3">
            <div className="bg-blue-500 text-white p-2 rounded-xl">
              <Repeat2 size={18} />
            </div>
            <div>
              <p className="font-bold text-blue-900">Como funciona</p>
              <p className="text-sm text-blue-800 mt-1 leading-relaxed">
                Quando o app abrir, o gasto recorrente é lançado como pendente
                no mês atual e aparece no alerta do painel.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="text-sm font-semibold text-emerald-800">
            {isEditing
              ? "Confirme para salvar as alterações deste recorrente."
              : "Use o botão central da barra inferior para salvar este recorrente."}
          </p>
          <button
            type="submit"
            className="mt-3 w-full bg-white text-emerald-700 py-3 rounded-xl font-bold border border-emerald-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <CalendarDays size={18} />
            <Save size={18} />
            <span>
              {isEditing ? "Salvar alterações" : "Salvar recorrência"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
