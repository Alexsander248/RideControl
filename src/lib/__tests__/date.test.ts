import { describe, it, expect, vi, afterEach } from "vitest";

import { getTodayLocalIsoDate, parseLocalDate } from "../date";

afterEach(() => {
  vi.useRealTimers();
});

describe("parseLocalDate", () => {
  it("parses yyyy-mm-dd as a local calendar day", () => {
    const date = parseLocalDate("2026-04-13");

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(13);
  });

  it("clones Date instances instead of mutating originals", () => {
    const source = new Date(2026, 3, 13, 10, 30, 0);
    const cloned = parseLocalDate(source);

    expect(cloned).not.toBe(source);
    expect(cloned.getTime()).toBe(source.getTime());
  });
});

describe("getTodayLocalIsoDate", () => {
  it("returns local yyyy-mm-dd", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 13, 9, 0, 0));

    expect(getTodayLocalIsoDate()).toBe("2026-04-13");
  });
});
