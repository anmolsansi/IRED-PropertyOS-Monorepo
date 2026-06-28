"use client";

import { use, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { MultiStepForm, StepContent, FormField, useMultiStepForm } from "@/components/shared/MultiStepForm";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProperty, useUpdateProperty } from "@/hooks/use-properties";
import {
  useStates,
  useCities,
  useLocalities,
  usePropertyTypes,
  useFurnishingStatuses,
  useAvailabilityStatuses,
  useSources,
  findByName,
  findById,
} from "@/hooks/use-reference";
import { propertySchema } from "@/lib/validation";
import { ArrowLeft, MapPin, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { Property } from "@/types";

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

function PropertyForm({ property }: { property: Property }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateProperty = useUpdateProperty();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reference data hooks
  const { data: states } = useStates();
  const { data: propertyTypes } = usePropertyTypes();
  const { data: furnishingStatuses } = useFurnishingStatuses();
  const { data: availabilityStatuses } = useAvailabilityStatuses();
  const { data: sources } = useSources();

  const refDataLoaded = states && propertyTypes && furnishingStatuses && availabilityStatuses;

  // Resolve string names to UUIDs from reference data
  const stateId = findByName(states, property.state)?.id || "";
  const { data: cities } = useCities(stateId || undefined);
  const cityId = findByName(cities, property.city)?.id || "";
  const { data: localities } = useLocalities(cityId || undefined);
  const localityId = findByName(localities, property.locality)?.id || "";

  const propertyTypeId = findByName(propertyTypes, property.propertyType)?.id || "";
  const availabilityStatusId = findByName(availabilityStatuses, property.availabilityStatus)?.id || "";
  const sourceId = findByName(sources, property.source || "")?.id || "";

  // Form state with UUIDs
  const [formData, setFormData] = useState({
    entryType: property.entryType,
    name: property.buildingName,
    propertyTypeId: "",
    sourceId: "",
    fullAddress: property.address,
    stateId: "",
    cityId: "",
    localityId: "",
    pincode: property.pincode,
    latitude: property.latitude?.toString() || "",
    longitude: property.longitude?.toString() || "",
    googleMapsUrl: property.mapsUrl || "",
    totalBuildingArea: property.totalArea.toString(),
    availableArea: property.availableArea.toString(),
    rentPerSqFt: property.rentPerSqFt.toString(),
    camCharges: property.camCharges.toString(),
    maintenanceCharges: property.maintenanceCharges.toString(),
    securityDeposit: property.securityDeposit.toString(),
    leaseTerms: property.leaseTerms || "",
    escalationDetails: property.escalationDetails || "",
    brokerage: property.brokerage || "",
    availabilityStatusId: "",
    furnishingStatus: property.furnishingStatus,
    availabilityDate: property.availabilityDate || "",
    possessionDate: property.possessionDate || "",
    notes: property.notes || "",
  });

  // Set UUIDs once reference data loads
  useEffect(() => {
    if (!refDataLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData((prev) => ({
      ...prev,
      propertyTypeId: prev.propertyTypeId || propertyTypeId,
      sourceId: prev.sourceId || sourceId,
      stateId: prev.stateId || stateId,
      cityId: prev.cityId || cityId,
      localityId: prev.localityId || localityId,
      availabilityStatusId: prev.availabilityStatusId || availabilityStatusId,
    }));
  }, [refDataLoaded, propertyTypeId, sourceId, stateId, cityId, localityId, availabilityStatusId]);

  function updateField(field: string, value: string | null) {
    setFormData((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  const [gpsLoading, setGpsLoading] = useState(false);

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

  async function handleSubmit() {
    // Validate with schema (adapt field names for validation)
    const schemaInput = {
      entryType: formData.entryType,
      buildingName: formData.name,
      propertyType: formData.propertyTypeId,
      source: formData.sourceId || "field",
      address: formData.fullAddress,
      state: formData.stateId,
      city: formData.cityId,
      locality: formData.localityId,
      pincode: formData.pincode,
      latitude: formData.latitude,
      longitude: formData.longitude,
      mapsUrl: formData.googleMapsUrl,
      totalArea: formData.totalBuildingArea,
      availableArea: formData.availableArea,
      rentPerSqFt: formData.rentPerSqFt,
      camCharges: formData.camCharges,
      maintenanceCharges: formData.maintenanceCharges,
      securityDeposit: formData.securityDeposit,
      leaseTerms: formData.leaseTerms,
      escalationDetails: formData.escalationDetails,
      brokerage: formData.brokerage,
      availabilityStatus: formData.availabilityStatusId,
      furnishingStatus: formData.furnishingStatus,
      availabilityDate: formData.availabilityDate,
      possessionDate: formData.possessionDate,
      notes: formData.notes,
    };

    const result = propertySchema.safeParse(schemaInput);
    if (!result.success) {
      toast.error("Please fix validation errors before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        propertyTypeId: formData.propertyTypeId || undefined,
        entryType: formData.entryType,
        fullAddress: formData.fullAddress,
        stateId: formData.stateId || undefined,
        cityId: formData.cityId || undefined,
        localityId: formData.localityId || undefined,
        pincode: formData.pincode,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        googleMapsUrl: formData.googleMapsUrl || undefined,
        totalBuildingArea: formData.totalBuildingArea ? parseFloat(formData.totalBuildingArea) : undefined,
        availabilityStatusId: formData.availabilityStatusId || undefined,
        notes: formData.notes || undefined,
      };

      await updateProperty.mutateAsync({ id: property.id, data: payload });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Property updated successfully!");
      router.push(`/properties/${property.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update property";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const validateStep = useCallback(
    (stepIndex: number): Record<string, string> | null => {
      const stepFields: Record<number, string[]> = {
        0: ["entryType", "name", "propertyTypeId"],
        1: ["fullAddress", "stateId", "cityId", "localityId", "pincode"],
        2: ["totalBuildingArea", "availableArea", "rentPerSqFt"],
        3: ["availabilityStatusId", "furnishingStatus"],
      };

      const fields = stepFields[stepIndex];
      if (!fields) return null;

      // Map form fields to schema fields for validation
      const schemaInput = {
        entryType: formData.entryType,
        buildingName: formData.name,
        propertyType: formData.propertyTypeId,
        address: formData.fullAddress,
        state: formData.stateId,
        city: formData.cityId,
        locality: formData.localityId,
        pincode: formData.pincode,
        totalArea: formData.totalBuildingArea,
        availableArea: formData.availableArea,
        rentPerSqFt: formData.rentPerSqFt,
        availabilityStatus: formData.availabilityStatusId,
        furnishingStatus: formData.furnishingStatus,
      };

      const result = propertySchema.safeParse(schemaInput);
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

  // Resolve UUIDs to display names for the Review step
  const stateName = findById(states, formData.stateId)?.name || "";
  const cityName = findById(cities, formData.cityId)?.name || "";
  const propertyTypeName = findById(propertyTypes, formData.propertyTypeId)?.name || "";
  const availabilityStatusName = findById(availabilityStatuses, formData.availabilityStatusId)?.name || "";

  return (
    <MultiStepForm steps={steps} onSubmit={handleSubmit} validateStep={validateStep} isSubmitting={isSubmitting}>
      {/* Step 1: Basic Info */}
      <StepContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedField label="Entry Type" required field="entryType">
            <Select
              value={formData.entryType}
              onValueChange={(v) => updateField("entryType", v)}
            >
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

          <ValidatedField label="Building Name" required field="name">
            <Input
              placeholder="e.g. Phoenix Marketcity"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </ValidatedField>

          <ValidatedField label="Property Type" required field="propertyTypeId">
            <Select
              value={formData.propertyTypeId}
              onValueChange={(v) => updateField("propertyTypeId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property type" />
              </SelectTrigger>
              <SelectContent>
                {propertyTypes?.map((pt) => (
                  <SelectItem key={pt.id} value={pt.id}>
                    {pt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ValidatedField>

          <FormField label="Source">
            <Select
              value={formData.sourceId}
              onValueChange={(v) => updateField("sourceId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {sources?.map((s) => (
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
          <ValidatedField label="Full Address" required field="fullAddress" className="md:col-span-2">
            <Textarea
              placeholder="Enter complete address"
              value={formData.fullAddress}
              onChange={(e) => updateField("fullAddress", e.target.value)}
            />
          </ValidatedField>

          <ValidatedField label="State" required field="stateId">
            <Select
              value={formData.stateId}
              onValueChange={(v) => {
                updateField("stateId", v);
                updateField("cityId", "");
                updateField("localityId", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {states?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ValidatedField>

          <ValidatedField label="City" required field="cityId">
            <Select
              value={formData.cityId}
              onValueChange={(v) => {
                updateField("cityId", v);
                updateField("localityId", "");
              }}
              disabled={!formData.stateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ValidatedField>

          <ValidatedField label="Locality" required field="localityId">
            <Select
              value={formData.localityId}
              onValueChange={(v) => updateField("localityId", v)}
              disabled={!formData.cityId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select locality" />
              </SelectTrigger>
              <SelectContent>
                {localities?.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
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
              value={formData.googleMapsUrl}
              onChange={(e) => updateField("googleMapsUrl", e.target.value)}
            />
          </FormField>
        </div>
      </StepContent>

      {/* Step 3: Area & Commercial Terms */}
      <StepContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ValidatedField label="Total Area (sqft)" required field="totalBuildingArea">
            <Input
              type="number"
              placeholder="e.g. 5000"
              value={formData.totalBuildingArea}
              onChange={(e) => updateField("totalBuildingArea", e.target.value)}
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
          <ValidatedField label="Availability Status" required field="availabilityStatusId">
            <Select
              value={formData.availabilityStatusId}
              onValueChange={(v) => updateField("availabilityStatusId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {availabilityStatuses?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ValidatedField>

          <ValidatedField label="Furnishing Status" required field="furnishingStatus">
            <Select
              value={formData.furnishingStatus}
              onValueChange={(v) => updateField("furnishingStatus", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select furnishing" />
              </SelectTrigger>
              <SelectContent>
                {furnishingStatuses?.map((f) => (
                  <SelectItem key={f.id} value={f.name.toLowerCase().replace(/\s+/g, "_")}>
                    {f.name}
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
        <div className="text-center py-8 text-muted-foreground">
          <p>Contacts section - Add owner, caretaker, security contacts</p>
        </div>
      </StepContent>

      {/* Step 6: Media */}
      <StepContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Media section - Upload photos, videos, and documents</p>
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
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted">
            <h3 className="font-semibold mb-2">Review Your Changes</h3>
            <p className="text-sm text-muted-foreground">
              Please review all the information before submitting. Changes will be saved to Master Data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Building Name:</span>{" "}
              <span className="font-medium">{formData.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Property Type:</span>{" "}
              <span className="font-medium">{propertyTypeName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Location:</span>{" "}
              <span className="font-medium">{cityName}, {stateName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Rent:</span>{" "}
              <span className="font-medium">₹{formData.rentPerSqFt}/sqft</span>
            </div>
            <div>
              <span className="text-muted-foreground">Area:</span>{" "}
              <span className="font-medium">{formData.availableArea} / {formData.totalBuildingArea} sqft</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className="font-medium">{availabilityStatusName}</span>
            </div>
          </div>
        </div>
      </StepContent>
    </MultiStepForm>
  );
}

export default function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: property, isLoading, error } = useProperty(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="table" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <EmptyState
        title="Property not found"
        description="The property you're trying to edit doesn't exist or has been removed."
        action={
          <Link href="/properties">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Properties
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${property.buildingName}`}
        description={`Editing ${property.propertyId}`}
      >
        <Link href={`/properties/${property.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </Link>
      </PageHeader>

      <PropertyForm property={property} />
    </div>
  );
}
