import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const CreateBuildingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  propertyTypeId: uuid.optional(),
  stateId: uuid.optional(),
  cityId: uuid.optional(),
  zoneId: uuid.optional(),
  localityId: uuid.optional(),
  microMarketId: uuid.optional(),
  fullAddress: z.string().optional(),
  landmark: z.string().optional(),
  pincode: z.string().optional(),
  googleMapsUrl: z.string().url().optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  totalFloors: z.number().int().positive().optional(),
  totalUnits: z.number().int().positive().optional(),
  totalBuildingArea: z.number().positive().optional(),
  availabilityStatusId: uuid.optional(),
  verificationStatusId: uuid.optional(),
  sourceId: uuid.optional(),
  parkingDetails: z.any().optional(),
  liftDetails: z.any().optional(),
  powerBackupDetails: z.any().optional(),
  fireSafetyDetails: z.any().optional(),
  waterAvailabilityDetails: z.any().optional(),
  roadWidth: z.number().positive().optional(),
  frontage: z.number().positive().optional(),
  nearbyTransportDetails: z.any().optional(),
  notes: z.string().optional(),
});

export const UpdateBuildingSchema = CreateBuildingSchema.partial().extend({
  workerNote: z.string().optional(),
});

export const BuildingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(20),
  stateId: uuid.optional(),
  cityId: uuid.optional(),
  localityId: uuid.optional(),
  propertyTypeId: uuid.optional(),
  availabilityStatusId: uuid.optional(),
  search: z.string().optional(),
});

export type CreateBuildingDto = z.infer<typeof CreateBuildingSchema>;
export type UpdateBuildingDto = z.infer<typeof UpdateBuildingSchema>;
export type BuildingQueryDto = z.infer<typeof BuildingQuerySchema>;
