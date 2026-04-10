import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ArrowLeft, Save, Trash2 } from "lucide-react";

import { useApp } from "../context/AppContext";
import type { ExpenseCategory } from "../types";

type EditFormData = {
  bikeId: string;
  type: ExpenseCategory;
  date: string;
  amount: number;
  km: number;
  liters: number;
  notes: string;
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  Combustivel: "Combustível",
  Manutencao: "Manutenção",
  Pecas: "Peças",
  Equipamentos: "Equipamentos",
  Outros: "Outros",
};

export const ExpenseActivityDetails: React.FC = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { bikes, expenses, updateExpense, deleteExpense } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string>("");

  const expense = useMemo(
    () => expenses.find((item) => item.id === id),
    [expenses, id],
  );

  const [formData, setFormData] = useState<EditFormData>(() => {
    if (expense) {
      return {
        bikeId: expense.bikeId,
        type: expense.type,
        date: expense.date,
        amount: expense.amount,
        km: expense.km,
        liters: expense.liters || 0,
        notes: expense.notes || "",
      };
    }
    return {
      bikeId: "",
      type: "Combustivel",
      date: new Date().toISOString().split("T")[0],
      amount: 0,
      km: 0,
      liters: 0,
      notes: "",
    };
  });

  useEffect(() => {
    if (!expense) {
      return;
    }

    setFormData({
      bikeId: expense.bikeId,
      type: expense.type,
      date: expense.date,
      amount: expense.amount,
      km: expense.km,
      liters: expense.liters || 0,
      notes: expense.notes || "",
    });
    setError("");
  }, [expense]);

  if (!expense) {
    return (
      <div className="p-6 pb-32">
        <div className="bg-white rounded-[28px] p-8 border border-gray-100 text-center">
          <h1 className="text-xl font-black mb-2">Atividade não encontrada</h1>
          <p className="text-gray-500 mb-6">
            Essa atividade pode ter sido removida.
          </p>
          <Link
            to="/diagnostico"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-blue-500 text-white font-bold"
          >
            Voltar para diagnóstico
          </Link>
        </div>
      </div>
    );
  }

  const bikeName =
    bikes.find((bike) => bike.id === expense.bikeId)?.name || "-";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.bikeId || formData.amount <= 0 || formData.km <= 0) {
      setError("Preencha motocicleta, valor e KM corretamente.");
      return;
    }

    if (formData.type === "Combustivel" && formData.liters <= 0) {
      setError("Para combustível, informe litros maiores que zero.");
      return;
    }

    try {
      updateExpense({
        ...expense,
        bikeId: formData.bikeId,
        type: formData.type,
        date: formData.date,
        amount: formData.amount,
        km: formData.km,
        liters: formData.type === "Combustivel" ? formData.liters : undefined,
        notes: formData.notes.trim() || undefined,
      });
      navigate("/diagnostico", { replace: true });
    } catch (err) {
      console.error("Erro ao salvar atividade:", err);
      setError("Erro ao salvar. Tente novamente.");
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.",
    );

    if (!confirmed) {
      return;
    }

    deleteExpense(expense.id);
    navigate("/diagnostico", { replace: true });
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
          <h1 className="text-2xl font-black">Detalhes da Atividade</h1>
          <p className="text-gray-500 text-sm font-medium">{bikeName}</p>
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 space-y-5">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Motocicleta
            </p>
            {isEditing ? (
              <select
                required
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold"
                value={formData.bikeId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bikeId: e.target.value }))
                }
              >
                <option value="">Selecione uma motocicleta</option>
                {bikes.map((bike) => (
                  <option key={bike.id} value={bike.id}>
                    {bike.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-gray-50 rounded-2xl px-5 py-4 font-bold">
                {bikeName}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Categoria
              </p>
              {isEditing ? (
                <select
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: e.target.value as ExpenseCategory,
                    }))
                  }
                >
                  {Object.keys(CATEGORY_LABELS).map((key) => (
                    <option key={key} value={key}>
                      {CATEGORY_LABELS[key as ExpenseCategory]}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="bg-gray-50 rounded-2xl px-5 py-4 font-bold">
                  {CATEGORY_LABELS[expense.type]}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Data
              </p>
              {isEditing ? (
                <input
                  required
                  type="date"
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              ) : (
                <div className="bg-gray-50 rounded-2xl px-5 py-4 font-bold">
                  {new Date(expense.date).toLocaleDateString("pt-BR")}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Valor
              </p>
              {isEditing ? (
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold"
                  value={formData.amount === 0 ? "" : formData.amount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      amount: Number.isFinite(value) ? value : 0,
                    }));
                  }}
                />
              ) : (
                <div className="bg-gray-50 rounded-2xl px-5 py-4 font-bold">
                  {expense.amount.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                KM
              </p>
              {isEditing ? (
                <input
                  required
                  type="number"
                  min="0"
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold"
                  value={formData.km === 0 ? "" : formData.km}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      km: Number.isFinite(value) ? value : 0,
                    }));
                  }}
                />
              ) : (
                <div className="bg-gray-50 rounded-2xl px-5 py-4 font-bold">
                  {expense.km.toLocaleString("pt-BR")} KM
                </div>
              )}
            </div>
          </div>

          {formData.type === "Combustivel" && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Litros
              </p>
              {isEditing ? (
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold"
                  value={formData.liters === 0 ? "" : formData.liters}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      liters: Number.isFinite(value) ? value : 0,
                    }));
                  }}
                />
              ) : (
                <div className="bg-gray-50 rounded-2xl px-5 py-4 font-bold">
                  {(expense.liters || 0).toLocaleString("pt-BR", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  L
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Observações
            </p>
            {isEditing ? (
              <textarea
                rows={3}
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold resize-none"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            ) : (
              <div className="bg-gray-50 rounded-2xl px-5 py-4 font-bold text-sm text-gray-700 min-h-[72px]">
                {expense.notes || "Sem observações"}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-bold border border-red-100 flex items-center justify-center gap-2"
          >
            <Trash2 size={18} />
            Excluir
          </button>

          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setError("");
                  if (expense) {
                    setFormData({
                      bikeId: expense.bikeId,
                      type: expense.type,
                      date: expense.date,
                      amount: expense.amount,
                      km: expense.km,
                      liters: expense.liters || 0,
                      notes: expense.notes || "",
                    });
                  }
                }}
                className="w-full py-4 rounded-2xl bg-gray-200 text-gray-700 font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Salvar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full py-4 rounded-2xl bg-blue-500 text-white font-bold"
            >
              Editar
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
