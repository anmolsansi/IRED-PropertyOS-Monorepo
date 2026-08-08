"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeIndianRupee,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  MapPin,
  PhoneCall,
  Plus,
  Save,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IntakeMediaManager } from "@/components/property-intake/IntakeMediaManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCompletePropertyIntake,
  useProperty,
  useUpdateIntakeStatus,
  useUpdateProperty,
  type IntakeStatus,
} from "@/hooks/use-properties";
import {
  useAvailabilityStatuses,
  useCities,
  useFurnishingStatuses,
  useLocalities,
  usePropertyTypes,
  useSources,
  useStates,
} from "@/hooks/use-reference";
import type { Contact } from "@/types";
import { toast } from "sonner";

interface EditorForm {
  name: string;
  propertyTypeId: string;
  sourceId: string;
  landlordName: string;
  starRating: string;
  fullAddress: string;
  stateId: string;
  cityId: string;
  localityId: string;
  pincode: string;
  mapsUrl: string;
  latitude: string;
  longitude: string;
  totalBuildingArea: string;
  availableArea: string;
  rentPerSqFt: string;
  camCharges: string;
  maintenanceCharges: string;
  securityDeposit: string;
  leaseTerms: string;
  escalationDetails: string;
  brokerage: string;
  availabilityStatusId: string;
  furnishingStatus: string;
  availabilityDate: string;
  possessionDate: string;
  facingOption: string;
  unitAccessLocation: string;
  notes: string;
}

const EMPTY_FORM: EditorForm = {
  name: "",
  propertyTypeId: "",
  sourceId: "",
  landlordName: "",
  starRating: "",
  fullAddress: "",
  stateId: "",
  cityId: "",
  localityId: "",
  pincode: "",
  mapsUrl: "",
  latitude: "",
  longitude: "",
  totalBuildingArea: "",
  availableArea: "",
  rentPerSqFt: "",
  camCharges: "",
  maintenanceCharges: "",
  securityDeposit: "",
  leaseTerms: "",
  escalationDetails: "",
  brokerage: "",
  availabilityStatusId: "",
  furnishingStatus: "",
  availabilityDate: "",
  possessionDate: "",
  facingOption: "",
  unitAccessLocation: "",
  notes: "",
};

const CONTACT_TYPES: Contact["contactType"][] = [
  "owner",
  "caretaker",
  "security",
  "broker",
  "tenant",
  "alternate",
];

function normalize(value?: string) {
  return (value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function numberValue(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function statusFromProperty(telecallerStatus?: string, additionalFields?: unknown): IntakeStatus {
  if (
    additionalFields &&
    typeof additionalFields === "object" &&
    !Array.isArray(additionalFields) &&
    "intakeStatus" in additionalFields
  ) {
    const status = (additionalFields as Record<string, unknown>).intakeStatus;
    if (status === "NEW" || status === "IN_PROGRESS" || status === "FOLLOW_UP" || status === "COMPLETED") return status;
  }
  return telecallerStatus === "VERIFIED" ? "COMPLETED" : "NEW";
}

function statusClass(status: IntakeStatus) {
  if (status === "COMPLETED") return "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300";
  if (status === "IN_PROGRESS") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
  if (status === "FOLLOW_UP") return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300";
  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
}

function Section({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function PropertyIntakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: property, isLoading, isError, error } = useProperty(id);
  const updateProperty = useUpdateProperty();
  const updateStatus = useUpdateIntakeStatus();
  const completeIntake = useCompletePropertyIntake();

  const { data: states = [] } = useStates();
  const { data: propertyTypes = [] } = usePropertyTypes();
  const { data: furnishingStatuses = [] } = useFurnishingStatuses();
  const { data: availabilityStatuses = [] } = useAvailabilityStatuses();
  const { data: sources = [] } = useSources();

  const [form, setForm] = useState<EditorForm>(EMPTY_FORM);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const { data: cities = [] } = useCities(form.stateId || undefined);
  const { data: localities = [] } = useLocalities(form.cityId || undefined);

  useEffect(() => {
    if (!property) return;
    setForm({
      name: property.buildingName || "",
      propertyTypeId: property.propertyTypeId || "",
      sourceId: property.sourceId || "",
      landlordName: property.landlordName || "",
      starRating: property.starRating ? String(property.starRating) : "",
      fullAddress: property.address || "",
      stateId: property.stateId || "",
      cityId: property.cityId || "",
      localityId: property.localityId || "",
      pincode: property.pincode || "",
      mapsUrl: property.mapsUrl || "",
      latitude: property.latitude != null ? String(property.latitude) : "",
      longitude: property.longitude != null ? String(property.longitude) : "",
      totalBuildingArea: property.totalArea ? String(property.totalArea) : "",
      availableArea: property.availableArea ? String(property.availableArea) : "",
      rentPerSqFt: property.rentPerSqFt ? String(property.rentPerSqFt) : "",
      camCharges: property.camCharges ? String(property.camCharges) : "",
      maintenanceCharges: property.maintenanceCharges ? String(property.maintenanceCharges) : "",
      securityDeposit: property.securityDeposit ? String(property.securityDeposit) : "",
      leaseTerms: property.leaseTerms || "",
      escalationDetails: property.escalationDetails || "",
      brokerage: property.brokerage || "",
      availabilityStatusId: property.availabilityStatusId || "",
      furnishingStatus: normalize(property.furnishingStatus),
      availabilityDate: property.availabilityDate || "",
      possessionDate: property.possessionDate || "",
      facingOption: property.facingOption || "",
      unitAccessLocation: property.unitAccessLocation || "",
      notes: property.notes || "",
    });
    setContacts(property.contacts || []);
  }, [property]);

  const status = useMemo(
    () => statusFromProperty(property?.telecallerStatus, property?.additionalFields),
    [property?.telecallerStatus, property?.additionalFields],
  );

  const selectedCity = cities.find((item) => item.id === form.cityId);
  const selectedLocality = localities.find((item) => item.id === form.localityId);
  const selectedFurnishing = furnishingStatuses.find(
    (item) => normalize(item.name) === normalize(form.furnishingStatus),
  );

  const completionMissing = useMemo(() => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("Property name");
    if (!form.propertyTypeId) missing.push("Property type");
    if (!form.fullAddress.trim()) missing.push("Full address");
    if (!form.stateId) missing.push("State");
    if (!form.cityId) missing.push("City");
    if (!form.totalBuildingArea || Number(form.totalBuildingArea) <= 0) missing.push("Total area");
    if (!form.availableArea || Number(form.availableArea) <= 0) missing.push("Available area");
    if (!form.rentPerSqFt || Number(form.rentPerSqFt) <= 0) missing.push("Rent per sqft");
    if (!form.availabilityStatusId) missing.push("Availability status");
    if (!form.furnishingStatus) missing.push("Furnishing status");
    if (!contacts.some((contact) => contact.name.trim() && contact.phone.trim())) missing.push("Contact");
    return missing;
  }, [form, contacts]);

  function updateField<K extends keyof EditorForm>(field: K, value: EditorForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addContact() {
    setContacts((current) => [
      ...current,
      {
        id: `temp-${Date.now()}`,
        entityId: id,
        entityType: "property",
        contactType: "owner",
        name: "",
        phone: "",
        email: "",
        designation: "",
        isPrimary: current.length === 0,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function updateContact(contactId: string, field: keyof Contact, value: string | boolean) {
    setContacts((current) =>
      current.map((contact) => (contact.id === contactId ? { ...contact, [field]: value } : contact)),
    );
  }

  function removeContact(contactId: string) {
    setContacts((current) => current.filter((contact) => contact.id !== contactId));
  }

  function buildPayload() {
    const existingTerms = property?.commercialTerms || {};
    return {
      name: form.name.trim(),
      propertyTypeId: form.propertyTypeId || undefined,
      sourceId: form.sourceId || undefined,
      landlordName: form.landlordName.trim() || undefined,
      starRating: numberValue(form.starRating),
      fullAddress: form.fullAddress.trim() || undefined,
      stateId: form.stateId || undefined,
      cityId: form.cityId || undefined,
      cityName: selectedCity?.name || property?.city || undefined,
      localityId: form.localityId || undefined,
      localityName: selectedLocality?.name || property?.locality || undefined,
      pincode: form.pincode.trim() || undefined,
      googleMapsUrl: form.mapsUrl.trim() || undefined,
      latitude: numberValue(form.latitude),
      longitude: numberValue(form.longitude),
      totalBuildingArea: numberValue(form.totalBuildingArea),
      availabilityStatusId: form.availabilityStatusId || undefined,
      facingOption: form.facingOption || undefined,
      unitAccessLocation: form.unitAccessLocation || undefined,
      commercialTerms: {
        ...existingTerms,
        availableArea: numberValue(form.availableArea),
        rentPerSqFt: numberValue(form.rentPerSqFt),
        camCharges: numberValue(form.camCharges),
        maintenanceCharges: numberValue(form.maintenanceCharges),
        securityDeposit: numberValue(form.securityDeposit),
        leaseTerms: form.leaseTerms.trim() || undefined,
        escalationDetails: form.escalationDetails.trim() || undefined,
        brokerage: form.brokerage.trim() || undefined,
        furnishingStatusId: selectedFurnishing?.id,
        furnishingStatusName: selectedFurnishing?.name || form.furnishingStatus || undefined,
        availabilityDate: form.availabilityDate || undefined,
        possessionDate: form.possessionDate || undefined,
      },
      notes: form.notes.trim() || undefined,
      contacts: contacts
        .filter((contact) => contact.name.trim() || contact.phone.trim())
        .map((contact) => ({
          contactType: contact.contactType,
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          email: contact.email?.trim() || undefined,
          designation: contact.designation?.trim() || undefined,
          isPrimary: contact.isPrimary,
        })),
    };
  }

  async function saveDraft(showSuccess = true) {
    if (!property) return false;
    setSaving(true);
    try {
      await updateProperty.mutateAsync({ id, data: buildPayload() });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["properties", id] }),
        queryClient.invalidateQueries({ queryKey: ["property-intake"] }),
      ]);
      if (showSuccess) toast.success("Intake details saved");
      return true;
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save intake details");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function markFollowUp() {
    const saved = await saveDraft(false);
    if (!saved) return;
    setStatusBusy(true);
    try {
      await updateStatus.mutateAsync({ id, status: "FOLLOW_UP" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["properties", id] }),
        queryClient.invalidateQueries({ queryKey: ["property-intake"] }),
      ]);
      toast.success("Property marked for follow-up");
    } catch (statusError) {
      toast.error(statusError instanceof Error ? statusError.message : "Failed to update status");
    } finally {
      setStatusBusy(false);
    }
  }

  async function completeProperty() {
    if (completionMissing.length > 0) {
      toast.error(`Complete these fields first: ${completionMissing.join(", ")}`);
      return;
    }
    const saved = await saveDraft(false);
    if (!saved) return;
    setStatusBusy(true);
    try {
      await completeIntake.mutateAsync(id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["properties"] }),
        queryClient.invalidateQueries({ queryKey: ["property-intake"] }),
      ]);
      toast.success("Property completed and added to Properties");
      router.push("/properties");
    } catch (completeError) {
      toast.error(completeError instanceof Error ? completeError.message : "Failed to complete property");
    } finally {
      setStatusBusy(false);
    }
  }

  if (isLoading) {
    return <div className="mx-auto max-w-7xl p-6 text-sm text-muted-foreground">Loading intake property...</div>;
  }

  if (isError || !property) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border bg-card p-8 text-center">
          <h1 className="font-semibold">Unable to load intake property</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Property not found."}</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push("/property-intake")}>Back to Property Intake</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] pb-24 lg:pb-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/property-intake" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Property Intake
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{form.name || property.buildingName}</h1>
            <Badge variant="outline" className={statusClass(status)}>{status.replace("_", " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete the rider submission with the property owner before adding it to master Properties.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveDraft()} disabled={saving || statusBusy}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button onClick={completeProperty} disabled={saving || statusBusy || status === "COMPLETED"}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Complete & Add to Properties
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <main className="space-y-5">
          <Section
            id="basic"
            icon={<Building2 className="h-5 w-5" />}
            title="Basic property information"
            description="Identify the property and capture ownership/source information."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Property name" required>
                <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
              </Field>
              <Field label="Property type" required>
                <Select value={form.propertyTypeId} onValueChange={(value) => updateField("propertyTypeId", value || "")}>
                  <SelectTrigger><SelectValue placeholder="Select property type" /></SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Source">
                <Select value={form.sourceId} onValueChange={(value) => updateField("sourceId", value || "")}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {sources.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Landlord / owner name">
                <Input value={form.landlordName} onChange={(event) => updateField("landlordName", event.target.value)} placeholder="Property owner name" />
              </Field>
              <Field label="Property rating (1-5)">
                <Input type="number" min="1" max="5" value={form.starRating} onChange={(event) => updateField("starRating", event.target.value)} placeholder="e.g. 4" />
              </Field>
            </div>
          </Section>

          <Section
            id="location"
            icon={<MapPin className="h-5 w-5" />}
            title="Location"
            description="Review and correct the location captured by the rider."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Full address" required>
                  <Textarea className="min-h-24" value={form.fullAddress} onChange={(event) => updateField("fullAddress", event.target.value)} placeholder="Complete property address" />
                </Field>
              </div>
              <Field label="State" required>
                <Select
                  value={form.stateId}
                  onValueChange={(value) => {
                    updateField("stateId", value || "");
                    updateField("cityId", "");
                    updateField("localityId", "");
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{states.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="City" required>
                <Select
                  value={form.cityId}
                  onValueChange={(value) => {
                    updateField("cityId", value || "");
                    updateField("localityId", "");
                  }}
                  disabled={!form.stateId}
                >
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>{cities.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Locality">
                <Select value={form.localityId} onValueChange={(value) => updateField("localityId", value || "")} disabled={!form.cityId}>
                  <SelectTrigger><SelectValue placeholder="Select locality" /></SelectTrigger>
                  <SelectContent>{localities.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Pincode">
                <Input value={form.pincode} onChange={(event) => updateField("pincode", event.target.value)} placeholder="e.g. 302001" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Google Maps URL">
                  <Input value={form.mapsUrl} onChange={(event) => updateField("mapsUrl", event.target.value)} placeholder="https://maps.google.com/..." />
                </Field>
              </div>
              <Field label="Latitude">
                <Input type="number" step="any" value={form.latitude} onChange={(event) => updateField("latitude", event.target.value)} />
              </Field>
              <Field label="Longitude">
                <Input type="number" step="any" value={form.longitude} onChange={(event) => updateField("longitude", event.target.value)} />
              </Field>
            </div>
          </Section>

          <Section
            id="area"
            icon={<Building2 className="h-5 w-5" />}
            title="Area & property details"
            description="Capture the physical property details needed for the master record."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Total area (sqft)" required>
                <Input type="number" min="0" value={form.totalBuildingArea} onChange={(event) => updateField("totalBuildingArea", event.target.value)} placeholder="e.g. 5000" />
              </Field>
              <Field label="Available area (sqft)" required>
                <Input type="number" min="0" value={form.availableArea} onChange={(event) => updateField("availableArea", event.target.value)} placeholder="e.g. 2500" />
              </Field>
              <Field label="Facing">
                <Select value={form.facingOption} onValueChange={(value) => updateField("facingOption", value || "")}>
                  <SelectTrigger><SelectValue placeholder="Select facing" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FRONT">Front</SelectItem>
                    <SelectItem value="REAR">Rear</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Unit access">
                <Select value={form.unitAccessLocation} onValueChange={(value) => updateField("unitAccessLocation", value || "")}>
                  <SelectTrigger><SelectValue placeholder="Select access" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAIN_ROAD">Main Road</SelectItem>
                    <SelectItem value="INSIDE">Inside</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section
            id="commercial"
            icon={<BadgeIndianRupee className="h-5 w-5" />}
            title="Rent & commercial terms"
            description="Use the owner call to fill rent, CAM, deposits, brokerage, lease duration, and escalation details."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Rent per sqft (₹)" required>
                <Input type="number" min="0" value={form.rentPerSqFt} onChange={(event) => updateField("rentPerSqFt", event.target.value)} placeholder="e.g. 125" />
              </Field>
              <Field label="CAM charges (₹/sqft)">
                <Input type="number" min="0" value={form.camCharges} onChange={(event) => updateField("camCharges", event.target.value)} placeholder="e.g. 15" />
              </Field>
              <Field label="Maintenance charges (₹/sqft)">
                <Input type="number" min="0" value={form.maintenanceCharges} onChange={(event) => updateField("maintenanceCharges", event.target.value)} placeholder="e.g. 10" />
              </Field>
              <Field label="Security deposit (₹)">
                <Input type="number" min="0" value={form.securityDeposit} onChange={(event) => updateField("securityDeposit", event.target.value)} placeholder="e.g. 500000" />
              </Field>
              <Field label="Lease / minimum rent duration">
                <Input value={form.leaseTerms} onChange={(event) => updateField("leaseTerms", event.target.value)} placeholder="e.g. 3+3 years / 36 months" />
              </Field>
              <Field label="Brokerage">
                <Input value={form.brokerage} onChange={(event) => updateField("brokerage", event.target.value)} placeholder="e.g. 1 month rent" />
              </Field>
              <div className="md:col-span-2 lg:col-span-3">
                <Field label="Escalation details">
                  <Input value={form.escalationDetails} onChange={(event) => updateField("escalationDetails", event.target.value)} placeholder="e.g. 10% every 2 years" />
                </Field>
              </div>
            </div>
          </Section>

          <Section
            id="availability"
            icon={<CalendarDays className="h-5 w-5" />}
            title="Availability & furnishing"
            description="Complete availability, furnishing and possession information."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Availability status" required>
                <Select value={form.availabilityStatusId} onValueChange={(value) => updateField("availabilityStatusId", value || "")}>
                  <SelectTrigger><SelectValue placeholder="Select availability" /></SelectTrigger>
                  <SelectContent>{availabilityStatuses.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Furnishing status" required>
                <Select value={form.furnishingStatus} onValueChange={(value) => updateField("furnishingStatus", value || "")}>
                  <SelectTrigger><SelectValue placeholder="Select furnishing" /></SelectTrigger>
                  <SelectContent>
                    {furnishingStatuses.map((item) => <SelectItem key={item.id} value={normalize(item.name)}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Availability date">
                <Input type="date" value={form.availabilityDate} onChange={(event) => updateField("availabilityDate", event.target.value)} />
              </Field>
              <Field label="Possession date">
                <Input type="date" value={form.possessionDate} onChange={(event) => updateField("possessionDate", event.target.value)} />
              </Field>
            </div>
          </Section>

          <Section
            id="contacts"
            icon={<PhoneCall className="h-5 w-5" />}
            title="Contacts & telecalling"
            description="Edit the rider contact and add every owner, broker, caretaker or alternate contact collected during calls."
          >
            <div className="space-y-3">
              {contacts.length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No contacts added yet.</div>
              )}
              {contacts.map((contact, index) => (
                <div key={contact.id} className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Contact {index + 1}</span>
                      {contact.isPrimary && <Badge variant="secondary">Primary</Badge>}
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeContact(contact.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Contact type">
                      <Select value={contact.contactType} onValueChange={(value) => updateContact(contact.id, "contactType", value || "owner")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONTACT_TYPES.map((type) => <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Name" required>
                      <Input value={contact.name} onChange={(event) => updateContact(contact.id, "name", event.target.value)} placeholder="Contact name" />
                    </Field>
                    <Field label="Phone number" required>
                      <Input value={contact.phone} onChange={(event) => updateContact(contact.id, "phone", event.target.value)} placeholder="Mobile number" />
                    </Field>
                    <Field label="Email">
                      <Input type="email" value={contact.email || ""} onChange={(event) => updateContact(contact.id, "email", event.target.value)} placeholder="Email address" />
                    </Field>
                    <Field label="Designation">
                      <Input value={contact.designation || ""} onChange={(event) => updateContact(contact.id, "designation", event.target.value)} placeholder="Owner, manager, broker..." />
                    </Field>
                    <label className="flex items-end pb-2 text-sm">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={contact.isPrimary}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setContacts((current) => current.map((item) => ({ ...item, isPrimary: item.id === contact.id })));
                            } else {
                              updateContact(contact.id, "isPrimary", false);
                            }
                          }}
                        />
                        Primary contact
                      </span>
                    </label>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addContact} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Contact
              </Button>
            </div>
          </Section>

          <IntakeMediaManager buildingId={id} />

          <Section
            id="notes"
            icon={<PhoneCall className="h-5 w-5" />}
            title="Notes & follow-up"
            description="Record owner discussions, access instructions, negotiation context and next-call notes."
          >
            <Textarea
              className="min-h-32"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder="Owner discussion, pricing context, access details, follow-up notes..."
            />
          </Section>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="font-semibold">Rider submission</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex gap-3">
                <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div><p className="text-xs text-muted-foreground">Submitted by</p><p className="font-medium">{property.createdByName || "Unknown rider"}</p></div>
              </div>
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div><p className="text-xs text-muted-foreground">Submitted</p><p className="font-medium">{new Date(property.createdAt).toLocaleString("en-IN")}</p></div>
              </div>
              <div className="flex gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div><p className="text-xs text-muted-foreground">Record</p><p className="break-all font-medium">{property.propertyId}</p></div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="font-semibold">Master property checklist</h2>
            <p className="mt-1 text-xs text-muted-foreground">These core fields should be complete before submission.</p>
            <div className="mt-4 space-y-2 text-sm">
              {[
                ["Property type", Boolean(form.propertyTypeId)],
                ["Address", Boolean(form.fullAddress.trim())],
                ["State & city", Boolean(form.stateId && form.cityId)],
                ["Contact", contacts.some((item) => item.name.trim() && item.phone.trim())],
                ["Total area", Number(form.totalBuildingArea) > 0],
                ["Available area", Number(form.availableArea) > 0],
                ["Rent", Number(form.rentPerSqFt) > 0],
                ["Availability", Boolean(form.availabilityStatusId)],
                ["Furnishing", Boolean(form.furnishingStatus)],
                ["GPS", Boolean(form.latitude && form.longitude)],
              ].map(([label, complete]) => (
                <div key={String(label)} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={complete ? "text-green-600" : "text-amber-600"}>{complete ? "Captured" : "Pending"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Telecaller workflow</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Call the owner, complete the master property data, save as often as needed, and use Follow-up when another call is required.
            </p>
            {completionMissing.length > 0 && (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                {completionMissing.length} required item{completionMissing.length === 1 ? "" : "s"} still pending.
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur md:left-64 xl:hidden">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-2">
          <Button variant="outline" onClick={() => router.push("/property-intake")}>Back</Button>
          <div className="flex gap-2">
            <Button variant="outline" className="border-violet-200 text-violet-700" onClick={markFollowUp} disabled={saving || statusBusy}>Mark as Follow-up</Button>
            <Button onClick={completeProperty} disabled={saving || statusBusy || status === "COMPLETED"}>Complete & Add</Button>
          </div>
        </div>
      </div>

      <div className="mt-5 hidden items-center justify-between gap-3 xl:flex">
        <Button variant="outline" onClick={() => router.push("/property-intake")}>Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveDraft()} disabled={saving || statusBusy}>
            <Save className="mr-2 h-4 w-4" /> Save Draft
          </Button>
          <Button variant="outline" className="border-violet-200 text-violet-700" onClick={markFollowUp} disabled={saving || statusBusy}>Mark as Follow-up</Button>
          <Button onClick={completeProperty} disabled={saving || statusBusy || status === "COMPLETED"}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Complete & Add to Properties
          </Button>
        </div>
      </div>
    </div>
  );
}
