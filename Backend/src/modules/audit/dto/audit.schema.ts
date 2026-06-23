import { z } from "zod";

export const AuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  eventType: z.string().optional(),
  actorUserId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z
    .enum(["createdAt", "eventType", "entityType"])
    .default("createdAt")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type AuditQueryDto = z.infer<typeof AuditQuerySchema>;
