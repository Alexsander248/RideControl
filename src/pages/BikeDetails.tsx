import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  ArrowLeft,
  Plus,
  Settings,
  Wrench,
  Fuel,
  Trash2,
  Star,
  ClipboardList,
} from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ImageViewerModal } from "../components/ImageViewerModal";

export const BikeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { bikes, tasks, expenses, deleteBike, toggleFavoriteBike } = useApp();
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);

  const bike = bikes.find((b) => b.id === id);
  const bikeTasks = tasks.filter((t) => t.bikeId === id);
  const bikeExpenses = expenses.filter((e) => e.bikeId === id);

  if (!bike) return <div className="p-8 text-center">Moto não encontrada</div>;

  const activeTasks = bikeTasks.filter((t) => !t.completed);
  const recentBikeExpenses = [...bikeExpenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const expenseTypeLabels: Record<string, string> = {
    Combustivel: "Combustível",
    Manutencao: "Manutenção",
    Pecas: "Peças",
    Equipamentos: "Equipamentos",
    Outros: "Outros",
  };

  const handleDelete = () => {
    if (
      window.confirm(
        "Tem certeza que deseja excluir esta moto? Todos os dados serão perdidos.",
      )
    ) {
      deleteBike(bike.id);
      navigate("/garagem");
    }
  };

  return (
    <div className="relative pb-12">
      {/* Header Image */}
      <div className="h-80 relative overflow-hidden">
        <button
          type="button"
          onClick={() => setIsPhotoViewerOpen(true)}
          className="block w-full h-full cursor-zoom-in active:scale-[0.99] transition-transform relative group"
          aria-label="Ampliar foto da moto"
        >
          <img
            src={
              bike.photoUrl || `https://picsum.photos/seed/${bike.id}/800/600`
            }
            alt={bike.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/0 group-active:bg-black/10 transition-colors" />
        </button>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white rounded-2xl text-gray-900 shadow-sm transition-transform active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Link
              to={`/moto/${bike.id}/editar`}
              className="p-3 bg-white rounded-2xl text-gray-900 shadow-sm transition-transform active:scale-95"
              aria-label="Editar moto"
            >
              <Settings size={24} />
            </Link>
            <button
              onClick={handleDelete}
              className="p-3 bg-red-500 rounded-2xl text-white shadow-sm transition-transform active:scale-95"
            >
              <Trash2 size={24} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 left-8 right-8 text-white z-10">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">{bike.name}</h1>
            <button
              type="button"
              onClick={() => toggleFavoriteBike(bike.id)}
              className={
                bike.isFavorite
                  ? "p-2 rounded-xl bg-yellow-400/25 text-yellow-300"
                  : "p-2 rounded-xl bg-white/20 text-white/80"
              }
              aria-label={
                bike.isFavorite ? "Remover dos favoritos" : "Favoritar moto"
              }
            >
              <Star
                size={18}
                fill={bike.isFavorite ? "currentColor" : "none"}
              />
            </button>
          </div>
          <p className="text-white/80 font-medium">
            {bike.model} - {bike.year}
          </p>
        </div>
      </div>

      <div className="px-6 -mt-6 relative z-10">
        {/* Stats Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-black/5 flex justify-between items-center mb-8">
          <div className="text-center flex-1 border-r border-gray-100">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              KM atual
            </p>
            <p className="text-xl font-bold text-blue-600">
              {bike.currentKm.toLocaleString()}
            </p>
          </div>
          <div className="text-center flex-1 border-r border-gray-100">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              Gastos
            </p>
            <p className="text-xl font-bold">{bikeExpenses.length}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
              Tarefas
            </p>
            <p className="text-xl font-bold">{activeTasks.length}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <Link
            to={`/adicionar-gasto?bikeId=${bike.id}`}
            className="bg-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-transform active:scale-95"
          >
            <Plus size={20} />
            <span>Adicionar gastos</span>
          </Link>
          <Link
            to={`/adicionar-tarefa?bikeId=${bike.id}`}
            className="bg-red-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 transition-transform active:scale-95"
          >
            <Plus size={20} />
            <span>Adicionar tarefas</span>
          </Link>
          <Link
            to={`/moto/${bike.id}/tarefas`}
            className="col-span-2 bg-rose-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-200 transition-transform active:scale-95"
          >
            <ClipboardList size={20} />
            <span>Tarefas</span>
          </Link>
        </div>

        {/* Recent Activity Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Atividade recente</h2>
            <Link to="/diagnostico" className="text-blue-500 text-sm font-bold">
              Ver tudo
            </Link>
          </div>

          <div className="max-h-[26rem] overflow-y-auto pr-1 space-y-4">
            {recentBikeExpenses.length === 0 ? (
              <p className="text-gray-400 text-center py-8 italic">
                Sem atividade recente para esta moto
              </p>
            ) : (
              recentBikeExpenses.map((expense, index) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-sm border border-gray-50"
                >
                  <div
                    className={
                      expense.type === "Combustivel"
                        ? "w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center"
                        : expense.type === "Manutencao"
                          ? "w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center"
                          : expense.type === "Pecas"
                            ? "w-12 h-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center"
                            : "w-12 h-12 rounded-2xl bg-gray-500 text-white flex items-center justify-center"
                    }
                  >
                    {expense.type === "Combustivel" ? (
                      <Fuel size={20} />
                    ) : (
                      <Wrench size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">
                      {expenseTypeLabels[expense.type] || expense.type}
                    </h4>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">
                      {format(new Date(expense.date), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">
                      {expense.amount.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold">
                      {expense.type === "Combustivel" &&
                      expense.liters !== undefined
                        ? `${expense.liters.toLocaleString("pt-BR", {
                            maximumFractionDigits: 2,
                          })} L`
                        : `${expense.km.toLocaleString()} KM`}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </div>

      <ImageViewerModal
        isOpen={isPhotoViewerOpen}
        src={bike.photoUrl || `https://picsum.photos/seed/${bike.id}/800/600`}
        alt={bike.name}
        onClose={() => setIsPhotoViewerOpen(false)}
      />
    </div>
  );
};
