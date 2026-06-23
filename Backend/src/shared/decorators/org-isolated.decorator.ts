import { SetMetadata } from "@nestjs/common";
import { ORG_ISOLATED_KEY } from "../guards/org.guard";

/**
 * Marks a controller or handler as organization-isolated.
 * Workers only see data belonging to their organization.
 * Admins bypass this filter and see all data.
 */
export const OrgIsolated = () => SetMetadata(ORG_ISOLATED_KEY, true);
