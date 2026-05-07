import { describe, expect, it } from "vitest";

import {
  getMissingRecurringExpenses,
  getRecurringExpenseAlerts,
} from "../recurringExpenses";
import type { AppState } from "../../types";

const baseState = (): AppState => ({
  bikes: [
    {
      id: "bike-1",
      name: "Moto 1",
      model: "Model 1",
      year: 2024,
      currentKm: 1200,
    },
  ],
  expenses: [],
  tasks: [],
  subscriptions: [
    {
      id: "sub-1",
      motoId: "bike-1",
      name: "Seguro",
      amount: 250,
      dueDay: 15,
      category: "Seguro",
      active: true,
    },
  ],
  userProfile: {
    name: "",
    photoUrl: "",
    memberSince: 2024,
  },
  notificationSettings: {
    taskDueSoonEnabled: true,
    daysBefore: 3,
    recurringExpenseDueSoonEnabled: true,
  },
  tutorialViewed: false,
});

describe("recurringExpenses", () => {
  it("creates a missing recurring expense for the current month", () => {
    const missing = getMissingRecurringExpenses(
      baseState(),
      new Date(2026, 4, 10),
    );

    expect(missing).toHaveLength(1);
    expect(missing[0].subscriptionId).toBe("sub-1");
    expect(missing[0].status).toBe("Pendente");
    expect(missing[0].dueDate).toBe("2026-05-15");
  });

  it("does not duplicate a recurring expense already launched in the same month", () => {
    const state = baseState();
    state.expenses = [
      {
        id: "expense-1",
        bikeId: "bike-1",
        type: "Outros",
        date: "2026-05-10",
        amount: 250,
        km: 1200,
        notes: "Seguro",
        status: "Pendente",
        subscriptionId: "sub-1",
        dueDate: "2026-05-15",
      },
    ];

    const missing = getMissingRecurringExpenses(state, new Date(2026, 4, 10));

    expect(missing).toHaveLength(0);
  });

  it("flags an alert when the due date is within 24h", () => {
    const state = baseState();
    state.expenses = [
      {
        id: "expense-1",
        bikeId: "bike-1",
        type: "Outros",
        date: "2026-05-10",
        amount: 250,
        km: 1200,
        notes: "Seguro",
        status: "Pendente",
        subscriptionId: "sub-1",
        dueDate: "2026-05-11",
      },
    ];

    const alerts = getRecurringExpenseAlerts(
      state,
      new Date(2026, 4, 10, 23, 0, 0),
    );

    expect(alerts).toHaveLength(1);
    expect(alerts[0].isOverdue).toBe(false);
    expect(alerts[0].hoursUntilDue).toBeLessThanOrEqual(24);
  });
});
