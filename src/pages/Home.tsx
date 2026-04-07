import React from "react";
import { useApp } from "../context/AppContext";
import {
  Fuel,
  Wrench,
  Gauge,
  TrendingUp,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "../lib/utils";

const DEFAULT_PROFILE_PHOTO = "https://picsum.photos/seed/rider/200/200";
const EXPENSE_TYPE_LABELS: Record<string, string> = {
  Combustivel: "Combustível",
  Manutencao: "Manutenção",
  Pecas: "Peças",
  Equipamentos: "Equipamentos",
  Outros: "Outros",
};

export const Home: React.FC = () => {
  const { bikes, expenses, tasks, userProfile } = useApp();

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const activeTasks = tasks.filter((t) => !t.completed);
  const preferredBikeWithTask = bikes.find(
    (bike) =>
      bike.isFavorite && activeTasks.some((task) => task.bikeId === bike.id),
  );
  const resolveBikeId = preferredBikeWithTask?.id || activeTasks[0]?.bikeId;
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <div className="p-6 pb-24">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
          <p className="text-gray-500 font-medium">
            Bem-vindo de volta, {userProfile.name.split(" ")[0]}!
          </p>
        </div>
        <Link
          to="/perfil"
          className="w-16 h-16 rounded-[22px] bg-gray-200 overflow-hidden block transition-transform active:scale-95 ring-2 ring-blue-50"
          aria-label="Ir para perfil"
        >
          <img
            src={userProfile.photoUrl || DEFAULT_PROFILE_PHOTO}
            alt="Perfil"
            className="w-full h-full object-cover"
          />
        </Link>
      </header>

      {/* Main Stats */}
      <div className="bg-blue-500 rounded-[40px] p-8 text-white shadow-2xl shadow-blue-200 mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-2">
            Total de gastos
          </p>
          <h2 className="text-4xl font-black mb-6">
            {totalSpent.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </h2>

          <div className="flex gap-6">
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1">
                Motos
              </p>
              <p className="text-lg font-bold">{bikes.length}</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider mb-1">
                Tarefas ativas
              </p>
              <p className="text-lg font-bold">{activeTasks.length}</p>
            </div>
          </div>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link
          to="/diagnostico"
          className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 flex flex-col gap-3"
        >
          <div className="bg-orange-50 w-10 h-10 rounded-xl flex items-center justify-center text-orange-500">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
              Relatórios
            </p>
            <p className="font-bold">Visão de gastos</p>
          </div>
        </Link>
        <Link
          to="/garagem"
          className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 flex flex-col gap-3"
        >
          <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center text-blue-500">
            <Gauge size={20} />
          </div>
          <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
              Garagem
            </p>
            <p className="font-bold">Gerenciar motos</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Atividade recente</h3>
          <Link to="/diagnostico" className="text-blue-500 text-sm font-bold">
            Ver tudo
          </Link>
        </div>

        <div className="space-y-4">
          {recentExpenses.length === 0 ? (
            <p className="text-gray-400 text-center py-4 italic">
              Sem atividade recente
            </p>
          ) : (
            recentExpenses.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-4 rounded-3xl flex items-center gap-4 shadow-sm border border-gray-50"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white ",
                    expense.type === "Combustivel"
                      ? "bg-orange-500"
                      : expense.type === "Manutencao"
                        ? "bg-blue-500"
                        : expense.type === "Pecas"
                          ? "bg-purple-500"
                          : "bg-gray-500",
                  )}
                >
                  {expense.type === "Combustivel" ? (
                    <Fuel size={20} />
                  ) : (
                    <Wrench size={20} />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm">
                    {EXPENSE_TYPE_LABELS[expense.type] || expense.type}
                  </h4>
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    {format(new Date(expense.date), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}{" "}
                    - {bikes.find((b) => b.id === expense.bikeId)?.name}
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

      {/* Maintenance Alerts */}
      {activeTasks.length > 0 && (
        <section>
          <h3 className="text-xl font-bold mb-6">Alertas de manutenção</h3>
          <div className="bg-red-50 border border-red-100 rounded-[32px] p-6 flex items-start gap-4">
            <div className="bg-red-500 text-white p-2 rounded-xl">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-red-900">Atenção necessária</h4>
              <p className="text-red-700 text-sm mt-1">
                Você tem {activeTasks.length} tarefas de manutenção pendentes.
                Verifique sua garagem para mais detalhes.
              </p>
              <Link
                to={
                  resolveBikeId ? `/moto/${resolveBikeId}/tarefas` : "/garagem"
                }
                className="inline-block mt-4 text-red-900 font-black text-xs uppercase tracking-widest border-b-2 border-red-900 pb-1"
              >
                Resolver agora
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
