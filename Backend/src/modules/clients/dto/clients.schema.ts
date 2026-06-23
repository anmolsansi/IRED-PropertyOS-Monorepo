import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const CreateClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z.string().email().optional(),
  mobileNumber: z.string().min(10).optional(),
  notes: z.string().optional(),
});

export const UpdateClientSchema = CreateClientSchema.partial();

export const AddClientContactSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  mobileNumber: z.string().min(10).optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
});

export const CreateRequirementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  minArea: z.number().positive().optional(),
  maxArea: z.number().positive().optional(),
  minBudget: z.number().positive().optional(),
  maxBudget: z.number().positive().optional(),
  preferredLocations: z.any().optional(),
});

export const UpdateRequirementSchema = CreateRequirementSchema.partial().extend(
  {
    status: z.enum(["active", "fulfilled", "cancelled"]).optional(),
  },
);

export const AddShortlistSchema = z.object({
  unitId: uuid.optional(),
  buildingId: uuid.optional(),
  notes: z.string().optional(),
});

export const UpdateShortlistSchema = z.object({
  status: z.enum(["pending", "accepted", "rejected"]).optional(),
  notes: z.string().optional(),
});

export const ClientQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(20),
  search: z.string().optional(),
});

export type CreateClientDto = z.infer<typeof CreateClientSchema>;
export type UpdateClientDto = z.infer<typeof UpdateClientSchema>;
export type AddClientContactDto = z.infer<typeof AddClientContactSchema>;
export type CreateRequirementDto = z.infer<typeof CreateRequirementSchema>;
export type UpdateRequirementDto = z.infer<typeof UpdateRequirementSchema>;
export type AddShortlistDto = z.infer<typeof AddShortlistSchema>;
export type UpdateShortlistDto = z.infer<typeof UpdateShortlistSchema>;
export type ClientQueryDto = z.infer<typeof ClientQuerySchema>;
