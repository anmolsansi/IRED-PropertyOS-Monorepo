import { z } from "zod";

export const MapColumnsSchema = z.object({
  mapping: z.record(z.string(), z.string()),
});

export type MapColumnsDto = z.infer<typeof MapColumnsSchema>;
