"use client";

import { use, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ImageIcon,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useProperty, useDeleteProperty } from "@/hooks/use-properties";
import { useMediaByBuilding } from "@/hooks/use-media";
import {
  getPropertyProfile,
  PROPERTY_PROFILE_SECTIONS,
  type PropertyProfileFields,
  type PropertyProfileKey,
} from "@/lib/property-profile";
import { toast } from "sonner";

function DetailCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border bg-card p-4 shadow-sm sm:p-5 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold sm:text-base">{title}</h2>
      {children}
    </section>
  );
}

function DetailRows({
  fields,
  profile,
}: {
  fields: ReadonlyArray<readonly [PropertyProfileKey, string]>;
  profile: PropertyProfileFields;
}) {
  return (
    <dl className="divide-y divide-border/70">
      {fields.map(([key, label]) => (
        <div key={key} className="grid grid-cols-[minmax(120px,0.9fr)_minmax(0,1.1fr)] gap-4 py-2.5 text-sm">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words font-medium">{profile[key] || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function MediaPanel({ media }: { media: Array<{ id: string; fileUrl?: string; fileName: string; category: string }> }) {
  const photos = media.filter((item) => item.category === "photo" && item.fileUrl);
  const hero = photos[0];
  const thumbnails = photos.slice(1, 4);

  return (
    <div className="grid min-h-[320px] gap-2 overflow-hidden rounded-2xl border bg-muted/20 shadow-sm sm:grid-cols-[minmax(0,1fr)_150px] lg:min-h-[390px]">
      <div
        className="relative min-h-[280px] bg-muted bg-cover bg-center sm:min-h-full"
        style={hero?.fileUrl ? { backgroundImage: `url(${JSON.stringify(hero.fileUrl)})` } : undefined}
      >
        {!hero && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
            <span className="text-sm">No property photos</span>
          </div>
        )}
        {photos.length > 0 && (
          <Badge className="absolute left-3 top-3 bg-black/70 text-white hover:bg-black/70">
            1 / {photos.length}
          </Badge>
        )}
      </div>

      <div className="hidden gap-2 sm:grid sm:grid-rows-3">
        {Array.from({ length: 3 }).map((_, index) => {
          const item = thumbnails[index];
          return (
            <div
              key={item?.id || index}
              className="relative min-h-0 bg-muted bg-cover bg-center"
              style={item?.fileUrl ? { backgroundImage: `url(${JSON.stringify(item.fileUrl)})` } : undefined}
            >
              {!item && <div className="absolute inset-0 bg-muted/60" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: property, isLoading, error } = useProperty(id);
  const { data: media = [] } = useMediaByBuilding(id);
  const deleteProperty = useDeleteProperty();

  const profile = useMemo(
    () => getPropertyProfile(property?.additionalFields, property?.commercialTerms),
    [property?.additionalFields, property?.commercialTerms],
  );

  if (isLoading) {
    return <LoadingSkeleton type="table" />;
  }

  if (error || !property) {
    return (
      <EmptyState
        title="Property not found"
        description="The property you're looking for doesn't exist or has been removed."
        action={
          <Link href="/properties">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Properties
            </Button>
          </Link>
        }
      />
    );
  }

  const primaryContact = property.contacts.find((contact) => contact.isPrimary) || property.contacts[0];
  const postedOn = profile.postedOn || new Date(property.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const buildingType = profile.buildingType || property.propertyType.replaceAll("_", " ");
  const headerLocation = [property.locality, property.city, property.state].filter(Boolean).join(", ");

  async function handleDelete() {
    try {
      await deleteProperty.mutateAsync(id);
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Property deleted successfully");
      router.push("/properties");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Failed to delete property");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-5 pb-8">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>›</span>
        <Link href="/properties" className="hover:text-foreground">Properties</Link>
        <span>›</span>
        <span className="truncate">{property.buildingName}</span>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{property.buildingName}</h1>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              {property.propertyId}
            </Badge>
            <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300">
              {property.availabilityStatus.replaceAll("_", " ")}
            </Badge>
          </div>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{property.address || headerLocation || "Location not added"}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/properties/${property.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="outline" className="text-destructive hover:text-destructive" />}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Property</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete {property.buildingName}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.16fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <MediaPanel media={media} />

          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard title="Property Overview">
              <dl className="divide-y divide-border/70 text-sm">
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4" /> Posted On</dt>
                  <dd className="font-medium">{postedOn}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-4 w-4" /> Building Type</dt>
                  <dd className="text-right font-medium capitalize">{buildingType || "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-muted-foreground">Building Name</dt>
                  <dd className="text-right font-medium">{property.buildingName}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> Verified No.</dt>
                  <dd className="font-medium text-green-700 dark:text-green-400">{profile.verifiedNo || "—"}</dd>
                </div>
              </dl>
            </DetailCard>

            <DetailCard title="Property Address">
              <p className="min-h-12 text-sm leading-6">{property.address || "—"}</p>
              <div className="mt-3 flex min-h-28 flex-col items-center justify-center rounded-xl border bg-muted/30 px-4 text-center">
                <MapPin className="mb-2 h-6 w-6 text-primary" />
                <span className="text-xs text-muted-foreground">{headerLocation || "Map location"}</span>
              </div>
              {property.mapsUrl && (
                <a href={property.mapsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
                  Open in Google Maps ↗
                </a>
              )}
            </DetailCard>

            <DetailCard title="Owner Contact Details">
              <div className="space-y-3 text-sm">
                <div className="flex gap-3"><UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Contact Person</p><p className="font-medium">{primaryContact?.name || "—"}</p></div></div>
                <div className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Mobile</p><p className="font-medium">{primaryContact?.phone || "—"}</p></div></div>
                <div className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 text-muted-foreground" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Email</p><p className="break-all font-medium">{primaryContact?.email || "—"}</p></div></div>
              </div>
            </DetailCard>

            <DetailCard title="Notes">
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{property.notes || "No notes added."}</p>
            </DetailCard>
          </div>
        </div>

        <div className="space-y-4">
          <DetailCard title="Building Compliance / Technical Details">
            <DetailRows fields={PROPERTY_PROFILE_SECTIONS.compliance} profile={profile} />
          </DetailCard>
          <DetailCard title="Area Details">
            <DetailRows fields={PROPERTY_PROFILE_SECTIONS.area} profile={profile} />
          </DetailCard>
          <DetailCard title="Financials">
            <DetailRows fields={PROPERTY_PROFILE_SECTIONS.financials} profile={profile} />
          </DetailCard>
        </div>

        <DetailCard title="Amenities & Infrastructure" className="h-fit xl:min-h-[740px]">
          <DetailRows fields={PROPERTY_PROFILE_SECTIONS.amenities} profile={profile} />
        </DetailCard>
      </div>
    </div>
  );
}
