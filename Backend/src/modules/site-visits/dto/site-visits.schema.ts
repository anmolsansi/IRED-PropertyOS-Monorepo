import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const CreateSiteVisitSchema = z.object({
  clientId: uuid.optional(),
  buildingId: uuid.optional(),
  unitId: uuid.optional(),
  scheduledAt: z.string().datetime({ message: "Scheduled date is required" }),
  assignedTo: uuid.optional(),
  notes: z.string().optional(),
});

export const UpdateSiteVisitSchema = CreateSiteVisitSchema.partial().extend({
  status: z
    .enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"])
    .optional(),
});

export const SiteVisitQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(20),
  scheduledDate: z.string().optional(),
  assignedTo: uuid.optional(),
  status: z.string().optional(),
  clientId: uuid.optional(),
});

export const CompleteSiteVisitSchema = z.object({
  notes: z.string().optional(),
});

export type CreateSiteVisitDto = z.infer<typeof CreateSiteVisitSchema>;
export type UpdateSiteVisitDto = z.infer<typeof UpdateSiteVisitSchema>;
export type SiteVisitQueryDto = z.infer<typeof SiteVisitQuerySchema>;
export type CompleteSiteVisitDto = z.infer<typeof CompleteSiteVisitSchema>;
