import { format } from "date-fns";

import type {
  AppState,
  Expense,
  ExpenseCategory,
  RecurringSubscription,
} from "../types";
import { parseLocalDate } from "./date";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export type RecurringExpenseAlert = {
  subscription: RecurringSubscription;
  expense: Expense;
  dueDate: Date;
  hoursUntilDue: number;
  isOverdue: boolean;
};

export const getRecurringMonthKey = (date: Date) => format(date, "yyyy-MM");

export const getRecurringDueDate = (
  dueDay: number,
  referenceDate: Date,
): Date => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, Math.trunc(dueDay)), lastDay);

  return new Date(year, month, safeDay, 23, 59, 59, 999);
};

export const formatRecurringDueDate = (
  dueDay: number,
  referenceDate: Date,
): string => format(getRecurringDueDate(dueDay, referenceDate), "yyyy-MM-dd");

export const mapRecurringCategoryToExpenseType = (
  category: string,
): ExpenseCategory => {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes("combust")) {
    return "Combustivel";
  }

  if (
    normalized.includes("manuten") ||
    normalized.includes("revis") ||
    normalized.includes("oficina")
  ) {
    return "Manutencao";
  }

  if (normalized.includes("pec") || normalized.includes("peç")) {
    return "Pecas";
  }

  if (normalized.includes("equip")) {
    return "Equipamentos";
  }

  return "Outros";
};

export const buildRecurringExpense = (
  subscription: RecurringSubscription,
  referenceDate: Date,
  bikeCurrentKm: number,
): Expense => {
  const dueDate = formatRecurringDueDate(subscription.dueDay, referenceDate);

  return {
    id: "",
    bikeId: subscription.motoId,
    type: mapRecurringCategoryToExpenseType(subscription.category),
    date: format(referenceDate, "yyyy-MM-dd"),
    amount: subscription.amount,
    km: bikeCurrentKm,
    notes: subscription.name,
    status: "Pendente",
    subscriptionId: subscription.id,
    dueDate,
  };
};

export const getMissingRecurringExpenses = (
  state: Pick<AppState, "bikes" | "expenses" | "subscriptions">,
  referenceDate = new Date(),
): Expense[] => {
  const currentMonthKey = getRecurringMonthKey(referenceDate);
  const expensesBySubscription = new Set(
    state.expenses
      .filter((expense) => expense.subscriptionId)
      .map(
        (expense) =>
          `${expense.subscriptionId}:${getRecurringMonthKey(
            parseLocalDate(expense.dueDate || expense.date),
          )}`,
      ),
  );

  return state.subscriptions
    .filter((subscription) => subscription.active)
    .map((subscription) => {
      const subscriptionMonthKey = `${subscription.id}:${currentMonthKey}`;
      const bike = state.bikes.find((item) => item.id === subscription.motoId);

      if (!bike) {
        return null;
      }

      if (expensesBySubscription.has(subscriptionMonthKey)) {
        return null;
      }

      return buildRecurringExpense(subscription, referenceDate, bike.currentKm);
    })
    .filter((expense): expense is Expense => expense !== null);
};

export const getRecurringExpenseAlerts = (
  state: Pick<AppState, "bikes" | "expenses" | "subscriptions">,
  referenceDate = new Date(),
): RecurringExpenseAlert[] => {
  const subscriptionById = new Map(
    state.subscriptions.map((subscription) => [subscription.id, subscription]),
  );
  const nowTs = referenceDate.getTime();

  return state.expenses
    .filter(
      (expense) =>
        expense.subscriptionId &&
        expense.status === "Pendente" &&
        typeof expense.dueDate === "string",
    )
    .map((expense) => {
      const subscription = subscriptionById.get(
        expense.subscriptionId as string,
      );
      if (!subscription) {
        return null;
      }

      const dueDate = parseLocalDate(expense.dueDate as string);
      const dueTs = dueDate.getTime();
      const hoursUntilDue = Math.floor((dueTs - nowTs) / (60 * 60 * 1000));
      const isOverdue = dueTs < nowTs;
      const isDueSoon = dueTs >= nowTs && dueTs - nowTs <= TWENTY_FOUR_HOURS_MS;

      if (!isOverdue && !isDueSoon) {
        return null;
      }

      return {
        subscription,
        expense,
        dueDate,
        hoursUntilDue,
        isOverdue,
      };
    })
    .filter((alert): alert is RecurringExpenseAlert => alert !== null)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
};

export const shouldSendRecurringNotification = (
  alert: RecurringExpenseAlert,
  referenceDate = new Date(),
) => {
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return false;
  }

  return !alert.isOverdue && alert.hoursUntilDue <= 24;
};
