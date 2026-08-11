"use client";

import { FileText, Film, ImageIcon, Loader2 } from "lucide-react";
import { useMediaByBuilding } from "@/hooks/use-media";
import { getPrimaryMediaSelection } from "@/lib/property-media";

interface ProposalPrimaryMediaCellProps {
  buildingId?: string;
  buildingName?: string;
  additionalFields?: unknown;
}

export function ProposalPrimaryMediaCell({
  buildingId,
  buildingName,
  additionalFields,
}: ProposalPrimaryMediaCellProps) {
  const { data: media = [], isLoading } = useMediaByBuilding(buildingId);
  const selection = getPrimaryMediaSelection(additionalFields);

  if (!buildingId) {
    return <EmptyState label="No building media" />;
  }

  if (isLoading) {
    return (
      <div className="flex h-44 min-w-[240px] items-center justify-center rounded-xl border bg-muted/10 text-muted-foreground">
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
        className="group relative block h-44 min-w-[240px] overflow-hidden rounded-xl border bg-muted"
        title={`Open main image for ${buildingName || "property"}`}
      >
        <img
          src={primary.fileUrl}
          alt={`Main image for ${buildingName || "property"}`}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-xs font-medium text-white">
          Main image
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
        className="group relative block h-44 min-w-[240px] overflow-hidden rounded-xl border bg-black"
        title={`Open main video for ${buildingName || "property"}`}
      >
        <video
          src={primary.fileUrl}
          preload="metadata"
          muted
          className="h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
            <Film className="h-5 w-5" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 text-xs font-medium text-white">
          Main video
        </div>
      </a>
    );
  }

  return (
    <a
      href={primary.fileUrl || undefined}
      target={primary.fileUrl ? "_blank" : undefined}
      rel={primary.fileUrl ? "noreferrer" : undefined}
      className="flex h-44 min-w-[240px] flex-col items-center justify-center rounded-xl border bg-muted/10 px-4 text-center text-muted-foreground"
    >
      <FileText className="h-9 w-9" />
      <span className="mt-2 max-w-[200px] truncate text-xs font-medium">
        {primary.fileName || "Main document"}
      </span>
      <span className="mt-1 text-[11px]">Main document</span>
    </a>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-44 min-w-[240px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/5 px-4 text-center text-muted-foreground">
      <ImageIcon className="h-8 w-8" />
      <span className="mt-2 text-xs">{label}</span>
    </div>
  );
}
