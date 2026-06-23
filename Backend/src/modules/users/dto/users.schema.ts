import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const InviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(1, "Full name is required"),
  mobileNumber: z.string().min(10).optional(),
  role: z.enum(["ADMIN", "WORKER"]),
  stateIds: z.array(uuid).optional(),
  cityIds: z.array(uuid).optional(),
});

export const UpdateUserStatusSchema = z.object({
  status: z.enum(["active", "inactive", "suspended"]),
});

export const UpdateUserSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  fullName: z.string().min(1, "Full name is required").optional(),
  mobileNumber: z.string().min(10).optional(),
  role: z.enum(["ADMIN", "WORKER"]).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

export const AssignGeographicScopeSchema = z.object({
  assignments: z
    .array(
      z.object({
        assignmentType: z.enum(["state", "city", "locality"]),
        stateId: uuid.optional(),
        cityId: uuid.optional(),
        localityId: uuid.optional(),
      }),
    )
    .min(1, "At least one assignment is required"),
});

export const ReassignUnitsSchema = z.object({
  fromWorkerId: uuid,
  toWorkerId: uuid,
});

export const UserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(20),
  role: z.enum(["ADMIN", "WORKER"]).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  search: z.string().optional(),
});

export type InviteUserDto = z.infer<typeof InviteUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type UpdateUserStatusDto = z.infer<typeof UpdateUserStatusSchema>;
export type AssignGeographicScopeDto = z.infer<
  typeof AssignGeographicScopeSchema
>;
export type ReassignUnitsDto = z.infer<typeof ReassignUnitsSchema>;
export type UserQueryDto = z.infer<typeof UserQuerySchema>;
