"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  ImageIcon,
  FileText,
  Film,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";
import type { MediaDocument } from "@/types";
import { useDeleteMedia, useDownloadMedia } from "@/hooks/use-media";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  photo: <ImageIcon className="h-4 w-4" />,
  video: <Film className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  floor_plan: <FileText className="h-4 w-4" />,
  other: <FileText className="h-4 w-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  photo: "Photo",
  video: "Video",
  document: "Document",
  floor_plan: "Floor Plan",
  other: "Other",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface MediaGalleryProps {
  media: MediaDocument[];
  title?: string;
  canDelete?: boolean;
  onDeleteComplete?: () => void;
}

export function MediaGallery({
  media,
  title = "Media",
  canDelete = false,
  onDeleteComplete,
}: MediaGalleryProps) {
  const [previewItem, setPreviewItem] = useState<MediaDocument | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const deleteMedia = useDeleteMedia();
  const downloadMedia = useDownloadMedia();

  const filteredMedia = media.filter((m) => !m.isDeleted);

  const handleDelete = async (item: MediaDocument) => {
    try {
      await deleteMedia.mutateAsync(item.id);
      toast.success("File deleted");
      if (previewItem?.id === item.id) {
        setPreviewItem(null);
      }
      onDeleteComplete?.();
    } catch {
      toast.error("Failed to delete file");
    }
  };

  const handleDownload = async (item: MediaDocument) => {
    try {
      const url = await downloadMedia.mutateAsync(item.id);
      window.open(url, "_blank");
    } catch {
      toast.error("Failed to get download link");
    }
  };

  const openPreview = (item: MediaDocument) => {
    const idx = filteredMedia.findIndex((m) => m.id === item.id);
    setPreviewIndex(idx);
    setPreviewItem(item);
  };

  const navigatePreview = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" ? previewIndex - 1 : previewIndex + 1;
    if (newIndex >= 0 && newIndex < filteredMedia.length) {
      setPreviewIndex(newIndex);
      setPreviewItem(filteredMedia[newIndex]);
    }
  };

  const isImage = (m: MediaDocument) => m.mimeType.startsWith("image/");
  const isPDF = (m: MediaDocument) => m.mimeType === "application/pdf";
  const isVideo = (m: MediaDocument) => m.mimeType.startsWith("video/");

  if (filteredMedia.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No media"
            description="No files have been uploaded yet."
            icon={<ImageIcon className="h-8 w-8 text-muted-foreground" />}
          />
        </CardContent>
      </Card>
    );
  }

  const grouped = filteredMedia.reduce(
    (acc, item) => {
      const cat = item.category || "other";
      acc[cat] = acc[cat] || [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, MediaDocument[]>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {title} ({filteredMedia.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  {CATEGORY_ICONS[category]}
                  <span className="text-sm font-medium">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {items.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="group relative aspect-square rounded-lg border bg-muted flex items-center justify-center overflow-hidden cursor-pointer"
                      onClick={() => openPreview(item)}
                    >
                      {isImage(item) && item.fileUrl ? (
                        <Image
                          src={item.fileUrl}
                          alt={item.caption || item.fileName}
                          width={200}
                          height={200}
                          unoptimized
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground p-2">
                          {CATEGORY_ICONS[category]}
                          <span className="text-xs text-center px-1 truncate max-w-full">
                            {item.fileName}
                          </span>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(item);
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          {previewItem && (
            <div className="flex flex-col">
              <DialogHeader className="px-4 pt-4 pb-2">
                <DialogTitle className="text-sm">{previewItem.fileName}</DialogTitle>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {previewItem.fileSize > 0 && (
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {formatFileSize(previewItem.fileSize)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(previewItem.createdAt)}
                  </span>
                </div>
              </DialogHeader>

              {/* Preview content */}
              <div className="flex-1 min-h-[300px] max-h-[60vh] flex items-center justify-center bg-muted/30">
                {isImage(previewItem) && previewItem.fileUrl ? (
                  <Image
                    src={previewItem.fileUrl}
                    alt={previewItem.caption || previewItem.fileName}
                    width={800}
                    height={600}
                    unoptimized
                    className="max-h-[60vh] object-contain"
                  />
                ) : isPDF(previewItem) && previewItem.fileUrl ? (
                  <iframe
                    src={previewItem.fileUrl}
                    className="w-full h-[60vh]"
                    title={previewItem.fileName}
                  />
                ) : isVideo(previewItem) && previewItem.fileUrl ? (
                  <video
                    src={previewItem.fileUrl}
                    controls
                    className="max-h-[60vh] max-w-full"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
                    {CATEGORY_ICONS[previewItem.category || "other"]}
                    <span className="text-sm">{previewItem.fileName}</span>
                    <span className="text-xs">Preview not available</span>
                  </div>
                )}
              </div>

              {/* Navigation */}
              {filteredMedia.length > 1 && (
                <div className="absolute top-1/2 left-2 -translate-y-1/2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                    disabled={previewIndex === 0}
                    onClick={() => navigatePreview("prev")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {filteredMedia.length > 1 && (
                <div className="absolute top-1/2 right-2 -translate-y-1/2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                    disabled={previewIndex === filteredMedia.length - 1}
                    onClick={() => navigatePreview("next")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-muted-foreground">
                  {previewIndex + 1} of {filteredMedia.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(previewItem)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download
                  </Button>
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button variant="outline" size="sm" className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete File</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {previewItem.fileName}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => handleDelete(previewItem)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
