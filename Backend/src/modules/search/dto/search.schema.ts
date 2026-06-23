import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const SearchPropertiesQuerySchema = z.object({
  stateId: uuid.optional(),
  cityId: uuid.optional(),
  localityId: uuid.optional(),
  propertyTypeId: uuid.optional(),
  furnishingStatusId: uuid.optional(),
  availabilityStatusId: uuid.optional(),
  verificationStatusId: uuid.optional(),
  minArea: z.coerce.number().positive().optional(),
  maxArea: z.coerce.number().positive().optional(),
  minRent: z.coerce.number().positive().optional(),
  maxRent: z.coerce.number().positive().optional(),
  minBuildingArea: z.coerce.number().positive().optional(),
  maxBuildingArea: z.coerce.number().positive().optional(),
  assignedWorkerId: uuid.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(20),
});

export const SearchUnitsQuerySchema = z.object({
  buildingId: uuid.optional(),
  availabilityStatusId: uuid.optional(),
  propertyTypeId: uuid.optional(),
  furnishingStatusId: uuid.optional(),
  minRent: z.coerce.number().positive().optional(),
  maxRent: z.coerce.number().positive().optional(),
  minArea: z.coerce.number().positive().optional(),
  maxArea: z.coerce.number().positive().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(20),
});

export const SearchContactsQuerySchema = z.object({
  contactRoleId: uuid.optional(),
  verificationStatusId: uuid.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(20),
});

export type SearchPropertiesQueryDto = z.infer<
  typeof SearchPropertiesQuerySchema
>;
export type SearchUnitsQueryDto = z.infer<typeof SearchUnitsQuerySchema>;
export type SearchContactsQueryDto = z.infer<typeof SearchContactsQuerySchema>;
