import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { FileType, UploadStatus } from "@prisma/client";

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

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

  async findAll(query?: { page?: number; limit?: number; fileType?: string }) {
    const { page = 1, limit = 20, fileType } = query || {};
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
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
      data,
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
      presignedUrl,
      storageKey,
      publicUrl: `${this.publicUrl}/${storageKey}`,
    };
  }

  async completeUpload(id: string, fileSizeBytes?: number) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException("Media not found");

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

  async findOne(id: string) {
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
    return media;
  }

  async findByBuilding(buildingId: string) {
    return this.prisma.media.findMany({
      where: { buildingId, deletedAt: null },
      orderBy: { uploadedAt: "desc" },
    });
  }

  async findByFloor(floorId: string) {
    return this.prisma.media.findMany({
      where: { floorId, deletedAt: null },
      orderBy: { uploadedAt: "desc" },
    });
  }

  async findByUnit(unitId: string) {
    return this.prisma.media.findMany({
      where: { unitId, deletedAt: null },
      orderBy: { uploadedAt: "desc" },
    });
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
