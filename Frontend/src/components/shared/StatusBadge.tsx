import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AVAILABILITY_COLORS,
  VERIFICATION_COLORS,
  APPROVAL_STATUS_COLORS,
  PRIORITY_COLORS,
} from "@/lib/constants";

type StatusType =
  | "availability"
  | "verification"
  | "approval"
  | "priority"
  | "task"
  | "deal"
  | "site_visit"
  | "proposal"
  | "follow_up";

interface StatusBadgeProps {
  type: StatusType;
  value: string;
  className?: string;
}

const TASK_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  in_progress: { label: "In Progress", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300" },
};

const DEAL_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  requirement_received: { label: "Requirement Received", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  shortlisted: { label: "Shortlisted", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  site_visit_scheduled: { label: "Site Visit Scheduled", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  site_visit_completed: { label: "Site Visit Done", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  negotiation: { label: "Negotiation", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  agreement_shared: { label: "Agreement Shared", className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300" },
  closed: { label: "Closed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  lost: { label: "Lost", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

const SITE_VISIT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300" },
  no_show: { label: "No Show", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

const PROPOSAL_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  accepted: { label: "Accepted", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  expired: { label: "Expired", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
};

const FOLLOW_UP_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  skipped: { label: "Skipped", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300" },
};

const LEGACY_COLOR_MAPS: Record<string, Record<string, string>> = {
  availability: AVAILABILITY_COLORS,
  verification: VERIFICATION_COLORS,
  approval: APPROVAL_STATUS_COLORS,
  priority: PRIORITY_COLORS,
};

const LEGACY_LABELS: Record<string, Record<string, string>> = {
  availability: {
    available: "Available",
    occupied: "Occupied",
    under_negotiation: "Under Negotiation",
    on_hold: "On Hold",
    under_construction: "Under Construction",
    planned: "Planned",
  },
  verification: {
    verified: "Verified",
    pending_verification: "Pending",
    needs_review: "Needs Review",
    rejected: "Rejected",
  },
  approval: {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    deferred: "Deferred",
    conflict: "Conflict",
  },
  priority: {
    high: "High",
    medium: "Medium",
    low: "Low",
  },
};

const STATUS_CONFIGS: Record<string, Record<string, { label: string; className: string }>> = {
  task: TASK_STATUS_CONFIG,
  deal: DEAL_STATUS_CONFIG,
  site_visit: SITE_VISIT_STATUS_CONFIG,
  proposal: PROPOSAL_STATUS_CONFIG,
  follow_up: FOLLOW_UP_STATUS_CONFIG,
};

export function StatusBadge({ type, value, className }: StatusBadgeProps) {
  const statusConfig = STATUS_CONFIGS[type];

  if (statusConfig) {
    const config = statusConfig[value];
    return (
      <Badge
        variant="secondary"
        className={cn("font-medium", config?.className || "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300", className)}
      >
        {config?.label || value}
      </Badge>
    );
  }

  const colors = LEGACY_COLOR_MAPS[type];
  const labelMap = LEGACY_LABELS[type];

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-medium",
        colors?.[value] || "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300",
        className
      )}
    >
      {labelMap?.[value] || value}
    </Badge>
  );
}
