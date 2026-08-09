"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Film,
  ImageIcon,
  Loader2,
  Plus,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useProperty,
  useUpdateProperty,
  type PropertyRecord,
} from "@/hooks/use-properties";
import {
  useCompleteUpload,
  useDeleteMedia,
  useMediaByBuilding,
  useUploadMedia,
} from "@/hooks/use-media";
import {
  getPrimaryMediaSelection,
  mergePrimaryMediaSelection,
} from "@/lib/property-media";
import type { MediaDocument } from "@/types";
import { toast } from "sonner";

const ACCEPTED_MEDIA = "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt";

function fileTypeForFile(file: File) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

function mediaLabel(item: MediaDocument) {
  if (item.category === "photo") return "Photo";
  if (item.category === "video") return "Video";
  if (item.category === "floor_plan") return "Floor plan";
  return "Document";
}

function MediaIcon({ item, className = "h-8 w-8" }: { item: MediaDocument; className?: string }) {
  if (item.category === "photo") return <ImageIcon className={className} />;
  if (item.category === "video") return <Film className={className} />;
  return <FileText className={className} />;
}

function PrimaryMediaViewer({ item }: { item: MediaDocument }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-black/95 shadow-sm">
      <div className="flex min-h-[340px] w-full items-center justify-center sm:min-h-[440px] xl:min-h-[520px]">
        {item.category === "photo" && item.fileUrl ? (
          <img
            src={item.fileUrl}
            alt={item.fileName}
            className="max-h-[340px] w-full object-contain sm:max-h-[440px] xl:max-h-[520px]"
          />
        ) : item.category === "video" && item.fileUrl ? (
          <video
            key={item.id}
            src={item.fileUrl}
            controls
            preload="metadata"
            className="max-h-[340px] w-full object-contain sm:max-h-[440px] xl:max-h-[520px]"
          >
            Your browser does not support video playback.
          </video>
        ) : (
          <div className="flex min-h-[340px] w-full flex-col items-center justify-center bg-muted/20 px-6 text-center text-white sm:min-h-[440px] xl:min-h-[520px]">
            <FileText className="mb-4 h-14 w-14 text-white/70" />
            <p className="max-w-xl break-words text-base font-semibold">{item.fileName}</p>
            <p className="mt-2 text-sm text-white/60">Document attached to this property</p>
            {item.fileUrl && (
              <a
                href={item.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
              >
                Open document
              </a>
            )}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4 pt-14 text-white">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
              <Star className="h-3 w-3 fill-current" />
              Primary
            </span>
            <span className="text-xs text-white/70">{mediaLabel(item)}</span>
          </div>
          <p className="truncate text-sm font-semibold" title={item.fileName}>{item.fileName}</p>
        </div>
      </div>
    </div>
  );
}

function SecondaryMediaPreview({ item }: { item: MediaDocument }) {
  if (item.category === "photo" && item.fileUrl) {
    return <img src={item.fileUrl} alt={item.fileName} className="h-full w-full object-cover" />;
  }

  if (item.category === "video" && item.fileUrl) {
    return (
      <div className="relative h-full w-full bg-black">
        <video src={item.fileUrl} preload="metadata" muted className="h-full w-full object-cover opacity-75" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Film className="h-9 w-9 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-4 text-center text-muted-foreground">
      <MediaIcon item={item} className="h-10 w-10" />
      <span className="mt-2 max-w-full truncate text-xs">{item.fileName}</span>
    </div>
  );
}

export function IntakeMediaManager({
  buildingId,
  embedded = false,
}: {
  buildingId: string;
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: property } = useProperty(buildingId);
  const { data: media = [], isLoading } = useMediaByBuilding(buildingId);
  const updateProperty = useUpdateProperty();
  const uploadMedia = useUploadMedia();
  const completeUpload = useCompleteUpload();
  const deleteMedia = useDeleteMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const autoDefaultInFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [primaryBusy, setPrimaryBusy] = useState(false);
  const [primaryMediaId, setPrimaryMediaId] = useState<string | null>(null);
  const [primarySelectionExplicit, setPrimarySelectionExplicit] = useState(false);

  useEffect(() => {
    if (!property) return;
    const selection = getPrimaryMediaSelection(property.additionalFields);
    setPrimaryMediaId(selection.primaryMediaId);
    setPrimarySelectionExplicit(selection.isExplicit);
  }, [property]);

  const primaryMedia = media.find((item) => item.id === primaryMediaId);
  const secondaryMedia = media.filter((item) => item.id !== primaryMediaId);

  useEffect(() => {
    if (
      !property ||
      isLoading ||
      primarySelectionExplicit ||
      primaryMediaId ||
      media.length !== 1 ||
      autoDefaultInFlight.current
    ) {
      return;
    }

    autoDefaultInFlight.current = true;
    void persistPrimaryMedia(media[0].id, true).finally(() => {
      autoDefaultInFlight.current = false;
    });
  }, [property, isLoading, media, primaryMediaId, primarySelectionExplicit]);

  useEffect(() => {
    if (!property || isLoading || !primaryMediaId || primaryMedia) return;

    const fallbackId = media.length === 1 ? media[0].id : null;
    void persistPrimaryMedia(fallbackId, true);
  }, [property, isLoading, media, primaryMedia, primaryMediaId]);

  function openPicker() {
    inputRef.current?.click();
  }

  async function persistPrimaryMedia(nextPrimaryMediaId: string | null, silent = false) {
    if (!property || primaryBusy) return false;

    const previousSelection = getPrimaryMediaSelection(property.additionalFields);
    const previousAdditionalFields = property.additionalFields;
    const nextAdditionalFields = mergePrimaryMediaSelection(
      property.additionalFields,
      nextPrimaryMediaId,
    );

    setPrimaryBusy(true);
    setPrimaryMediaId(nextPrimaryMediaId);
    setPrimarySelectionExplicit(true);
    queryClient.setQueryData<PropertyRecord>(["properties", buildingId], (current) =>
      current ? { ...current, additionalFields: nextAdditionalFields } : current,
    );

    try {
      await updateProperty.mutateAsync({
        id: buildingId,
        data: { additionalFields: nextAdditionalFields },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["properties", buildingId] }),
        queryClient.invalidateQueries({ queryKey: ["property-intake"] }),
      ]);
      if (!silent) {
        toast.success(nextPrimaryMediaId ? "Primary media updated" : "Primary media cleared");
      }
      return true;
    } catch (error) {
      setPrimaryMediaId(previousSelection.primaryMediaId);
      setPrimarySelectionExplicit(previousSelection.isExplicit);
      queryClient.setQueryData<PropertyRecord>(["properties", buildingId], (current) =>
        current ? { ...current, additionalFields: previousAdditionalFields } : current,
      );
      toast.error(error instanceof Error ? error.message : "Failed to update primary media");
      return false;
    } finally {
      setPrimaryBusy(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const fileType = fileTypeForFile(file);
        const response = await uploadMedia.mutateAsync({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileType,
          buildingId,
          fileSizeBytes: file.size,
        });
        const uploadData = response.data ?? response;
        const uploadUrl = uploadData.uploadUrl || uploadData.presignedUrl;
        if (!uploadUrl) throw new Error(`Upload URL missing for ${file.name}`);

        const uploaded = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!uploaded.ok) throw new Error(`Failed to upload ${file.name}`);

        await completeUpload.mutateAsync({
          mediaId: uploadData.mediaId,
          fileType,
          mimeType: file.type || "application/octet-stream",
          fileSizeBytes: file.size,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["media", "building", buildingId] });
      toast.success(`${files.length} media file${files.length === 1 ? "" : "s"} added`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload media");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      setBusy(false);
    }
  }

  async function removeMedia(id: string) {
    setBusy(true);
    try {
      const deletingPrimary = id === primaryMediaId;
      const remainingMedia = media.filter((item) => item.id !== id);

      await deleteMedia.mutateAsync(id);
      await queryClient.invalidateQueries({ queryKey: ["media", "building", buildingId] });

      if (deletingPrimary) {
        const nextPrimaryMediaId = remainingMedia.length === 1 ? remainingMedia[0].id : null;
        await persistPrimaryMedia(nextPrimaryMediaId, true);
      }

      toast.success("Media removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove media");
    } finally {
      setBusy(false);
    }
  }

  const content = (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold sm:text-base">Media</p>
            {(busy || primaryBusy) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {media.length > 0
              ? `${media.length} file${media.length === 1 ? "" : "s"} attached. Choose one primary media item; everything else remains secondary.`
              : "Add photos, videos or documents from the rider visit or owner follow-up."}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={openPicker} disabled={busy || primaryBusy} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add media
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_MEDIA}
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      {isLoading ? (
        <div className="flex min-h-[340px] items-center justify-center rounded-2xl border border-dashed bg-muted/10 text-sm text-muted-foreground sm:min-h-[440px] xl:min-h-[520px]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading media...
        </div>
      ) : media.length === 0 ? (
        <button
          type="button"
          onClick={openPicker}
          className="flex min-h-[340px] w-full flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/10 p-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/20 sm:min-h-[440px] xl:min-h-[520px]"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Upload className="h-7 w-7" />
          </div>
          <span className="text-base font-semibold">Add property media</span>
          <span className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Upload photos, videos, PDFs or other documents. You don&apos;t need to choose a media type first.
          </span>
          <span className="mt-4 text-xs font-medium text-primary">Choose files</span>
        </button>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-muted/10 p-3 sm:p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold sm:text-base">Primary media</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  This media stays at the top and is saved as the property&apos;s main media.
                </p>
              </div>
              {primaryMedia && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => persistPrimaryMedia(null)}
                  disabled={busy || primaryBusy}
                >
                  Remove primary
                </Button>
              )}
            </div>

            {primaryMedia ? (
              <div className="space-y-3">
                <PrimaryMediaViewer item={primaryMedia} />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={primaryMedia.fileName}>{primaryMedia.fileName}</p>
                    <p className="text-xs text-muted-foreground">{mediaLabel(primaryMedia)} · Primary media</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeMedia(primaryMedia.id)}
                    disabled={busy || primaryBusy}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-background px-6 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Star className="h-6 w-6" />
                </div>
                <p className="font-semibold">No primary media selected</p>
                <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                  Choose any item from Secondary media below. If a property starts with only one media item, it is selected as primary by default until the telecaller changes it.
                </p>
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold sm:text-base">Secondary media</h3>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  {secondaryMedia.length} secondary item{secondaryMedia.length === 1 ? "" : "s"}. Setting a new primary automatically moves the previous primary here.
                </p>
              </div>
            </div>

            {secondaryMedia.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-muted/5 px-6 py-8 text-center text-sm text-muted-foreground">
                No secondary media. Add more files or remove the current primary designation.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {secondaryMedia.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border bg-background shadow-sm">
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                      <SecondaryMediaPreview item={item} />
                    </div>
                    <div className="space-y-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" title={item.fileName}>{item.fileName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{mediaLabel(item)} · Secondary</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1"
                          onClick={() => persistPrimaryMedia(item.id)}
                          disabled={busy || primaryBusy}
                        >
                          <Star className="mr-2 h-4 w-4" />
                          Set as primary
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 text-destructive hover:text-destructive"
                          onClick={() => removeMedia(item.id)}
                          disabled={busy || primaryBusy}
                          aria-label={`Delete ${item.fileName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}

                <button
                  type="button"
                  onClick={openPicker}
                  disabled={busy || primaryBusy}
                  className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/10 p-5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Plus className="h-6 w-6" />
                  <span className="mt-2 text-sm font-medium">Add more media</span>
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );

  if (embedded) return <div className="min-w-0">{content}</div>;

  return (
    <section id="media" className="scroll-mt-24 rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
      {content}
    </section>
  );
}
