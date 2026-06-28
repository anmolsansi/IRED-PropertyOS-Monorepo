"use client";

import { useState, useRef, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { MultiStepForm, StepContent, FormField, useMultiStepForm } from "@/components/shared/MultiStepForm";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { propertySchema } from "@/lib/validation";
import { useCreateProperty } from "@/hooks/use-properties";
import { useCompleteUpload, useUploadMedia } from "@/hooks/use-media";
import {
  useStates,
  usePropertyTypes,
  useFurnishingStatuses,
  useAvailabilityStatuses,
  useSources,
  findById,
  type ReferenceItem,
} from "@/hooks/use-reference";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Upload, X, ImageIcon, FileText, Film } from "lucide-react";
import type { Contact, MediaDocument } from "@/types";

const steps = [
  { id: "property", title: "Add Property", description: "All property details" },
  { id: "review", title: "Review", description: "Review and submit" },
];

const CONTACT_TYPES = [
  { value: "owner", label: "Owner" },
  { value: "caretaker", label: "Caretaker" },
  { value: "security", label: "Security" },
  { value: "broker", label: "Broker" },
  { value: "tenant", label: "Tenant" },
  { value: "alternate", label: "Alternate" },
];

const MEDIA_CATEGORIES = [
  { value: "photo", label: "Photo", icon: ImageIcon },
  { value: "video", label: "Video", icon: Film },
  { value: "document", label: "Document", icon: FileText },
  { value: "floor_plan", label: "Floor Plan", icon: FileText },
];

const ADDITIONAL_FIELD_TYPES = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "website", label: "Website" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "other", label: "Other" },
];

const FALLBACK_PROPERTY_TYPES: ReferenceItem[] = [
  "Office",
  "Retail",
  "Warehouse",
  "Industrial",
  "Residential",
  "CoWorking",
  "Plot",
  "Farmhouse",
].map((name) => ({ id: name, name, active: true }));

const FALLBACK_SOURCES: ReferenceItem[] = [
  "Manual Entry",
  "Website",
  "Referral",
  "99acres",
  "MagicBricks",
  "Housing.com",
  "JustDial",
  "Google Maps",
  "Walk-in",
  "Existing Client",
].map((name) => ({ id: name, name, active: true }));

const FALLBACK_STATES: ReferenceItem[] = [
  ["AP", "Andhra Pradesh"],
  ["AR", "Arunachal Pradesh"],
  ["AS", "Assam"],
  ["BR", "Bihar"],
  ["CG", "Chhattisgarh"],
  ["GA", "Goa"],
  ["GJ", "Gujarat"],
  ["HR", "Haryana"],
  ["HP", "Himachal Pradesh"],
  ["JH", "Jharkhand"],
  ["KA", "Karnataka"],
  ["KL", "Kerala"],
  ["MP", "Madhya Pradesh"],
  ["MH", "Maharashtra"],
  ["MN", "Manipur"],
  ["ML", "Meghalaya"],
  ["MZ", "Mizoram"],
  ["NL", "Nagaland"],
  ["OD", "Odisha"],
  ["PB", "Punjab"],
  ["RJ", "Rajasthan"],
  ["SK", "Sikkim"],
  ["TN", "Tamil Nadu"],
  ["TS", "Telangana"],
  ["TR", "Tripura"],
  ["UP", "Uttar Pradesh"],
  ["UK", "Uttarakhand"],
  ["WB", "West Bengal"],
  ["AN", "Andaman and Nicobar Islands"],
  ["CH", "Chandigarh"],
  ["DN", "Dadra and Nagar Haveli and Daman and Diu"],
  ["DL", "Delhi"],
  ["JK", "Jammu and Kashmir"],
  ["LA", "Ladakh"],
  ["LD", "Lakshadweep"],
  ["PY", "Puducherry"],
].map(([code, name]) => ({ id: code, code, name, active: true }));

interface AdditionalField {
  id: string;
  type: string;
  label: string;
  value: string;
}

interface PendingMediaFile {
  id: string;
  file: File;
  category: MediaDocument["category"];
}

function ValidatedField({
  label,
  required,
  field,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  field: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { errors } = useMultiStepForm();
  return (
    <FormField label={label} required={required} error={errors[field]} className={className}>
      {children}
    </FormField>
  );
}

interface FormData {
  entryType: string;
  propertyType: string;
  source: string;
  address: string;
  state: string;
  city: string;
  locality: string;
  pincode: string;
  latitude: string;
  longitude: string;
  mapsUrl: string;
  totalArea: string;
  availableArea: string;
  rentPerSqFt: string;
  camCharges: string;
  maintenanceCharges: string;
  securityDeposit: string;
  leaseTerms: string;
  escalationDetails: string;
  brokerage: string;
  availabilityStatus: string;
  furnishingStatus: string;
  availabilityDate: string;
  possessionDate: string;
  notes: string;
  landlordName: string;
  telecallerStatus: string;
  starRating: string;
  facingOption: string;
  unitAccessLocation: string;
}

const initialFormData: FormData = {
  entryType: "building",
  propertyType: "",
  source: "",
  address: "",
  state: "",
  city: "",
  locality: "",
  pincode: "",
  latitude: "",
  longitude: "",
  mapsUrl: "",
  totalArea: "",
  availableArea: "",
  rentPerSqFt: "",
  camCharges: "",
  maintenanceCharges: "",
  securityDeposit: "",
  leaseTerms: "",
  escalationDetails: "",
  brokerage: "",
  availabilityStatus: "",
  furnishingStatus: "",
  availabilityDate: "",
  possessionDate: "",
  notes: "",
  landlordName: "",
  telecallerStatus: "BLANK",
  starRating: "",
  facingOption: "",
  unitAccessLocation: "",
};

export default function NewPropertyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createProperty = useCreateProperty();
  const uploadMedia = useUploadMedia();
  const completeUpload = useCompleteUpload();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [media, setMedia] = useState<PendingMediaFile[]>([]);
  const [additionalFields, setAdditionalFields] = useState<AdditionalField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const idCounter = useRef(0);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const pendingMediaCategory = useRef<MediaDocument["category"]>("photo");

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateField("latitude", position.coords.latitude.toFixed(6));
        updateField("longitude", position.coords.longitude.toFixed(6));
        setGpsLoading(false);
        toast.success("GPS coordinates captured");
      },
      (error) => {
        setGpsLoading(false);
        toast.error(
          error.code === 1
            ? "Location access denied. Please enable location permissions."
            : "Unable to get location. Please enter coordinates manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // Reference data
  const { data: statesData = [] } = useStates();
  const { data: propertyTypesData = [] } = usePropertyTypes();
  const { data: furnishingStatuses = [] } = useFurnishingStatuses();
  const { data: availabilityStatuses = [] } = useAvailabilityStatuses();
  const { data: sourcesData = [] } = useSources();
  const states = statesData.length > 0 ? statesData : FALLBACK_STATES;
  const propertyTypes = propertyTypesData.length > 0 ? propertyTypesData : FALLBACK_PROPERTY_TYPES;
  const sources = sourcesData.length > 0 ? sourcesData : FALLBACK_SOURCES;

  function updateField(field: string, value: string | null) {
    setFormData((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  function getMediaFileType(category: MediaDocument["category"]) {
    return category === "photo" ? "image" : category === "video" ? "video" : "document";
  }

  function getCreatedBuildingId(response: unknown) {
    const maybeWrapped = response as { data?: { id?: string }; id?: string };
    return maybeWrapped.data?.id || maybeWrapped.id;
  }

  function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function derivePropertyName() {
    const addressLine = formData.address.trim().split("\n")[0]?.trim();
    return (
      addressLine ||
      [formData.locality, formData.city, formData.pincode].filter(Boolean).join(", ") ||
      "New Property"
    );
  }

  async function uploadPendingMedia(buildingId: string) {
    if (media.length === 0) return;

    let uploadedCount = 0;
    for (const item of media) {
      const uploadResponse = await uploadMedia.mutateAsync({
        fileName: item.file.name,
        mimeType: item.file.type || "application/octet-stream",
        fileType: getMediaFileType(item.category),
        buildingId,
        fileSizeBytes: item.file.size,
      });
      const uploadData = uploadResponse.data ?? uploadResponse;
      const uploadUrl = uploadData.uploadUrl || uploadData.presignedUrl;
      if (!uploadUrl) throw new Error(`Upload URL missing for ${item.file.name}`);

      const uploadResult = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": item.file.type || "application/octet-stream" },
        body: item.file,
      });

      if (!uploadResult.ok) {
        throw new Error(`Failed to upload ${item.file.name}`);
      }

      await completeUpload.mutateAsync({
        mediaId: uploadData.mediaId,
        fileSizeBytes: item.file.size,
      });
      uploadedCount += 1;
    }

    toast.success(`${uploadedCount} media file(s) uploaded`);
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    const result = propertySchema.safeParse(formData);
    if (!result.success) {
      toast.error("Please fix validation errors before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: derivePropertyName(),
        fullAddress: formData.address || undefined,
        cityName: formData.city || undefined,
        localityName: formData.locality || undefined,
        pincode: formData.pincode || undefined,
        notes: formData.notes || undefined,
        landlordName: formData.landlordName || undefined,
        telecallerStatus: formData.telecallerStatus || undefined,
        starRating: formData.starRating ? parseInt(formData.starRating, 10) : undefined,
        facingOption: formData.facingOption || undefined,
        unitAccessLocation: formData.unitAccessLocation || undefined,
      };

      const commercialTerms = {
        availableArea: formData.availableArea ? parseFloat(formData.availableArea) : undefined,
        rentPerSqFt: formData.rentPerSqFt ? parseFloat(formData.rentPerSqFt) : undefined,
        camCharges: formData.camCharges ? parseFloat(formData.camCharges) : undefined,
        maintenanceCharges: formData.maintenanceCharges ? parseFloat(formData.maintenanceCharges) : undefined,
        securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : undefined,
        leaseTerms: formData.leaseTerms || undefined,
        escalationDetails: formData.escalationDetails || undefined,
        brokerage: formData.brokerage || undefined,
        furnishingStatusId: formData.furnishingStatus || undefined,
        availabilityDate: formData.availabilityDate || undefined,
        possessionDate: formData.possessionDate || undefined,
      };

      const extraFields = additionalFields
        .filter((field) => field.value.trim())
        .map((field) => ({
          type: field.type,
          label: field.label.trim() || ADDITIONAL_FIELD_TYPES.find((item) => item.value === field.type)?.label || "Other",
          value: field.value.trim(),
        }));

      const selectedPropertyType = findById(propertyTypes, formData.propertyType);
      const selectedState = findById(states, formData.state);
      const selectedSource = findById(sources, formData.source);
      if (formData.propertyType) {
        if (isUuid(formData.propertyType)) payload.propertyTypeId = formData.propertyType;
        else payload.propertyTypeName = selectedPropertyType?.name || formData.propertyType;
      }
      if (formData.state) {
        if (isUuid(formData.state)) payload.stateId = formData.state;
        else {
          payload.stateCode = selectedState?.code || formData.state;
          payload.stateName = selectedState?.name || formData.state;
        }
      }
      if (formData.source) {
        if (isUuid(formData.source)) payload.sourceId = formData.source;
        else payload.sourceName = selectedSource?.name || formData.source;
      }
      if (formData.availabilityStatus) payload.availabilityStatusId = formData.availabilityStatus;
      if (formData.mapsUrl) payload.googleMapsUrl = formData.mapsUrl;
      if (formData.latitude) payload.latitude = parseFloat(formData.latitude);
      if (formData.longitude) payload.longitude = parseFloat(formData.longitude);
      if (formData.totalArea) payload.totalBuildingArea = parseFloat(formData.totalArea);
      if (Object.values(commercialTerms).some((value) => value !== undefined)) {
        payload.commercialTerms = commercialTerms;
      }
      if (extraFields.length > 0) payload.additionalFields = extraFields;

      const createdProperty = await createProperty.mutateAsync(payload);
      const buildingId = getCreatedBuildingId(createdProperty);
      if (buildingId) {
        try {
          await uploadPendingMedia(buildingId);
        } catch (uploadError) {
          const uploadMessage =
            uploadError instanceof Error
              ? uploadError.message
              : "Property created, but media upload failed.";
          toast.error(uploadMessage);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Property created successfully!");
      router.push("/properties");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create property";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const validateStep = useCallback(
    (stepIndex: number): Record<string, string> | null => {
      const stepFields: Record<number, string[]> = {
        0: ["entryType", "propertyType", "state", "city", "pincode", "mapsUrl", "totalArea", "availableArea", "rentPerSqFt"],
      };

      const fields = stepFields[stepIndex];
      if (!fields) return null;

      const result = propertySchema.safeParse(formData);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const path = issue.path[0] as string;
          if (fields.includes(path) && !fieldErrors[path]) {
            fieldErrors[path] = issue.message;
          }
        }
        return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
      }
      return null;
    },
    [formData]
  );

  // Contact handlers
  function addContact() {
    idCounter.current += 1;
    const newContact: Contact = {
      id: `temp-${idCounter.current}`,
      entityId: "",
      entityType: "property",
      contactType: "owner",
      name: "",
      phone: "",
      email: "",
      designation: "",
      isPrimary: contacts.length === 0,
      createdAt: new Date().toISOString(),
    };
    setContacts([...contacts, newContact]);
  }

  function updateContact(id: string, field: keyof Contact, value: string | boolean | null) {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value ?? "" } : c))
    );
  }

  function removeContact(id: string) {
    setContacts((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length > 0 && !filtered.some((c) => c.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  }

  function setPrimaryContact(id: string) {
    setContacts((prev) =>
      prev.map((c) => ({ ...c, isPrimary: c.id === id }))
    );
  }

  // Media handlers
  function openMediaPicker(category: MediaDocument["category"]) {
    pendingMediaCategory.current = category;
    mediaInputRef.current?.click();
  }

  function handleMediaSelection(files: FileList | null) {
    if (!files || files.length === 0) return;

    const category = pendingMediaCategory.current;
    const selectedFiles = Array.from(files).map((file) => {
      idCounter.current += 1;
      return {
        id: `media-${idCounter.current}`,
        file,
        category,
      };
    });

    setMedia((prev) => [...prev, ...selectedFiles]);
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  }

  function removeMediaItem(id: string) {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  function addAdditionalField() {
    idCounter.current += 1;
    setAdditionalFields((prev) => [
      ...prev,
      {
        id: `extra-${idCounter.current}`,
        type: "instagram",
        label: "Instagram",
        value: "",
      },
    ]);
  }

  function updateAdditionalField(id: string, field: keyof AdditionalField, value: string) {
    setAdditionalFields((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "type") {
          const selectedType = ADDITIONAL_FIELD_TYPES.find((type) => type.value === value);
          return {
            ...item,
            type: value,
            label: selectedType?.label || item.label,
          };
        }
        return { ...item, [field]: value };
      }),
    );
  }

  function removeAdditionalField(id: string) {
    setAdditionalFields((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Property"
        description="Create a new property record in Master Data."
      />

      <MultiStepForm steps={steps} onSubmit={handleSubmit} validateStep={validateStep} isSubmitting={isSubmitting}>
        {/* Step 1: Add Property */}
        <StepContent>
          <div className="space-y-8">
          <section className="space-y-4">
          <h3 className="text-sm font-semibold">Basic Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidatedField label="Entry Type" required field="entryType">
              <Select value={formData.entryType} onValueChange={(v) => updateField("entryType", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="building">Building</SelectItem>
                  <SelectItem value="floor">Floor</SelectItem>
                  <SelectItem value="unit">Unit</SelectItem>
                </SelectContent>
              </Select>
            </ValidatedField>

            <ValidatedField label="Property Type" required field="propertyType">
              <Select value={formData.propertyType} onValueChange={(v) => updateField("propertyType", v)}>
                <SelectTrigger>
                  <SelectValue>{findById(propertyTypes, formData.propertyType)?.name || "Select property type"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ValidatedField>

            <FormField label="Source">
              <Select value={formData.source} onValueChange={(v) => updateField("source", v)}>
                <SelectTrigger>
                  <SelectValue>{findById(sources, formData.source)?.name || "Select source"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          </section>

        {/* Location */}
          <section className="space-y-4">
          <h3 className="text-sm font-semibold">Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidatedField label="Full Address" field="address" className="md:col-span-2">
              <Textarea
                placeholder="Enter complete address (optional for new records)"
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </ValidatedField>

            <ValidatedField label="State" required field="state">
              <Select
                value={formData.state}
                onValueChange={(v) => {
                  updateField("state", v);
                  updateField("city", "");
                  updateField("locality", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue>{findById(states, formData.state)?.name || "Select state or union territory"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.id} value={state.id}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ValidatedField>

            <ValidatedField label="City" required field="city">
              <Input
                placeholder="e.g. New Delhi"
                value={formData.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </ValidatedField>

            <FormField label="Locality">
              <Input
                placeholder="e.g. Connaught Place"
                value={formData.locality}
                onChange={(e) => updateField("locality", e.target.value)}
              />
            </FormField>

            <ValidatedField label="Pincode" required field="pincode">
              <Input
                placeholder="e.g. 411014"
                value={formData.pincode}
                onChange={(e) => updateField("pincode", e.target.value)}
              />
            </ValidatedField>

            <FormField label="Latitude">
              <Input
                type="number"
                step="any"
                placeholder="e.g. 18.5204"
                value={formData.latitude}
                onChange={(e) => updateField("latitude", e.target.value)}
              />
            </FormField>

            <FormField label="Longitude">
              <Input
                type="number"
                step="any"
                placeholder="e.g. 73.8567"
                value={formData.longitude}
                onChange={(e) => updateField("longitude", e.target.value)}
              />
            </FormField>

            <div className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={captureGps}
                disabled={gpsLoading}
              >
                {gpsLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4 mr-2" />
                )}
                {gpsLoading ? "Capturing..." : "Use Current Location"}
              </Button>
            </div>

            <FormField label="Maps URL" className="md:col-span-2">
              <Input
                placeholder="https://maps.google.com/..."
                value={formData.mapsUrl}
                onChange={(e) => updateField("mapsUrl", e.target.value)}
              />
            </FormField>
          </div>
          </section>

        {/* Area & Commercial Terms */}
          <section className="space-y-4">
          <h3 className="text-sm font-semibold">Area & Commercial Terms</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidatedField label="Total Area (sqft)" field="totalArea">
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={formData.totalArea}
                onChange={(e) => updateField("totalArea", e.target.value)}
              />
            </ValidatedField>

            <ValidatedField label="Available Area (sqft)" field="availableArea">
              <Input
                type="number"
                placeholder="e.g. 2500"
                value={formData.availableArea}
                onChange={(e) => updateField("availableArea", e.target.value)}
              />
            </ValidatedField>

            <ValidatedField label="Rent per sqft (₹)" field="rentPerSqFt">
              <Input
                type="number"
                placeholder="e.g. 125"
                value={formData.rentPerSqFt}
                onChange={(e) => updateField("rentPerSqFt", e.target.value)}
              />
            </ValidatedField>

            <FormField label="CAM Charges (₹/sqft)">
              <Input
                type="number"
                placeholder="e.g. 15"
                value={formData.camCharges}
                onChange={(e) => updateField("camCharges", e.target.value)}
              />
            </FormField>

            <FormField label="Maintenance Charges (₹/sqft)">
              <Input
                type="number"
                placeholder="e.g. 10"
                value={formData.maintenanceCharges}
                onChange={(e) => updateField("maintenanceCharges", e.target.value)}
              />
            </FormField>

            <FormField label="Security Deposit (₹)">
              <Input
                type="number"
                placeholder="e.g. 500000"
                value={formData.securityDeposit}
                onChange={(e) => updateField("securityDeposit", e.target.value)}
              />
            </FormField>

            <FormField label="Lease Terms">
              <Input
                placeholder="e.g. 3+3 years"
                value={formData.leaseTerms}
                onChange={(e) => updateField("leaseTerms", e.target.value)}
              />
            </FormField>

            <FormField label="Escalation Details">
              <Input
                placeholder="e.g. 10% every 2 years"
                value={formData.escalationDetails}
                onChange={(e) => updateField("escalationDetails", e.target.value)}
              />
            </FormField>

            <FormField label="Brokerage">
              <Input
                placeholder="e.g. 1 month rent"
                value={formData.brokerage}
                onChange={(e) => updateField("brokerage", e.target.value)}
              />
            </FormField>
          </div>
          </section>

        {/* Availability & Furnishing */}
          <section className="space-y-4">
          <h3 className="text-sm font-semibold">Availability & Furnishing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Availability Status">
              <Select value={formData.availabilityStatus} onValueChange={(v) => updateField("availabilityStatus", v)}>
                <SelectTrigger>
                  <SelectValue>{findById(availabilityStatuses, formData.availabilityStatus)?.name || "Select status"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availabilityStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Furnishing Status">
              <Select value={formData.furnishingStatus} onValueChange={(v) => updateField("furnishingStatus", v)}>
                <SelectTrigger>
                  <SelectValue>{findById(furnishingStatuses, formData.furnishingStatus)?.name || "Select furnishing"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {furnishingStatuses.map((fs) => (
                    <SelectItem key={fs.id} value={fs.id}>
                      {fs.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Availability Date">
              <Input
                type="date"
                value={formData.availabilityDate}
                onChange={(e) => updateField("availabilityDate", e.target.value)}
              />
            </FormField>

            <FormField label="Possession Date">
              <Input
                type="date"
                value={formData.possessionDate}
                onChange={(e) => updateField("possessionDate", e.target.value)}
              />
            </FormField>
          </div>
          </section>

        {/* Additional Property Details */}
          <section className="space-y-4">
          <h3 className="text-sm font-semibold">Additional Property Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Landlord Name">
              <Input
                placeholder="e.g. John Doe"
                value={formData.landlordName}
                onChange={(e) => updateField("landlordName", e.target.value)}
              />
            </FormField>

            <FormField label="Telecaller Status">
              <Select value={formData.telecallerStatus} onValueChange={(v) => updateField("telecallerStatus", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="REVIEW_NEEDED">Review Needed</SelectItem>
                  <SelectItem value="BLANK">Blank (Default)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Star Rating">
              <Input
                type="number"
                min="1"
                max="5"
                placeholder="e.g. 5"
                value={formData.starRating}
                onChange={(e) => updateField("starRating", e.target.value)}
              />
            </FormField>

            <FormField label="Facing Option">
              <Select value={formData.facingOption} onValueChange={(v) => updateField("facingOption", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Facing Option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FRONT">Front</SelectItem>
                  <SelectItem value="REAR">Rear</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Unit Access Location">
              <Select value={formData.unitAccessLocation} onValueChange={(v) => updateField("unitAccessLocation", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Access Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAIN_ROAD">Main Road</SelectItem>
                  <SelectItem value="INSIDE">Inside</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          </section>

        {/* Contacts */}
          <section className="space-y-4">
          <h3 className="text-sm font-semibold">Contacts</h3>
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 rounded-lg border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Contact</span>
                    {contact.isPrimary && (
                      <Badge variant="secondary" className="text-xs">Primary</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!contact.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPrimaryContact(contact.id)}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeContact(contact.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Type</label>
                    <Select
                      value={contact.contactType}
                      onValueChange={(v) => updateContact(contact.id, "contactType", v)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_TYPES.map((ct) => (
                          <SelectItem key={ct.value} value={ct.value}>
                            {ct.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Name *</label>
                    <Input
                      className="h-8"
                      placeholder="Contact name"
                      value={contact.name}
                      onChange={(e) => updateContact(contact.id, "name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Phone *</label>
                    <Input
                      className="h-8"
                      placeholder="Phone number"
                      value={contact.phone}
                      onChange={(e) => updateContact(contact.id, "phone", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Email</label>
                    <Input
                      className="h-8"
                      type="email"
                      placeholder="Email (optional)"
                      value={contact.email || ""}
                      onChange={(e) => updateContact(contact.id, "email", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Designation</label>
                    <Input
                      className="h-8"
                      placeholder="Designation (optional)"
                      value={contact.designation || ""}
                      onChange={(e) => updateContact(contact.id, "designation", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addContact}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
          </section>

        {/* Media */}
          <section className="space-y-4">
          <h3 className="text-sm font-semibold">Media</h3>
          <div className="space-y-4">
            <input
              ref={mediaInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(event) => handleMediaSelection(event.target.files)}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {MEDIA_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Button
                    key={cat.value}
                    type="button"
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => openMediaPicker(cat.value as MediaDocument["category"])}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">Add {cat.label}</span>
                  </Button>
                );
              })}
            </div>

            {media.length > 0 && (
              <div className="space-y-2">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {item.category === "photo" && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                      {item.category === "video" && <Film className="h-4 w-4 text-muted-foreground" />}
                      {(item.category === "document" || item.category === "floor_plan") && (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{item.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {MEDIA_CATEGORIES.find((c) => c.value === item.category)?.label} •{" "}
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeMediaItem(item.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {media.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No media files added yet.</p>
                <p className="text-xs">Click the buttons above to choose photos, videos, or documents.</p>
              </div>
            )}
          </div>
          </section>

        {/* Additional Fields */}
          <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Additional Fields</h3>
            <Button type="button" variant="outline" size="sm" onClick={addAdditionalField}>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
          {additionalFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add Instagram, Facebook, website, or any custom field when available.</p>
          ) : (
            <div className="space-y-3">
              {additionalFields.map((field) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[180px_1fr_1fr_auto] gap-3 rounded-lg border p-3">
                  <Select value={field.type} onValueChange={(value) => updateAdditionalField(field.id, "type", value || "other")}>
                    <SelectTrigger>
                      <SelectValue>{ADDITIONAL_FIELD_TYPES.find((type) => type.value === field.type)?.label || "Other"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ADDITIONAL_FIELD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Field label"
                    value={field.label}
                    onChange={(e) => updateAdditionalField(field.id, "label", e.target.value)}
                  />
                  <Input
                    placeholder="Value or URL"
                    value={field.value}
                    onChange={(e) => updateAdditionalField(field.id, "value", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeAdditionalField(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          </section>

        {/* Notes */}
          <section className="space-y-4">
          <h3 className="text-sm font-semibold">Notes</h3>
          <FormField label="Notes">
            <Textarea
              placeholder="Additional notes about this property..."
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </FormField>
          </section>
          </div>
        </StepContent>

        {/* Step 2: Review */}
        <StepContent>
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-muted">
              <h3 className="font-semibold mb-1">Review Your Property</h3>
              <p className="text-sm text-muted-foreground">
                Please review all the information before submitting.
              </p>
            </div>

            {/* Basic Info */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Basic Info</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">Entry Type:</span>
                <span>{formData.entryType.charAt(0).toUpperCase() + formData.entryType.slice(1)}</span>
                <span className="text-muted-foreground">Property Type:</span>
                <span>{findById(propertyTypes, formData.propertyType)?.name || "—"}</span>
                <span className="text-muted-foreground">Source:</span>
                <span>{findById(sources, formData.source)?.name || "—"}</span>
              </div>
            </div>

            {/* Location */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Location</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">Address:</span>
                <span>{formData.address || "—"}</span>
                <span className="text-muted-foreground">State:</span>
                <span>{findById(states, formData.state)?.name || "—"}</span>
                <span className="text-muted-foreground">City:</span>
                <span>{formData.city || "—"}</span>
                <span className="text-muted-foreground">Locality:</span>
                <span>{formData.locality || "—"}</span>
                <span className="text-muted-foreground">Pincode:</span>
                <span>{formData.pincode || "—"}</span>
                <span className="text-muted-foreground">Coordinates:</span>
                <span>
                  {formData.latitude && formData.longitude
                    ? `${formData.latitude}, ${formData.longitude}`
                    : "—"}
                </span>
              </div>
            </div>

            {/* Commercial Terms */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Commercial Terms</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">Total Area:</span>
                <span>{formData.totalArea ? `${formData.totalArea} sqft` : "—"}</span>
                <span className="text-muted-foreground">Available Area:</span>
                <span>{formData.availableArea ? `${formData.availableArea} sqft` : "—"}</span>
                <span className="text-muted-foreground">Rent/sqft:</span>
                <span>{formData.rentPerSqFt ? `₹${formData.rentPerSqFt}` : "—"}</span>
                <span className="text-muted-foreground">CAM Charges:</span>
                <span>{formData.camCharges ? `₹${formData.camCharges}/sqft` : "—"}</span>
                <span className="text-muted-foreground">Maintenance:</span>
                <span>{formData.maintenanceCharges ? `₹${formData.maintenanceCharges}/sqft` : "—"}</span>
                <span className="text-muted-foreground">Security Deposit:</span>
                <span>{formData.securityDeposit ? `₹${Number(formData.securityDeposit).toLocaleString()}` : "—"}</span>
                <span className="text-muted-foreground">Lease Terms:</span>
                <span>{formData.leaseTerms || "—"}</span>
                <span className="text-muted-foreground">Escalation:</span>
                <span>{formData.escalationDetails || "—"}</span>
              </div>
            </div>

            {/* Availability */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Availability</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span>{findById(availabilityStatuses, formData.availabilityStatus)?.name || "—"}</span>
                <span className="text-muted-foreground">Furnishing:</span>
                <span>{findById(furnishingStatuses, formData.furnishingStatus)?.name || "—"}</span>
                <span className="text-muted-foreground">Available From:</span>
                <span>{formData.availabilityDate || "—"}</span>
                <span className="text-muted-foreground">Possession Date:</span>
                <span>{formData.possessionDate || "—"}</span>
              </div>
            </div>

            {/* Contacts */}
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Contacts ({contacts.length})
              </h4>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts added.</p>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 text-sm p-2 rounded border">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {CONTACT_TYPES.find((ct) => ct.value === c.contactType)?.label}
                      </Badge>
                      <span className="font-medium">{c.name || "Unnamed"}</span>
                      <span className="text-muted-foreground">{c.phone}</span>
                      {c.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Media */}
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Media ({media.length})
              </h4>
              {media.length === 0 ? (
                <p className="text-sm text-muted-foreground">No media files added.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {media.map((m) => (
                    <Badge key={m.id} variant="outline" className="text-xs">
                      {m.file.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Fields */}
            {additionalFields.some((field) => field.value.trim()) && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Additional Fields</h4>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  {additionalFields
                    .filter((field) => field.value.trim())
                    .map((field) => (
                      <div key={field.id} className="contents">
                        <span className="text-muted-foreground">{field.label || "Other"}:</span>
                        <span className="break-all">{field.value}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {formData.notes && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.notes}</p>
              </div>
            )}

            <div className="p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-300">
                This new property will be added to Master Data upon submission.
              </p>
            </div>
          </div>
        </StepContent>
      </MultiStepForm>
    </div>
  );
}
