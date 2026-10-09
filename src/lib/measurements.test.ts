import { describe, expect, it } from "vitest";
import { measurementGroupKey, measurementRangeStatus } from "./records";
import { parseMeasurementInput } from "../server/measurements";

describe("health measurements", () => {
  it("normalizes names and units without combining incompatible units", () => {
    expect(measurementGroupKey("  HbA1c ", " % ")).toBe(
      measurementGroupKey("hba1c", "%"),
    );
    expect(measurementGroupKey("Glucose", "mg/dL")).not.toBe(
      measurementGroupKey("Glucose", "mmol/L"),
    );
  });

  it("derives range status only from supplied limits", () => {
    expect(measurementRangeStatus({ value: 3, referenceLow: 4 })).toBe("low");
    expect(measurementRangeStatus({ value: 7, referenceHigh: 6 })).toBe("high");
    expect(
      measurementRangeStatus({ value: 5, referenceLow: 4, referenceHigh: 6 }),
    ).toBe("within");
    expect(measurementRangeStatus({ value: 5 })).toBe("unknown");
  });

  it("validates dates, finite values, ranges, and field lengths", () => {
    const valid = {
      name: "HbA1c",
      value: 5.6,
      unit: "%",
      measuredAt: "2026-01-01",
      category: "Laboratory",
      referenceLow: 4,
      referenceHigh: 5.7,
      notes: "Reviewed from report",
    };
    expect(parseMeasurementInput(valid)).toMatchObject(valid);
    expect(() => parseMeasurementInput({ ...valid, value: Number.NaN })).toThrow();
    expect(() =>
      parseMeasurementInput({ ...valid, referenceLow: 8, referenceHigh: 7 }),
    ).toThrow(/upper reference/i);
    expect(() => parseMeasurementInput({ ...valid, measuredAt: "2999-01-01" })).toThrow(
      /future/i,
    );
  });
});
