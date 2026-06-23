"use client";

import { useRef, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageIcon, Film, FileText, Upload, Loader2 } from "lucide-react";
import { useMedia, useUploadMedia, useCompleteUpload } from "@/hooks/use-media";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-5 w-5" />,
  video: <Film className="h-5 w-5" />,
  document: <FileText className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  image: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  video: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  document: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export default function MediaPage() {
  const { data, isLoading } = useMedia();
  const uploadMedia = useUploadMedia();
  const completeUpload = useCompleteUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const mediaItems = data?.data ?? [];

  const photoCount = mediaItems.filter((m) => m.fileType === "image").length;
  const videoCount = mediaItems.filter((m) => m.fileType === "video").length;
  const docCount = mediaItems.filter((m) => m.fileType === "document").length;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const result = await uploadMedia.mutateAsync({
          fileName: file.name,
          mimeType: file.type,
          fileType: file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
              ? "video"
              : "document",
        });
        const { uploadUrl, mediaId } = result.data;

        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        await completeUpload.mutateAsync({
          mediaId,
          fileSizeBytes: file.size,
        });

        toast.success(`${file.name} uploaded successfully`);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media"
        description="Photos, videos, and documents across all properties."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{photoCount}</p>
                <p className="text-xs text-muted-foreground">Photos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Film className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{videoCount}</p>
                <p className="text-xs text-muted-foreground">Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{docCount}</p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Upload Media
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Media</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mediaItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No media files yet. Upload your first file above.
            </p>
          ) : (
            <div className="space-y-2">
              {mediaItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      {CATEGORY_ICONS[item.fileType]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.mimeType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={CATEGORY_COLORS[item.fileType]}>
                      {item.fileType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
