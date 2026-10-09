import { z } from "zod";
import type { HealthMeasurementInput } from "@/lib/records";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid measurement date.")
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Choose a valid measurement date.")
  .refine(
    (value) => value <= new Date().toISOString().slice(0, 10),
    "The measurement date cannot be in the future.",
  );

export const measurementInputSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a metric name.").max(80),
    value: z.number().finite("Enter a finite numeric value."),
    unit: z.string().trim().min(1, "Enter a unit.").max(24),
    measuredAt: isoDate,
    category: z.enum(["Laboratory", "Vital sign", "Body measurement", "Other"]),
    referenceLow: z.number().finite().optional(),
    referenceHigh: z.number().finite().optional(),
    notes: z.string().trim().max(500),
    sourceRecordId: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.referenceLow !== undefined &&
      value.referenceHigh !== undefined &&
      value.referenceLow >= value.referenceHigh
    ) {
      context.addIssue({
        code: "custom",
        path: ["referenceHigh"],
        message: "The upper reference limit must be greater than the lower limit.",
      });
    }
  });

export function parseMeasurementInput(value: unknown): HealthMeasurementInput {
  return measurementInputSchema.parse(value);
}
