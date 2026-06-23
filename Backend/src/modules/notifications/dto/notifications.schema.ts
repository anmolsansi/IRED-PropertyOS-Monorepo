import { z } from "zod";

export const RetryQueueSchema = z.object({
  queue: z.enum(["email", "sms"]),
});

export type RetryQueueDto = z.infer<typeof RetryQueueSchema>;
