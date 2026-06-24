import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createChangeRequest,
  diffFields,
} from "../change-requests/change-request.helper";
import { EntityType } from "@prisma/client";
import { GeographicScope } from "../../shared/utils/geography-filter";
import { verifyEntityGeography } from "../../shared/utils/verify-entity-geography";

const EDITABLE_FIELDS = [
  "fullName",
  "mobileNumber",
  "alternateMobileNumber",
  "whatsappNumber",
  "email",
  "preferredCommunicationMethod",
  "availabilityHours",
  "contactRoleId",
  "verificationStatusId",
  "notes",
];

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    query?: { page?: number; limit?: number; contactRoleId?: string },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, contactRoleId } = query || {};
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (contactRoleId) where.contactRoleId = contactRoleId;

    // Contacts are scoped through their building
    if (geographicScope) {
      if (geographicScope.denyAll) {
        where.buildingId = "00000000-0000-0000-0000-000000000000";
      }
      const hasScope =
        !geographicScope.denyAll &&
        (geographicScope.stateIds.length > 0 ||
          geographicScope.cityIds.length > 0 ||
          geographicScope.localityIds.length > 0);
      if (hasScope) {
        const buildingFilter: any = {};
        if (geographicScope.stateIds.length > 0)
          buildingFilter.stateId = { in: geographicScope.stateIds };
        if (geographicScope.cityIds.length > 0)
          buildingFilter.cityId = { in: geographicScope.cityIds };
        if (geographicScope.localityIds.length > 0)
          buildingFilter.localityId = { in: geographicScope.localityIds };

        const buildings = await this.prisma.building.findMany({
          where: buildingFilter,
          select: { id: true },
        });
        where.buildingId = { in: buildings.map((b) => b.id) };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          building: { select: { id: true, name: true } },
          floor: { select: { id: true, floorName: true } },
          unit: { select: { id: true, unitNumber: true } },
          contactRole: true,
          verificationStatus: true,
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, geographicScope?: GeographicScope) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        building: true,
        floor: true,
        unit: true,
        contactRole: true,
        verificationStatus: true,
      },
    });
    if (!contact) throw new NotFoundException("Contact not found");
    // Contacts are scoped through their building
    if (geographicScope && contact.building) {
      await verifyEntityGeography(
        this.prisma,
        geographicScope,
        contact.building,
        "Contact",
      );
    }
    return contact;
  }

  async create(data: any, userId: string) {
    return this.prisma.contact.create({
      data: {
        ...data,
        createdBy: userId,
      },
    });
  }

  async update(id: string, data: any, userId: string, isAdmin: boolean) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException("Contact not found");

    if (isAdmin) {
      return this.prisma.contact.update({
        where: { id },
        data,
      });
    }

    const changes = diffFields(contact as any, data, EDITABLE_FIELDS);

    const changeRequest = await createChangeRequest(this.prisma, {
      entityType: EntityType.contact,
      entityId: id,
      requestedBy: userId,
      workerNote: data.workerNote,
      fields: changes,
    });

    if (!changeRequest) {
      return { message: "No changes detected", entityId: id };
    }

    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        eventType: "change_request_created",
        entityType: "contact",
        entityId: id,
        metadataJson: {
          changeRequestId: changeRequest.id,
          fieldsChanged: changes.map((c) => c.fieldName),
        },
      },
    });

    return changeRequest;
  }

  async softDelete(id: string) {
    return this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    return this.prisma.contact.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async logView(id: string, userId: string) {
    await this.prisma.auditEvent.create({
      data: {
        actorUserId: userId,
        eventType: "contact_viewed",
        entityType: "contact",
        entityId: id,
        metadataJson: { viewedAt: new Date().toISOString() },
      },
    });
    return { success: true };
  }
}
