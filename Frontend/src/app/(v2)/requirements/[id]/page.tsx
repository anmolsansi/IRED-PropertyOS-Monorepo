"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { InfoSection } from "@/components/properties/InfoSection";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRequirement, useUpdateRequirement, useDeleteRequirement } from "@/hooks/use-requirements";
import { PROPERTY_TYPE_LABELS, FURNISHING_LABELS } from "@/lib/constants";
import { ArrowLeft, Pencil, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = { lease: "Lease", buy: "Buy", sell: "Sell" };
const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  fulfilled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function RequirementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: req, isLoading, error } = useRequirement(id);
  const updateRequirement = useUpdateRequirement();
  const deleteRequirement = useDeleteRequirement();

  const [editOpen, setEditOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});

  if (isLoading) return <LoadingSkeleton type="table" />;

  if (error || !req) {
    return (
      <EmptyState
        title="Requirement not found"
        description="The requirement you're looking for doesn't exist."
        action={
          <Link href="/requirements">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Requirements
            </Button>
          </Link>
        }
      />
    );
  }

  function openEdit() {
    if (!req) return;
    setForm({
      title: req.title || "",
      requirementType: req.requirementType || "lease",
      preferredState: req.preferredState || "",
      preferredCity: req.preferredCity || "",
      preferredLocality: req.preferredLocality || "",
      propertyType: req.propertyType || "",
      furnishingPreference: req.furnishingPreference || "",
      minArea: req.minArea?.toString() || "",
      maxArea: req.maxArea?.toString() || "",
      minBudget: req.minBudget?.toString() || "",
      maxBudget: req.maxBudget?.toString() || "",
      moveInDate: req.moveInDate || "",
      parkingRequired: req.parkingRequired || false,
      specialNotes: req.specialNotes || "",
      status: req.status || "active",
    });
    setEditOpen(true);
  }

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleUpdate() {
    if (!req) return;
    try {
      const data: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(form)) {
        if (key === "minArea" || key === "maxArea" || key === "minBudget" || key === "maxBudget") {
          data[key] = val ? Number(val) : undefined;
        } else {
          data[key] = val || undefined;
        }
      }
      await updateRequirement.mutateAsync({ id: req.id, data });
      toast.success("Requirement updated successfully!");
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update requirement");
    }
  }

  async function handleDelete() {
    if (!req) return;
    try {
      await deleteRequirement.mutateAsync(req.id);
      toast.success("Requirement deleted.");
      router.push("/requirements");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete requirement");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={req.title || `${TYPE_LABELS[req.requirementType ?? ""]} Requirement`}
        description={`Client: ${req.client?.name || req.clientId}`}
      >
        <Link href="/requirements">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={openEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoSection
          title="Requirement Details"
          fields={[
            { label: "Type", value: TYPE_LABELS[req.requirementType ?? ""] },
            { label: "Status", value: req.status },
            { label: "Property Type", value: PROPERTY_TYPE_LABELS[req.propertyType ?? ""] },
            { label: "Furnishing", value: FURNISHING_LABELS[req.furnishingPreference ?? ""] },
            { label: "Parking Required", value: req.parkingRequired ? "Yes" : "No" },
          ]}
        />

        <InfoSection
          title="Location & Budget"
          fields={[
            { label: "State", value: req.preferredState },
            { label: "City", value: req.preferredCity },
            { label: "Locality", value: req.preferredLocality },
            { label: "Area", value: req.minArea && req.maxArea ? `${req.minArea}–${req.maxArea} sqft` : undefined },
            { label: "Budget", value: req.minBudget != null && req.maxBudget != null ? `₹${req.minBudget}–₹${req.maxBudget}` : undefined },
          ]}
        />
      </div>

      {req.moveInDate && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Move-in Date:</span>
              <span>{new Date(req.moveInDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {req.specialNotes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Special Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{req.specialNotes}</p>
          </CardContent>
        </Card>
      )}

      {req.client && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Linked Client</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/clients/${req.client.id}`} className="text-sm font-medium hover:underline">
              {req.client.name}
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Record Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">ID: </span>
              <span className="font-mono text-xs">{req.id}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created: </span>
              <span>{new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Requirement</DialogTitle>
            <DialogDescription>Update requirement details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Title">
              <Input value={String(form.title || "")} onChange={(e) => updateField("title", e.target.value)} />
            </FormField>

            <FormField label="Requirement Type">
              <Select value={String(form.requirementType)} onValueChange={(v) => v && updateField("requirementType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lease">Lease</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Status">
              <Select value={String(form.status)} onValueChange={(v) => v && updateField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Property Type">
              <Select value={String(form.propertyType)} onValueChange={(v) => v && updateField("propertyType", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Preferred State">
                <Input value={String(form.preferredState || "")} onChange={(e) => updateField("preferredState", e.target.value)} />
              </FormField>
              <FormField label="Preferred City">
                <Input value={String(form.preferredCity || "")} onChange={(e) => updateField("preferredCity", e.target.value)} />
              </FormField>
            </div>

            <FormField label="Preferred Locality">
              <Input value={String(form.preferredLocality || "")} onChange={(e) => updateField("preferredLocality", e.target.value)} />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Min Area (sqft)">
                <Input type="number" value={String(form.minArea || "")} onChange={(e) => updateField("minArea", e.target.value)} />
              </FormField>
              <FormField label="Max Area (sqft)">
                <Input type="number" value={String(form.maxArea || "")} onChange={(e) => updateField("maxArea", e.target.value)} />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Min Budget">
                <Input type="number" value={String(form.minBudget || "")} onChange={(e) => updateField("minBudget", e.target.value)} />
              </FormField>
              <FormField label="Max Budget">
                <Input type="number" value={String(form.maxBudget || "")} onChange={(e) => updateField("maxBudget", e.target.value)} />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Furnishing">
                <Select value={String(form.furnishingPreference || "none")} onValueChange={(v) => { if (v) updateField("furnishingPreference", v === "none" ? "" : v); }}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {Object.entries(FURNISHING_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Move-in Date">
                <Input type="date" value={String(form.moveInDate || "")} onChange={(e) => updateField("moveInDate", e.target.value)} />
              </FormField>
            </div>

            <FormField label="Special Notes">
              <Input value={String(form.specialNotes || "")} onChange={(e) => updateField("specialNotes", e.target.value)} />
            </FormField>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(form.parkingRequired)}
                onChange={(e) => updateField("parkingRequired", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-700"
              />
              <Label className="text-sm">Parking Required</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateRequirement.isPending}>
              {updateRequirement.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this requirement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
