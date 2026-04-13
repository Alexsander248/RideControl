import React, { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

import { motion } from "motion/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Circle,
  CheckCircle2,
  Wrench,
  Calendar,
  Plus,
} from "lucide-react";

import { useApp } from "../context/AppContext";
import { parseLocalDate } from "../lib/date";
import { cn } from "../lib/utils";

export const BikeTasks: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { bikes, tasks, toggleTask } = useApp();
  const [showHistory, setShowHistory] = useState(false);

  const bike = bikes.find((b) => b.id === id);

  const bikeTasks = useMemo(
    () => tasks.filter((task) => task.bikeId === id),
    [tasks, id],
  );

  const activeTasks = useMemo(
    () =>
      bikeTasks
        .filter((task) => !task.completed)
        .sort((a, b) => a.targetKm - b.targetKm),
    [bikeTasks],
  );

  const historyTasks = useMemo(
    () =>
      bikeTasks
        .filter((task) => task.completed)
        .sort(
          (a, b) =>
            parseLocalDate(b.completedDate || b.dueDate || 0).getTime() -
            parseLocalDate(a.completedDate || a.dueDate || 0).getTime(),
        ),
    [bikeTasks],
  );

  if (!bike) {
    return <div className="p-8 text-center">Moto não encontrada</div>;
  }

  return (
    <div className="p-6 pb-24">
      <header className="flex items-center justify-between mb-8 gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-900 shadow-sm transition-transform active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Tarefas</h1>
            <p className="text-gray-500 font-medium truncate">{bike.name}</p>
          </div>
        </div>

        <Link
          to={`/adicionar-tarefa?bikeId=${bike.id}`}
          className="bg-blue-500 text-white px-4 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-transform active:scale-95"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Nova</span>
        </Link>
      </header>

      <section>
        <div className="flex gap-5 text-sm font-bold mb-6">
          <button
            type="button"
            onClick={() => setShowHistory(false)}
            className={cn(
              "pb-1 border-b-2 transition-colors",
              !showHistory
                ? "text-blue-500 border-blue-500"
                : "text-gray-400 border-transparent",
            )}
          >
            Ativas ({activeTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className={cn(
              "pb-1 border-b-2 transition-colors",
              showHistory
                ? "text-blue-500 border-blue-500"
                : "text-gray-400 border-transparent",
            )}
          >
            Histórico ({historyTasks.length})
          </button>
        </div>

        <div className="space-y-4">
          {showHistory ? (
            historyTasks.length === 0 ? (
              <p className="text-gray-400 text-center py-8 italic">
                Nenhuma tarefa no histórico
              </p>
            ) : (
              historyTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-sm border border-gray-50"
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="p-2 rounded-xl transition-colors bg-blue-100 text-blue-600"
                    aria-label="Reabrir tarefa"
                  >
                    <CheckCircle2 size={24} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate">
                      {task.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                        <Wrench size={12} />
                        <span>{task.targetKm.toLocaleString()} KM</span>
                      </div>
                      {task.completedKm !== undefined && (
                        <div className="text-xs text-blue-600 font-semibold">
                          Concluída em {task.completedKm.toLocaleString()} KM
                        </div>
                      )}
                      {task.completedDate && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                          <Calendar size={12} />
                          <span>
                            {format(
                              parseLocalDate(task.completedDate),
                              "dd/MM/yyyy",
                              {
                                locale: ptBR,
                              },
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      task.priority === "ALTA"
                        ? "bg-red-100 text-red-600"
                        : task.priority === "MEDIA"
                        ? "bg-orange-100 text-orange-600"
                        : "bg-blue-100 text-blue-600",
                    )}
                  >
                    {task.priority}
                  </div>
                </motion.div>
              ))
            )
          ) : activeTasks.length === 0 ? (
            <p className="text-gray-400 text-center py-8 italic">
              Nenhuma tarefa ativa
            </p>
          ) : (
            activeTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-sm border border-gray-50"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="p-2 rounded-xl transition-colors bg-gray-100 text-gray-400"
                  aria-label="Concluir tarefa"
                >
                  <Circle size={24} />
                </button>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 truncate">
                    {task.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                      <Wrench size={12} />
                      <span>{task.targetKm.toLocaleString()} KM</span>
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                        <Calendar size={12} />
                        <span>
                          {format(parseLocalDate(task.dueDate), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    task.priority === "ALTA"
                      ? "bg-red-100 text-red-600"
                      : task.priority === "MEDIA"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-blue-100 text-blue-600",
                  )}
                >
                  {task.priority}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
