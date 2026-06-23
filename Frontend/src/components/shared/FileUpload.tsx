"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "complete" | "error";
  preview?: string;
}

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  onUpload?: (files: File[]) => Promise<void>;
  entityType?: string;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-4 w-4" />,
  video: <Film className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
};

function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  accept = "image/*,video/*,.pdf,.doc,.docx",
  multiple = true,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 20,
  onUpload,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);

      const valid = fileArray.filter((f) => {
        if (f.size > maxSize) {
          toast.error(`${f.name} exceeds ${formatFileSize(maxSize)} limit`);
          return false;
        }
        return true;
      });

      const remaining = maxFiles - files.length;
      const toAdd = valid.slice(0, remaining);

      if (valid.length > remaining) {
        toast.warning(`Only ${remaining} more files allowed`);
      }

      const uploaded: UploadedFile[] = toAdd.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        progress: 0,
        status: "uploading" as const,
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      }));

      setFiles((prev) => [...prev, ...uploaded]);

      // Simulate upload progress
      uploaded.forEach((uf) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 30 + 10;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uf.id ? { ...f, progress: 100, status: "complete" } : f
              )
            );
          } else {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uf.id ? { ...f, progress: Math.min(progress, 99) } : f
              )
            );
          }
        }, 300);
      });
    },
    [files.length, maxFiles, maxSize]
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

  const handleUploadAll = async () => {
    if (onUpload) {
      try {
        await onUpload(files.map((f) => f.file));
        toast.success("All files uploaded successfully!");
        setFiles([]);
      } catch {
        toast.error("Upload failed. Please try again.");
      }
    } else {
      toast.success(`${files.length} file(s) ready (mock upload)`);
      setFiles([]);
    }
  };

  const completedCount = files.filter((f) => f.status === "complete").length;
  const allComplete = files.length > 0 && completedCount === files.length;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          Images, videos, PDFs up to {formatFileSize(maxSize)} each
          {maxFiles > 1 ? ` (max ${maxFiles} files)` : ""}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">
                {files.length} file{files.length !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiles([])}
                >
                  Clear All
                </Button>
                <Button
                  size="sm"
                  disabled={!allComplete}
                  onClick={handleUploadAll}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload All
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
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
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-background flex items-center justify-center">
                        {FILE_ICONS[category]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.file.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(f.file.size)}
                        </span>
                        {f.status === "complete" && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Done
                          </Badge>
                        )}
                        {f.status === "error" && (
                          <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                      {f.status === "uploading" && (
                        <Progress value={f.progress} className="h-1 mt-1" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeFile(f.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
