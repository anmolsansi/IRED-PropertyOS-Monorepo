import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { MapService } from "./map.service";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../shared/pipes/zod-validation.pipe";
import {
  BoundsQuerySchema,
  NearbyQuerySchema,
  BoundsQueryDto,
  NearbyQueryDto,
} from "./dto/map.schema";

@ApiTags("map")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller({ path: "map", version: "1" })
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get("properties")
  @ApiOperation({ summary: "Get properties within map bounds" })
  @ApiResponse({
    status: 200,
    description: "Properties in bounds",
    schema: {
      example: {
        data: [
          {
            id: "uuid",
            name: "Tower A",
            latitude: 19.076,
            longitude: 72.8777,
            totalUnits: 48,
            availabilityStatus: "Available",
          },
        ],
      },
    },
  })
  @UsePipes(new ZodValidationPipe(BoundsQuerySchema))
  async findByBounds(@Query() query: BoundsQueryDto) {
    return this.mapService.findByBounds(query);
  }

  @Get("properties/nearby")
  @ApiOperation({ summary: "Get nearby properties" })
  @ApiResponse({
    status: 200,
    description: "Nearby properties with distance",
    schema: {
      example: {
        data: [
          {
            id: "uuid",
            name: "Tower A",
            latitude: 19.076,
            longitude: 72.8777,
            distance: 1.2,
          },
        ],
      },
    },
  })
  @UsePipes(new ZodValidationPipe(NearbyQuerySchema))
  async findNearby(@Query() query: NearbyQueryDto) {
    return this.mapService.findNearby(query.lat, query.lng, query.radius);
  }
}
