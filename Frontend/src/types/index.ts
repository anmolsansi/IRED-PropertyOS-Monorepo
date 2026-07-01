// ============================================================
// Core Types for IRED PropertyOS
// ============================================================

// --- Auth & Users ---

export type UserRole = "ADMIN" | "WORKER" | "RIDER";

export interface User {
  id: string;
  email: string;
  fullName: string;
  mobileNumber?: string;
  role: UserRole;
  status: "active" | "inactive" | "suspended";
  geographicAssignments?: GeographicAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface GeographicAssignment {
  assignmentType: "state" | "city" | "locality";
  state?: { id: string; name: string; code: string };
  city?: { id: string; name: string };
  locality?: { id: string; name: string };
}

// --- Property Enums ---

export type PropertyType =
  | "commercial_office"
  | "commercial_retail"
  | "it_park"
  | "co_working"
  | "warehouse"
  | "industrial"
  | "mixed_use";

export type FurnishingStatus =
  | "unfurnished"
  | "bare_shell"
  | "semi_furnished"
  | "fully_furnished";

export type AvailabilityStatus =
  | "available"
  | "occupied"
  | "under_negotiation"
  | "on_hold"
  | "under_construction"
  | "planned";

export type VerificationStatus =
  | "verified"
  | "pending_verification"
  | "needs_review"
  | "rejected";

export type EntryType = "building" | "floor" | "unit";

// --- Core Entities ---

export interface Property {
  id: string;
  propertyId: string;
  entryType: EntryType;
  buildingName: string;
  address: string;
  state: string;
  city: string;
  locality: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  mapsUrl?: string;
  propertyType: PropertyType;
  furnishingStatus: FurnishingStatus;
  availabilityStatus: AvailabilityStatus;
  verificationStatus: VerificationStatus;
  availableArea: number;
  totalArea: number;
  rentPerSqFt: number;
  camCharges: number;
  maintenanceCharges: number;
  securityDeposit: number;
  leaseTerms?: string;
  escalationDetails?: string;
  availabilityDate?: string;
  possessionDate?: string;
  brokerage?: string;
  landlordName?: string;
  telecallerStatus?: string;
  starRating?: number;
  facingOption?: string;
  unitAccessLocation?: string;
  additionalFields?: any;
  assignedWorkerId: string;
  assignedWorker?: User;
  source?: string;
  notes?: string;
  duplicateWarning?: boolean;
  duplicateOfId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Building extends Property {
  entryType: "building";
  floors: Floor[];
  units: Unit[];
  contacts: Contact[];
  media: MediaDocument[];
  documents: MediaDocument[];
}

export interface Floor extends Property {
  entryType: "floor";
  buildingId: string;
  building?: Building;
  floorNumber: number;
  floorName: string;
  units: Unit[];
  contacts: Contact[];
}

export interface Unit extends Property {
  entryType: "unit";
  buildingId: string;
  building?: Building;
  floorId: string;
  floor?: Floor;
  unitNumber: string;
  contacts: Contact[];
}

export interface Contact {
  id: string;
  entityId: string;
  entityType: "building" | "floor" | "unit" | "property";
  contactType: "owner" | "caretaker" | "security" | "guest" | "broker" | "tenant" | "alternate";
  name: string;
  phone: string;
  email?: string;
  designation?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface MediaDocument {
  id: string;
  entityId: string;
  entityType: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  category: "photo" | "video" | "document" | "floor_plan" | "other";
  caption?: string;
  uploadedBy: string;
  uploader?: User;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}

// --- Change Requests & Approvals ---

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "deferred"
  | "conflict";

export type ApprovalPriority = "high" | "medium" | "low";

export interface ChangeRequest {
  id: string;
  requestId: string;
  entityType: "building" | "floor" | "unit" | "contact" | "media";
  entityId: string;
  entityName: string;
  city: string;
  state: string;
  locality: string;
  workerId: string;
  worker?: User;
  fieldChanges: FieldChange[];
  status: ApprovalStatus;
  priority: ApprovalPriority;
  adminComment?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldChange {
  id: string;
  fieldName: string;
  fieldLabel: string;
  masterValue: string;
  workerValue: string;
  status: "pending" | "approved" | "rejected" | "deferred" | "unchanged" | "conflict";
  adminComment?: string;
  changedBy: string;
  changedAt: string;
}

// --- V2 Types ---

export interface Client {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  assignedWorkerId: string;
  assignedWorker?: User;
  requirements: Requirement[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Requirement {
  id: string;
  clientId: string;
  client?: Client;
  requirementType: "lease" | "buy" | "sell";
  preferredState: string;
  preferredCity: string;
  preferredLocality?: string;
  propertyType: PropertyType;
  minArea: number;
  maxArea: number;
  minBudget: number;
  maxBudget: number;
  furnishingPreference: FurnishingStatus;
  moveInDate?: string;
  parkingRequired: boolean;
  specialNotes?: string;
  assignedWorkerId: string;
  status: "active" | "fulfilled" | "closed" | "expired";
  shortlistedProperties: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  title: string;
  clientId: string;
  client?: Client;
  buildingId?: string;
  building?: Building;
  unitId?: string;
  dealValue?: number;
  status: DealStage;
  assignedTo?: string;
  commissions?: Commission[];
  invoices?: Invoice[];
  createdAt: string;
  updatedAt: string;
}

export interface Commission {
  id: string;
  amount: number;
  rate?: number;
  status: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  amount: number;
  status: string;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
}

export type DealStage =
  | "requirement_received"
  | "shortlisted"
  | "site_visit_scheduled"
  | "site_visit_completed"
  | "negotiation"
  | "agreement_shared"
  | "closed"
  | "lost";

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: "general" | "follow_up" | "site_visit" | "other";
  dueDate: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "open" | "in_progress" | "completed" | "cancelled";
  assignedToId: string;
  assignedTo?: User;
  clientId?: string;
  client?: Client;
  buildingId?: string;
  property?: Property;
  createdAt: string;
  updatedAt: string;
}

export interface SiteVisit {
  id: string;
  clientId: string;
  client?: Client;
  buildingId?: string;
  building?: Building;
  unitId?: string;
  scheduledAt: string;
  assignedToId: string;
  assignedTo?: User;
  notes?: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  createdAt: string;
  updatedAt: string;
}

// --- API Response Types ---

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FilterParams {
  search?: string;
  state?: string;
  city?: string;
  locality?: string;
  propertyType?: PropertyType;
  furnishingStatus?: FurnishingStatus;
  availabilityStatus?: AvailabilityStatus;
  verificationStatus?: VerificationStatus;
  assignedWorkerId?: string;
  priority?: string;
  minArea?: number;
  maxArea?: number;
  minRent?: number;
  maxRent?: number;
  hasDuplicate?: boolean;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface ImportResult {
  totalRows: number;
  newRecords: number;
  updatedRecords: number;
  invalidRecords: number;
  skippedRecords: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  user?: User;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  changedFields?: string[];
  previousValues?: Record<string, string>;
  newValues?: Record<string, string>;
  changeRequestId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
