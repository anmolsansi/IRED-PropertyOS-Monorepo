import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const CreateProposalSchema = z.object({
  clientId: uuid,
  requirementId: uuid.optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateProposalSchema = z.object({
  title: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "exported", "sent", "accepted", "rejected", "expired", "archived"]).optional(),
});

export const AddProposalItemSchema = z.object({
  entityType: z.enum(["building", "floor", "unit"]),
  buildingId: uuid.optional(),
  floorId: uuid.optional(),
  unitId: uuid.optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.entityType === "building" && !data.buildingId) return false;
  if (data.entityType === "floor" && (!data.buildingId || !data.floorId)) return false;
  if (data.entityType === "unit" && (!data.buildingId || !data.floorId || !data.unitId)) return false;
  return true;
}, {
  message: "Missing required IDs for the selected entity type",
});

export const UpdateProposalFieldsSchema = z.object({
  selectedFields: z.array(z.string()).min(1, "Select at least one field"),
});

export const ExportProposalSchema = z.object({
  selectedFields: z.array(z.string()).optional(),
  useLatestData: z.boolean().optional(),
});

export type CreateProposalDto = z.infer<typeof CreateProposalSchema>;
export type UpdateProposalDto = z.infer<typeof UpdateProposalSchema>;
export type AddProposalItemDto = z.infer<typeof AddProposalItemSchema>;
export type UpdateProposalFieldsDto = z.infer<typeof UpdateProposalFieldsSchema>;
export type ExportProposalDto = z.infer<typeof ExportProposalSchema>;
