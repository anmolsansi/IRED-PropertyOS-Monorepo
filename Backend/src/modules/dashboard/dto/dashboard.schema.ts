import { z } from "zod";

export const ActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ActivityQueryDto = z.infer<typeof ActivityQuerySchema>;
