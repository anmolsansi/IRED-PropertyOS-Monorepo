import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const CreateDealSchema = z.object({
  clientId: uuid.optional(),
  buildingId: uuid.optional(),
  unitId: uuid.optional(),
  title: z.string().min(1, "Title is required"),
  dealValue: z.number().positive().optional(),
  status: z
    .enum([
      "requirement_received",
      "shortlisted",
      "site_visit_scheduled",
      "site_visit_completed",
      "negotiation",
      "agreement_shared",
      "closed",
      "lost",
    ])
    .default("negotiation"),
  assignedTo: uuid.optional(),
});

export const UpdateDealSchema = CreateDealSchema.partial();

export const AddCommissionSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  rate: z.number().min(0).max(100).optional(),
});

export const AddInvoiceSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.string().datetime().optional(),
});

export const DealQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(20),
  status: z.string().optional(),
  assignedTo: uuid.optional(),
  clientId: uuid.optional(),
  buildingId: uuid.optional(),
});

export type CreateDealDto = z.infer<typeof CreateDealSchema>;
export type UpdateDealDto = z.infer<typeof UpdateDealSchema>;
export type AddCommissionDto = z.infer<typeof AddCommissionSchema>;
export type AddInvoiceDto = z.infer<typeof AddInvoiceSchema>;
export type DealQueryDto = z.infer<typeof DealQuerySchema>;
