import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const CreateFloorSchema = z.object({
  floorName: z.string().optional(),
  floorNumber: z.number().int(),
  totalArea: z.number().positive().optional(),
  availableArea: z.number().positive().optional(),
  availabilityStatusId: uuid.optional(),
  notes: z.string().optional(),
});

export const UpdateFloorSchema = CreateFloorSchema.partial().extend({
  workerNote: z.string().optional(),
});

export type CreateFloorDto = z.infer<typeof CreateFloorSchema>;
export type UpdateFloorDto = z.infer<typeof UpdateFloorSchema>;
