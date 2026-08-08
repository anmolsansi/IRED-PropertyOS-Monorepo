export interface PropertyProfileFields {
  postedOn: string;
  buildingType: string;
  verifiedNo: string;
  buildingUsage: string;
  buildingStructure: string;
  ageOfConstruction: string;
  sanctionedMap: string;
  floorSize: string;
  fireNoc: string;
  ocCc: string;
  availableFloor: string;
  premisesCondition: string;
  superArea: string;
  carpetArea: string;
  loading: string;
  rent: string;
  cam: string;
  leasePeriod: string;
  escalation: string;
  securityDeposit: string;
  stampDutyRegistration: string;
  rentFreePeriod: string;
  lift: string;
  parking: string;
  electricityLoad: string;
  spaceForDgSet: string;
  spaceForVSat: string;
  spaceForSignage: string;
  vitrifiedFlooring: string;
  toilets: string;
  pantry: string;
  waterCharges: string;
}

export type PropertyProfileKey = keyof PropertyProfileFields;

export const EMPTY_PROPERTY_PROFILE: PropertyProfileFields = {
  postedOn: "",
  buildingType: "",
  verifiedNo: "",
  buildingUsage: "",
  buildingStructure: "",
  ageOfConstruction: "",
  sanctionedMap: "",
  floorSize: "",
  fireNoc: "",
  ocCc: "",
  availableFloor: "",
  premisesCondition: "",
  superArea: "",
  carpetArea: "",
  loading: "",
  rent: "",
  cam: "",
  leasePeriod: "",
  escalation: "",
  securityDeposit: "",
  stampDutyRegistration: "",
  rentFreePeriod: "",
  lift: "",
  parking: "",
  electricityLoad: "",
  spaceForDgSet: "",
  spaceForVSat: "",
  spaceForSignage: "",
  vitrifiedFlooring: "",
  toilets: "",
  pantry: "",
  waterCharges: "",
};

export const PROPERTY_PROFILE_SECTIONS = {
  compliance: [
    ["buildingUsage", "Building Usage"],
    ["buildingStructure", "Building Structure"],
    ["ageOfConstruction", "Age of Construction"],
    ["sanctionedMap", "Sanctioned Map"],
    ["floorSize", "Floor Size"],
    ["fireNoc", "Fire NOC"],
    ["ocCc", "OC/CC"],
  ],
  area: [
    ["availableFloor", "Available Floor"],
    ["premisesCondition", "Premises Condition"],
    ["superArea", "Super Area"],
    ["carpetArea", "Carpet Area"],
    ["loading", "Loading"],
  ],
  financials: [
    ["rent", "Rent"],
    ["cam", "CAM"],
    ["leasePeriod", "Lease Period"],
    ["escalation", "Escalation"],
    ["securityDeposit", "Security Deposit"],
    ["stampDutyRegistration", "Stamp Duty & Registration"],
    ["rentFreePeriod", "Rent Free Period"],
  ],
  amenities: [
    ["lift", "Lift"],
    ["parking", "Parking"],
    ["electricityLoad", "Electricity Load"],
    ["spaceForDgSet", "Space for DG Set"],
    ["spaceForVSat", "Space for V Sat"],
    ["spaceForSignage", "Space for Signage"],
    ["vitrifiedFlooring", "Vitrified Flooring"],
    ["toilets", "Toilets"],
    ["pantry", "Pantry"],
    ["waterCharges", "Water Charges"],
  ],
} as const satisfies Record<string, ReadonlyArray<readonly [PropertyProfileKey, string]>>;

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function getPropertyProfile(
  additionalFields: unknown,
  commercialTerms?: Record<string, unknown>,
): PropertyProfileFields {
  const additional = asObject(additionalFields);
  const stored = asObject(additional.propertyProfile);
  const commercial = commercialTerms || {};

  return {
    ...EMPTY_PROPERTY_PROFILE,
    ...Object.fromEntries(
      Object.keys(EMPTY_PROPERTY_PROFILE).map((key) => [key, asString(stored[key])]),
    ),
    rent: asString(stored.rent ?? commercial.rent ?? commercial.rentPerSqFt),
    cam: asString(stored.cam ?? commercial.cam ?? commercial.camCharges),
    leasePeriod: asString(stored.leasePeriod ?? commercial.leasePeriod ?? commercial.leaseTerms),
    escalation: asString(stored.escalation ?? commercial.escalation ?? commercial.escalationDetails),
    securityDeposit: asString(stored.securityDeposit ?? commercial.securityDeposit),
    premisesCondition: asString(
      stored.premisesCondition ??
        commercial.premisesCondition ??
        commercial.furnishingStatusName ??
        commercial.furnishingStatus,
    ),
    superArea: asString(stored.superArea ?? commercial.superArea ?? commercial.availableArea),
  } as PropertyProfileFields;
}

export function mergePropertyProfile(
  additionalFields: unknown,
  profile: PropertyProfileFields,
): Record<string, unknown> {
  return {
    ...asObject(additionalFields),
    propertyProfile: { ...profile },
  };
}

export function countCompletedProfileFields(profile: PropertyProfileFields) {
  const keys = Object.keys(EMPTY_PROPERTY_PROFILE) as PropertyProfileKey[];
  const complete = keys.filter((key) => profile[key].trim().length > 0).length;
  return { complete, total: keys.length };
}
