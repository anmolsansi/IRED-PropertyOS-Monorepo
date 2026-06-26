"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildFilterQuery } from "@/lib/api/client";
import type { MediaDocument, PaginatedResponse, FilterParams } from "@/types";

export interface MediaItem {
  id: string;
  entityId?: string;
  entityType?: string;
  buildingId?: string;
  floorId?: string;
  unitId?: string;
  fileName: string;
  storageKey?: string;
  fileType: "image" | "video" | "document";
  mimeType: string;
  fileSizeBytes?: number;
  fileSize?: number;
  uploadStatus?: string;
  fileUrl?: string;
  category?: MediaDocument["category"];
  caption?: string;
  createdAt: string;
}

interface BackendMedia {
  id: string;
  buildingId?: string;
  floorId?: string;
  unitId?: string;
  fileName: string;
  originalFileName: string;
  fileType: "image" | "video" | "document";
  mimeType: string;
  fileSizeBytes: number;
  storageKey: string;
  publicUrl?: string;
  uploadStatus: string;
  uploadedBy?: string;
  createdAt: string;
}

const MEDIA_BASE_URL =
  process.env.NEXT_PUBLIC_MEDIA_URL || "http://localhost:9000/propertyos-media";

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isRootRelativeUrl(value: string) {
  return value.startsWith("/");
}

function buildMediaUrl(media: BackendMedia) {
  const candidate = media.publicUrl || media.storageKey;
  if (!candidate) return "";
  if (isAbsoluteUrl(candidate) || isRootRelativeUrl(candidate)) {
    return candidate;
  }

  const baseUrl = MEDIA_BASE_URL.replace(/\/$/, "");
  const bucketName = baseUrl.split("/").filter(Boolean).at(-1);
  const storageKey =
    bucketName && candidate.startsWith(`${bucketName}/`)
      ? candidate.slice(bucketName.length + 1)
      : candidate;

  return `${baseUrl}/${storageKey
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function adaptBackendMedia(media: BackendMedia): MediaDocument {
  const categoryMap: Record<string, MediaDocument["category"]> = {
    image: "photo",
    video: "video",
    document: "document",
  };

  return {
    id: media.id,
    entityId: media.buildingId || "",
    entityType: "building",
    fileName: media.originalFileName,
    fileUrl: buildMediaUrl(media),
    fileSize: Number(media.fileSizeBytes),
    mimeType: media.mimeType,
    category: categoryMap[media.fileType] || "other",
    caption: undefined,
    uploadedBy: media.uploadedBy || "",
    uploader: undefined,
    isDeleted: false,
    deletedAt: undefined,
    createdAt: media.createdAt,
  };
}

export function useMedia(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ["media", filters],
    queryFn: async (): Promise<PaginatedResponse<MediaItem>> => {
      return api.getPaginated<MediaItem>("/media", buildFilterQuery(filters));
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useMediaByBuilding(buildingId?: string) {
  return useQuery({
    queryKey: ["media", "building", buildingId],
    queryFn: async (): Promise<MediaDocument[]> => {
      if (!buildingId) return [];
      const response = await api.get<{ data: BackendMedia[] }>(`/media?buildingId=${buildingId}`);
      const raw = response.data ?? response;
      return Array.isArray(raw) ? raw.map(adaptBackendMedia) : [];
    },
    enabled: !!buildingId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUploadMedia() {
  return {
    mutateAsync: async (data: {
      fileName: string;
      mimeType: string;
      fileType: string;
      buildingId?: string;
      floorId?: string;
      unitId?: string;
      entityType?: string;
      entityId?: string;
      fileSizeBytes?: number;
    }) => {
      return api.post<{
        data: {
          uploadUrl: string;
          presignedUrl?: string;
          mediaId: string;
          publicUrl?: string;
          storageKey?: string;
        };
      }>("/media/upload-url", data);
    },
  };
}

export function useGetUploadUrl() {
  return useMutation({
    mutationFn: async (data: {
      fileName: string;
      fileType: string;
      fileSizeBytes: number;
      entityType: "building" | "floor" | "unit";
      entityId: string;
    }) => {
      return api.post<{
        data: { uploadUrl: string; presignedUrl?: string; mediaId: string };
      }>("/media/upload-url", data);
    },
  });
}

export function useCompleteUpload() {
  const queryClient = useQueryClient();
  return {
    mutateAsync: async (data: {
      uploadId?: string;
      mediaId?: string;
      storageUrl?: string;
      mimeType?: string;
      fileType?: string;
      fileSizeBytes?: number;
      documentCategoryId?: string;
    }) => {
      const payload: Record<string, unknown> = {};
      if (data.uploadId) payload.mediaId = data.uploadId;
      if (data.mediaId) payload.mediaId = data.mediaId;
      if (data.storageUrl) payload.storageUrl = data.storageUrl;
      if (data.mimeType) payload.mimeType = data.mimeType;
      if (data.fileType) payload.fileType = data.fileType;
      if (data.fileSizeBytes) payload.fileSizeBytes = data.fileSizeBytes;
      if (data.documentCategoryId) payload.documentCategoryId = data.documentCategoryId;
      return api.post("/media/complete-upload", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({ queryKey: ["mediaDocuments"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  };
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/media/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({ queryKey: ["mediaDocuments"] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useDownloadMedia() {
  return {
    mutateAsync: async (id: string): Promise<string> => {
      const response = await api.get<{ data: { downloadUrl?: string; url?: string } }>(`/media/${id}/download-url`);
      const data = response.data ?? response;
      return (data as { downloadUrl?: string; url?: string }).downloadUrl || (data as { url?: string }).url || "";
    },
  };
}
