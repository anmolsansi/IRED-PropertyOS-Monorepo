"use client";

import { ExternalLink, FileText, Film, ImageIcon, Loader2 } from "lucide-react";
import { useMediaByBuilding } from "@/hooks/use-media";
import { useProperty } from "@/hooks/use-properties";
import { getPrimaryMediaSelection } from "@/lib/property-media";

interface ProposalPrimaryMediaCellProps {
  buildingId?: string;
  buildingName?: string;
}

const previewFrameClass =
  "w-full min-w-[240px] max-w-[480px] overflow-hidden rounded-xl border bg-card";

export function ProposalPrimaryMediaCell({
  buildingId,
  buildingName,
}: ProposalPrimaryMediaCellProps) {
  const { data: property, isLoading: propertyLoading } = useProperty(buildingId || "");
  const { data: media = [], isLoading: mediaLoading } = useMediaByBuilding(buildingId);
  const selection = getPrimaryMediaSelection(property?.additionalFields);

  if (!buildingId) {
    return <EmptyState label="No building media" />;
  }

  if (propertyLoading || mediaLoading) {
    return (
      <div className={`${previewFrameClass} flex h-64 items-center justify-center bg-muted/10 text-muted-foreground`}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const selectedPrimary = selection.primaryMediaId
    ? media.find((item) => item.id === selection.primaryMediaId)
    : undefined;

  const fallbackPrimary = !selection.isExplicit
    ? media.find((item) => item.category === "photo") || media[0]
    : undefined;

  const primary = selectedPrimary || fallbackPrimary;

  if (!primary) {
    return (
      <EmptyState
        label={selection.isExplicit ? "No main media selected" : "No property media"}
      />
    );
  }

  if (primary.category === "photo" && primary.fileUrl) {
    return (
      <a
        href={primary.fileUrl}
        target="_blank"
        rel="noreferrer"
        className={`${previewFrameClass} group block`}
        title={`Open main image for ${buildingName || "property"}`}
      >
        <div className="flex h-64 items-center justify-center bg-muted/20 p-3">
          <img
            src={primary.fileUrl}
            alt={`Main image for ${buildingName || "property"}`}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-xs">
          <span className="font-medium text-foreground">Main image</span>
          <span className="flex items-center gap-1 text-muted-foreground transition-colors group-hover:text-foreground">
            View full size <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </a>
    );
  }

  if (primary.category === "video" && primary.fileUrl) {
    return (
      <a
        href={primary.fileUrl}
        target="_blank"
        rel="noreferrer"
        className={`${previewFrameClass} group block`}
        title={`Open main video for ${buildingName || "property"}`}
      >
        <div className="relative flex h-64 items-center justify-center bg-black p-2">
          <video
            src={primary.fileUrl}
            preload="metadata"
            muted
            className="max-h-full max-w-full object-contain"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
              <Film className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-xs">
          <span className="font-medium text-foreground">Main video</span>
          <span className="flex items-center gap-1 text-muted-foreground transition-colors group-hover:text-foreground">
            Open video <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </a>
    );
  }

  return (
    <a
      href={primary.fileUrl || undefined}
      target={primary.fileUrl ? "_blank" : undefined}
      rel={primary.fileUrl ? "noreferrer" : undefined}
      className={`${previewFrameClass} flex h-64 flex-col items-center justify-center bg-muted/10 px-4 text-center text-muted-foreground`}
    >
      <FileText className="h-9 w-9" />
      <span className="mt-2 max-w-[360px] truncate text-xs font-medium text-foreground">
        {primary.fileName || "Main document"}
      </span>
      <span className="mt-1 flex items-center gap-1 text-[11px]">
        Open main document {primary.fileUrl && <ExternalLink className="h-3 w-3" />}
      </span>
    </a>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className={`${previewFrameClass} flex h-64 flex-col items-center justify-center border-dashed bg-muted/5 px-4 text-center text-muted-foreground`}>
      <ImageIcon className="h-8 w-8" />
      <span className="mt-2 text-xs">{label}</span>
    </div>
  );
}
