import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const GetUploadUrlSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  fileType: z.enum(["image", "video", "document"]),
  buildingId: uuid.optional(),
  floorId: uuid.optional(),
  unitId: uuid.optional(),
  documentCategoryId: uuid.optional(),
});

export const CompleteUploadSchema = z.object({
  mediaId: uuid,
  fileSizeBytes: z.number().positive().optional(),
});

export const UpdateMediaSchema = z.object({
  documentCategoryId: uuid.optional(),
  notes: z.string().optional(),
});

export const MediaQuerySchema = z.object({
  buildingId: uuid.optional(),
  floorId: uuid.optional(),
  unitId: uuid.optional(),
  fileType: z.enum(["image", "video", "document"]).optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
});

export type GetUploadUrlDto = z.infer<typeof GetUploadUrlSchema>;
export type CompleteUploadDto = z.infer<typeof CompleteUploadSchema>;
export type UpdateMediaDto = z.infer<typeof UpdateMediaSchema>;
export type MediaQueryDto = z.infer<typeof MediaQuerySchema>;
