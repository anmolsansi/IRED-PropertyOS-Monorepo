import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const CreateContactSchema = z.object({
  buildingId: uuid.optional(),
  floorId: uuid.optional(),
  unitId: uuid.optional(),
  contactRoleId: uuid.optional(),
  fullName: z.string().min(1, "Full name is required"),
  mobileNumber: z.string().min(10).optional(),
  alternateMobileNumber: z.string().min(10).optional(),
  whatsappNumber: z.string().min(10).optional(),
  email: z.string().email().optional(),
  preferredCommunicationMethod: z
    .enum(["phone", "whatsapp", "email"])
    .optional(),
  availabilityHours: z.string().optional(),
  verificationStatusId: uuid.optional(),
  notes: z.string().optional(),
});

export const UpdateContactSchema = CreateContactSchema.partial();

export type CreateContactDto = z.infer<typeof CreateContactSchema>;
export type UpdateContactDto = z.infer<typeof UpdateContactSchema>;
