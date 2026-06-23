"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export function MediaUploadButton() {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      // Mock upload - simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(`${files.length} file(s) uploaded successfully`);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        <Upload className="h-4 w-4 mr-2" />
        {isUploading ? "Uploading..." : "Upload Media"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
    </>
  );
}
