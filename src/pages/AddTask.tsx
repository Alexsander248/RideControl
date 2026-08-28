import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ArrowLeft, Save } from "lucide-react";
import { Priority } from "../types";
import { cn } from "../lib/utils";

export const AddTask: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { bikes, addTask } = useApp();

  const initialBikeId =
    searchParams.get("bikeId") || (bikes.length > 0 ? bikes[0].id : "");

  const [formData, setFormData] = useState({
    bikeId: initialBikeId,
    title: "",
    targetKm:
      (bikes.find((b) => b.id === initialBikeId)?.currentKm || 0) + 5000,
    dueDate: "",
    priority: "MEDIA" as Priority,
    completed: false,
  });

  const priorities: Priority[] = ["BAIXA", "MEDIA", "ALTA"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bikeId) return;

    const title = formData.title.trim();
    if (!title || formData.targetKm <= 0) {
      return;
    }

    addTask(formData as any);
    navigate(`/moto/${formData.bikeId}`);
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
        <h1 className="text-2xl font-bold">Nova tarefa</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Título da tarefa
            </label>
            <input
              required
              type="text"
              placeholder="ex: Troca de óleo"
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Motocicleta
            </label>
            <select
              required
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
              value={formData.bikeId}
              onChange={(e) => {
                const bikeId = e.target.value;
                const bikeCurrentKm =
                  bikes.find((bike) => bike.id === bikeId)?.currentKm || 0;

                setFormData({
                  ...formData,
                  bikeId,
                  targetKm: Math.max(formData.targetKm, bikeCurrentKm + 5000),
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
                KM alvo
              </label>
              <input
                required
                type="number"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                value={formData.targetKm === 0 ? "" : formData.targetKm}
                onChange={(e) => {
                  const value = e.target.value;

                  setFormData({
                    ...formData,
                    targetKm: value === "" ? 0 : Number(value),
                  });
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                Data limite (opcional)
              </label>
              <input
                type="date"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-blue-500/20"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 ml-1">
              Prioridade
            </label>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: p })}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-xs transition-all",
                    formData.priority === p
                      ? p === "ALTA"
                        ? "bg-red-500 text-white shadow-lg shadow-red-200"
                        : p === "MEDIA"
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-200"
                        : "bg-blue-500 text-white shadow-lg shadow-blue-200"
                      : "bg-gray-50 text-gray-400",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-5 rounded-[24px] font-bold text-lg shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-transform active:scale-95"
        >
          <Save size={24} />
          <span>Criar tarefa</span>
        </button>
      </form>
    </div>
  );
};
