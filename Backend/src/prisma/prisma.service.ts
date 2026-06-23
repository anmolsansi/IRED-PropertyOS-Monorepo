import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const modelNames = [
      "auditEvent",
      "versionSnapshot",
      "changeItem",
      "changeRequest",
      "media",
      "contact",
      "unit",
      "floor",
      "building",
      "refreshToken",
      "workerGeographicAssignment",
      "user",
    ];

    return Promise.all(
      modelNames.map((name) => {
        const model = (this as Record<string, unknown>)[name] as {
          deleteMany: () => Promise<unknown>;
        };
        return model?.deleteMany();
      }),
    );
  }
}
