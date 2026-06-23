import { SetMetadata } from "@nestjs/common";

export enum Role {
  ADMIN = "ADMIN",
  WORKER = "WORKER",
}

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
