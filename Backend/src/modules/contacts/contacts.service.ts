import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  createChangeRequest,
  diffFields,
} from "../change-requests/change-request.helper";
import { EntityType } from "@prisma/client";

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

  async findOne(id: string) {
    return this.prisma.contact.findUnique({
      where: { id },
      include: {
        building: true,
        floor: true,
        unit: true,
        contactRole: true,
        verificationStatus: true,
      },
    });
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
