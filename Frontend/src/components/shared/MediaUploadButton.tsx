"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, X, FileText, Image as ImageIcon, Film, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useGetUploadUrl, useCompleteUpload } from "@/hooks/use-media";

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "processing" | "complete" | "error";
  preview?: string;
}

interface MediaUploadButtonProps {
  entityType: "building" | "floor" | "unit";
  entityId: string;
  onUploadComplete?: () => void;
  children?: React.ReactNode;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

function getFileIcon(mimeType: string) {
  const category = getFileCategory(mimeType);
  if (category === "image") return <ImageIcon className="h-4 w-4" />;
  if (category === "video") return <Film className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function getMimeTypeCategory(mimeType: string): "image" | "video" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

export function MediaUploadButton({
  entityType,
  entityId,
  onUploadComplete,
  children,
}: MediaUploadButtonProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getUploadUrl = useGetUploadUrl();
  const completeUpload = useCompleteUpload();

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);

      const valid = fileArray.filter((f) => {
        if (f.size > MAX_FILE_SIZE) {
          toast.error(`${f.name} exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`);
          return false;
        }
        if (!ALLOWED_TYPES.includes(f.type)) {
          toast.error(`${f.name} is not a supported file type`);
          return false;
        }
        return true;
      });

      const remaining = 20 - files.length;
      const toAdd = valid.slice(0, remaining);

      if (valid.length > remaining) {
        toast.warning(`Only ${remaining} more files allowed`);
      }

      const uploaded: UploadingFile[] = toAdd.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        progress: 0,
        status: "uploading" as const,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }));

      setFiles((prev) => [...prev, ...uploaded]);
    },
    [files.length]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const uploadFile = async (uf: UploadingFile) => {
    try {
      // Step 1: Get presigned upload URL
      const result = await getUploadUrl.mutateAsync({
        fileName: uf.file.name,
        fileType: getMimeTypeCategory(uf.file.type),
        fileSizeBytes: uf.file.size,
        entityType,
        entityId,
      });
      const uploadUrl = result.data.uploadUrl;
      const mediaId = result.data.mediaId;

      // Step 2: Upload to S3 with progress
      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.min((event.loaded / event.total) * 100, 99);
            setFiles((prev) =>
              prev.map((f) => (f.id === uf.id ? { ...f, progress } : f))
            );
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with status ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", uf.file.type);
        xhr.send(uf.file);
      });

      // Step 3: Mark as processing
      setFiles((prev) =>
        prev.map((f) => (f.id === uf.id ? { ...f, status: "processing", progress: 100 } : f))
      );

      // Step 4: Complete upload
      await completeUpload.mutateAsync({
        uploadId: mediaId,
        storageUrl: uploadUrl.split("?")[0],
        mimeType: uf.file.type,
        fileType: getMimeTypeCategory(uf.file.type),
      });

      // Step 5: Done
      setFiles((prev) =>
        prev.map((f) => (f.id === uf.id ? { ...f, status: "complete", progress: 100 } : f))
      );
    } catch {
      setFiles((prev) =>
        prev.map((f) => (f.id === uf.id ? { ...f, status: "error" } : f))
      );
    }
  };

  const handleUploadAll = async () => {
    const uploading = files.filter((f) => f.status === "uploading");
    await Promise.all(uploading.map(uploadFile));

    const completedCount = files.filter((f) => f.status === "complete").length;
    if (completedCount > 0) {
      toast.success(`${completedCount} file(s) uploaded successfully`);
      onUploadComplete?.();
      setFiles([]);
      setOpen(false);
    } else {
      toast.error("Some uploads failed. Please try again.");
    }
  };

  const completedCount = files.filter((f) => f.status === "complete").length;
  const allComplete = files.length > 0 && completedCount === files.length;
  const hasUploading = files.some((f) => f.status === "uploading" || f.status === "processing");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Upload className="h-3.5 w-3.5 mr-1" />
            Upload
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
          <DialogDescription>
            Upload images, videos, or documents. Max {formatFileSize(MAX_FILE_SIZE)} per file.
          </DialogDescription>
        </DialogHeader>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">Drop files here or click to browse</p>
          <p className="text-xs text-muted-foreground">
            Images, videos, PDFs up to {formatFileSize(MAX_FILE_SIZE)}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((f) => {
              const category = getFileCategory(f.file.type);
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  {f.preview ? (
                    <Image
                      src={f.preview}
                      alt={f.file.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-background flex items-center justify-center">
                      {getFileIcon(f.file.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{f.file.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(f.file.size)}
                      </span>
                      {f.status === "complete" && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Done
                        </Badge>
                      )}
                      {f.status === "error" && (
                        <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                      {f.status === "processing" && (
                        <Badge variant="secondary" className="text-xs">Processing...</Badge>
                      )}
                    </div>
                    {(f.status === "uploading" || f.status === "processing") && (
                      <Progress value={f.progress} className="h-1 mt-1" />
                    )}
                  </div>
                  {f.status === "uploading" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeFile(f.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setFiles([]); setOpen(false); }}>
            Cancel
          </Button>
          <Button
            onClick={handleUploadAll}
            disabled={files.length === 0 || allComplete || hasUploading}
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            {hasUploading ? "Uploading..." : `Upload ${files.length} file(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
