export type ProposalExportField = {
  key: string;
  label: string;
  group: string;
  restricted: boolean;
};

export const PROPOSAL_EXPORT_FIELDS: ProposalExportField[] = [
  // Basic Property Fields
  { key: "buildingName", label: "Building Name", group: "Basic", restricted: false },
  { key: "buildingCode", label: "Building Code", group: "Basic", restricted: false },
  { key: "propertyType", label: "Property Type", group: "Basic", restricted: false },
  { key: "entityType", label: "Entity Type", group: "Basic", restricted: false },
  { key: "source", label: "Source", group: "Basic", restricted: false },
  { key: "starRating", label: "Star Rating", group: "Basic", restricted: false },
  { key: "verificationStatus", label: "Verification Status", group: "Basic", restricted: false },

  // Location Fields
  { key: "address", label: "Address", group: "Location", restricted: false },
  { key: "state", label: "State", group: "Location", restricted: false },
  { key: "city", label: "City", group: "Location", restricted: false },
  { key: "locality", label: "Locality", group: "Location", restricted: false },
  { key: "pincode", label: "Pincode", group: "Location", restricted: false },
  { key: "latitude", label: "Latitude", group: "Location", restricted: false },
  { key: "longitude", label: "Longitude", group: "Location", restricted: false },
  { key: "googleMapsUrl", label: "Google Maps Link", group: "Location", restricted: false },

  // Area Fields
  { key: "carpetArea", label: "Carpet Area", group: "Area", restricted: false },
  { key: "builtUpArea", label: "Built-up Area", group: "Area", restricted: false },
  { key: "chargeableArea", label: "Chargeable Area", group: "Area", restricted: false },
  { key: "superBuiltUpArea", label: "Super Built-up Area", group: "Area", restricted: false },
  { key: "availableArea", label: "Available Area", group: "Area", restricted: false },
  { key: "totalArea", label: "Total Area", group: "Area", restricted: false },

  // Commercial Fields
  { key: "rentPerSqFt", label: "Rent per Sq Ft", group: "Commercial", restricted: false },
  { key: "monthlyRent", label: "Monthly Rent", group: "Commercial", restricted: false },
  { key: "maintenanceCharges", label: "Maintenance Charges", group: "Commercial", restricted: false },
  { key: "securityDeposit", label: "Security Deposit", group: "Commercial", restricted: false },
  { key: "lockInPeriod", label: "Lock-in Period", group: "Commercial", restricted: false },
  { key: "leaseTenure", label: "Lease Tenure", group: "Commercial", restricted: false },
  { key: "otherCharges", label: "Other Charges", group: "Commercial", restricted: false },
  { key: "escalation", label: "Escalation", group: "Commercial", restricted: false },
  { key: "brokerage", label: "Brokerage", group: "Commercial", restricted: false },

  // Floor and Unit Fields
  { key: "floorNumber", label: "Floor Number", group: "Floor & Unit", restricted: false },
  { key: "unitNumber", label: "Unit Number", group: "Floor & Unit", restricted: false },
  { key: "unitName", label: "Unit Name", group: "Floor & Unit", restricted: false },
  { key: "unitStatus", label: "Unit Status", group: "Floor & Unit", restricted: false },
  { key: "unitArea", label: "Unit Area", group: "Floor & Unit", restricted: false },

  // Availability Fields
  { key: "availabilityStatus", label: "Availability Status", group: "Availability", restricted: false },
  { key: "availableFromDate", label: "Available From Date", group: "Availability", restricted: false },
  { key: "occupancyStatus", label: "Occupancy Status", group: "Availability", restricted: false },

  // Furnishing Fields
  { key: "furnishingStatus", label: "Furnishing Status", group: "Furnishing", restricted: false },
  { key: "furnishingDetails", label: "Furnishing Details", group: "Furnishing", restricted: false },

  // Contact Fields
  { key: "contactName", label: "Contact Name", group: "Contact", restricted: false },
  { key: "contactRole", label: "Contact Role", group: "Contact", restricted: false },
  { key: "contactPhone", label: "Contact Phone", group: "Contact", restricted: false },
  { key: "contactEmail", label: "Contact Email", group: "Contact", restricted: false },
  { key: "landlordName", label: "Landlord Name", group: "Contact", restricted: false },

  // Notes
  { key: "publicNotes", label: "Public Notes", group: "Notes", restricted: false },
  { key: "proposalItemNote", label: "Proposal Item Note", group: "Notes", restricted: false },

  // Restricted Fields
  { key: "ownerPhone", label: "Owner Phone", group: "Contact", restricted: true },
  { key: "ownerEmail", label: "Owner Email", group: "Contact", restricted: true },
  { key: "internalNotes", label: "Internal Notes", group: "Notes", restricted: true },
  { key: "brokerageDetails", label: "Brokerage Details", group: "Commercial", restricted: true },
  { key: "commissionDetails", label: "Commission Details", group: "Commercial", restricted: true },
  { key: "adminRemarks", label: "Admin Remarks", group: "Audit", restricted: true },
  { key: "auditData", label: "Audit Data", group: "Audit", restricted: true },
  { key: "createdBy", label: "Created By", group: "Audit", restricted: true },
  { key: "updatedBy", label: "Updated By", group: "Audit", restricted: true },
  { key: "changeRequestHistory", label: "Change Request History", group: "Audit", restricted: true },
];

export const DEFAULT_SELECTED_FIELDS = PROPOSAL_EXPORT_FIELDS.filter(f => !f.restricted).map(f => f.key);
