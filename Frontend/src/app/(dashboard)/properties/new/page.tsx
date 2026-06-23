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
import {
  useStates,
  useCities,
  useLocalities,
  usePropertyTypes,
  useFurnishingStatuses,
  useAvailabilityStatuses,
  useSources,
  findById,
} from "@/hooks/use-reference";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Upload, X, ImageIcon, FileText, Film } from "lucide-react";
import type { Contact, MediaDocument } from "@/types";

const steps = [
  { id: "basic", title: "Basic Info", description: "Building name and type" },
  { id: "location", title: "Location", description: "Address and GPS" },
  { id: "area", title: "Area & Terms", description: "Rent and commercial terms" },
  { id: "availability", title: "Availability", description: "Status and furnishing" },
  { id: "contacts", title: "Contacts", description: "Contact details" },
  { id: "media", title: "Media", description: "Photos and documents" },
  { id: "notes", title: "Notes", description: "Additional information" },
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
  buildingName: string;
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
}

const initialFormData: FormData = {
  entryType: "building",
  buildingName: "",
  propertyType: "",
  source: "field",
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
};

export default function NewPropertyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createProperty = useCreateProperty();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [media, setMedia] = useState<MediaDocument[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const idCounter = useRef(0);

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
  const { data: states = [] } = useStates();
  const { data: propertyTypes = [] } = usePropertyTypes();
  const { data: furnishingStatuses = [] } = useFurnishingStatuses();
  const { data: availabilityStatuses = [] } = useAvailabilityStatuses();
  const { data: sources = [] } = useSources();
  const { data: cities = [] } = useCities(formData.state || undefined);
  const { data: localities = [] } = useLocalities(formData.city || undefined);

  function updateField(field: string, value: string | null) {
    setFormData((prev) => ({ ...prev, [field]: value ?? "" }));
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
        name: formData.buildingName,
        fullAddress: formData.address || undefined,
        pincode: formData.pincode || undefined,
        notes: formData.notes || undefined,
      };

      if (formData.propertyType) payload.propertyTypeId = formData.propertyType;
      if (formData.state) payload.stateId = formData.state;
      if (formData.city) payload.cityId = formData.city;
      if (formData.locality) payload.localityId = formData.locality;
      if (formData.source) payload.sourceId = formData.source;
      if (formData.availabilityStatus) payload.availabilityStatusId = formData.availabilityStatus;
      if (formData.mapsUrl) payload.googleMapsUrl = formData.mapsUrl;
      if (formData.latitude) payload.latitude = parseFloat(formData.latitude);
      if (formData.longitude) payload.longitude = parseFloat(formData.longitude);
      if (formData.totalArea) payload.totalBuildingArea = parseFloat(formData.totalArea);

      await createProperty.mutateAsync(payload);
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
        0: ["entryType", "buildingName", "propertyType"],
        1: ["address", "state", "city", "locality", "pincode"],
        2: ["totalArea", "availableArea", "rentPerSqFt"],
        3: ["availabilityStatus", "furnishingStatus"],
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
  function addMediaItem(category: string) {
    idCounter.current += 1;
    const newItem: MediaDocument = {
      id: `temp-${idCounter.current}`,
      entityId: "",
      entityType: "property",
      fileName: `sample-${category}-${media.length + 1}.jpg`,
      fileUrl: "",
      fileSize: 0,
      mimeType: category === "video" ? "video/mp4" : category === "document" ? "application/pdf" : "image/jpeg",
      category: category as MediaDocument["category"],
      caption: "",
      uploadedBy: "",
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    setMedia([...media, newItem]);
  }

  function removeMediaItem(id: string) {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Property"
        description="Create a new property record in Master Data."
      />

      <MultiStepForm steps={steps} onSubmit={handleSubmit} validateStep={validateStep} isSubmitting={isSubmitting}>
        {/* Step 1: Basic Info */}
        <StepContent>
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

            <ValidatedField label="Building Name" required field="buildingName">
              <Input
                placeholder="e.g. Phoenix Marketcity"
                value={formData.buildingName}
                onChange={(e) => updateField("buildingName", e.target.value)}
              />
            </ValidatedField>

            <ValidatedField label="Property Type" required field="propertyType">
              <Select value={formData.propertyType} onValueChange={(v) => updateField("propertyType", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
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
                  <SelectValue placeholder="Select source" />
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
        </StepContent>

        {/* Step 2: Location */}
        <StepContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidatedField label="Full Address" required field="address" className="col-span-2">
              <Textarea
                placeholder="Enter complete address"
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
                  <SelectValue placeholder="Select state" />
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
              <Select
                value={formData.city}
                onValueChange={(v) => {
                  updateField("city", v);
                  updateField("locality", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.state ? "Select city" : "Select state first"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ValidatedField>

            <ValidatedField label="Locality" required field="locality">
              <Select
                value={formData.locality}
                onValueChange={(v) => updateField("locality", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.city ? "Select locality" : "Select city first"} />
                </SelectTrigger>
                <SelectContent>
                  {localities.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ValidatedField>

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

            <div className="col-span-2">
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

            <FormField label="Maps URL" className="col-span-2">
              <Input
                placeholder="https://maps.google.com/..."
                value={formData.mapsUrl}
                onChange={(e) => updateField("mapsUrl", e.target.value)}
              />
            </FormField>
          </div>
        </StepContent>

        {/* Step 3: Area & Commercial Terms */}
        <StepContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidatedField label="Total Area (sqft)" required field="totalArea">
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={formData.totalArea}
                onChange={(e) => updateField("totalArea", e.target.value)}
              />
            </ValidatedField>

            <ValidatedField label="Available Area (sqft)" required field="availableArea">
              <Input
                type="number"
                placeholder="e.g. 2500"
                value={formData.availableArea}
                onChange={(e) => updateField("availableArea", e.target.value)}
              />
            </ValidatedField>

            <ValidatedField label="Rent per sqft (₹)" required field="rentPerSqFt">
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
        </StepContent>

        {/* Step 4: Availability & Furnishing */}
        <StepContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidatedField label="Availability Status" required field="availabilityStatus">
              <Select value={formData.availabilityStatus} onValueChange={(v) => updateField("availabilityStatus", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {availabilityStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ValidatedField>

            <ValidatedField label="Furnishing Status" required field="furnishingStatus">
              <Select value={formData.furnishingStatus} onValueChange={(v) => updateField("furnishingStatus", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select furnishing" />
                </SelectTrigger>
                <SelectContent>
                  {furnishingStatuses.map((fs) => (
                    <SelectItem key={fs.id} value={fs.id}>
                      {fs.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ValidatedField>

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
        </StepContent>

        {/* Step 5: Contacts */}
        <StepContent>
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
        </StepContent>

        {/* Step 6: Media */}
        <StepContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {MEDIA_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Button
                    key={cat.value}
                    type="button"
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => addMediaItem(cat.value)}
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
                        <p className="text-sm font-medium">{item.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {MEDIA_CATEGORIES.find((c) => c.value === item.category)?.label}
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
                <p className="text-xs">Click the buttons above to add photos, videos, or documents.</p>
              </div>
            )}
          </div>
        </StepContent>

        {/* Step 7: Notes */}
        <StepContent>
          <FormField label="Notes">
            <Textarea
              placeholder="Additional notes about this property..."
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </FormField>
        </StepContent>

        {/* Step 8: Review */}
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
                <span className="text-muted-foreground">Building Name:</span>
                <span>{formData.buildingName || "—"}</span>
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
                <span>{findById(cities, formData.city)?.name || "—"}</span>
                <span className="text-muted-foreground">Locality:</span>
                <span>{findById(localities, formData.locality)?.name || "—"}</span>
                <span className="text-muted-foreground">Pincode:</span>
                <span>{formData.pincode || "—"}</span>
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
                      {m.fileName}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

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
