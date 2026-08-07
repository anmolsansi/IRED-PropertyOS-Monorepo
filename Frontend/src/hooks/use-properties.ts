"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError, api, buildFilterQuery } from "@/lib/api/client";
import type { Property, PaginatedResponse, FilterParams } from "@/types";

export type IntakeStatus = "NEW" | "IN_PROGRESS" | "FOLLOW_UP" | "COMPLETED";

interface BackendContact {
  id: string;
  fullName: string;
  mobileNumber?: string | null;
  alternateMobileNumber?: string | null;
  whatsappNumber?: string | null;
  email?: string | null;
  contactRole?: { name: string } | null;
  notes?: string | null;
  createdAt: string;
}

interface BackendBuilding {
  id: string;
  buildingCode: string;
  name: string;
  propertyTypeId?: string;
  propertyType?: { id: string; name: string; code: string };
  stateId?: string;
  state?: { id: string; name: string; code: string };
  cityId?: string;
  city?: { id: string; name: string };
  cityName?: string;
  localityId?: string;
  locality?: { id: string; name: string };
  localityName?: string;
  pincode?: string;
  fullAddress?: string;
  landmark?: string;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  totalFloors?: number;
  totalUnits?: number;
  totalBuildingArea?: number;
  availabilityStatusId?: string;
  availabilityStatus?: { id: string; name: string };
  verificationStatusId?: string;
  verificationStatus?: { id: string; name: string };
  parkingDetails?: Record<string, unknown>;
  liftDetails?: Record<string, unknown>;
  commercialTerms?: Record<string, unknown>;
  additionalFields?: Record<string, unknown> | unknown[];
  landlordName?: string;
  telecallerStatus?: string;
  starRating?: number;
  facingOption?: string;
  unitAccessLocation?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  floors?: unknown[];
  units?: unknown[];
  contacts?: BackendContact[];
  source?: { id: string; name: string };
  creator?: { id: string; fullName: string };
  updater?: { id: string; fullName: string };
  _count?: { contacts?: number; media?: number };
}

export interface PropertyIntakeItem extends Property {
  intakeStatus: IntakeStatus;
  submittedByName: string;
  submittedAt: string;
  lastUpdatedByName: string;
  contactCount: number;
  mediaCount: number;
  contacts: import("@/types").Contact[];
}

export interface PropertyIntakeSummary {
  total: number;
  new: number;
  inProgress: number;
  followUp: number;
}

export interface PropertyIntakeResponse {
  data: PropertyIntakeItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: PropertyIntakeSummary;
}

function adaptBackendContact(contact: BackendContact): import("@/types").Contact {
  return {
    id: contact.id,
    entityId: contact.id,
    entityType: "building",
    contactType: (contact.contactRole?.name?.toLowerCase() || "owner") as import("@/types").Contact["contactType"],
    name: contact.fullName,
    phone: contact.mobileNumber || "",
    email: contact.email || undefined,
    designation: contact.contactRole?.name || undefined,
    isPrimary: false,
    createdAt: contact.createdAt,
  };
}

function adaptBuildingToProperty(building: BackendBuilding): Property & { contacts: import("@/types").Contact[] } {
  return {
    id: building.id,
    propertyId: building.buildingCode || building.id,
    entryType: "building",
    buildingName: building.name,
    address: [building.fullAddress, building.landmark].filter(Boolean).join(", ") || "",
    state: building.state?.name || "",
    city: building.city?.name || building.cityName || "",
    locality: building.locality?.name || building.localityName || "",
    pincode: building.pincode || "",
    latitude: building.latitude,
    longitude: building.longitude,
    mapsUrl: building.googleMapsUrl,
    propertyType: (building.propertyType?.code || building.propertyType?.name?.toLowerCase().replace(/\s+/g, "_") || "mixed_use") as Property["propertyType"],
    furnishingStatus: ((building.commercialTerms?.furnishingStatusId as string)?.toLowerCase().replace(/\s+/g, "_") || "unfurnished") as Property["furnishingStatus"],
    availabilityStatus: (building.availabilityStatus?.name?.toLowerCase().replace(/\s+/g, "_") as Property["availabilityStatus"]) || "available",
    verificationStatus: (building.verificationStatus?.name?.toLowerCase().replace(/\s+/g, "_") as Property["verificationStatus"]) || "pending_verification",
    availableArea: (building.commercialTerms?.availableArea as number) || 0,
    totalArea: building.totalBuildingArea || 0,
    rentPerSqFt: (building.commercialTerms?.rentPerSqFt as number) || 0,
    camCharges: (building.commercialTerms?.camCharges as number) || 0,
    maintenanceCharges: (building.commercialTerms?.maintenanceCharges as number) || 0,
    securityDeposit: (building.commercialTerms?.securityDeposit as number) || 0,
    leaseTerms: (building.commercialTerms?.leaseTerms as string) || "",
    escalationDetails: (building.commercialTerms?.escalationDetails as string) || "",
    brokerage: (building.commercialTerms?.brokerage as string) || "",
    availabilityDate: (building.commercialTerms?.availabilityDate as string) || "",
    possessionDate: (building.commercialTerms?.possessionDate as string) || "",
    landlordName: building.landlordName || "",
    telecallerStatus: building.telecallerStatus || "",
    starRating: building.starRating || 0,
    facingOption: building.facingOption || "",
    unitAccessLocation: building.unitAccessLocation || "",
    additionalFields: building.additionalFields || [],
    assignedWorkerId: building.createdBy || "",
    assignedWorkerName: building.creator?.fullName || "",
    lastAssignedWorkerName: building.updater?.fullName || "",
    createdByName: building.creator?.fullName || "",
    source: (building.source?.name?.toLowerCase().replace(/\s+/g, "_") as Property["source"]) || "field",
    notes: building.notes,
    createdAt: building.createdAt,
    updatedAt: building.updatedAt,
    createdBy: building.createdBy || "",
    contacts: (building.contacts || []).map(adaptBackendContact),
  };
}

function getIntakeMetadata(building: BackendBuilding) {
  const fields = building.additionalFields;
  if (fields && !Array.isArray(fields) && typeof fields === "object") {
    return fields;
  }
  return {} as Record<string, unknown>;
}

function adaptBuildingToIntake(building: BackendBuilding): PropertyIntakeItem {
  const property = adaptBuildingToProperty(building);
  const metadata = getIntakeMetadata(building);
  const status = (metadata.intakeStatus as IntakeStatus | undefined) ||
    (building.telecallerStatus === "VERIFIED" ? "COMPLETED" : "NEW");

  return {
    ...property,
    intakeStatus: status,
    submittedByName: building.creator?.fullName || "Unknown rider",
    submittedAt: (metadata.intakeSubmittedAt as string | undefined) || building.createdAt,
    lastUpdatedByName: building.updater?.fullName || building.creator?.fullName || "—",
    contactCount: building._count?.contacts ?? building.contacts?.length ?? 0,
    mediaCount: building._count?.media ?? 0,
    contacts: property.contacts,
  };
}

export function useProperties(filters: FilterParams = {}) {
  const queryParams = buildFilterQuery(filters);

  return useQuery({
    queryKey: ["properties", filters],
    queryFn: async (): Promise<PaginatedResponse<Property>> => {
      let response: PaginatedResponse<BackendBuilding>;
      try {
        response = await api.getPaginated<BackendBuilding>("/buildings", queryParams);
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          return {
            data: [],
            total: 0,
            page: Number(filters.page) || 1,
            pageSize: Number(filters.pageSize) || 10,
            totalPages: 0,
          };
        }
        throw error;
      }
      return {
        ...response,
        data: response.data.map(adaptBuildingToProperty),
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function usePropertyIntake(filters: {
  status?: Exclude<IntakeStatus, "COMPLETED">;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: ["property-intake", filters],
    queryFn: async (): Promise<PropertyIntakeResponse> => {
      const params: Record<string, string> = {
        page: String(filters.page || 1),
        limit: String(filters.limit || 20),
      };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      type BackendIntakeResponse = {
        data: BackendBuilding[];
        meta: { total: number; page: number; limit: number; totalPages: number };
        summary: PropertyIntakeSummary;
      };

      const raw = await api.get<BackendIntakeResponse | { data: BackendIntakeResponse }>("/buildings/intake", params);
      const response = "meta" in raw ? raw : raw.data;

      return {
        data: (response.data || []).map(adaptBuildingToIntake),
        total: response.meta?.total || 0,
        page: response.meta?.page || 1,
        pageSize: response.meta?.limit || 20,
        totalPages: response.meta?.totalPages || 0,
        summary: response.summary || { total: 0, new: 0, inProgress: 0, followUp: 0 },
      };
    },
    staleTime: 30 * 1000,
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ["properties", id],
    queryFn: async () => {
      const response = await api.get<{ data: BackendBuilding }>(`/buildings/${id}`);
      const building = (response.data ?? response) as unknown as BackendBuilding;
      return adaptBuildingToProperty(building);
    },
    enabled: !!id,
  });
}

export function useCreateProperty() {
  return {
    mutateAsync: async (data: Record<string, unknown>) => {
      return api.post<{ data: BackendBuilding }>("/buildings", data);
    },
  };
}

export function useUpdateProperty() {
  return {
    mutateAsync: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return api.patch<{ data: BackendBuilding }>(`/buildings/${id}`, data);
    },
  };
}

export function useUpdateIntakeStatus() {
  return {
    mutateAsync: async ({ id, status }: { id: string; status: Exclude<IntakeStatus, "COMPLETED"> }) => {
      return api.patch<{ data: BackendBuilding }>(`/buildings/${id}/intake-status`, { status });
    },
  };
}

export function useCompletePropertyIntake() {
  return {
    mutateAsync: async (id: string) => {
      return api.post<{ data: BackendBuilding }>(`/buildings/${id}/complete-intake`);
    },
  };
}

export function useDeleteProperty() {
  return {
    mutateAsync: async (id: string) => {
      return api.delete(`/buildings/${id}`);
    },
  };
}

export function useFloors(buildingId?: string) {
  return useQuery({
    queryKey: ["floors", buildingId],
    queryFn: async () => {
      const endpoint = buildingId ? `/buildings/${buildingId}/floors` : "/buildings";
      if (!buildingId) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
      return api.getPaginated<{ id: string; floorCode: string; floorName: string; floorNumber: number; totalArea?: number; availableArea?: number; buildingId: string }>(endpoint);
    },
    enabled: !!buildingId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUnits(filters: FilterParams = {}) {
  return useQuery({
    queryKey: ["units", filters],
    queryFn: async () => {
      const params = buildFilterQuery(filters);
      return api.getPaginated<{ id: string; unitCode: string; unitNumber: string; buildingId: string; floorId?: string; carpetArea?: number; builtUpArea?: number; monthlyRent?: number; availabilityStatusId?: string }>("/units", params);
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateFloor() {
  return {
    mutateAsync: async ({ buildingId, data }: { buildingId: string; data: Record<string, unknown> }) => {
      return api.post(`/buildings/${buildingId}/floors`, data);
    },
  };
}

export function useCreateUnit() {
  return {
    mutateAsync: async (data: Record<string, unknown>) => {
      return api.post("/units", data);
    },
  };
}

export function useUpdateUnit() {
  return {
    mutateAsync: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      return api.patch(`/units/${id}`, data);
    },
  };
}

export function useDeleteUnit() {
  return {
    mutateAsync: async (id: string) => {
      return api.delete(`/units/${id}`);
    },
  };
}

export interface BuildingFloor {
  id: string;
  floorCode: string;
  floorName: string;
  floorNumber: number;
  totalArea?: number;
  availableArea?: number;
  units?: BuildingUnit[];
}

export interface BuildingUnit {
  id: string;
  unitCode: string;
  unitNumber: string;
  carpetArea?: number;
  builtUpArea?: number;
  monthlyRent?: number;
  availabilityStatus?: { name: string };
}

export function useBuildingFloors(buildingId?: string) {
  return useQuery({
    queryKey: ["buildingFloors", buildingId],
    queryFn: async (): Promise<BuildingFloor[]> => {
      if (!buildingId) return [];
      const response = await api.get<{ data: BuildingFloor[] }>(`/buildings/${buildingId}/floors`);
      const raw = response.data ?? response;
      return Array.isArray(raw) ? (raw as BuildingFloor[]) : [];
    },
    enabled: !!buildingId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useDeleteFloor() {
  return {
    mutateAsync: async ({ buildingId, floorId }: { buildingId: string; floorId: string }) => {
      return api.delete(`/buildings/${buildingId}/floors/${floorId}`);
    },
  };
}
