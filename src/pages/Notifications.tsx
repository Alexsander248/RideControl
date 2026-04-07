import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Calendar } from "lucide-react";
import { useApp } from "../context/AppContext";
import { cn } from "../lib/utils";

const DAY_OPTIONS = [1, 3, 7] as const;

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { bikes, tasks, notificationSettings, updateNotificationSettings } =
    useApp();

  const upcomingTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limit = new Date(today);
    limit.setDate(limit.getDate() + notificationSettings.daysBefore);

    return tasks
      .filter((task) => !task.completed && task.dueDate)
      .filter((task) => {
        const due = new Date(task.dueDate as string);
        due.setHours(0, 0, 0, 0);
        return due >= today && due <= limit;
      })
      .sort(
        (a, b) =>
          new Date(a.dueDate as string).getTime() -
          new Date(b.dueDate as string).getTime(),
      );
  }, [tasks, notificationSettings.daysBefore]);

  return (
    <div className="p-6 pb-24">
      <header className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-900 shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Notificações</h1>
      </header>

      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div>
              <p className="font-bold text-gray-900">Lembrete de prazo</p>
              <p className="text-sm text-gray-500">
                Avisar quando tarefas estiverem perto da data limite
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              updateNotificationSettings({
                taskDueSoonEnabled: !notificationSettings.taskDueSoonEnabled,
              })
            }
            className={cn(
              "w-12 h-6 rounded-full relative transition-colors",
              notificationSettings.taskDueSoonEnabled
                ? "bg-blue-500"
                : "bg-gray-200",
            )}
            aria-label="Alternar notificações"
          >
            <span
              className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                notificationSettings.taskDueSoonEnabled ? "left-7" : "left-1",
              )}
            />
          </button>
        </div>

        <div className="mt-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Antecedência
          </p>
          <div className="flex gap-2">
            {DAY_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => updateNotificationSettings({ daysBefore: days })}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  notificationSettings.daysBefore === days
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600",
                )}
              >
                {days} {days === 1 ? "dia" : "dias"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50">
        <h2 className="text-lg font-bold mb-4">Tarefas próximas do prazo</h2>

        {!notificationSettings.taskDueSoonEnabled ? (
          <p className="text-sm text-gray-500">Notificações desativadas.</p>
        ) : upcomingTasks.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma tarefa vence nos próximos {notificationSettings.daysBefore}{" "}
            dias.
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingTasks.map((task) => {
              const bikeName =
                bikes.find((bike) => bike.id === task.bikeId)?.name || "Moto";
              return (
                <div key={task.id} className="p-4 bg-gray-50 rounded-2xl">
                  <p className="font-bold text-gray-900">{task.title}</p>
                  <p className="text-sm text-gray-500">{bikeName}</p>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    <Calendar size={12} />
                    <span>{task.dueDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
