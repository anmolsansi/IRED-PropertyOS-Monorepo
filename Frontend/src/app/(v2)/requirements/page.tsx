"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRequirements, useCreateRequirement, type Requirement } from "@/hooks/use-requirements";
import { useClients } from "@/hooks/use-clients";
import { useQueryClient } from "@tanstack/react-query";
import { requirementSchema } from "@/lib/validation";
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from "@/lib/constants";
import { Plus, MapPin, IndianRupee, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import type { FilterParams } from "@/types";
import Link from "next/link";

const TYPE_LABELS: Record<string, string> = {
  lease: "Lease",
  buy: "Buy",
  sell: "Sell",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  fulfilled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const INITIAL_FORM = {
  clientId: "",
  title: "",
  requirementType: "lease" as "lease" | "buy" | "sell",
  preferredState: "",
  preferredCity: "",
  preferredLocality: "",
  propertyType: "",
  minArea: "",
  maxArea: "",
  minBudget: "",
  maxBudget: "",
  furnishingPreference: "",
  moveInDate: "",
  parkingRequired: false,
  specialNotes: "",
};

export default function RequirementsPage() {
  const [filters, setFilters] = useState<FilterParams>({ page: 1, pageSize: 10 });
  const { data, isLoading } = useRequirements(filters);
  const requirements = data?.data || [];
  const queryClient = useQueryClient();
  const createRequirement = useCreateRequirement();
  const { data: clientsData } = useClients({ pageSize: 200 });
  const clients = clientsData?.data || [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function updateField(field: string, value: string | boolean) {
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
    const result = requirementSchema.safeParse(form);
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
      const title = form.title || `${form.requirementType} - ${form.preferredCity || "Requirement"}`;
      await createRequirement.mutateAsync({
        clientId: form.clientId,
        title,
        requirementType: form.requirementType,
        preferredState: form.preferredState,
        preferredCity: form.preferredCity,
        preferredLocality: form.preferredLocality || undefined,
        propertyType: form.propertyType,
        furnishingPreference: form.furnishingPreference || undefined,
        moveInDate: form.moveInDate || undefined,
        parkingRequired: form.parkingRequired,
        specialNotes: form.specialNotes || undefined,
        minArea: form.minArea ? Number(form.minArea) : undefined,
        maxArea: form.maxArea ? Number(form.maxArea) : undefined,
        minBudget: form.minBudget ? Number(form.minBudget) : undefined,
        maxBudget: form.maxBudget ? Number(form.maxBudget) : undefined,
      });
      toast.success("Requirement created successfully!");
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      setDialogOpen(false);
      setForm(INITIAL_FORM);
      setErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create requirement");
    }
  }

  function RequirementCard({ req }: { req: Requirement }) {
    return (
      <Link href={`/requirements/${req.id}`}>
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm">{req.title || `${TYPE_LABELS[req.requirementType ?? ""]} Requirement`}</p>
                <p className="text-xs text-muted-foreground">
                  {req.client?.name || req.clientId}
                </p>
              </div>
              <Badge variant="secondary" className={STATUS_COLORS[req.status]}>
                {req.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground text-xs">Location</span>
              <span className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {req.preferredLocality ? `${req.preferredLocality}, ` : ""}
                {req.preferredCity}
              </span>
              <span className="text-muted-foreground text-xs">Type</span>
              <span className="text-xs">{PROPERTY_TYPE_LABELS[req.propertyType ?? ""]}</span>
              <span className="text-muted-foreground text-xs">Area</span>
              <span className="text-xs flex items-center gap-1">
                <Maximize2 className="h-3 w-3" />
                {req.minArea}–{req.maxArea} sqft
              </span>
              <span className="text-muted-foreground text-xs">Budget</span>
              <span className="text-xs flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                {req.minBudget}–{req.maxBudget}
              </span>
              {req.furnishingPreference && (
                <>
                  <span className="text-muted-foreground text-xs">Furnishing</span>
                  <span className="text-xs">{FURNISHING_LABELS[req.furnishingPreference]}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requirements"
        description="Client property requirements — lease, buy, and sell."
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button size="sm" />}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Requirement
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Requirement</DialogTitle>
              <DialogDescription>Add a new client property requirement.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <FormField label="Client" required error={errors.clientId}>
                <Select value={form.clientId} onValueChange={(v) => v && updateField("clientId", v)}>
                  <SelectTrigger aria-invalid={!!errors.clientId}>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Title" error={errors.title}>
                <Input
                  placeholder="e.g. Lease - Mumbai Office (auto-generated if empty)"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                />
              </FormField>

              <FormField label="Requirement Type" required error={errors.requirementType}>
                <Select value={form.requirementType} onValueChange={(v) => v && updateField("requirementType", v)}>
                  <SelectTrigger aria-invalid={!!errors.requirementType}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lease">Lease</SelectItem>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Property Type" required error={errors.propertyType}>
                <Select value={form.propertyType} onValueChange={(v) => v && updateField("propertyType", v)}>
                  <SelectTrigger aria-invalid={!!errors.propertyType}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Preferred State" required error={errors.preferredState}>
                  <Input
                    placeholder="e.g. Maharashtra"
                    value={form.preferredState}
                    onChange={(e) => updateField("preferredState", e.target.value)}
                    aria-invalid={!!errors.preferredState}
                  />
                </FormField>
                <FormField label="Preferred City" required error={errors.preferredCity}>
                  <Input
                    placeholder="e.g. Mumbai"
                    value={form.preferredCity}
                    onChange={(e) => updateField("preferredCity", e.target.value)}
                    aria-invalid={!!errors.preferredCity}
                  />
                </FormField>
              </div>

              <FormField label="Preferred Locality" error={errors.preferredLocality}>
                <Input
                  placeholder="e.g. Andheri West"
                  value={form.preferredLocality}
                  onChange={(e) => updateField("preferredLocality", e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Min Area (sqft)" required error={errors.minArea}>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.minArea}
                    onChange={(e) => updateField("minArea", e.target.value)}
                    aria-invalid={!!errors.minArea}
                  />
                </FormField>
                <FormField label="Max Area (sqft)" required error={errors.maxArea}>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.maxArea}
                    onChange={(e) => updateField("maxArea", e.target.value)}
                    aria-invalid={!!errors.maxArea}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Min Budget" required error={errors.minBudget}>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.minBudget}
                    onChange={(e) => updateField("minBudget", e.target.value)}
                    aria-invalid={!!errors.minBudget}
                  />
                </FormField>
                <FormField label="Max Budget" required error={errors.maxBudget}>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.maxBudget}
                    onChange={(e) => updateField("maxBudget", e.target.value)}
                    aria-invalid={!!errors.maxBudget}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Furnishing Preference" error={errors.furnishingPreference}>
                  <Select value={form.furnishingPreference || "none"} onValueChange={(v) => { if (v) updateField("furnishingPreference", v === "none" ? "" : v); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {Object.entries(FURNISHING_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Move-in Date" error={errors.moveInDate}>
                  <Input
                    type="date"
                    value={form.moveInDate}
                    onChange={(e) => updateField("moveInDate", e.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="Special Notes" error={errors.specialNotes}>
                <Input
                  placeholder="Any special requirements..."
                  value={form.specialNotes}
                  onChange={(e) => updateField("specialNotes", e.target.value)}
                />
              </FormField>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="parking-required"
                  checked={form.parkingRequired}
                  onChange={(e) => updateField("parkingRequired", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-700"
                />
                <Label htmlFor="parking-required" className="text-sm">Parking Required</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Requirement</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search by city or locality..."
              className="max-w-sm"
              value={filters.search || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value || undefined, page: 1 }))
              }
            />
            <Select
              value={filters.propertyType || "all"}
              onValueChange={(v) =>
                setFilters((prev) => ({
                  ...prev,
                  propertyType: v === "all" ? undefined : (v as FilterParams["propertyType"]),
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingSkeleton type="table" />
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {requirements.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No requirements found.
                </CardContent>
              </Card>
            ) : (
              requirements.map((req) => (
                <RequirementCard key={req.id} req={req} />
              ))
            )}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No requirements found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    requirements.map((req) => (
                      <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/requirements/${req.id}`}>
                        <TableCell className="font-medium">
                          {req.title || `${TYPE_LABELS[req.requirementType ?? ""]} Requirement`}
                        </TableCell>
                        <TableCell className="text-sm">{req.client?.name || req.clientId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{TYPE_LABELS[req.requirementType ?? ""]}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {req.preferredLocality ? `${req.preferredLocality}, ` : ""}
                            {req.preferredCity}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Maximize2 className="h-3 w-3 text-muted-foreground" />
                            {req.minArea}–{req.maxArea} sqft
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <IndianRupee className="h-3 w-3 text-muted-foreground" />
                            {req.minBudget}–{req.maxBudget}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={STATUS_COLORS[req.status]}>
                            {req.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
