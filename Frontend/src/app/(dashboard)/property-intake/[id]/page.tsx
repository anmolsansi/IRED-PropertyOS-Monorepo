"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  PhoneCall,
  Save,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCompletePropertyIntake,
  useProperty,
  useUpdateIntakeStatus,
  useUpdateProperty,
  type IntakeStatus,
} from "@/hooks/use-properties";
import { toast } from "sonner";

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
  if (status === "COMPLETED") return "border-green-200 bg-green-50 text-green-700";
  if (status === "IN_PROGRESS") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "FOLLOW_UP") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function PropertyIntakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: property, isLoading, isError, error } = useProperty(id);
  const updateProperty = useUpdateProperty();
  const updateStatus = useUpdateIntakeStatus();
  const completeIntake = useCompletePropertyIntake();

  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    fullAddress: "",
    cityName: "",
    localityName: "",
    mapsUrl: "",
    latitude: "",
    longitude: "",
    notes: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  });

  useEffect(() => {
    if (!property) return;
    const primaryContact = property.contacts?.[0];
    setForm({
      name: property.buildingName || "",
      fullAddress: property.address || "",
      cityName: property.city || "",
      localityName: property.locality || "",
      mapsUrl: property.mapsUrl || "",
      latitude: property.latitude?.toString() || "",
      longitude: property.longitude?.toString() || "",
      notes: property.notes || "",
      contactName: primaryContact?.name || "",
      contactPhone: primaryContact?.phone || "",
      contactEmail: primaryContact?.email || "",
    });
  }, [property]);

  const status = useMemo(
    () => statusFromProperty(property?.telecallerStatus, property?.additionalFields),
    [property],
  );

  function setField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildPayload() {
    const contacts = form.contactName.trim() || form.contactPhone.trim()
      ? [
          {
            name: form.contactName.trim(),
            phone: form.contactPhone.trim(),
            email: form.contactEmail.trim() || undefined,
            contactType: "owner",
            isPrimary: true,
          },
        ]
      : [];

    return {
      name: form.name.trim(),
      fullAddress: form.fullAddress.trim() || undefined,
      cityName: form.cityName.trim() || undefined,
      localityName: form.localityName.trim() || undefined,
      googleMapsUrl: form.mapsUrl.trim() || undefined,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      notes: form.notes.trim() || undefined,
      contacts,
    };
  }

  async function saveDraft(showSuccess = true) {
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
      toast.error(saveError instanceof Error ? saveError.message : "Unable to save intake details");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function markStatus(nextStatus: "IN_PROGRESS" | "FOLLOW_UP") {
    setStatusBusy(true);
    try {
      await updateStatus.mutateAsync({ id, status: nextStatus });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["properties", id] }),
        queryClient.invalidateQueries({ queryKey: ["property-intake"] }),
      ]);
      toast.success(nextStatus === "FOLLOW_UP" ? "Marked for follow-up" : "Review started");
    } catch (statusError) {
      toast.error(statusError instanceof Error ? statusError.message : "Unable to update intake status");
    } finally {
      setStatusBusy(false);
    }
  }

  async function complete() {
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
      toast.error(completeError instanceof Error ? completeError.message : "Unable to complete Property Intake");
    } finally {
      setStatusBusy(false);
    }
  }

  if (isLoading) {
    return <div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">Loading intake record...</div>;
  }

  if (isError || !property) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div>
          <p className="font-medium text-destructive">Unable to load intake record</p>
          <p className="mt-1 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Property not found."}</p>
          <Button asChild variant="outline" className="mt-4"><Link href="/property-intake">Back to Property Intake</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 pb-24 lg:space-y-6 lg:pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/property-intake" className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Property Intake
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{property.buildingName}</h1>
            <Badge variant="outline" className={statusClass(status)}>{status.replace("_", " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Complete the rider submission, capture call details, and add it to master Properties.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/properties/${id}/edit`}>
            Advanced property editor <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_310px]">
        <div className="space-y-5">
          <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></div>
              <div><h2 className="font-semibold">Location & property information</h2><p className="text-sm text-muted-foreground">Review and correct the field information captured by the rider.</p></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Property name</label>
                <Input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Property name" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Full address</label>
                <Textarea value={form.fullAddress} onChange={(event) => setField("fullAddress", event.target.value)} placeholder="Complete property address" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">State</label>
                <Input value={property.state || ""} disabled />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">City</label>
                <Input value={form.cityName} onChange={(event) => setField("cityName", event.target.value)} placeholder="City" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Locality</label>
                <Input value={form.localityName} onChange={(event) => setField("localityName", event.target.value)} placeholder="Locality / area" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Google Maps URL</label>
                <Input value={form.mapsUrl} onChange={(event) => setField("mapsUrl", event.target.value)} placeholder="https://maps.google.com/..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Latitude</label>
                <Input type="number" step="any" value={form.latitude} onChange={(event) => setField("latitude", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Longitude</label>
                <Input type="number" step="any" value={form.longitude} onChange={(event) => setField("longitude", event.target.value)} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><PhoneCall className="h-5 w-5" /></div>
              <div><h2 className="font-semibold">Contact & telecalling</h2><p className="text-sm text-muted-foreground">Update the owner/contact information gathered during the verification call.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><label className="text-sm font-medium">Contact name</label><Input value={form.contactName} onChange={(event) => setField("contactName", event.target.value)} placeholder="Owner / contact name" /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Phone number</label><Input value={form.contactPhone} onChange={(event) => setField("contactPhone", event.target.value)} placeholder="Phone number" /></div>
              <div className="space-y-1.5 sm:col-span-2"><label className="text-sm font-medium">Email</label><Input type="email" value={form.contactEmail} onChange={(event) => setField("contactEmail", event.target.value)} placeholder="Email address (optional)" /></div>
              <div className="space-y-1.5 sm:col-span-2"><label className="text-sm font-medium">Notes / information gathered</label><Textarea className="min-h-28" value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Owner discussion, pricing context, access details, follow-up notes..." /></div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="font-semibold">Rider submission</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-3"><UserRound className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Submitted by</p><p className="font-medium">{property.createdByName || "Rider"}</p></div></div>
              <div className="flex items-center gap-3"><Clock3 className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Submitted</p><p className="font-medium">{new Date(property.createdAt).toLocaleString("en-IN")}</p></div></div>
              <div className="flex items-center gap-3"><Building2 className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Record</p><p className="font-medium">{property.propertyId}</p></div></div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="font-semibold">Intake checklist</h2>
            <div className="mt-4 space-y-2.5 text-sm">
              {[
                ["Address", Boolean(form.fullAddress.trim())],
                ["State", Boolean(property.state)],
                ["City", Boolean(form.cityName.trim())],
                ["Contact", Boolean(form.contactName.trim() || form.contactPhone.trim())],
                ["GPS", Boolean(form.latitude && form.longitude)],
              ].map(([label, complete]) => (
                <div key={String(label)} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={complete ? "text-green-600" : "text-amber-600"}>{complete ? "Captured" : "Pending"}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm font-medium">Workflow</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Save as many times as needed. Use Follow-up when another call is required. Complete only when the record is ready to become master property data.</p>
          </section>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur md:left-64 lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={() => router.push("/property-intake")}>Back</Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            {status === "NEW" && <Button type="button" variant="outline" disabled={statusBusy} onClick={() => markStatus("IN_PROGRESS")}>Start Review</Button>}
            <Button type="button" variant="outline" disabled={saving || statusBusy} onClick={() => saveDraft()}><Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save Draft"}</Button>
            <Button type="button" variant="outline" disabled={statusBusy} className="border-violet-300 text-violet-700 hover:text-violet-700" onClick={() => markStatus("FOLLOW_UP")}>Mark as Follow-up</Button>
            <Button type="button" disabled={saving || statusBusy} onClick={complete}><CheckCircle2 className="mr-2 h-4 w-4" />Complete & Add to Properties</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
