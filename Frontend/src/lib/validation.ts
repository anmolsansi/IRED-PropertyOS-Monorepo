import { z } from "zod";

export const propertySchema = z.object({
  entryType: z.enum(["building", "floor", "unit"]),
  buildingName: z.string().min(1, "Building name is required").max(200),
  propertyType: z.string().min(1, "Property type is required"),
  source: z.string().optional(),
  address: z.string().min(5, "Address must be at least 5 characters").max(500),
  state: z.string().min(1, "State is required"),
  city: z.string().min(1, "City is required"),
  locality: z.string().min(1, "Locality is required"),
  pincode: z
    .string()
    .min(6, "Pincode must be 6 digits")
    .max(6)
    .regex(/^\d{6}$/, "Pincode must be 6 digits"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  mapsUrl: z.string().url("Invalid URL").or(z.literal("")).optional(),
  totalArea: z.coerce.number().min(1, "Total area is required"),
  availableArea: z.coerce.number().min(0, "Available area must be positive"),
  rentPerSqFt: z.coerce.number().min(0, "Rent must be positive"),
  camCharges: z.coerce.number().min(0).optional(),
  maintenanceCharges: z.coerce.number().min(0).optional(),
  securityDeposit: z.coerce.number().min(0).optional(),
  leaseTerms: z.string().optional(),
  escalationDetails: z.string().optional(),
  brokerage: z.string().optional(),
  availabilityStatus: z.string().min(1, "Availability status is required"),
  furnishingStatus: z.string().min(1, "Furnishing status is required"),
  availabilityDate: z.string().optional(),
  possessionDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
}).refine(
  (data) => {
    if (data.availableArea && data.totalArea) {
      return data.availableArea <= data.totalArea;
    }
    return true;
  },
  { message: "Available area cannot exceed total area", path: ["availableArea"] }
);

export type PropertyFormData = z.infer<typeof propertySchema>;

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  company: z.string().max(200).optional(),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .regex(/^[\d\s+()-]+$/, "Invalid phone number"),
  notes: z.string().max(2000).optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;

export const requirementSchema = z.object({
  requirementType: z.enum(["lease", "buy", "sell"]),
  preferredState: z.string().min(1, "State is required"),
  preferredCity: z.string().min(1, "City is required"),
  preferredLocality: z.string().optional(),
  propertyType: z.string().min(1, "Property type is required"),
  minArea: z.coerce.number().min(1, "Minimum area is required"),
  maxArea: z.coerce.number().min(1, "Maximum area is required"),
  minBudget: z.coerce.number().min(0, "Budget must be positive"),
  maxBudget: z.coerce.number().min(0, "Budget must be positive"),
  furnishingPreference: z.string().optional(),
  moveInDate: z.string().optional(),
  parkingRequired: z.boolean().optional(),
  specialNotes: z.string().max(2000).optional(),
}).refine(
  (data) => data.maxArea >= data.minArea,
  { message: "Maximum area must be greater than or equal to minimum area", path: ["maxArea"] }
).refine(
  (data) => data.maxBudget >= data.minBudget,
  { message: "Maximum budget must be greater than or equal to minimum budget", path: ["maxBudget"] }
);

export type RequirementFormData = z.infer<typeof requirementSchema>;

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().min(1, "Due date is required"),
  priority: z.enum(["high", "medium", "low"]),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
});

export type TaskFormData = z.infer<typeof taskSchema>;

export const siteVisitSchema = z.object({
  scheduledDate: z.string().min(1, "Date is required"),
  scheduledTime: z.string().min(1, "Time is required"),
  location: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["scheduled", "confirmed", "completed", "rescheduled", "cancelled"]).optional(),
});

export type SiteVisitFormData = z.infer<typeof siteVisitSchema>;

export const followUpSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(["call", "email", "meeting", "site_visit", "other"]),
  dueDate: z.string().min(1, "Due date is required"),
  clientId: z.string().min(1, "Client is required"),
});

export type FollowUpFormData = z.infer<typeof followUpSchema>;

export const proposalSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  dealId: z.string().max(200).optional(),
  clientId: z.string().min(1, "Client is required"),
  unitIds: z.array(z.string()).min(1, "At least one unit is required"),
  rentValue: z.coerce.number().min(0).optional(),
  camCharges: z.coerce.number().min(0).optional(),
  securityDeposit: z.coerce.number().min(0).optional(),
  leaseTerms: z.string().max(500).optional(),
  validUntil: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export type ProposalFormData = z.infer<typeof proposalSchema>;

export const dealSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  requirementId: z.string().min(1, "Requirement is required"),
  propertyId: z.string().min(1, "Property is required"),
  stage: z.enum([
    "requirement_received",
    "shortlisted",
    "site_visit_scheduled",
    "site_visit_completed",
    "negotiation",
    "agreement_shared",
    "closed",
    "lost",
  ]),
  expectedCloseDate: z.string().optional(),
  rentValue: z.coerce.number().min(0).optional(),
  priority: z.enum(["high", "medium", "low"]),
  notes: z.string().max(2000).optional(),
});

export type DealFormData = z.infer<typeof dealSchema>;

export const contactSchema = z.object({
  contactType: z.enum(["owner", "caretaker", "security", "broker", "tenant", "alternate"]),
  name: z.string().min(1, "Name is required").max(100),
  phone: z
    .string()
    .min(10, "Phone must be at least 10 digits")
    .regex(/^[\d\s+()-]+$/, "Invalid phone number"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  designation: z.string().max(100).optional(),
  isPrimary: z.boolean().optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
