import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const CreateProposalSchema = z.object({
  clientId: uuid,
  requirementId: uuid.optional(),
  unitIds: z.array(uuid).min(1, "At least one unit is required"),
  notes: z.string().optional(),
});

export const GeneratePdfSchema = z.object({
  client: z.record(z.string(), z.unknown()),
  units: z.array(z.record(z.string(), z.unknown())).min(1),
  notes: z.string().optional(),
});

export type CreateProposalDto = z.infer<typeof CreateProposalSchema>;
export type GeneratePdfDto = z.infer<typeof GeneratePdfSchema>;
