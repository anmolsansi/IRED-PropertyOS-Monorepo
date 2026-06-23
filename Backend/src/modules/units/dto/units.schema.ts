import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const CreateUnitSchema = z.object({
  buildingId: uuid,
  floorId: uuid.optional(),
  unitNumber: z.string().min(1, "Unit number is required"),
  propertyTypeId: uuid.optional(),
  furnishingStatusId: uuid.optional(),
  availabilityStatusId: uuid.optional(),
  carpetArea: z.number().positive().optional(),
  builtUpArea: z.number().positive().optional(),
  superBuiltUpArea: z.number().positive().optional(),
  chargeableArea: z.number().positive().optional(),
  monthlyRent: z.number().positive().optional(),
  rentPerSqftMonth: z.number().positive().optional(),
  camChargesPerSqftMonth: z.number().positive().optional(),
  maintenanceCharges: z.number().positive().optional(),
  securityDeposit: z.number().positive().optional(),
  lockInPeriodMonths: z.number().int().nonnegative().optional(),
  leaseTermMonths: z.number().int().positive().optional(),
  escalationPercentage: z.number().min(0).max(100).optional(),
  escalationFrequency: z.string().optional(),
  parkingCharges: z.number().nonnegative().optional(),
  powerBackupCharges: z.number().nonnegative().optional(),
  gstApplicable: z.boolean().default(false),
  brokerageCommission: z.number().nonnegative().optional(),
  availabilityDate: z.string().datetime().optional(),
  possessionDate: z.string().datetime().optional(),
  negotiable: z.boolean().default(false),
  assignedWorkerId: uuid.optional(),
  notes: z.string().optional(),
});

export const UpdateUnitSchema = CreateUnitSchema.partial().extend({
  buildingId: uuid.optional(),
  workerNote: z.string().optional(),
});

export const UnitQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(20),
  buildingId: uuid.optional(),
  floorId: uuid.optional(),
  availabilityStatusId: uuid.optional(),
  search: z.string().optional(),
});

export type CreateUnitDto = z.infer<typeof CreateUnitSchema>;
export type UpdateUnitDto = z.infer<typeof UpdateUnitSchema>;
export type UnitQueryDto = z.infer<typeof UnitQuerySchema>;
