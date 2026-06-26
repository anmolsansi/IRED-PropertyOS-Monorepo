import { Test, TestingModule } from "@nestjs/testing";
import { MediaService } from "../media.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  CreateBucketCommand: jest.fn(),
  HeadBucketCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest
    .fn()
    .mockResolvedValue("https://presigned-url.example.com"),
}));

describe("MediaService", () => {
  let service: MediaService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      media: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest
          .fn()
          .mockResolvedValue({ id: "m-1", storageKey: "image/test.jpg" }),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                "app.s3.bucket": "test-bucket",
                "app.s3.publicUrl": "https://s3.example.com",
                "app.s3.endpoint": "https://s3.example.com",
                "app.s3.region": "us-east-1",
                "app.s3.accessKey": "key",
                "app.s3.secretKey": "secret",
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getUploadUrl", () => {
    it("should return presigned URL and media record", async () => {
      const result = await service.getUploadUrl({
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
        fileType: "image",
      });
      expect(result).toHaveProperty("mediaId");
      expect(result).toHaveProperty("presignedUrl");
      expect(result).toHaveProperty("storageKey");
      expect(prisma.media.create).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should throw if not found", async () => {
      prisma.media.findUnique.mockResolvedValue(null);
      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return media", async () => {
      const mockMedia = { id: "m-1", storageKey: "image/test.jpg" };
      prisma.media.findUnique.mockResolvedValue(mockMedia);
      const result = await service.findOne("m-1");
      expect(result).toEqual({
        ...mockMedia,
        publicUrl: "https://s3.example.com/test-bucket/image/test.jpg",
      });
    });

    it("should not append bucket name to Cloudflare R2 public URLs", async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MediaService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                const config: Record<string, string> = {
                  "app.s3.bucket": "propertyos-media",
                  "app.s3.publicUrl":
                    "https://pub-f0d030c6e52c49d3963eb677df1b1179.r2.dev",
                  "app.s3.endpoint":
                    "https://account-id.r2.cloudflarestorage.com",
                  "app.s3.region": "auto",
                  "app.s3.accessKey": "key",
                  "app.s3.secretKey": "secret",
                };
                return config[key];
              }),
            },
          },
        ],
      }).compile();
      const r2Service = module.get<MediaService>(MediaService);

      const mockMedia = { id: "m-1", storageKey: "image/test.jpg" };
      prisma.media.findUnique.mockResolvedValue(mockMedia);
      const result = await r2Service.findOne("m-1");

      expect(result).toEqual({
        ...mockMedia,
        publicUrl:
          "https://pub-f0d030c6e52c49d3963eb677df1b1179.r2.dev/image/test.jpg",
      });
    });
  });

  describe("completeUpload", () => {
    it("should verify the object exists before marking upload complete", async () => {
      prisma.media.findUnique.mockResolvedValue({
        id: "m-1",
        storageKey: "image/test.jpg",
        fileSizeBytes: BigInt(0),
      });

      await service.completeUpload("m-1", 123);

      expect(prisma.media.update).toHaveBeenCalledWith({
        where: { id: "m-1" },
        data: expect.objectContaining({
          uploadStatus: "completed",
          fileSizeBytes: BigInt(123),
        }),
      });
    });
  });

  describe("getDownloadUrl", () => {
    it("should throw if not found", async () => {
      prisma.media.findUnique.mockResolvedValue(null);
      await expect(service.getDownloadUrl("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return presigned download URL", async () => {
      prisma.media.findUnique.mockResolvedValue({
        id: "m-1",
        storageKey: "image/test.jpg",
        originalFileName: "photo.jpg",
      });
      const result = await service.getDownloadUrl("m-1");
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("fileName", "photo.jpg");
    });
  });
});
