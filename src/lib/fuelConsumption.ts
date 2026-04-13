import { parseLocalDate } from "./date";

import type { Expense } from "../types";

export type FuelCycleConsumption = {
  bikeId: string;
  kmInicial: number;
  kmFinal: number;
  litrosTotal: number;
  consumo: number;
};

type FuelConsumptionOptions = {
  bikeId: string;
  sortBy?: "km" | "date";
};

export function calculateFuelConsumptionCycles(
  expenses: Expense[],
  options: FuelConsumptionOptions,
): FuelCycleConsumption[] {
  const { bikeId, sortBy = "km" } = options;

  const fuelExpenses = expenses
    .filter(
      (expense) => expense.type === "Combustivel" && expense.bikeId === bikeId,
    )
    .sort((a, b) => {
      if (sortBy === "date") {
        const dateDiff =
          parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime();
        if (dateDiff !== 0) {
          return dateDiff;
        }

        return a.km - b.km;
      }

      const kmDiff = a.km - b.km;
      if (kmDiff !== 0) {
        return kmDiff;
      }

      return (
        parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()
      );
    });

  const cycles: FuelCycleConsumption[] = [];
  let cycleStart: Expense | null = null;
  let litrosAcumulados = 0;

  fuelExpenses.forEach((expense) => {
    const litrosAtuais = Math.max(0, expense.liters ?? 0);

    if (!cycleStart) {
      cycleStart = expense;
      litrosAcumulados = litrosAtuais;
    } else {
      litrosAcumulados += litrosAtuais;
    }

    if (!expense.fullTank || !cycleStart) {
      return;
    }

    const kmRodado = expense.km - cycleStart.km;

    if (kmRodado > 0 && litrosAcumulados > 0) {
      cycles.push({
        bikeId,
        kmInicial: cycleStart.km,
        kmFinal: expense.km,
        litrosTotal: litrosAcumulados,
        consumo: kmRodado / litrosAcumulados,
      });
    }

    cycleStart = expense;
    litrosAcumulados = 0;
  });

  return cycles;
}
