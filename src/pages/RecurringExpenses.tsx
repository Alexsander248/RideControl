import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  CalendarDays,
  PauseCircle,
  PlayCircle,
  Trash2,
  Bike,
  Pencil,
} from "lucide-react";

import { useApp } from "../context/AppContext";
import { formatCompactCurrency, cn } from "../lib/utils";

export const RecurringExpenses: React.FC = () => {
  const navigate = useNavigate();
  const { bikes, subscriptions, updateSubscription, deleteSubscription } =
    useApp();

  const sortedSubscriptions = useMemo(
    () =>
      [...subscriptions].sort((a, b) => {
        if (a.active !== b.active) {
          return a.active ? -1 : 1;
        }

        return a.name.localeCompare(b.name, "pt-BR");
      }),
    [subscriptions],
  );

  const handleToggleActive = (subscriptionId: string) => {
    const target = subscriptions.find((item) => item.id === subscriptionId);

    if (!target) {
      return;
    }

    updateSubscription({
      ...target,
      active: !target.active,
    });
  };

  const handleDelete = (subscriptionId: string, name: string) => {
    const confirmed = window.confirm(
      `Deseja remover a recorrência \"${name}\"? Os lançamentos já criados serão mantidos.`,
    );

    if (!confirmed) {
      return;
    }

    deleteSubscription(subscriptionId);
  };

  return (
    <div className="p-6 pb-32">
      <header className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-900 shadow-sm transition-transform active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight whitespace-normal">
              Gastos recorrentes
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              Gerencie suas recorrências e aprovações mensais.
            </p>
          </div>
        </div>

        <Link
          to="/adicionar-recorrente"
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 text-white px-4 py-3 font-bold shadow-sm transition-transform active:scale-95 shrink-0"
        >
          <Plus size={16} />
          Novo
        </Link>
      </header>

      {sortedSubscriptions.length === 0 ? (
        <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-50 text-center">
          <p className="text-sm uppercase tracking-wider font-bold text-gray-400 mb-2">
            Nenhuma recorrência
          </p>
          <h2 className="text-xl font-black text-gray-900 mb-2">
            Você ainda não cadastrou gastos recorrentes
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Cadastre assinaturas, seguro, IPVA e outras cobranças para gerar
            pendências automaticamente.
          </p>
          <Link
            to="/adicionar-recorrente"
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 text-white px-5 py-3 font-bold shadow-sm transition-transform active:scale-95"
          >
            <Plus size={18} />
            Cadastrar recorrência
          </Link>
        </section>
      ) : (
        <div className="space-y-4">
          {sortedSubscriptions.map((subscription) => {
            const bikeName =
              bikes.find((bike) => bike.id === subscription.motoId)?.name ||
              "Moto removida";

            return (
              <article
                key={subscription.id}
                className={cn(
                  "rounded-[30px] border p-5 shadow-sm bg-white",
                  subscription.active
                    ? "border-emerald-100"
                    : "border-gray-200",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3",
                        subscription.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600",
                      )}
                    >
                      {subscription.active ? (
                        <PlayCircle size={12} />
                      ) : (
                        <PauseCircle size={12} />
                      )}
                      <span>{subscription.active ? "Ativo" : "Pausado"}</span>
                    </div>

                    <h2 className="font-black text-gray-900 text-lg truncate">
                      {subscription.name}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {subscription.category}
                    </p>
                    <p className="text-xs font-medium text-gray-500 mt-2 inline-flex items-center gap-2">
                      <Bike size={12} />
                      {bikeName}
                    </p>
                    <p className="text-xs font-medium text-gray-500 mt-1 inline-flex items-center gap-2">
                      <CalendarDays size={12} />
                      Vencimento todo dia {subscription.dueDay}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xl font-black text-gray-900">
                      {formatCompactCurrency(subscription.amount)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Link
                    to={`/adicionar-recorrente?id=${subscription.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold border border-blue-200 bg-blue-50 text-blue-700 transition-transform active:scale-95"
                  >
                    <Pencil size={16} />
                    Editar
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(subscription.id)}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold border transition-transform active:scale-95",
                      subscription.active
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : "bg-emerald-50 border-emerald-200 text-emerald-800",
                    )}
                  >
                    {subscription.active ? (
                      <>
                        <PauseCircle size={16} />
                        Pausar
                      </>
                    ) : (
                      <>
                        <PlayCircle size={16} />
                        Ativar
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(subscription.id, subscription.name)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold border border-red-200 bg-red-50 text-red-700 transition-transform active:scale-95"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
