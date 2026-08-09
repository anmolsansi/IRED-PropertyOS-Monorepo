export interface PrimaryMediaSelection {
  primaryMediaId: string | null;
  isExplicit: boolean;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function getPrimaryMediaSelection(additionalFields: unknown): PrimaryMediaSelection {
  const fields = asObject(additionalFields);
  const rawPrimaryMediaId = fields.primaryMediaId;
  const primaryMediaId =
    typeof rawPrimaryMediaId === "string" && rawPrimaryMediaId.trim()
      ? rawPrimaryMediaId
      : null;

  return {
    primaryMediaId,
    isExplicit: fields.primaryMediaSelectionSet === true || primaryMediaId !== null,
  };
}

export function mergePrimaryMediaSelection(
  additionalFields: unknown,
  primaryMediaId: string | null,
): Record<string, unknown> {
  return {
    ...asObject(additionalFields),
    primaryMediaId,
    primaryMediaSelectionSet: true,
  };
}
