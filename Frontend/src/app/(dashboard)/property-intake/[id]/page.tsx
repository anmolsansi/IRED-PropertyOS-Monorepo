"use client";

import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IntakeMediaManager } from "@/components/property-intake/IntakeMediaManager";
import {
  useCompletePropertyIntake,
  useProperty,
  useUpdateIntakeStatus,
  useUpdateProperty,
  type IntakeStatus,
} from "@/hooks/use-properties";
import {
  EMPTY_PROPERTY_PROFILE,
  getPropertyProfile,
  mergePropertyProfile,
  type PropertyProfileFields,
  type PropertyProfileKey,
} from "@/lib/property-profile";
import type { Contact } from "@/types";
import { toast } from "sonner";

interface OverviewForm {
  name: string;
  fullAddress: string;
  mapsUrl: string;
  notes: string;
}

const EMPTY_OVERVIEW: OverviewForm = {
  name: "",
  fullAddress: "",
  mapsUrl: "",
  notes: "",
};

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

function EditorCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border bg-card p-4 shadow-sm sm:p-5 ${className}`}>
      <h2 className="mb-4 text-sm font-semibold sm:text-base">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function ProfileTextField({
  label,
  field,
  profile,
  onChange,
  placeholder,
}: {
  label: string;
  field: PropertyProfileKey;
  profile: PropertyProfileFields;
  onChange: (field: PropertyProfileKey, value: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Input value={profile[field]} onChange={(event) => onChange(field, event.target.value)} placeholder={placeholder} />
    </Field>
  );
}

function ProfileSelectField({
  label,
  field,
  profile,
  onChange,
  options,
  placeholder = "Select",
}: {
  label: string;
  field: PropertyProfileKey;
  profile: PropertyProfileFields;
  onChange: (field: PropertyProfileKey, value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Select value={profile[field]} onValueChange={(value) => onChange(field, value || "")}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
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

  const [overview, setOverview] = useState<OverviewForm>(EMPTY_OVERVIEW);
  const [profile, setProfile] = useState<PropertyProfileFields>(EMPTY_PROPERTY_PROFILE);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    if (!property) return;
    const loadedProfile = getPropertyProfile(property.additionalFields, property.commercialTerms);
    setOverview({
      name: property.buildingName || "",
      fullAddress: property.address || "",
      mapsUrl: property.mapsUrl || "",
      notes: property.notes || "",
    });
    setProfile({
      ...loadedProfile,
      postedOn: loadedProfile.postedOn || property.createdAt.slice(0, 10),
      buildingType: loadedProfile.buildingType || property.propertyType.replaceAll("_", " "),
    });
    setContacts(property.contacts || []);
  }, [property]);

  const status = useMemo(
    () => statusFromProperty(property?.telecallerStatus, property?.additionalFields),
    [property?.telecallerStatus, property?.additionalFields],
  );

  const primaryContactReady = contacts.some((contact) => contact.name.trim() && contact.phone.trim());

  const completionMissing = useMemo(() => {
    const missing: string[] = [];
    if (!overview.name.trim()) missing.push("Building Name");
    if (!overview.fullAddress.trim()) missing.push("Property Address");
    if (!overview.mapsUrl.trim()) missing.push("Google Map");
    if (!overview.notes.trim()) missing.push("Notes");
    if (!primaryContactReady) missing.push("Owner Contact Details");

    for (const key of Object.keys(EMPTY_PROPERTY_PROFILE) as PropertyProfileKey[]) {
      if (!profile[key].trim()) missing.push(key);
    }
    return missing;
  }, [overview, primaryContactReady, profile]);

  function updateProfile(field: PropertyProfileKey, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
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
      name: overview.name.trim(),
      fullAddress: overview.fullAddress.trim() || undefined,
      googleMapsUrl: overview.mapsUrl.trim() || undefined,
      notes: overview.notes.trim() || undefined,
      additionalFields: mergePropertyProfile(property?.additionalFields, profile),
      commercialTerms: {
        ...existingTerms,
        rent: profile.rent,
        cam: profile.cam,
        leasePeriod: profile.leasePeriod,
        escalation: profile.escalation,
        securityDeposit: profile.securityDeposit,
        stampDutyRegistration: profile.stampDutyRegistration,
        rentFreePeriod: profile.rentFreePeriod,
        premisesCondition: profile.premisesCondition,
        superArea: profile.superArea,
        carpetArea: profile.carpetArea,
        loading: profile.loading,
      },
      contacts: contacts
        .filter((contact) => contact.name.trim() || contact.phone.trim() || contact.email?.trim())
        .map((contact) => ({
          contactType: contact.contactType || "owner",
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
      const preview = completionMissing.slice(0, 5).join(", ");
      toast.error(`Complete all intake fields first: ${preview}${completionMissing.length > 5 ? "…" : ""}`);
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
      router.push(`/properties/${id}`);
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
    <div className="mx-auto w-full max-w-[1480px] space-y-5 pb-24 xl:pb-8">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>›</span>
        <Link href="/property-intake" className="hover:text-foreground">Property Intake</Link>
        <span>›</span>
        <span>{property.buildingName}</span>
      </div>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{overview.name || property.buildingName}</h1>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{property.propertyId}</Badge>
            <Badge variant="outline" className={statusClass(status)}>{status.replace("_", " ")}</Badge>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {[property.city, property.state].filter(Boolean).join(", ") || "Rider-submitted property"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => saveDraft()} disabled={saving || statusBusy}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button variant="outline" className="border-violet-200 text-violet-700 hover:text-violet-700" onClick={markFollowUp} disabled={saving || statusBusy}>
            Mark Follow-up
          </Button>
          <Button onClick={completeProperty} disabled={saving || statusBusy || status === "COMPLETED"}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Complete & Add to Properties
          </Button>
        </div>
      </header>

      <main className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <EditorCard title="1. Property Overview">
            <div className="grid gap-5 xl:grid-cols-[0.68fr_1.32fr]">
              <div className="space-y-4">
                <Field label="Posted On">
                  <Input type="date" value={profile.postedOn} onChange={(event) => updateProfile("postedOn", event.target.value)} />
                </Field>
                <ProfileSelectField
                  label="Building Type"
                  field="buildingType"
                  profile={profile}
                  onChange={updateProfile}
                  options={["Independent Building", "High Rise", "Mall", "Business Park", "Other"]}
                />
                <Field label="Building Name">
                  <Input value={overview.name} onChange={(event) => setOverview((current) => ({ ...current, name: event.target.value }))} />
                </Field>
                <Field label="Property Address">
                  <Textarea className="min-h-24" value={overview.fullAddress} onChange={(event) => setOverview((current) => ({ ...current, fullAddress: event.target.value }))} placeholder="Complete property address" />
                </Field>
                <ProfileTextField label="Verified No." field="verifiedNo" profile={profile} onChange={updateProfile} placeholder="Verification number" />
              </div>

              <div className="min-w-0 space-y-5">
                <IntakeMediaManager buildingId={id} embedded />

                <div>
                  <p className="mb-2 text-sm font-semibold">Google Map</p>
                  <div className="flex min-h-24 items-center justify-center rounded-xl border bg-muted/20">
                    <MapPin className="h-7 w-7 text-primary" />
                  </div>
                  <Input className="mt-2" value={overview.mapsUrl} onChange={(event) => setOverview((current) => ({ ...current, mapsUrl: event.target.value }))} placeholder="https://maps.google.com/..." />
                  {overview.mapsUrl && <a href={overview.mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">Open in Google Maps ↗</a>}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Owner Contact Details</p>
                    <Button type="button" size="sm" variant="outline" onClick={addContact}><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button>
                  </div>
                  <div className="space-y-3">
                    {contacts.length === 0 && <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">No owner contact added.</div>}
                    {contacts.map((contact, index) => (
                      <div key={contact.id} className="rounded-xl border p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold">Contact {index + 1}</span>
                          <Button type="button" variant="ghost" size="icon-xs" className="text-destructive" onClick={() => removeContact(contact.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input value={contact.name} onChange={(event) => updateContact(contact.id, "name", event.target.value)} placeholder="Contact person" />
                          <Input value={contact.phone} onChange={(event) => updateContact(contact.id, "phone", event.target.value)} placeholder="Mobile" />
                          <Input className="sm:col-span-2" type="email" value={contact.email || ""} onChange={(event) => updateContact(contact.id, "email", event.target.value)} placeholder="Email" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Field label="Notes">
                  <Textarea className="min-h-28" value={overview.notes} onChange={(event) => setOverview((current) => ({ ...current, notes: event.target.value }))} placeholder="Telecaller notes and owner discussion..." />
                </Field>
              </div>
            </div>
          </EditorCard>

          <div className="space-y-5">
            <EditorCard title="2. Building Compliance / Technical Details">
              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileSelectField label="Building Usage" field="buildingUsage" profile={profile} onChange={updateProfile} options={["Commercial", "Non Commercial", "IT/ITes", "Industrial"]} />
                <ProfileTextField label="Building Structure" field="buildingStructure" profile={profile} onChange={updateProfile} placeholder="e.g. B1+B2+G+4" />
                <ProfileTextField label="Age of Construction" field="ageOfConstruction" profile={profile} onChange={updateProfile} placeholder="e.g. 5 years" />
                <ProfileSelectField label="Sanctioned Map" field="sanctionedMap" profile={profile} onChange={updateProfile} options={["Available", "Not Available"]} />
                <ProfileTextField label="Floor Size" field="floorSize" profile={profile} onChange={updateProfile} placeholder="e.g. 5,000 sq.ft." />
                <ProfileSelectField label="Fire NOC" field="fireNoc" profile={profile} onChange={updateProfile} options={["Yes", "No"]} />
                <ProfileSelectField label="OC/CC" field="ocCc" profile={profile} onChange={updateProfile} options={["Yes", "No"]} />
              </div>
            </EditorCard>

            <EditorCard title="3. Area Details">
              <div className="grid gap-3 sm:grid-cols-2">
                <ProfileTextField label="Available Floor" field="availableFloor" profile={profile} onChange={updateProfile} placeholder="e.g. 2nd Floor" />
                <ProfileSelectField label="Premises Condition" field="premisesCondition" profile={profile} onChange={updateProfile} options={["Bareshell", "Semi Furnished", "Furnished"]} />
                <ProfileTextField label="Super Area" field="superArea" profile={profile} onChange={updateProfile} placeholder="e.g. 5,800 sq.ft." />
                <ProfileTextField label="Carpet Area" field="carpetArea" profile={profile} onChange={updateProfile} placeholder="e.g. 4,250 sq.ft." />
                <ProfileTextField label="Loading" field="loading" profile={profile} onChange={updateProfile} placeholder="e.g. 1.5 Ton/sq.ft." />
              </div>
            </EditorCard>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <EditorCard title="4. Financials">
            <div className="grid gap-3 sm:grid-cols-2">
              <ProfileTextField label="Rent" field="rent" profile={profile} onChange={updateProfile} placeholder="e.g. ₹110 / sq.ft. / month" />
              <ProfileTextField label="CAM" field="cam" profile={profile} onChange={updateProfile} placeholder="e.g. ₹18 / sq.ft. / month" />
              <ProfileTextField label="Lease Period" field="leasePeriod" profile={profile} onChange={updateProfile} placeholder="e.g. 5 Years" />
              <ProfileTextField label="Escalation" field="escalation" profile={profile} onChange={updateProfile} placeholder="e.g. 15% every 3 Years" />
              <ProfileTextField label="Security Deposit" field="securityDeposit" profile={profile} onChange={updateProfile} placeholder="e.g. 6 Months" />
              <ProfileTextField label="Stamp Duty & Registration" field="stampDutyRegistration" profile={profile} onChange={updateProfile} placeholder="e.g. 50:50" />
              <ProfileTextField label="Rent Free Period" field="rentFreePeriod" profile={profile} onChange={updateProfile} placeholder="e.g. 90 Days" />
            </div>
          </EditorCard>

          <EditorCard title="5. Amenities & Infrastructure">
            <div className="grid gap-3 sm:grid-cols-2">
              <ProfileTextField label="Lift" field="lift" profile={profile} onChange={updateProfile} placeholder="e.g. 4 Passenger + 1 Service" />
              <ProfileTextField label="Parking" field="parking" profile={profile} onChange={updateProfile} placeholder="e.g. Basement + Stilt" />
              <ProfileTextField label="Electricity Load" field="electricityLoad" profile={profile} onChange={updateProfile} placeholder="e.g. 1500 KVA" />
              <ProfileSelectField label="Space for DG Set" field="spaceForDgSet" profile={profile} onChange={updateProfile} options={["Available", "Not Available"]} />
              <ProfileSelectField label="Space for V Sat" field="spaceForVSat" profile={profile} onChange={updateProfile} options={["Available", "Not Available"]} />
              <ProfileSelectField label="Space for Signage" field="spaceForSignage" profile={profile} onChange={updateProfile} options={["Available", "Not Available"]} />
              <ProfileSelectField label="Vitrified Flooring" field="vitrifiedFlooring" profile={profile} onChange={updateProfile} options={["Yes", "No"]} />
              <ProfileTextField label="Toilets" field="toilets" profile={profile} onChange={updateProfile} placeholder="e.g. Yes (Each Floor)" />
              <ProfileSelectField label="Pantry" field="pantry" profile={profile} onChange={updateProfile} options={["Yes", "No"]} />
              <ProfileTextField label="Water Charges" field="waterCharges" profile={profile} onChange={updateProfile} placeholder="e.g. ₹5 / KL" />
            </div>
          </EditorCard>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur md:left-[68px] xl:hidden">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-2">
          <Button variant="outline" onClick={() => router.push("/property-intake")}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => saveDraft()} disabled={saving || statusBusy}>Save</Button>
            <Button onClick={completeProperty} disabled={saving || statusBusy || status === "COMPLETED"}>Complete & Add</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
