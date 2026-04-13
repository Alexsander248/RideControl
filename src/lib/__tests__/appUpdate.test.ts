import { describe, it, expect } from "vitest";

import { compareVersions } from "../appUpdate";

describe("compareVersions", () => {
  it("detects newer semantic versions", () => {
    expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
    expect(compareVersions("1.2.0", "1.10.0")).toBe(-1);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("treats shorter versions as zero-padded", () => {
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("2", "1.9.9")).toBe(1);
  });
});
