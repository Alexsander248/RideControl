import { describe, it, expect } from "vitest";

import { calculateFuelConsumptionCycles } from "../fuelConsumption";
import type { Expense } from "../../types";

const createFuelExpense = (
  id: string,
  km: number,
  date: string,
  liters: number,
  fullTank: boolean,
  bikeId = "bike-1",
): Expense => ({
  id,
  bikeId,
  type: "Combustivel",
  date,
  amount: liters * 6,
  km,
  liters,
  fullTank,
});

describe("calculateFuelConsumptionCycles", () => {
  it("builds cycles only when a full tank closes the cycle", () => {
    const expenses: Expense[] = [
      createFuelExpense("1", 1000, "2026-04-01", 5, false),
      createFuelExpense("2", 1100, "2026-04-05", 8, false),
      createFuelExpense("3", 1200, "2026-04-09", 10, true),
    ];

    const cycles = calculateFuelConsumptionCycles(expenses, {
      bikeId: "bike-1",
      sortBy: "date",
    });

    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toMatchObject({
      bikeId: "bike-1",
      kmInicial: 1000,
      kmFinal: 1200,
      litrosTotal: 23,
    });
    expect(cycles[0].consumo).toBeCloseTo(200 / 23, 6);
  });

  it("supports date sorting when km and input order differ", () => {
    const expenses: Expense[] = [
      createFuelExpense("1", 1600, "2026-04-12", 9, true),
      createFuelExpense("2", 1500, "2026-04-10", 6, false),
      createFuelExpense("3", 1400, "2026-04-08", 7, false),
    ];

    const cycles = calculateFuelConsumptionCycles(expenses, {
      bikeId: "bike-1",
      sortBy: "date",
    });

    expect(cycles).toHaveLength(1);
    expect(cycles[0].kmInicial).toBe(1400);
    expect(cycles[0].kmFinal).toBe(1600);
  });

  it("ignores other bikes", () => {
    const expenses: Expense[] = [
      createFuelExpense("1", 1000, "2026-04-01", 5, false, "bike-1"),
      createFuelExpense("2", 1100, "2026-04-02", 6, true, "bike-2"),
      createFuelExpense("3", 1200, "2026-04-03", 7, true, "bike-1"),
    ];

    const cycles = calculateFuelConsumptionCycles(expenses, {
      bikeId: "bike-1",
      sortBy: "km",
    });

    expect(cycles).toHaveLength(1);
    expect(cycles[0].bikeId).toBe("bike-1");
  });
});
