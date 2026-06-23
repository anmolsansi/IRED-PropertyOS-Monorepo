import { z } from "zod";

const uuid = z.string().uuid("Invalid UUID");

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z
    .enum(["general", "follow_up", "site_visit", "other"])
    .default("general"),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  dueDate: z.string().datetime().optional(),
  assignedTo: uuid.optional(),
  buildingId: uuid.optional(),
  clientId: uuid.optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
});

export const CreateFollowUpSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().datetime({ message: "Due date is required" }),
});

export const UpdateFollowUpSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["pending", "completed", "overdue"]).optional(),
});

export const TaskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(250).default(20),
  assignedTo: uuid.optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  buildingId: uuid.optional(),
  clientId: uuid.optional(),
});

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;
export type CreateFollowUpDto = z.infer<typeof CreateFollowUpSchema>;
export type UpdateFollowUpDto = z.infer<typeof UpdateFollowUpSchema>;
export type TaskQueryDto = z.infer<typeof TaskQuerySchema>;
