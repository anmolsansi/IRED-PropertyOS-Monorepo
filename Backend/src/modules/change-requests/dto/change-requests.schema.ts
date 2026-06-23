import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const ChangeRequestQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(20),
  status: z
    .enum([
      "pending",
      "partially_approved",
      "approved",
      "rejected",
      "withdrawn",
      "conflict",
    ])
    .optional(),
  entityType: z
    .enum(["building", "floor", "unit", "contact", "document"])
    .optional(),
  cityId: uuid.optional(),
});

export const ApproveItemsSchema = z.object({
  items: z
    .array(
      z.object({
        changeItemId: uuid,
        finalValue: z.string(),
        comment: z.string().optional(),
      }),
    )
    .min(1, "At least one item is required"),
});

export const RejectItemsSchema = z.object({
  items: z
    .array(
      z.object({
        changeItemId: uuid,
        comment: z.string().min(1, "Comment is required"),
      }),
    )
    .min(1, "At least one item is required"),
});

export const ResolveConflictSchema = z.object({
  changeItemId: uuid,
  finalValue: z.string(),
});

export type ChangeRequestQueryDto = z.infer<typeof ChangeRequestQuerySchema>;
export type ApproveItemsDto = z.infer<typeof ApproveItemsSchema>;
export type RejectItemsDto = z.infer<typeof RejectItemsSchema>;
export type ResolveConflictDto = z.infer<typeof ResolveConflictSchema>;
