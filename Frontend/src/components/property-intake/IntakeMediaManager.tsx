"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Film, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCompleteUpload,
  useDeleteMedia,
  useMediaByBuilding,
  useUploadMedia,
} from "@/hooks/use-media";
import type { MediaDocument } from "@/types";
import { toast } from "sonner";

const MEDIA_CATEGORIES: Array<{
  value: MediaDocument["category"];
  label: string;
  icon: typeof ImageIcon;
}> = [
  { value: "photo", label: "Photo", icon: ImageIcon },
  { value: "video", label: "Video", icon: Film },
  { value: "document", label: "Document", icon: FileText },
  { value: "floor_plan", label: "Floor Plan", icon: FileText },
];

function fileTypeFor(category: MediaDocument["category"]) {
  if (category === "photo") return "image";
  if (category === "video") return "video";
  return "document";
}

export function IntakeMediaManager({ buildingId }: { buildingId: string }) {
  const queryClient = useQueryClient();
  const { data: media = [], isLoading } = useMediaByBuilding(buildingId);
  const uploadMedia = useUploadMedia();
  const completeUpload = useCompleteUpload();
  const deleteMedia = useDeleteMedia();
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCategory = useRef<MediaDocument["category"]>("photo");
  const [busy, setBusy] = useState(false);

  function openPicker(category: MediaDocument["category"]) {
    pendingCategory.current = category;
    inputRef.current?.click();
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const response = await uploadMedia.mutateAsync({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileType: fileTypeFor(pendingCategory.current),
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
      await deleteMedia.mutateAsync(id);
      await queryClient.invalidateQueries({ queryKey: ["media", "building", buildingId] });
      toast.success("Media removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove media");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="media" className="scroll-mt-24 rounded-2xl border bg-card p-4 shadow-sm sm:p-5 lg:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Media & documents</h2>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">
              Review the rider&apos;s photos and add any new photos, videos, documents or floor plans collected later.
            </p>
          </div>
        </div>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MEDIA_CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.value}
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => openPicker(category.value)}
              disabled={busy}
            >
              <Icon className="mr-2 h-4 w-4 text-primary" />
              {category.label}
            </Button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="mt-4 flex min-h-28 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          Loading rider media...
        </div>
      ) : media.length === 0 ? (
        <button
          type="button"
          onClick={() => openPicker("photo")}
          className="mt-4 flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 p-5 text-center hover:border-primary/40"
        >
          <Upload className="mb-2 h-6 w-6 text-primary" />
          <span className="text-sm font-medium">No media uploaded yet</span>
          <span className="mt-1 text-xs text-muted-foreground">Click to add the first photo</span>
        </button>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl border bg-background">
              {item.category === "photo" && item.fileUrl ? (
                <div
                  className="h-32 bg-muted bg-cover bg-center"
                  style={{ backgroundImage: `url(${JSON.stringify(item.fileUrl)})` }}
                  role="img"
                  aria-label={item.fileName}
                />
              ) : (
                <div className="flex h-32 items-center justify-center bg-muted/40">
                  {item.category === "video" ? (
                    <Film className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.fileName}</p>
                  <p className="text-xs capitalize text-muted-foreground">{item.category.replace("_", " ")}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive"
                  onClick={() => removeMedia(item.id)}
                  disabled={busy}
                  aria-label={`Remove ${item.fileName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
