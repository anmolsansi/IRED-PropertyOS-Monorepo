"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronUp,
  FileText,
  Film,
  ImageIcon,
  Link2,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  MultiStepForm,
  StepContent,
  FormField,
  useMultiStepForm,
} from "@/components/shared/MultiStepForm";
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
import { useStates, findById, type ReferenceItem } from "@/hooks/use-reference";
import { useAuthSession } from "@/hooks/use-session";
import type { Contact, MediaDocument } from "@/types";

const steps = [
  { id: "property", title: "Property Details", description: "Field information" },
  { id: "review", title: "Review & Submit", description: "Submit to intake" },
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

const FALLBACK_STATES: ReferenceItem[] = [
  ["AP", "Andhra Pradesh"], ["AR", "Arunachal Pradesh"], ["AS", "Assam"],
  ["BR", "Bihar"], ["CG", "Chhattisgarh"], ["GA", "Goa"], ["GJ", "Gujarat"],
  ["HR", "Haryana"], ["HP", "Himachal Pradesh"], ["JH", "Jharkhand"],
  ["KA", "Karnataka"], ["KL", "Kerala"], ["MP", "Madhya Pradesh"],
  ["MH", "Maharashtra"], ["MN", "Manipur"], ["ML", "Meghalaya"],
  ["MZ", "Mizoram"], ["NL", "Nagaland"], ["OD", "Odisha"], ["PB", "Punjab"],
  ["RJ", "Rajasthan"], ["SK", "Sikkim"], ["TN", "Tamil Nadu"], ["TS", "Telangana"],
  ["TR", "Tripura"], ["UP", "Uttar Pradesh"], ["UK", "Uttarakhand"],
  ["WB", "West Bengal"], ["AN", "Andaman and Nicobar Islands"], ["CH", "Chandigarh"],
  ["DN", "Dadra and Nagar Haveli and Daman and Diu"], ["DL", "Delhi"],
  ["JK", "Jammu and Kashmir"], ["LA", "Ladakh"], ["LD", "Lakshadweep"],
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

interface FormData {
  address: string;
  state: string;
  city: string;
  locality: string;
  latitude: string;
  longitude: string;
  mapsUrl: string;
  notes: string;
}

const initialFormData: FormData = {
  address: "",
  state: "",
  city: "",
  locality: "",
  latitude: "",
  longitude: "",
  mapsUrl: "",
  notes: "",
};

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

function SectionCard({
  icon,
  title,
  description,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:p-6 ${className}`}>
      <div className="mb-4 flex items-start gap-3 lg:mb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-5">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">{description}</p>
        </div>
        <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      {children}
    </section>
  );
}

export default function NewPropertyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthSession();
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

  const { data: statesData = [] } = useStates();
  const states = statesData.length > 0 ? statesData : FALLBACK_STATES;

  function updateField(field: keyof FormData, value: string | null) {
    setFormData((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  function nextId(prefix: string) {
    idCounter.current += 1;
    return `${prefix}-${idCounter.current}`;
  }

  function captureGps() {
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
  }

  function derivePropertyName() {
    const addressLine = formData.address.trim().split("\n")[0]?.trim();
    return addressLine || [formData.locality, formData.city].filter(Boolean).join(", ") || "New Property";
  }

  function getCreatedBuildingId(response: unknown) {
    const maybeWrapped = response as { data?: { id?: string }; id?: string };
    return maybeWrapped.data?.id || maybeWrapped.id;
  }

  function getMediaFileType(category: MediaDocument["category"]) {
    return category === "photo" ? "image" : category === "video" ? "video" : "document";
  }

  async function uploadPendingMedia(buildingId: string) {
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
      if (!uploadResult.ok) throw new Error(`Failed to upload ${item.file.name}`);

      await completeUpload.mutateAsync({
        mediaId: uploadData.mediaId,
        fileSizeBytes: item.file.size,
      });
    }
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    const validation = propertySchema.safeParse(formData);
    if (!validation.success) {
      toast.error("Please fix validation errors before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedState = findById(states, formData.state);
      const payload: Record<string, unknown> = {
        name: derivePropertyName(),
        fullAddress: formData.address || undefined,
        stateId: formData.state || undefined,
        stateCode: selectedState?.code || undefined,
        stateName: selectedState?.name || undefined,
        cityName: formData.city || undefined,
        localityName: formData.locality || undefined,
        googleMapsUrl: formData.mapsUrl || undefined,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
        notes: formData.notes || undefined,
        contacts: contacts.length > 0 ? contacts : undefined,
        additionalFields:
          additionalFields.length > 0
            ? additionalFields
                .filter((field) => field.value.trim())
                .map((field) => ({ type: field.type, label: field.label, value: field.value.trim() }))
            : undefined,
      };

      const createdProperty = await createProperty.mutateAsync(payload);
      const buildingId = getCreatedBuildingId(createdProperty);

      if (buildingId && media.length > 0) {
        try {
          await uploadPendingMedia(buildingId);
          toast.success(`${media.length} media file${media.length === 1 ? "" : "s"} uploaded`);
        } catch (uploadError) {
          toast.error(uploadError instanceof Error ? uploadError.message : "Property submitted, but media upload failed.");
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["property-intake"] }),
        queryClient.invalidateQueries({ queryKey: ["properties"] }),
      ]);

      toast.success("Property submitted to Property Intake");
      router.push(session?.user?.role === "RIDER" ? "/properties/new/submitted" : "/property-intake");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit property");
    } finally {
      setIsSubmitting(false);
    }
  }

  const validateStep = useCallback(
    (stepIndex: number): Record<string, string> | null => {
      if (stepIndex !== 0) return null;
      const result = propertySchema.safeParse(formData);
      if (result.success) return null;

      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (["state", "city", "mapsUrl"].includes(path) && !errors[path]) errors[path] = issue.message;
      }
      return Object.keys(errors).length > 0 ? errors : null;
    },
    [formData],
  );

  function addContact() {
    setContacts((current) => [
      ...current,
      {
        id: nextId("contact"),
        entityId: "",
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

  function updateContact(id: string, field: keyof Contact, value: string | boolean) {
    setContacts((current) => current.map((contact) => (contact.id === id ? { ...contact, [field]: value } : contact)));
  }

  function removeContact(id: string) {
    setContacts((current) => current.filter((contact) => contact.id !== id));
  }

  function openMediaPicker(category: MediaDocument["category"]) {
    pendingMediaCategory.current = category;
    mediaInputRef.current?.click();
  }

  function handleMediaSelection(files: FileList | null) {
    if (!files?.length) return;
    const category = pendingMediaCategory.current;
    const selected = Array.from(files).map((file) => ({ id: nextId("media"), file, category }));
    setMedia((current) => [...current, ...selected]);
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  }

  function addAdditionalField() {
    setAdditionalFields((current) => [
      ...current,
      { id: nextId("field"), type: "instagram", label: "Instagram", value: "" },
    ]);
  }

  function updateAdditionalField(id: string, field: keyof AdditionalField, value: string) {
    setAdditionalFields((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (field === "type") {
          const selectedType = ADDITIONAL_FIELD_TYPES.find((option) => option.value === value);
          return { ...item, type: value, label: selectedType?.label || item.label };
        }
        return { ...item, [field]: value };
      }),
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] pb-20 sm:pb-6 lg:px-2 xl:px-4">
      <div className="mb-5 flex items-center justify-between sm:hidden">
        <Button type="button" variant="ghost" size="icon" onClick={() => router.back()} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Add New Property</h1>
        <span className="w-10" />
      </div>

      <div className="hidden sm:block">
        <PageHeader
          title="Add New Property"
          description="Capture field information and submit the property to the Property Intake queue."
        />
      </div>

      <MultiStepForm
        steps={steps}
        onSubmit={handleSubmit}
        validateStep={validateStep}
        isSubmitting={isSubmitting}
        className="lg:space-y-7"
        contentCardClassName="border-0 bg-transparent shadow-none"
        contentClassName="p-0"
        navigationClassName="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 lg:justify-end"
        previousLabel="Back"
        nextLabel="Continue to Review"
        submitLabel="Submit to Intake"
      >
        <StepContent>
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-6">
              <SectionCard className="h-full" icon={<ImageIcon className="h-5 w-5" />} title="Media" description="Add photos, videos, documents, or floor plans.">
                <input ref={mediaInputRef} type="file" className="hidden" multiple onChange={(event) => handleMediaSelection(event.target.files)} />
                <button
                  type="button"
                  onClick={() => openMediaPicker("photo")}
                  className="flex min-h-[150px] w-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
                >
                  <Upload className="mb-2 h-7 w-7 text-primary" />
                  <span className="text-sm font-medium">Upload files</span>
                  <span className="mt-1 text-xs text-muted-foreground">Tap to choose files</span>
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {MEDIA_CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    return (
                      <Button key={category.value} type="button" variant="outline" className="min-h-11 gap-2" onClick={() => openMediaPicker(category.value as MediaDocument["category"])}>
                        <Icon className="h-4 w-4 text-primary" />
                        <span>{category.label}</span>
                      </Button>
                    );
                  })}
                </div>
                {media.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {media.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-xl border p-3">
                        <div className="min-w-0"><p className="truncate text-sm font-medium">{item.file.name}</p><p className="text-xs text-muted-foreground">{item.category} · {(item.file.size / 1024 / 1024).toFixed(2)} MB</p></div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setMedia((current) => current.filter((file) => file.id !== item.id))}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard className="h-full" icon={<Users className="h-5 w-5" />} title="Contacts" description="Capture the person the telecaller should contact.">
                {contacts.length === 0 ? (
                  <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border bg-muted/10 px-4 py-6 text-center">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted"><Users className="h-5 w-5 text-muted-foreground" /></div>
                    <p className="text-sm font-medium">No contacts added yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Add the owner, broker, caretaker, or another contact if available.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="rounded-xl border p-3">
                        <div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium">Contact</span><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeContact(contact.id)}><Trash2 className="h-4 w-4" /></Button></div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5"><label className="text-xs font-medium">Type</label><Select value={contact.contactType} onValueChange={(value) => updateContact(contact.id, "contactType", value)}><SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{CONTACT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>
                          <div className="space-y-1.5"><label className="text-xs font-medium">Name</label><Input className="min-h-11" value={contact.name} onChange={(event) => updateContact(contact.id, "name", event.target.value)} /></div>
                          <div className="space-y-1.5"><label className="text-xs font-medium">Phone</label><Input className="min-h-11" value={contact.phone} onChange={(event) => updateContact(contact.id, "phone", event.target.value)} /></div>
                          <div className="space-y-1.5"><label className="text-xs font-medium">Email</label><Input className="min-h-11" type="email" value={contact.email || ""} onChange={(event) => updateContact(contact.id, "email", event.target.value)} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" className="mt-3 min-h-11 w-full border-primary/50 text-primary" onClick={addContact}><Plus className="mr-2 h-4 w-4" />Add Contact</Button>
              </SectionCard>
            </div>

            <SectionCard icon={<MapPin className="h-5 w-5" />} title="Location" description="Add the property address and field location details.">
              <div className="grid gap-4 sm:grid-cols-2 lg:gap-x-5">
                <ValidatedField label="Full Address" field="address" className="sm:col-span-2"><Textarea className="min-h-20" placeholder="Enter complete address" value={formData.address} onChange={(event) => updateField("address", event.target.value)} /></ValidatedField>
                <ValidatedField label="State" required field="state"><Select value={formData.state} onValueChange={(value) => { updateField("state", value); updateField("city", ""); updateField("locality", ""); }}><SelectTrigger className="min-h-11"><SelectValue>{findById(states, formData.state)?.name || "Select state"}</SelectValue></SelectTrigger><SelectContent>{states.map((state) => <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>)}</SelectContent></Select></ValidatedField>
                <ValidatedField label="City" required field="city"><Input className="min-h-11" placeholder="Enter city" value={formData.city} onChange={(event) => updateField("city", event.target.value)} /></ValidatedField>
                <FormField label="Locality"><Input className="min-h-11" placeholder="Enter locality / area" value={formData.locality} onChange={(event) => updateField("locality", event.target.value)} /></FormField>
                <FormField label="Google Maps URL"><div className="relative"><Link2 className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input className="min-h-11 pl-9" placeholder="https://maps.google.com/..." value={formData.mapsUrl} onChange={(event) => updateField("mapsUrl", event.target.value)} /></div></FormField>
                <div className="grid gap-3 sm:col-span-2 lg:grid-cols-[260px_1fr]">
                  <Button type="button" variant="outline" className="min-h-11 text-primary" onClick={captureGps} disabled={gpsLoading}>{gpsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}{gpsLoading ? "Capturing..." : "Use current location"}</Button>
                  <div className="flex min-h-11 items-center justify-between rounded-xl border bg-muted/10 px-3 text-sm text-muted-foreground"><span>Lat: {formData.latitude || "—"} · Long: {formData.longitude || "—"}</span>{formData.latitude && formData.longitude && <Badge className="bg-green-100 text-green-700 hover:bg-green-100">GPS Captured</Badge>}</div>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={<FileText className="h-5 w-5" />} title="Additional Details" description="Add optional field notes or useful links for the telecaller.">
              <div className="flex justify-end"><Button type="button" variant="outline" onClick={addAdditionalField}><Plus className="mr-2 h-4 w-4" />Add Field</Button></div>
              {additionalFields.length > 0 && (
                <div className="mt-3 space-y-3">
                  {additionalFields.map((field) => (
                    <div key={field.id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-[180px_1fr_1fr_44px]">
                      <Select value={field.type} onValueChange={(value) => updateAdditionalField(field.id, "type", value)}><SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger><SelectContent>{ADDITIONAL_FIELD_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select>
                      <Input className="min-h-11" value={field.label} onChange={(event) => updateAdditionalField(field.id, "label", event.target.value)} placeholder="Label" />
                      <Input className="min-h-11" value={field.value} onChange={(event) => updateAdditionalField(field.id, "value", event.target.value)} placeholder="Value or URL" />
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setAdditionalFields((current) => current.filter((item) => item.id !== field.id))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 space-y-1.5"><label className="text-sm font-medium">Notes</label><Textarea className="min-h-24" placeholder="Add field notes about this property..." value={formData.notes} onChange={(event) => updateField("notes", event.target.value)} /></div>
            </SectionCard>
          </div>
        </StepContent>

        <StepContent>
          <div className="space-y-5">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="font-semibold">Review Before Intake</h3>
              <p className="mt-1 text-sm text-muted-foreground">Confirm what the rider captured. The telecaller can edit and enrich this record after submission.</p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border bg-card p-5 shadow-sm">
                <h4 className="mb-3 text-sm font-semibold">Location</h4>
                <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Address</dt><dd>{formData.address || "—"}</dd>
                  <dt className="text-muted-foreground">State</dt><dd>{findById(states, formData.state)?.name || "—"}</dd>
                  <dt className="text-muted-foreground">City</dt><dd>{formData.city || "—"}</dd>
                  <dt className="text-muted-foreground">Locality</dt><dd>{formData.locality || "—"}</dd>
                  <dt className="text-muted-foreground">GPS</dt><dd>{formData.latitude && formData.longitude ? `${formData.latitude}, ${formData.longitude}` : "—"}</dd>
                </dl>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border bg-card p-5 shadow-sm"><h4 className="text-sm font-semibold">Contacts ({contacts.length})</h4><p className="mt-2 text-sm text-muted-foreground">{contacts.length ? contacts.map((contact) => contact.name || contact.phone).filter(Boolean).join(", ") : "No contacts added."}</p></div>
                <div className="rounded-2xl border bg-card p-5 shadow-sm"><h4 className="text-sm font-semibold">Media ({media.length})</h4><p className="mt-2 text-sm text-muted-foreground">{media.length ? `${media.length} file${media.length === 1 ? "" : "s"} ready to upload.` : "No media added."}</p></div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
              Submitting creates a temporary Property Intake record. It will not appear in master Properties until a telecaller completes the intake workflow.
            </div>
          </div>
        </StepContent>
      </MultiStepForm>
    </div>
  );
}
