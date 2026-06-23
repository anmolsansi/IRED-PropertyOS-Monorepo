"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { FormField } from "@/components/shared/FormField";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeals, useCreateDeal, useDeleteDeal } from "@/hooks/use-deals";
import { useClients } from "@/hooks/use-clients";
import { useProperties } from "@/hooks/use-properties";
import { useUnits } from "@/hooks/use-properties";
import { useQueryClient } from "@tanstack/react-query";
import { dealSchema } from "@/lib/validation";
import { DEAL_STAGE_LABELS, DEAL_STAGES_ORDER } from "@/lib/constants";
import { Plus, TrendingUp, IndianRupee, Handshake, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STAGE_COLORS: Record<string, string> = {
  requirement_received: "border-t-blue-500",
  shortlisted: "border-t-purple-500",
  site_visit_scheduled: "border-t-yellow-500",
  site_visit_completed: "border-t-orange-500",
  negotiation: "border-t-red-500",
  agreement_shared: "border-t-green-500",
  closed: "border-t-green-700",
  lost: "border-t-gray-400",
};

const INITIAL_FORM = {
  title: "",
  clientId: "",
  requirementId: "",
  propertyId: "",
  unitId: "",
  stage: "requirement_received",
  priority: "medium",
  expectedCloseDate: "",
  rentValue: "",
  notes: "",
};

export default function DealsPage() {
  const router = useRouter();
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const { data, isLoading } = useDeals({});
  const deals = data?.data || [];
  const queryClient = useQueryClient();
  const createDeal = useCreateDeal();
  const deleteDeal = useDeleteDeal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: clientsData } = useClients({ pageSize: 200 });
  const clients = clientsData?.data || [];

  const { data: propertiesData } = useProperties({ pageSize: 200 });
  const properties = propertiesData?.data || [];

  const { data: unitsData } = useUnits({ pageSize: 200 });
  const units = unitsData?.data || [];

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleCreate() {
    const result = dealSchema.safeParse({
      clientId: form.clientId,
      requirementId: form.requirementId,
      propertyId: form.propertyId,
      stage: form.stage,
      priority: form.priority,
      expectedCloseDate: form.expectedCloseDate,
      rentValue: form.rentValue,
      notes: form.notes,
    });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the errors below.");
      return;
    }
    try {
      const title = form.title || `Deal for ${clients.find((c) => c.id === form.clientId)?.name || form.clientId}`;
      await createDeal.mutateAsync({
        title,
        clientId: form.clientId,
        buildingId: form.propertyId || undefined,
        unitId: form.unitId || undefined,
        dealValue: form.rentValue ? Number(form.rentValue) : undefined,
        status: form.stage,
        priority: form.priority,
        expectedCloseDate: form.expectedCloseDate || undefined,
        notes: form.notes || undefined,
        requirementId: form.requirementId || undefined,
      });
      toast.success("Deal created successfully!");
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setDialogOpen(false);
      setForm(INITIAL_FORM);
      setErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create deal");
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this deal?")) return;
    try {
      await deleteDeal.mutateAsync(id);
      toast.success("Deal deleted");
    } catch {
      toast.error("Failed to delete deal");
    }
  }

  const filteredDeals = deals.filter((d) => {
    const matchesSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || (d.client?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStage = filterStage === "all" || d.status === filterStage;
    return matchesSearch && matchesStage;
  });

  const stageCounts = DEAL_STAGES_ORDER.reduce(
    (acc, stage) => {
      acc[stage] = deals.filter((d) => d.status === stage).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalValue = deals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
  const activeDeals = deals.filter((d) => !["closed", "lost"].includes(d.status)).length;

  if (isLoading) return <LoadingSkeleton type="table" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deals"
        description="Track your deal pipeline from requirement to close."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView(view === "pipeline" ? "list" : "pipeline")}
        >
          {view === "pipeline" ? "List View" : "Pipeline View"}
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button size="sm" />}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Deal</DialogTitle>
              <DialogDescription>Add a new deal to the pipeline.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <FormField label="Deal Title" error={errors.title}>
                <Input
                  placeholder="e.g. Office deal for Acme Corp"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                />
              </FormField>
              <FormField label="Client" required error={errors.clientId}>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => v && updateField("clientId", v)}
                >
                  <SelectTrigger aria-invalid={!!errors.clientId}>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.company ? ` (${c.company})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Property / Building" required error={errors.propertyId}>
                <Select
                  value={form.propertyId}
                  onValueChange={(v) => v && updateField("propertyId", v)}
                >
                  <SelectTrigger aria-invalid={!!errors.propertyId}>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.buildingName}{p.city ? ` - ${p.city}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              {form.propertyId && (
                <FormField label="Unit (optional)" error={errors.unitId}>
                  <Select
                    value={form.unitId}
                    onValueChange={(v) => updateField("unitId", v || "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {units.filter((u) => (u as unknown as Record<string, unknown>).buildingId === form.propertyId).map((u) => {
                        const raw = u as unknown as { unitNumber?: string; unitCode?: string };
                        return (
                          <SelectItem key={u.id} value={u.id}>
                            {raw.unitNumber || raw.unitCode || u.id}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
              <FormField label="Requirement ID (optional)" error={errors.requirementId}>
                <Input
                  placeholder="e.g. req_456"
                  value={form.requirementId}
                  onChange={(e) => updateField("requirementId", e.target.value)}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Stage" required error={errors.stage}>
                  <Select
                    value={form.stage}
                    onValueChange={(v) => v && updateField("stage", v)}
                  >
                    <SelectTrigger aria-invalid={!!errors.stage}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_STAGES_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {DEAL_STAGE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Priority" required error={errors.priority}>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => v && updateField("priority", v)}
                  >
                    <SelectTrigger aria-invalid={!!errors.priority}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Expected Close Date" error={errors.expectedCloseDate}>
                  <Input
                    type="date"
                    value={form.expectedCloseDate}
                    onChange={(e) => updateField("expectedCloseDate", e.target.value)}
                  />
                </FormField>
                <FormField label="Rent Value (₹/mo)" error={errors.rentValue}>
                  <Input
                    type="number"
                    placeholder="e.g. 50000"
                    value={form.rentValue}
                    onChange={(e) => updateField("rentValue", e.target.value)}
                  />
                </FormField>
              </div>
              <FormField label="Notes" error={errors.notes}>
                <Textarea
                  placeholder="Optional notes..."
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={3}
                />
              </FormField>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Deal</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Handshake className="h-4 w-4" />
              <span className="text-xs">Active Deals</span>
            </div>
            <p className="text-2xl font-bold">{activeDeals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <IndianRupee className="h-4 w-4" />
              <span className="text-xs">Total Pipeline Value</span>
            </div>
            <p className="text-2xl font-bold">₹{(totalValue / 100000).toFixed(1)}L/mo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Conversion Rate</span>
            </div>
            <p className="text-2xl font-bold">
              {deals.length > 0
                ? `${Math.round((deals.filter((d) => d.status === "closed").length / deals.length) * 100)}%`
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStage} onValueChange={(v) => v && setFilterStage(v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {DEAL_STAGES_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {DEAL_STAGE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {view === "pipeline" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES_ORDER.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.status === stage);
            return (
              <div key={stage} className="min-w-[280px] flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">{DEAL_STAGE_LABELS[stage]}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {stageDeals.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {stageDeals.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
                      No deals
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <Card
                        key={deal.id}
                        className={`border-t-2 ${STAGE_COLORS[deal.status] || ""} cursor-pointer hover:shadow-md transition-shadow`}
                        onClick={() => router.push(`/deals/${deal.id}`)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm font-medium line-clamp-1">
                              {deal.title}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={(e) => handleDelete(deal.id, e)}
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {deal.client?.name || deal.clientId}
                          </p>
                          {deal.dealValue && (
                            <p className="text-sm font-semibold">
                              ₹{deal.dealValue.toLocaleString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredDeals.map((deal) => (
              <Card
                key={deal.id}
                className="cursor-pointer"
                onClick={() => router.push(`/deals/${deal.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">{deal.client?.name || deal.clientId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {DEAL_STAGE_LABELS[deal.status]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => handleDelete(deal.id, e)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground text-xs">Value</span>
                    <span className="text-xs font-medium">
                      {deal.dealValue ? `₹${deal.dealValue.toLocaleString()}` : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredDeals.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No deals found.
                </CardContent>
              </Card>
            )}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Title
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Client
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Property
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Stage
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                      Rent/mo
                    </th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((deal) => (
                    <tr
                      key={deal.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/deals/${deal.id}`)}
                    >
                      <td className="p-3 text-sm font-medium">{deal.title}</td>
                      <td className="p-3 text-sm">{deal.client?.name || deal.clientId}</td>
                      <td className="p-3 text-sm">{deal.building?.buildingName || "—"}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {DEAL_STAGE_LABELS[deal.status]}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-right font-medium">
                        {deal.dealValue ? `₹${deal.dealValue.toLocaleString()}` : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => handleDelete(deal.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
