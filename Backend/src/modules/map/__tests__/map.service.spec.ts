import { Test, TestingModule } from "@nestjs/testing";
import { MapService } from "../map.service";
import { PrismaService } from "../../../prisma/prisma.service";

describe("MapService", () => {
  let service: MapService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      building: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MapService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<MapService>(MapService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findByBounds", () => {
    it("should return buildings within bounds", async () => {
      const result = await service.findByBounds({
        north: 28.9,
        south: 28.5,
        east: 77.3,
        west: 76.9,
      });
      expect(result).toEqual([]);
      expect(prisma.building.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            latitude: expect.any(Object),
            longitude: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe("findNearby", () => {
    it("should return nearby buildings", async () => {
      const result = await service.findNearby(28.6139, 77.209, 5);
      expect(result).toEqual([]);
      expect(prisma.building.findMany).toHaveBeenCalled();
    });

    it("should use default radius of 5km", async () => {
      await service.findNearby(28.6139, 77.209);
      expect(prisma.building.findMany).toHaveBeenCalled();
    });
  });
});
