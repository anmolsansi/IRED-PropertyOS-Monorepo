"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Film, ImageIcon, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCompleteUpload,
  useDeleteMedia,
  useMediaByBuilding,
  useUploadMedia,
} from "@/hooks/use-media";
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

export function IntakeMediaManager({
  buildingId,
  embedded = false,
}: {
  buildingId: string;
  embedded?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: media = [], isLoading } = useMediaByBuilding(buildingId);
  const uploadMedia = useUploadMedia();
  const completeUpload = useCompleteUpload();
  const deleteMedia = useDeleteMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (media.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !media.some((item) => item.id === selectedId)) {
      setSelectedId(media[0].id);
    }
  }, [media, selectedId]);

  const selectedMedia = media.find((item) => item.id === selectedId) || media[0];

  function openPicker() {
    inputRef.current?.click();
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      let newestMediaId: string | undefined;
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
        newestMediaId = uploadData.mediaId;
      }

      await queryClient.invalidateQueries({ queryKey: ["media", "building", buildingId] });
      if (newestMediaId) setSelectedId(newestMediaId);
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
      await deleteMedia.mutateAsync(id);
      await queryClient.invalidateQueries({ queryKey: ["media", "building", buildingId] });
      toast.success("Media removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove media");
    } finally {
      setBusy(false);
    }
  }

  const content = (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold sm:text-base">Media</p>
            {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {media.length > 0
              ? `${media.length} file${media.length === 1 ? "" : "s"} attached. Photos, videos and documents stay together.`
              : "Add photos, videos or documents from the rider visit or owner follow-up."}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={openPicker} disabled={busy} className="shrink-0">
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
        <div className="space-y-3">
          <div className="group relative overflow-hidden rounded-2xl border bg-black/95 shadow-sm">
            <div className="flex min-h-[340px] w-full items-center justify-center sm:min-h-[440px] xl:min-h-[520px]">
              {selectedMedia?.category === "photo" && selectedMedia.fileUrl ? (
                <img
                  src={selectedMedia.fileUrl}
                  alt={selectedMedia.fileName}
                  className="max-h-[340px] w-full object-contain sm:max-h-[440px] xl:max-h-[520px]"
                />
              ) : selectedMedia?.category === "video" && selectedMedia.fileUrl ? (
                <video
                  key={selectedMedia.id}
                  src={selectedMedia.fileUrl}
                  controls
                  preload="metadata"
                  className="max-h-[340px] w-full object-contain sm:max-h-[440px] xl:max-h-[520px]"
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="flex min-h-[340px] w-full flex-col items-center justify-center bg-muted/20 px-6 text-center text-white sm:min-h-[440px] xl:min-h-[520px]">
                  <FileText className="mb-4 h-14 w-14 text-white/70" />
                  <p className="max-w-xl break-words text-base font-semibold">{selectedMedia?.fileName}</p>
                  <p className="mt-2 text-sm text-white/60">Document attached to this property</p>
                  {selectedMedia?.fileUrl && (
                    <a
                      href={selectedMedia.fileUrl}
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

            {selectedMedia && (
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4 pt-14 text-white">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" title={selectedMedia.fileName}>{selectedMedia.fileName}</p>
                  <p className="mt-0.5 text-xs text-white/70">{mediaLabel(selectedMedia)}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 shrink-0 bg-white/90 text-destructive hover:bg-white"
                  onClick={() => removeMedia(selectedMedia.id)}
                  disabled={busy}
                  aria-label={`Remove ${selectedMedia.fileName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            {media.map((item) => {
              const selected = item.id === selectedMedia?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border-2 bg-muted transition-colors sm:h-28 sm:w-40 ${
                    selected ? "border-primary" : "border-transparent hover:border-border"
                  }`}
                  aria-label={`View ${item.fileName}`}
                >
                  {item.category === "photo" && item.fileUrl ? (
                    <img src={item.fileUrl} alt="" className="h-full w-full object-cover" />
                  ) : item.category === "video" && item.fileUrl ? (
                    <div className="relative h-full w-full bg-black">
                      <video src={item.fileUrl} preload="metadata" muted className="h-full w-full object-cover opacity-75" />
                      <div className="absolute inset-0 flex items-center justify-center"><Film className="h-7 w-7 text-white" /></div>
                    </div>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center px-2 text-muted-foreground">
                      <MediaIcon item={item} className="h-7 w-7" />
                      <span className="mt-1 w-full truncate text-[10px]">{item.fileName}</span>
                    </div>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {mediaLabel(item)}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={openPicker}
              disabled={busy}
              className="flex h-24 w-32 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary sm:h-28 sm:w-40"
            >
              <Plus className="h-5 w-5" />
              <span className="mt-1 text-xs font-medium">Add more</span>
            </button>
          </div>
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
