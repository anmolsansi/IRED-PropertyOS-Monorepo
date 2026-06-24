export interface GeographicScope {
  denyAll?: boolean;
  stateIds: string[];
  cityIds: string[];
  localityIds: string[];
}

const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Build a Prisma WHERE clause that restricts results to the user's geographic scope.
 * Returns an empty object (no restriction) if no scope is provided.
 *
 * Additive logic:
 * - State assignments include all cities/localities in that state
 * - City assignments include all localities in that city
 * - Locality assignments include only that locality
 *
 * @param scope - The geographic scope from request.userGeographicScope
 * @param columnPrefix - Optional prefix for direct columns (e.g., "" for buildings, "building." for tasks)
 */
export function buildGeographyWhere(
  scope: GeographicScope | undefined,
  columnPrefix = "",
): Record<string, any> {
  if (!scope) return {};

  if (scope.denyAll) {
    return { id: NO_MATCH_ID };
  }

  const hasStateScope = scope.stateIds.length > 0;
  const hasCityScope = scope.cityIds.length > 0;
  const hasLocalityScope = scope.localityIds.length > 0;

  if (!hasStateScope && !hasCityScope && !hasLocalityScope) return {};

  const prefix = columnPrefix ? `${columnPrefix}.` : "";

  const orConditions: any[] = [];

  // Locality assignments are most specific
  if (hasLocalityScope) {
    orConditions.push({
      [`${prefix}localityId`]: { in: scope.localityIds },
    });
  }

  // City assignments include all localities in those cities
  if (hasCityScope) {
    orConditions.push({
      [`${prefix}cityId`]: { in: scope.cityIds },
    });
  }

  // State assignments include all cities/localities in those states
  if (hasStateScope) {
    orConditions.push({
      [`${prefix}stateId`]: { in: scope.stateIds },
    });
  }

  return orConditions.length > 0 ? { OR: orConditions } : {};
}

/**
 * Build geography WHERE for entities linked to buildings (tasks, site-visits, deals).
 * Uses a nested include filter on the building relation.
 */
export function buildLinkedGeographyWhere(
  scope: GeographicScope | undefined,
): Record<string, any> {
  if (!scope) return {};

  if (scope.denyAll) {
    return { building: { id: NO_MATCH_ID } };
  }

  const hasStateScope = scope.stateIds.length > 0;
  const hasCityScope = scope.cityIds.length > 0;
  const hasLocalityScope = scope.localityIds.length > 0;

  if (!hasStateScope && !hasCityScope && !hasLocalityScope) return {};

  const orConditions: any[] = [];

  if (hasLocalityScope) {
    orConditions.push({
      building: { localityId: { in: scope.localityIds } },
    });
  }

  if (hasCityScope) {
    orConditions.push({
      building: { cityId: { in: scope.cityIds } },
    });
  }

  if (hasStateScope) {
    orConditions.push({
      building: { stateId: { in: scope.stateIds } },
    });
  }

  return orConditions.length > 0 ? { OR: orConditions } : {};
}

/**
 * Build geography WHERE for proposals (linked through units → building).
 */
export function buildProposalGeographyWhere(
  scope: GeographicScope | undefined,
): Record<string, any> {
  if (!scope) return {};

  if (scope.denyAll) {
    return { units: { some: { building: { id: NO_MATCH_ID } } } };
  }

  const hasStateScope = scope.stateIds.length > 0;
  const hasCityScope = scope.cityIds.length > 0;
  const hasLocalityScope = scope.localityIds.length > 0;

  if (!hasStateScope && !hasCityScope && !hasLocalityScope) return {};

  const orConditions: any[] = [];

  if (hasLocalityScope) {
    orConditions.push({
      units: { some: { building: { localityId: { in: scope.localityIds } } } },
    });
  }

  if (hasCityScope) {
    orConditions.push({
      units: { some: { building: { cityId: { in: scope.cityIds } } } },
    });
  }

  if (hasStateScope) {
    orConditions.push({
      units: { some: { building: { stateId: { in: scope.stateIds } } } },
    });
  }

  return orConditions.length > 0 ? { OR: orConditions } : {};
}
