import { Module } from "@nestjs/common";
import { ProposalsController } from "./proposals.controller";
import { ProposalsService } from "./proposals.service";
import { ProposalExportService } from "./proposal-export.service";
import { PrismaModule } from "../../prisma/prisma.module";
import { MediaModule } from "../media/media.module";

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [ProposalsController],
  providers: [ProposalsService, ProposalExportService],
  exports: [ProposalsService, ProposalExportService],
})
export class ProposalsModule {}
