import { ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { GeographicScope } from "./geography-filter";

/**
 * Verify that an entity (building-linked) is within the user's geographic scope.
 * Throws NotFoundException if out of scope (to not reveal existence).
 *
 * @param prisma - PrismaService instance
 * @param scope - User's geographic scope from request
 * @param entity - The entity to check (must have building relation or direct state/city/locality)
 * @param entityType - Label for error messages
 */
export async function verifyEntityGeography(
  prisma: PrismaService,
  scope: GeographicScope | undefined,
  entity: any,
  entityType: string,
): Promise<void> {
  if (!scope) return;

  if (scope.denyAll) {
    throw new ForbiddenException(
      `${entityType} not found in your assigned geography`,
    );
  }

  const hasScope =
    scope.stateIds.length > 0 ||
    scope.cityIds.length > 0 ||
    scope.localityIds.length > 0;

  if (!hasScope) return;

  // Get the entity's geography — could be direct or through building
  let stateId = entity.stateId;
  let cityId = entity.cityId;
  let localityId = entity.localityId;

  // If entity has a building relation, resolve through it
  if (!stateId && entity.buildingId) {
    const building = await prisma.building.findUnique({
      where: { id: entity.buildingId },
      select: { stateId: true, cityId: true, localityId: true },
    });
    if (building) {
      stateId = building.stateId;
      cityId = building.cityId;
      localityId = building.localityId;
    }
  }

  // Check locality first (most specific)
  if (localityId && scope.localityIds.includes(localityId)) return;
  // Check city
  if (cityId && scope.cityIds.includes(cityId)) return;
  // Check state
  if (stateId && scope.stateIds.includes(stateId)) return;

  throw new ForbiddenException(
    `${entityType} not found in your assigned geography`,
  );
}
