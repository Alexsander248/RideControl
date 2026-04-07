import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  format,
  startOfYear,
  endOfYear,
  subYears,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronDown,
  DollarSign,
  TrendingUp,
  Gauge,
  CreditCard,
  X,
  Wrench,
  Fuel,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../lib/utils";

export const ExpenseInsights: React.FC = () => {
  const { expenses, bikes } = useApp();
  const [timeFilter, setTimeFilter] = useState<
    "Este Ano" | "Ano Passado" | "Todo Período"
  >("Este Ano");
  const [selectedBikeId, setSelectedBikeId] = useState<string>("");
  const [activeMetric, setActiveMetric] = useState<
    "total" | "media" | "custo" | "consumo" | null
  >(null);

  const categoryLabels: Record<string, string> = {
    Combustivel: "Combustível",
    Manutencao: "Manutenção",
    Pecas: "Peças",
    Equipamentos: "Equipamentos",
    Outros: "Outros",
  };

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    let filtered = expenses;

    if (selectedBikeId) {
      filtered = filtered.filter(
        (expense) => expense.bikeId === selectedBikeId,
      );
    }

    if (timeFilter === "Todo Período") return filtered;

    const interval =
      timeFilter === "Este Ano"
        ? { start: startOfYear(now), end: endOfYear(now) }
        : {
            start: startOfYear(subYears(now, 1)),
            end: endOfYear(subYears(now, 1)),
          };

    return filtered.filter((expense) =>
      isWithinInterval(new Date(expense.date), interval),
    );
  }, [expenses, timeFilter, selectedBikeId]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {
      Combustivel: 0,
      Manutencao: 0,
      Pecas: 0,
      Equipamentos: 0,
      Outros: 0,
    };

    filteredExpenses.forEach((expense) => {
      categories[expense.type] += expense.amount;
    });

    return Object.entries(categories)
      .map(([key, value]) => ({
        key,
        name: categoryLabels[key] || key,
        value,
      }))
      .filter((item) => item.value > 0);
  }, [filteredExpenses]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();

    for (let index = 5; index >= 0; index--) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      months[format(date, "MMM")] = 0;
    }

    filteredExpenses.forEach((expense) => {
      const month = format(new Date(expense.date), "MMM");
      if (months[month] !== undefined) {
        months[month] += expense.amount;
      }
    });

    return Object.entries(months).map(([name, amount]) => ({ name, amount }));
  }, [filteredExpenses]);

  const totalSpent = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  const totalKm = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;

    const bikeKmMap = new Map<string, number[]>();
    filteredExpenses.forEach((expense) => {
      if (!bikeKmMap.has(expense.bikeId)) {
        bikeKmMap.set(expense.bikeId, []);
      }
      bikeKmMap.get(expense.bikeId)!.push(expense.km);
    });

    let totalDistance = 0;
    bikeKmMap.forEach((kms) => {
      if (kms.length >= 2) {
        const sortedKms = kms.sort((a, b) => a - b);
        totalDistance += sortedKms[sortedKms.length - 1] - sortedKms[0];
      }
    });

    return totalDistance;
  }, [filteredExpenses]);

  const fuelExpenses = useMemo(
    () => filteredExpenses.filter((expense) => expense.type === "Combustivel"),
    [filteredExpenses],
  );

  const totalFuelLiters = useMemo(
    () => fuelExpenses.reduce((sum, expense) => sum + (expense.liters || 0), 0),
    [fuelExpenses],
  );

  const latestFuelExpense = useMemo(() => {
    if (fuelExpenses.length === 0) return null;

    return [...fuelExpenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];
  }, [fuelExpenses]);

  const latestFuelBikeName = latestFuelExpense
    ? bikes.find((bike) => bike.id === latestFuelExpense.bikeId)?.name || ""
    : "";

  const costPerKm = totalKm > 0 ? totalSpent / totalKm : 0;
  const avgMonthly = totalSpent / 12;

  const COLORS = {
    Combustivel: "#F97316",
    Manutencao: "#3B82F6",
    Pecas: "#8B5CF6",
    Equipamentos: "#EC4899",
    Outros: "#6B7280",
  };

  const metricInfo = {
    total: {
      title: "Total gasto",
      description:
        "Soma de todos os gastos registrados no período selecionado. Inclui combustível, manutenção, peças, equipamentos e outros.",
    },
    media: {
      title: "Média mensal",
      description:
        "Estimativa média por mês calculada dividindo o total gasto por 12. Útil para ter uma noção de orçamento mensal.",
    },
    custo: {
      title: "Custo / KM",
      description:
        "Valor médio gasto por quilômetro rodado no período. É calculado dividindo o total gasto pela diferença entre o maior e o menor KM registrado.",
    },
    consumo: {
      title: "Consumo",
      description:
        "Total de litros abastecidos no período selecionado. Adicione abastecimentos para acompanhar este indicador.",
    },
  };

  return (
    <div className="p-6 pb-24 relative">
      <header className="mb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Diagnóstico</h1>
          <p className="text-gray-500 font-medium">Relatórios de gastos</p>
        </div>

        <div className="flex flex-row gap-4 items-end">
          <div className="flex-1 relative">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Motocicleta
            </label>
            <select
              value={selectedBikeId}
              onChange={(e) => setSelectedBikeId(e.target.value)}
              className="appearance-none w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 pr-10 font-bold text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Todas as motos</option>
              {bikes.map((bike) => (
                <option key={bike.id} value={bike.id}>
                  {bike.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-4 bottom-3 text-gray-400 pointer-events-none"
            />
          </div>

          <div className="flex-1 relative">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Período
            </label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="appearance-none w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 pr-10 font-bold text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option>Este Ano</option>
              <option>Ano Passado</option>
              <option>Todo Período</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-4 bottom-3 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          type="button"
          onClick={() => setActiveMetric("total")}
          className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 text-left"
        >
          <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 mb-4">
            <DollarSign size={20} />
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
            Total gasto
          </p>
          <p className="text-xl font-bold">
            {totalSpent.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveMetric("media")}
          className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 text-left"
        >
          <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 mb-4">
            <TrendingUp size={20} />
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
            Média mensal
          </p>
          <p className="text-xl font-bold">
            {avgMonthly.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveMetric("custo")}
          className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 text-left"
        >
          <div className="bg-orange-50 w-10 h-10 rounded-xl flex items-center justify-center text-orange-600 mb-4">
            <Gauge size={20} />
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
            Custo / KM
          </p>
          <p className="text-xl font-bold">
            {costPerKm.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveMetric("consumo")}
          className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 text-left"
        >
          <div className="bg-purple-50 w-10 h-10 rounded-xl flex items-center justify-center text-purple-600 mb-4">
            <CreditCard size={20} />
          </div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
            Consumo
          </p>
          <p className="text-xl font-bold">
            {totalFuelLiters.toLocaleString("pt-BR", {
              maximumFractionDigits: 2,
            })}{" "}
            L
          </p>
        </button>
      </div>

      <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 mb-8">
        <h3 className="text-lg font-bold mb-6">Por categoria</h3>
        <div className="h-64 min-w-0 relative">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={256}
          >
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={8}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.key as keyof typeof COLORS]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">
              Total
            </p>
            <p className="text-xl font-black max-w-[110px] text-center break-words">
              {totalSpent.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {categoryData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: COLORS[item.key as keyof typeof COLORS],
                  }}
                />
                <span className="font-bold text-gray-700">{item.name}</span>
              </div>
              <div className="text-right">
                <p className="font-bold">
                  {item.value.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
                <p className="text-xs text-gray-400 font-medium">
                  {totalSpent > 0
                    ? ((item.value / totalSpent) * 100).toFixed(1)
                    : "0.0"}
                  %
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 mb-8">
        <h3 className="text-lg font-bold mb-6">Atividades</h3>
        <div className="max-h-[19rem] overflow-y-auto pr-1 space-y-4">
          {filteredExpenses.length === 0 ? (
            <p className="text-gray-400 text-center py-8 italic">
              Nenhuma atividade encontrada
            </p>
          ) : (
            filteredExpenses
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              )
              .map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0",
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
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm">
                      {categoryLabels[expense.type] || expense.type}
                    </h4>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                      {format(new Date(expense.date), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    {expense.notes && (
                      <p className="text-gray-500 text-[10px] mt-1">
                        {expense.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
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
                </div>
              ))
          )}
        </div>
      </section>

      <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 mb-8">
        <h3 className="text-lg font-bold mb-6">Gastos Mensais</h3>
        <div className="h-64 min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={256}
          >
            <BarChart data={monthlyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#F3F4F6"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "#F9FAFB" }}
                contentStyle={{
                  borderRadius: "16px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
              />
              <Bar
                dataKey="amount"
                fill="#22C55E"
                radius={[8, 8, 8, 8]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <AnimatePresence>
        {activeMetric && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <button
              type="button"
              onClick={() => setActiveMetric(null)}
              className="absolute inset-0 bg-black/35 backdrop-blur-sm"
              aria-label="Fechar explicação"
            />

            <motion.div
              className="absolute inset-x-6 top-1/2 -translate-y-1/2 bg-white rounded-3xl p-6 shadow-2xl border border-gray-100"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h4 className="text-xl font-black text-gray-900">
                  {metricInfo[activeMetric].title}
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveMetric(null)}
                  className="p-2 rounded-xl bg-gray-100 text-gray-500"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm">
                {metricInfo[activeMetric].description}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
