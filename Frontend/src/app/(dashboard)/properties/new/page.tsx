"use client";

import { useState, useRef, useCallback } from "react";
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
import type { Contact, MediaDocument } from "@/types";

const steps = [
  { id: "property", title: "Property Details", description: "All property details" },
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

  function updateField(field: string, value: string | null) {
    setFormData((prev) => ({ ...prev, [field]: value ?? "" }));
  }

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
            : "Unable to get location. Please enter coordinates manually."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

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
    return addressLine || [formData.locality, formData.city].filter(Boolean).join(", ") || "New Property";
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
      if (!uploadResult.ok) throw new Error(`Failed to upload ${item.file.name}`);
      await completeUpload.mutateAsync({ mediaId: uploadData.mediaId, fileSizeBytes: item.file.size });
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
        stateName: formData.state || undefined,
        cityName: formData.city || undefined,
        localityName: formData.locality || undefined,
        notes: formData.notes || undefined,
      };
      const extraFields = additionalFields
        .filter((field) => field.value.trim())
        .map((field) => ({
          type: field.type,
          label: field.label.trim() || ADDITIONAL_FIELD_TYPES.find((item) => item.value === field.type)?.label || "Other",
          value: field.value.trim(),
        }));
      const selectedState = findById(states, formData.state);
      if (formData.state) {
        if (isUuid(formData.state)) payload.stateId = formData.state;
        else {
          payload.stateCode = selectedState?.code || formData.state;
          payload.stateName = selectedState?.name || formData.state;
        }
      }
      if (formData.mapsUrl) payload.googleMapsUrl = formData.mapsUrl;
      if (formData.latitude) payload.latitude = parseFloat(formData.latitude);
      if (formData.longitude) payload.longitude = parseFloat(formData.longitude);
      if (extraFields.length > 0) payload.additionalFields = extraFields;
      if (contacts.length > 0) payload.contacts = contacts;

      const createdProperty = await createProperty.mutateAsync(payload);
      const buildingId = getCreatedBuildingId(createdProperty);
      if (buildingId) {
        try {
          await uploadPendingMedia(buildingId);
        } catch (uploadError) {
          toast.error(uploadError instanceof Error ? uploadError.message : "Property created, but media upload failed.");
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Property created successfully!");
      router.push("/properties");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create property");
    } finally {
      setIsSubmitting(false);
    }
  }

  const validateStep = useCallback(
    (stepIndex: number): Record<string, string> | null => {
      const stepFields: Record<number, string[]> = { 0: ["state", "city", "mapsUrl"] };
      const fields = stepFields[stepIndex];
      if (!fields) return null;
      const result = propertySchema.safeParse(formData);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const path = issue.path[0] as string;
          if (fields.includes(path) && !fieldErrors[path]) fieldErrors[path] = issue.message;
        }
        return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
      }
      return null;
    },
    [formData]
  );

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
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value ?? "" } : c)));
  }

  function removeContact(id: string) {
    setContacts((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length > 0 && !filtered.some((c) => c.isPrimary)) filtered[0].isPrimary = true;
      return filtered;
    });
  }

  function setPrimaryContact(id: string) {
    setContacts((prev) => prev.map((c) => ({ ...c, isPrimary: c.id === id })));
  }

  function openMediaPicker(category: MediaDocument["category"]) {
    pendingMediaCategory.current = category;
    mediaInputRef.current?.click();
  }

  function handleMediaSelection(files: FileList | null) {
    if (!files || files.length === 0) return;
    const category = pendingMediaCategory.current;
    const selectedFiles = Array.from(files).map((file) => {
      idCounter.current += 1;
      return { id: `media-${idCounter.current}`, file, category };
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
      { id: `extra-${idCounter.current}`, type: "instagram", label: "Instagram", value: "" },
    ]);
  }

  function updateAdditionalField(id: string, field: keyof AdditionalField, value: string) {
    setAdditionalFields((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "type") {
          const selectedType = ADDITIONAL_FIELD_TYPES.find((type) => type.value === value);
          return { ...item, type: value, label: selectedType?.label || item.label };
        }
        return { ...item, [field]: value };
      })
    );
  }

  function removeAdditionalField(id: string) {
    setAdditionalFields((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] pb-20 sm:pb-6 lg:px-2 xl:px-4">
      <div className="mb-5 flex items-center justify-between sm:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.push("/properties")}
          aria-label="Back to properties"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Add New Property</h1>
        <span className="w-10" />
      </div>

      <div className="hidden sm:block">
        <PageHeader
          title="Add New Property"
          description="Create a new property record in Master Data."
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
        navigationClassName="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 lg:justify-end lg:pt-1"
        previousLabel="Back"
        nextLabel="Continue to Review"
        submitLabel="Create Property"
      >
        <StepContent>
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-6">
              <SectionCard
                className="h-full"
                icon={<ImageIcon className="h-5 w-5" />}
                title="Media"
                description="Add photos, videos, documents, or floor plans."
              >
                <input
                  ref={mediaInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(event) => handleMediaSelection(event.target.files)}
                />
                <button
                  type="button"
                  onClick={() => openMediaPicker("photo")}
                  className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/[0.03] lg:min-h-[150px]"
                >
                  <Upload className="mb-2 h-7 w-7 text-primary" />
                  <span className="text-sm font-medium">Upload files</span>
                  <span className="mt-1 text-xs text-muted-foreground">Tap to choose files</span>
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {MEDIA_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <Button
                        key={cat.value}
                        type="button"
                        variant="outline"
                        className="min-h-11 gap-2"
                        onClick={() => openMediaPicker(cat.value as MediaDocument["category"])}
                      >
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-xs sm:text-sm">{cat.label}</span>
                      </Button>
                    );
                  })}
                </div>
                {media.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {media.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {MEDIA_CATEGORIES.find((c) => c.value === item.category)?.label} · {(item.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive"
                          onClick={() => removeMediaItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                className="h-full"
                icon={<Users className="h-5 w-5" />}
                title="Contacts"
                description="Add people or organizations related to this property."
              >
                {contacts.length === 0 ? (
                  <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border bg-muted/10 px-4 py-6 text-center">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No contacts added yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Add property contacts to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="rounded-xl border p-3 sm:p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Contact</span>
                            {contact.isPrimary && <Badge variant="secondary">Primary</Badge>}
                          </div>
                          <div className="flex items-center gap-1">
                            {!contact.isPrimary && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => setPrimaryContact(contact.id)}>
                                Set Primary
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => removeContact(contact.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">Type</label>
                            <Select value={contact.contactType} onValueChange={(v) => updateContact(contact.id, "contactType", v)}>
                              <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CONTACT_TYPES.map((ct) => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">Name *</label>
                            <Input className="min-h-11" placeholder="Contact name" value={contact.name} onChange={(e) => updateContact(contact.id, "name", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">Phone *</label>
                            <Input className="min-h-11" placeholder="Phone number" value={contact.phone} onChange={(e) => updateContact(contact.id, "phone", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">Email</label>
                            <Input className="min-h-11" type="email" placeholder="Email (optional)" value={contact.email || ""} onChange={(e) => updateContact(contact.id, "email", e.target.value)} />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-medium">Designation</label>
                            <Input className="min-h-11" placeholder="Designation (optional)" value={contact.designation || ""} onChange={(e) => updateContact(contact.id, "designation", e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 min-h-11 w-full border-primary/50 text-primary hover:text-primary"
                  onClick={addContact}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Contact
                </Button>
              </SectionCard>
            </div>

            <SectionCard
              icon={<MapPin className="h-5 w-5" />}
              title="Location"
              description="Add the property’s address and location details."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-x-5 lg:gap-y-4">
                <ValidatedField label="Full Address" field="address" className="sm:col-span-2">
                  <Textarea
                    className="min-h-20 lg:min-h-24"
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
                    <SelectTrigger className="min-h-11">
                      <SelectValue>{findById(states, formData.state)?.name || "Select state"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </ValidatedField>

                <ValidatedField label="City" required field="city">
                  <Input
                    className="min-h-11"
                    placeholder="Enter city"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                  />
                </ValidatedField>

                <FormField label="Locality">
                  <Input
                    className="min-h-11"
                    placeholder="Enter locality / area"
                    value={formData.locality}
                    onChange={(e) => updateField("locality", e.target.value)}
                  />
                </FormField>

                <FormField label="Google Maps URL">
                  <div className="relative">
                    <Link2 className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="min-h-11 pl-9"
                      placeholder="https://maps.google.com/..."
                      value={formData.mapsUrl}
                      onChange={(e) => updateField("mapsUrl", e.target.value)}
                    />
                  </div>
                </FormField>

                <div className="grid gap-3 sm:col-span-2 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)] lg:items-stretch">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full text-primary"
                    onClick={captureGps}
                    disabled={gpsLoading}
                  >
                    {gpsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                    {gpsLoading ? "Capturing..." : "Use current location"}
                  </Button>

                  {formData.latitude || formData.longitude ? (
                    <div className="flex min-h-11 flex-col gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex min-w-0 items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">Lat: {formData.latitude || "—"} · Long: {formData.longitude || "—"}</span>
                      </span>
                      <Badge className="w-fit shrink-0 bg-green-100 text-green-700 hover:bg-green-100">
                        GPS Location Captured
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex min-h-11 items-center gap-2 rounded-xl border bg-muted/10 px-3 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      GPS coordinates have not been captured yet.
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={<FileText className="h-5 w-5" />}
              title="Additional Details"
              description="Add extra fields and notes about this property."
            >
              <div className="flex justify-stretch sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full justify-between sm:w-auto sm:min-w-36"
                  onClick={addAdditionalField}
                >
                  <span className="flex items-center"><Plus className="mr-2 h-4 w-4 text-primary" /> Add Field</span>
                  <span className="ml-4 text-muted-foreground">›</span>
                </Button>
              </div>

              {additionalFields.length > 0 && (
                <div className="mt-3 space-y-3">
                  {additionalFields.map((field) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-[180px_minmax(180px,0.8fr)_minmax(260px,1.2fr)_44px] lg:items-center"
                    >
                      <Select value={field.type} onValueChange={(value) => updateAdditionalField(field.id, "type", value || "other")}>
                        <SelectTrigger className="min-h-11">
                          <SelectValue>{ADDITIONAL_FIELD_TYPES.find((type) => type.value === field.type)?.label || "Other"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ADDITIONAL_FIELD_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input
                        className="min-h-11"
                        placeholder="Field label"
                        value={field.label}
                        onChange={(e) => updateAdditionalField(field.id, "label", e.target.value)}
                      />
                      <Input
                        className="min-h-11 sm:col-span-2 lg:col-span-1"
                        placeholder="Value or URL"
                        value={field.value}
                        onChange={(e) => updateAdditionalField(field.id, "value", e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive sm:justify-self-end lg:justify-self-auto"
                        onClick={() => removeAdditionalField(field.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-1.5 lg:mt-5">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  className="min-h-24 lg:min-h-28"
                  placeholder="Add notes about this property..."
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                />
              </div>
            </SectionCard>
          </div>
        </StepContent>

        <StepContent>
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
              <h3 className="font-semibold">Review Your Property</h3>
              <p className="mt-1 text-sm text-muted-foreground">Please review all the information before submitting.</p>
            </div>

            <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:gap-6">
              <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
                <h4 className="mb-3 text-sm font-semibold">Location</h4>
                <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-sm sm:grid-cols-[130px_1fr]">
                  <dt className="text-muted-foreground">Address</dt><dd>{formData.address || "—"}</dd>
                  <dt className="text-muted-foreground">State</dt><dd>{findById(states, formData.state)?.name || "—"}</dd>
                  <dt className="text-muted-foreground">City</dt><dd>{formData.city || "—"}</dd>
                  <dt className="text-muted-foreground">Locality</dt><dd>{formData.locality || "—"}</dd>
                  <dt className="text-muted-foreground">Coordinates</dt><dd>{formData.latitude && formData.longitude ? `${formData.latitude}, ${formData.longitude}` : "—"}</dd>
                </dl>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
                  <h4 className="text-sm font-semibold">Contacts ({contacts.length})</h4>
                  {contacts.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No contacts added.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {contacts.map((c) => (
                        <div key={c.id} className="rounded-lg border p-2 text-sm">
                          <span className="font-medium">{c.name || "Unnamed"}</span>
                          <span className="ml-2 text-muted-foreground">{c.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
                  <h4 className="text-sm font-semibold">Media ({media.length})</h4>
                  {media.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No media files added.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {media.map((m) => <Badge key={m.id} variant="outline">{m.file.name}</Badge>)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {additionalFields.some((field) => field.value.trim()) && (
              <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
                <h4 className="mb-3 text-sm font-semibold">Additional Fields</h4>
                <div className="space-y-2 text-sm">
                  {additionalFields.filter((field) => field.value.trim()).map((field) => (
                    <div key={field.id} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{field.label || "Other"}</span>
                      <span className="break-all text-right">{field.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.notes && (
              <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
                <h4 className="mb-2 text-sm font-semibold">Notes</h4>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{formData.notes}</p>
              </div>
            )}

            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
              This new property will be added to Master Data upon submission.
            </div>
          </div>
        </StepContent>
      </MultiStepForm>
    </div>
  );
}
