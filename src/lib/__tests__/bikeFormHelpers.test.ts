import { describe, it, expect, vi, afterEach } from "vitest";

import {
  formatCurrency,
  formatKm,
  maskCurrency,
  normalizeKmInput,
  validateYear,
} from "../bikeFormHelpers";

afterEach(() => {
  vi.useRealTimers();
});

describe("bikeFormHelpers", () => {
  it("normalizes km input to digits", () => {
    expect(normalizeKmInput("12.345 km")).toBe("12345");
    expect(normalizeKmInput("abc")).toBe("0");
  });

  it("formats km with compact suffix when >= 1000", () => {
    expect(formatKm(999)).toBe("999 km");
    expect(formatKm(1500)).toBe("1.5k km");
  });

  it("formats and masks currency in pt-BR", () => {
    expect(formatCurrency(1234.56)).toContain("R$");
    expect(maskCurrency("123456")).toContain("1.234,56");
    expect(maskCurrency("")).toBe("");
  });

  it("validates year using current year upper bound", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 13));

    expect(validateYear(2020)).toBe(2020);
    expect(validateYear(1980)).toBe(2026);
    expect(validateYear(3000)).toBe(2026);
  });
});
