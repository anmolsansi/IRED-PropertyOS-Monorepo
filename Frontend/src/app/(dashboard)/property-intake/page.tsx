"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardList,
  Clock3,
  ImageIcon,
  MapPin,
  PhoneCall,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  usePropertyIntake,
  useUpdateIntakeStatus,
  type IntakeStatus,
  type PropertyIntakeItem,
} from "@/hooks/use-properties";
import { toast } from "sonner";

const STATUS_OPTIONS: Array<{
  value: "ALL" | Exclude<IntakeStatus, "COMPLETED">;
  label: string;
}> = [
  { value: "ALL", label: "All" },
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "FOLLOW_UP", label: "Follow-up" },
];

const STATUS_STYLES: Record<Exclude<IntakeStatus, "COMPLETED">, string> = {
  NEW: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  FOLLOW_UP: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function IntakeStatusBadge({ status }: { status: Exclude<IntakeStatus, "COMPLETED"> }) {
  const label = status === "IN_PROGRESS" ? "IN PROGRESS" : status === "FOLLOW_UP" ? "FOLLOW-UP" : "NEW";
  return (
    <Badge variant="outline" className={`rounded-md text-[10px] font-semibold ${STATUS_STYLES[status]}`}>
      {label}
    </Badge>
  );
}

function SummaryCard({
  label,
  value,
  description,
  active,
  onClick,
}: {
  label: string;
  value: number;
  description: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md sm:p-5 ${active ? "border-primary ring-1 ring-primary/15" : ""}`}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function IntakeAction({ item }: { item: PropertyIntakeItem }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateStatus = useUpdateIntakeStatus();
  const [busy, setBusy] = useState(false);

  async function openItem() {
    if (item.intakeStatus !== "NEW") {
      router.push(`/property-intake/${item.id}`);
      return;
    }

    setBusy(true);
    try {
      await updateStatus.mutateAsync({ id: item.id, status: "IN_PROGRESS" });
      await queryClient.invalidateQueries({ queryKey: ["property-intake"] });
      router.push(`/property-intake/${item.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start intake review");
    } finally {
      setBusy(false);
    }
  }

  const label = item.intakeStatus === "NEW" ? "Start" : item.intakeStatus === "IN_PROGRESS" ? "Continue" : "Open";

  return (
    <Button type="button" variant={item.intakeStatus === "NEW" ? "default" : "outline"} size="sm" onClick={openItem} disabled={busy}>
      {busy ? "Starting..." : label}
      {!busy && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
    </Button>
  );
}

export default function PropertyIntakePage() {
  const [status, setStatus] = useState<"ALL" | Exclude<IntakeStatus, "COMPLETED">>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      status: status === "ALL" ? undefined : status,
      search: search.trim() || undefined,
      page,
      limit: 20,
    }),
    [status, search, page],
  );

  const { data, isLoading, isError, error } = usePropertyIntake(filters);
  const items = data?.data || [];
  const summary = data?.summary || { total: 0, new: 0, inProgress: 0, followUp: 0 };

  function chooseStatus(next: typeof status) {
    setStatus(next);
    setPage(1);
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 pb-8 lg:space-y-6">
      <PageHeader
        title="Property Intake"
        description="Review, enrich, and complete properties submitted by riders before they enter master Properties."
      >
        <Button asChild>
          <Link href="/properties/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <SummaryCard label="Total Intake" value={summary.total} description="Waiting in the intake workflow" active={status === "ALL"} onClick={() => chooseStatus("ALL")} />
        <SummaryCard label="New" value={summary.new} description="Not started yet" active={status === "NEW"} onClick={() => chooseStatus("NEW")} />
        <SummaryCard label="In Progress" value={summary.inProgress} description="Currently being completed" active={status === "IN_PROGRESS"} onClick={() => chooseStatus("IN_PROGRESS")} />
        <SummaryCard label="Follow-up" value={summary.followUp} description="Needs another call or more info" active={status === "FOLLOW_UP"} onClick={() => chooseStatus("FOLLOW_UP")} />
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Intake Queue</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Only active rider submissions appear here. Completed records move to Properties.</p>
            </div>

            <div className="relative w-full xl:w-[360px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-9"
                placeholder="Search property, location, or rider..."
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={status === option.value ? "default" : "outline"}
                size="sm"
                className="shrink-0"
                onClick={() => chooseStatus(option.value)}
              >
                {option.label}
                <span className="ml-2 rounded-full bg-background/20 px-1.5 text-[10px]">
                  {option.value === "ALL"
                    ? summary.total
                    : option.value === "NEW"
                      ? summary.new
                      : option.value === "IN_PROGRESS"
                        ? summary.inProgress
                        : summary.followUp}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid min-h-72 place-items-center p-8 text-sm text-muted-foreground">Loading intake queue...</div>
        ) : isError ? (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <p className="font-medium text-destructive">Unable to load Property Intake</p>
              <p className="mt-1 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Please try again."}</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div className="max-w-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold">No properties in this queue</h3>
              <p className="mt-1 text-sm text-muted-foreground">New rider submissions will appear here automatically.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Property</th>
                    <th className="px-4 py-3 font-medium">Rider</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Captured</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-5 py-4">
                        <div className="max-w-[320px]">
                          <p className="font-medium">{item.buildingName}</p>
                          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {[item.locality, item.city, item.state].filter(Boolean).join(", ") || item.address || "Location not completed"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                            <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span>{item.submittedByName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{formatDate(item.submittedAt)}</span>
                      </td>
                      <td className="px-4 py-4"><IntakeStatusBadge status={item.intakeStatus as Exclude<IntakeStatus, "COMPLETED">} /></td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><PhoneCall className="h-3.5 w-3.5" />{item.contactCount}</span>
                          <span className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" />{item.mediaCount}</span>
                          {item.latitude && item.longitude && <span className="flex items-center gap-1 text-green-600"><MapPin className="h-3.5 w-3.5" />GPS</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right"><IntakeAction item={item} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y md:hidden">
              {items.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{item.buildingName}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{[item.locality, item.city, item.state].filter(Boolean).join(", ") || "Location not completed"}</p>
                    </div>
                    <IntakeStatusBadge status={item.intakeStatus as Exclude<IntakeStatus, "COMPLETED">} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted/25 p-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{item.submittedByName}</span>
                    <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{formatDate(item.submittedAt)}</span>
                    <span className="flex items-center gap-1.5"><PhoneCall className="h-3.5 w-3.5" />{item.contactCount} contact{item.contactCount === 1 ? "" : "s"}</span>
                    <span className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" />{item.mediaCount} media</span>
                  </div>
                  <div className="mt-3 flex justify-end"><IntakeAction item={item} /></div>
                </div>
              ))}
            </div>

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm sm:px-5">
                <p className="text-xs text-muted-foreground">Page {data.page} of {data.totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
