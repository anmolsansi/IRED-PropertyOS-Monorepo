import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { FileType, UploadStatus } from "@prisma/client";
import {
  GeographicScope,
  buildLinkedGeographyWhere,
} from "../../shared/utils/geography-filter";
import { verifyEntityGeography } from "../../shared/utils/verify-entity-geography";

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private bucketReady?: Promise<void>;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.bucket =
      this.config.get<string>("app.s3.bucket") || "propertyos-media";
    this.publicUrl = this.config.get<string>("app.s3.publicUrl") || "";

    this.s3 = new S3Client({
      endpoint: this.config.get<string>("app.s3.endpoint"),
      region: this.config.get<string>("app.s3.region") || "us-east-1",
      credentials: {
        accessKeyId: this.config.get<string>("app.s3.accessKey") || "",
        secretAccessKey: this.config.get<string>("app.s3.secretKey") || "",
      },
      forcePathStyle: true,
    });
  }

  async findAll(
    query?: { page?: number; limit?: number; fileType?: string },
    geographicScope?: GeographicScope,
  ) {
    const { page = 1, limit = 20, fileType } = query || {};
    const skip = (page - 1) * limit;

    const geoWhere = buildLinkedGeographyWhere(geographicScope);

    const where: any = { deletedAt: null, ...geoWhere };
    if (fileType) where.fileType = fileType;

    const [data, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          building: { select: { id: true, name: true } },
          floor: { select: { id: true, floorName: true } },
          unit: { select: { id: true, unitNumber: true } },
          documentCategory: true,
        },
      }),
      this.prisma.media.count({ where }),
    ]);

    return {
      data: data.map((media) => this.withPublicUrl(media)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUploadUrl(params: {
    fileName: string;
    mimeType: string;
    fileType: FileType;
    buildingId?: string;
    floorId?: string;
    unitId?: string;
    documentCategoryId?: string;
  }) {
    await this.ensureBucket();

    const ext = params.fileName.split(".").pop() || "";
    const storageKey = `${params.fileType}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: params.mimeType,
    });

    const presignedUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 300,
    });

    const media = await this.prisma.media.create({
      data: {
        fileName: storageKey,
        originalFileName: params.fileName,
        fileType: params.fileType,
        mimeType: params.mimeType,
        fileSizeBytes: 0,
        storageKey,
        buildingId: params.buildingId,
        floorId: params.floorId,
        unitId: params.unitId,
        documentCategoryId: params.documentCategoryId,
        uploadStatus: UploadStatus.pending,
      },
    });

    return {
      mediaId: media.id,
      uploadUrl: presignedUrl,
      presignedUrl,
      storageKey,
      publicUrl: this.buildPublicUrl(storageKey),
    };
  }

  private async ensureBucket() {
    this.bucketReady ??= (async () => {
      try {
        await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      } catch {
        this.logger.warn(
          `Media bucket "${this.bucket}" not found; creating it now.`,
        );
        try {
          await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        } catch (error) {
          this.bucketReady = undefined;
          throw error;
        }
      }
    })();

    return this.bucketReady;
  }

  async completeUpload(id: string, fileSizeBytes?: number) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException("Media not found");

    await this.s3.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: media.storageKey,
      }),
    );

    return this.prisma.media.update({
      where: { id },
      data: {
        uploadStatus: UploadStatus.completed,
        uploadedAt: new Date(),
        fileSizeBytes: fileSizeBytes
          ? BigInt(fileSizeBytes)
          : media.fileSizeBytes,
      },
    });
  }

  async getDownloadUrl(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException("Media not found");

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: media.storageKey,
    });

    const presignedUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 300,
    });

    return { url: presignedUrl, fileName: media.originalFileName };
  }

  async findOne(id: string, geographicScope?: GeographicScope) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: {
        building: true,
        floor: true,
        unit: true,
        documentCategory: true,
      },
    });
    if (!media) throw new NotFoundException("Media not found");
    // Media is scoped through its building
    if (geographicScope && media.building) {
      await verifyEntityGeography(
        this.prisma,
        geographicScope,
        media.building,
        "Media",
      );
    }
    return this.withPublicUrl(media);
  }

  async findByBuilding(buildingId: string, geographicScope?: GeographicScope) {
    if (geographicScope) {
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { id: true, stateId: true, cityId: true, localityId: true },
      });
      if (building) {
        await verifyEntityGeography(
          this.prisma,
          geographicScope,
          building,
          "Media (building filter)",
        );
      }
    }
    const media = await this.prisma.media.findMany({
      where: { buildingId, deletedAt: null },
      orderBy: { uploadedAt: "desc" },
    });
    return media.map((item) => this.withPublicUrl(item));
  }

  async findByFloor(floorId: string, geographicScope?: GeographicScope) {
    if (geographicScope) {
      const floor = await this.prisma.floor.findUnique({
        where: { id: floorId },
        select: { id: true, buildingId: true },
      });
      if (floor) {
        const building = await this.prisma.building.findUnique({
          where: { id: floor.buildingId },
          select: { id: true, stateId: true, cityId: true, localityId: true },
        });
        if (building) {
          await verifyEntityGeography(
            this.prisma,
            geographicScope,
            building,
            "Media (floor filter)",
          );
        }
      }
    }
    const media = await this.prisma.media.findMany({
      where: { floorId, deletedAt: null },
      orderBy: { uploadedAt: "desc" },
    });
    return media.map((item) => this.withPublicUrl(item));
  }

  async findByUnit(unitId: string, geographicScope?: GeographicScope) {
    if (geographicScope) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: unitId },
        select: { id: true, buildingId: true },
      });
      if (unit) {
        const building = await this.prisma.building.findUnique({
          where: { id: unit.buildingId },
          select: { id: true, stateId: true, cityId: true, localityId: true },
        });
        if (building) {
          await verifyEntityGeography(
            this.prisma,
            geographicScope,
            building,
            "Media (unit filter)",
          );
        }
      }
    }
    const media = await this.prisma.media.findMany({
      where: { unitId, deletedAt: null },
      orderBy: { uploadedAt: "desc" },
    });
    return media.map((item) => this.withPublicUrl(item));
  }

  private withPublicUrl<T extends { storageKey: string }>(media: T) {
    return {
      ...media,
      publicUrl: this.buildPublicUrl(media.storageKey),
    };
  }

  private buildPublicUrl(storageKey: string) {
    const baseUrl = this.publicUrl.replace(/\/$/, "");
    if (!baseUrl) return storageKey;

    const hostname = new URL(baseUrl).hostname;
    if (hostname.endsWith(".r2.dev")) return `${baseUrl}/${storageKey}`;

    const bucketPath = `/${this.bucket}`;
    return baseUrl.endsWith(bucketPath)
      ? `${baseUrl}/${storageKey}`
      : `${baseUrl}${bucketPath}/${storageKey}`;
  }

  async updateMetadata(
    id: string,
    data: { documentCategoryId?: string; notes?: string },
  ) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException("Media not found");

    return this.prisma.media.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prisma.media.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    return this.prisma.media.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async scheduleDeletion(id: string, deleteAfterDays: number = 30) {
    const deleteAt = new Date();
    deleteAt.setDate(deleteAt.getDate() + deleteAfterDays);

    return this.prisma.media.update({
      where: { id },
      data: { deletionScheduledAt: deleteAt },
    });
  }
}
