import { Controller, Get, Query, UseGuards, UsePipes } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { SearchService } from "./search.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { GeographyScope } from "../../shared/decorators/geography-scope.decorator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  SearchPropertiesQuerySchema,
  SearchUnitsQuerySchema,
  SearchContactsQuerySchema,
  SearchPropertiesQueryDto,
  SearchUnitsQueryDto,
  SearchContactsQueryDto,
} from "./dto/search.schema";

@ApiTags("search")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "search", version: "1" })
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("properties")
  @GeographyScope()
  @ApiOperation({ summary: "Search properties with advanced filters" })
  @ApiResponse({
    status: 200,
    description: "Matching properties",
    schema: {
      example: {
        data: [
          {
            id: "uuid",
            name: "Tower A",
            propertyType: "Office",
            city: "Mumbai",
            locality: "BKC",
            totalUnits: 48,
            availableUnits: 12,
          },
        ],
        pagination: { page: 1, limit: 20, total: 45, totalPages: 3 },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(SearchPropertiesQuerySchema))
  async searchProperties(
    @Query() query: SearchPropertiesQueryDto,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.searchService.searchProperties(query, scope);
  }

  @Get("units")
  @GeographyScope()
  @ApiOperation({ summary: "Search units with advanced filters" })
  @UsePipes(new ZodValidationPipe(SearchUnitsQuerySchema))
  async searchUnits(
    @Query() query: SearchUnitsQueryDto,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.searchService.searchUnits(query, scope);
  }

  @Get("contacts")
  @GeographyScope()
  @ApiOperation({ summary: "Search contacts" })
  @UsePipes(new ZodValidationPipe(SearchContactsQuerySchema))
  async searchContacts(
    @Query() query: SearchContactsQueryDto,
    @CurrentUser("geographicScope") scope: any,
  ) {
    return this.searchService.searchContacts(query, scope);
  }
}
