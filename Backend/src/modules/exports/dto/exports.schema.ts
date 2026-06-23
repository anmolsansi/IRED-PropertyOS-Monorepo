import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const ExportQuerySchema = z.object({
  stateId: uuid.optional(),
  cityId: uuid.optional(),
  buildingId: uuid.optional(),
});

export type ExportQueryDto = z.infer<typeof ExportQuerySchema>;
