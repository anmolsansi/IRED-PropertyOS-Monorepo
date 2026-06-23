import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ReferenceService } from "./reference.service";

@ApiTags("reference")
@Controller({ path: "reference", version: "1" })
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get("states")
  @ApiOperation({ summary: "List all states" })
  async findAllStates() {
    return this.referenceService.findAllStates();
  }

  @Get("states/:stateId/cities")
  @ApiOperation({ summary: "List cities by state" })
  async findCitiesByState(@Param("stateId") stateId: string) {
    return this.referenceService.findCitiesByState(stateId);
  }

  @Get("cities/:cityId/localities")
  @ApiOperation({ summary: "List localities by city" })
  async findLocalitiesByCity(@Param("cityId") cityId: string) {
    return this.referenceService.findLocalitiesByCity(cityId);
  }

  @Get("localities/:localityId/micro-markets")
  @ApiOperation({ summary: "List micro-markets by locality" })
  async findMicroMarketsByLocality(@Param("localityId") localityId: string) {
    return this.referenceService.findMicroMarketsByLocality(localityId);
  }

  @Get("property-types")
  @ApiOperation({ summary: "List all property types" })
  async findAllPropertyTypes() {
    return this.referenceService.findAllPropertyTypes();
  }

  @Get("furnishing-statuses")
  @ApiOperation({ summary: "List all furnishing statuses" })
  async findAllFurnishingStatuses() {
    return this.referenceService.findAllFurnishingStatuses();
  }

  @Get("availability-statuses")
  @ApiOperation({ summary: "List all availability statuses" })
  async findAllAvailabilityStatuses() {
    return this.referenceService.findAllAvailabilityStatuses();
  }

  @Get("verification-statuses")
  @ApiOperation({ summary: "List all verification statuses" })
  async findAllVerificationStatuses() {
    return this.referenceService.findAllVerificationStatuses();
  }

  @Get("contact-roles")
  @ApiOperation({ summary: "List all contact roles" })
  async findAllContactRoles() {
    return this.referenceService.findAllContactRoles();
  }

  @Get("document-categories")
  @ApiOperation({ summary: "List all document categories" })
  async findAllDocumentCategories() {
    return this.referenceService.findAllDocumentCategories();
  }

  @Get("sources")
  @ApiOperation({ summary: "List all sources" })
  async findAllSources() {
    return this.referenceService.findAllSources();
  }

  @Get("zones")
  @ApiOperation({ summary: "List all zones" })
  async findAllZones() {
    return this.referenceService.findAllZones();
  }

  @Get("cities/:cityId/zones")
  @ApiOperation({ summary: "List zones by city" })
  async findZonesByCity(@Param("cityId") cityId: string) {
    return this.referenceService.findZonesByCity(cityId);
  }
}
