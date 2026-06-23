import { Module } from "@nestjs/common";
import { FloorsController } from "./floors.controller";
import { FloorsService } from "./floors.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [FloorsController],
  providers: [FloorsService],
  exports: [FloorsService],
})
export class FloorsModule {}
