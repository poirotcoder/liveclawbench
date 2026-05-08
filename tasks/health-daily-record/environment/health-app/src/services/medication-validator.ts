import { ValidationError } from "../utils/errors";
import type { z } from "zod";
import type { CreateMedicationBodySchema } from "../schemas";

type CreateMedicationInput = z.infer<typeof CreateMedicationBodySchema>;

export function validateMedicationInput(input: CreateMedicationInput): void {
  if (input.frequency === "weekly" || input.frequency === "custom") {
    throw new ValidationError(
      `Frequency "${input.frequency}" is not supported in MVP. Only "daily" and "as_needed" are allowed.`,
      { code: "UNSUPPORTED_FREQUENCY", frequency: input.frequency },
    );
  }

  if (input.frequency === "daily") {
    if (!input.slots || input.slots.length === 0) {
      throw new ValidationError(
        "Daily frequency requires at least one intake slot",
        { field: "slots" },
      );
    }
  }

  if (input.frequency === "as_needed") {
    if (input.slots && input.slots.length > 0) {
      throw new ValidationError(
        "As-needed frequency must not include slots",
        { field: "slots" },
      );
    }
  }
}
