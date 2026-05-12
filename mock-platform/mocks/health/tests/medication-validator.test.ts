import { describe, expect, test } from "bun:test";
import { validateMedicationInput } from "../src/services/medication-validator";

describe("validateMedicationInput", () => {
  test("throws for weekly frequency", () => {
    expect(() =>
      validateMedicationInput({
        name: "Test",
        frequency: "weekly" as any,
        start_date: "2025-01-01",
      })
    ).toThrow("not supported");
  });

  test("throws for custom frequency", () => {
    expect(() =>
      validateMedicationInput({
        name: "Test",
        frequency: "custom" as any,
        start_date: "2025-01-01",
      })
    ).toThrow("not supported");
  });

  test("throws for daily without slots", () => {
    expect(() =>
      validateMedicationInput({
        name: "Test",
        frequency: "daily",
        start_date: "2025-01-01",
      })
    ).toThrow("slot");
  });

  test("throws for daily with empty slots", () => {
    expect(() =>
      validateMedicationInput({
        name: "Test",
        frequency: "daily",
        start_date: "2025-01-01",
        slots: [],
      })
    ).toThrow("slot");
  });

  test("throws for as_needed with slots", () => {
    expect(() =>
      validateMedicationInput({
        name: "Test",
        frequency: "as_needed",
        start_date: "2025-01-01",
        slots: [{ time_hhmm: "08:00", dose_amount: 100, dose_unit: "mg" }],
      })
    ).toThrow("slot");
  });

  test("passes for valid daily with slots", () => {
    expect(() =>
      validateMedicationInput({
        name: "Aspirin",
        frequency: "daily",
        start_date: "2025-01-01",
        slots: [{ time_hhmm: "08:00", dose_amount: 100, dose_unit: "mg" }],
      })
    ).not.toThrow();
  });

  test("passes for valid as_needed without slots", () => {
    expect(() =>
      validateMedicationInput({
        name: "Ibuprofen",
        frequency: "as_needed",
        start_date: "2025-01-01",
      })
    ).not.toThrow();
  });

  test("passes for as_needed with undefined slots", () => {
    expect(() =>
      validateMedicationInput({
        name: "Test",
        frequency: "as_needed",
        start_date: "2025-01-01",
        slots: undefined,
      })
    ).not.toThrow();
  });
});
