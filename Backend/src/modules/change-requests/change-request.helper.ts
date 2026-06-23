import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { EntityType } from "@prisma/client";

export interface ChangeFieldInput {
  fieldName: string;
  oldValue: unknown;
  proposedValue: unknown;
}

function toJsonValue(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) return Prisma.JsonNull;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createChangeRequest(
  prisma: PrismaService,
  params: {
    entityType: EntityType;
    entityId: string;
    requestedBy: string;
    workerNote?: string;
    fields: ChangeFieldInput[];
  },
) {
  const hasChanges = params.fields.some(
    (f) => JSON.stringify(f.oldValue) !== JSON.stringify(f.proposedValue),
  );

  if (!hasChanges) {
    return null;
  }

  return prisma.changeRequest.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      requestedBy: params.requestedBy,
      workerNote: params.workerNote,
      status: "pending",
      changeItems: {
        create: params.fields
          .filter(
            (f) =>
              JSON.stringify(f.oldValue) !== JSON.stringify(f.proposedValue),
          )
          .map((f) => ({
            fieldName: f.fieldName,
            oldValueJson: toJsonValue(f.oldValue),
            proposedValueJson: toJsonValue(f.proposedValue),
            status: "pending" as const,
          })),
      },
    },
    include: {
      changeItems: true,
    },
  });
}

export function diffFields(
  current: Record<string, unknown>,
  proposed: Record<string, unknown>,
  allowedFields: string[],
): ChangeFieldInput[] {
  const changes: ChangeFieldInput[] = [];

  for (const field of allowedFields) {
    if (
      field in proposed &&
      JSON.stringify(current[field]) !== JSON.stringify(proposed[field])
    ) {
      changes.push({
        fieldName: field,
        oldValue: current[field],
        proposedValue: proposed[field],
      });
    }
  }

  return changes;
}
