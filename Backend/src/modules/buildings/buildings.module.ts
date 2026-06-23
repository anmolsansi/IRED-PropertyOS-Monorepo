import { Module } from "@nestjs/common";
import { BuildingsController } from "./buildings.controller";
import { BuildingsService } from "./buildings.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
