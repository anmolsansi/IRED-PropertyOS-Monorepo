"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { FormField } from "@/components/shared/FormField";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProposals, useCreateProposal } from "@/hooks/use-proposals";
import { useClients } from "@/hooks/use-clients";
import { useUnits } from "@/hooks/use-properties";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import type { FilterParams } from "@/types";

const INITIAL_FORM = {
  title: "",
  dealId: "",
  clientId: "",
  rentValue: "",
  leaseTerms: "",
  validUntil: "",
  camCharges: "",
  securityDeposit: "",
  notes: "",
};

export default function ProposalsPage() {
  const [filters, setFilters] = useState<FilterParams>({ page: 1, pageSize: 10 });
  const { data, isLoading } = useProposals(filters);
  const proposals = data?.data || [];
  const totalPages = data?.totalPages || 0;
  const currentPage = data?.page || 1;

  const createProposal = useCreateProposal();

  const { data: clientsData } = useClients({ pageSize: 200 });
  const clients = clientsData?.data || [];

  const { data: unitsData } = useUnits({ pageSize: 200 });
  const units = unitsData?.data || [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalValue = proposals.reduce((sum, p) => sum + (p.rentValue ?? 0), 0);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function toggleUnit(unitId: string) {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setSelectedUnitIds([]);
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      setErrors({ clientId: "Client is required" });
      toast.error("Please select a client.");
      return;
    }
    if (!form.title) {
      setErrors({ title: "Title is required" });
      toast.error("Please enter a title.");
      return;
    }
    if (selectedUnitIds.length === 0) {
      toast.error("Please select at least one unit.");
      return;
    }
    try {
      await createProposal.mutateAsync({
        clientId: form.clientId,
        unitIds: selectedUnitIds,
        title: form.title || undefined,
        dealId: form.dealId || undefined,
        rentValue: form.rentValue ? Number(form.rentValue) : undefined,
        camCharges: form.camCharges ? Number(form.camCharges) : undefined,
        securityDeposit: form.securityDeposit ? Number(form.securityDeposit) : undefined,
        leaseTerms: form.leaseTerms || undefined,
        validUntil: form.validUntil || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Proposal created successfully!");
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create proposal");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals"
        description="Create and manage lease proposals for clients."
      >
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-2" />
            New Proposal
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Proposal</DialogTitle>
              <DialogDescription>Fill in the details to create a new lease proposal.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Title" required error={errors.title}>
                <Input name="title" value={form.title} onChange={handleChange} placeholder="Proposal title" />
              </FormField>

              <FormField label="Client" required error={errors.clientId}>
                <Select value={form.clientId} onValueChange={(v) => { setForm((prev) => ({ ...prev, clientId: v || "" })); if (errors.clientId) setErrors((p) => ({ ...p, clientId: "" })); }}>
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

              <FormField label="Units" required>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                  {units.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No units available.</p>
                  ) : (
                    units.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                        <input
                          type="checkbox"
                          checked={selectedUnitIds.includes(u.id)}
                          onChange={() => toggleUnit(u.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span>{u.unitNumber || u.unitCode || u.id}</span>
                        <span className="text-muted-foreground text-xs ml-auto">
                          {u.monthlyRent ? `₹${u.monthlyRent.toLocaleString()}/mo` : ""}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {selectedUnitIds.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedUnitIds.length} unit(s) selected</p>
                )}
              </FormField>

              <FormField label="Deal ID" error={errors.dealId}>
                <Input name="dealId" value={form.dealId} onChange={handleChange} placeholder="Optional deal reference" />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Rent Value" error={errors.rentValue}>
                  <Input name="rentValue" type="number" value={form.rentValue} onChange={handleChange} placeholder="Monthly rent" />
                </FormField>
                <FormField label="CAM Charges" error={errors.camCharges}>
                  <Input name="camCharges" type="number" value={form.camCharges} onChange={handleChange} placeholder="Optional" />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Security Deposit" error={errors.securityDeposit}>
                  <Input name="securityDeposit" type="number" value={form.securityDeposit} onChange={handleChange} placeholder="Optional" />
                </FormField>
                <FormField label="Valid Until" error={errors.validUntil}>
                  <Input name="validUntil" type="date" value={form.validUntil} onChange={handleChange} />
                </FormField>
              </div>

              <FormField label="Lease Terms" error={errors.leaseTerms}>
                <Input name="leaseTerms" value={form.leaseTerms} onChange={handleChange} placeholder="e.g. 11 months" />
              </FormField>

              <FormField label="Notes" error={errors.notes}>
                <Input name="notes" value={form.notes} onChange={handleChange} placeholder="Optional notes" />
              </FormField>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProposal.isPending}>
                  {createProposal.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{data?.total || proposals.length}</p>
            <p className="text-xs text-muted-foreground">Total Proposals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">
              {proposals.filter((p) => p.status === "sent").length}
            </p>
            <p className="text-xs text-muted-foreground">Awaiting Response</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">
              {proposals.filter((p) => p.status === "accepted").length}
            </p>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">₹{(totalValue / 100000).toFixed(1)}L</p>
            <p className="text-xs text-muted-foreground">Total Monthly Value</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Input
              placeholder="Search proposals..."
              className="max-w-sm"
              value={filters.search || ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value || undefined, page: 1 }))
              }
            />
            <Select
              value={filters.status || "all"}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, status: !v || v === "all" ? undefined : v, page: 1 }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingSkeleton type="table" />
      ) : (
        <>
          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {proposals.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No proposals found.
                </CardContent>
              </Card>
            ) : (
              proposals.map((p) => (
                <Link key={p.id} href={`/proposals/${p.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{p.leaseTerms}</p>
                        </div>
                        <StatusBadge type="proposal" value={p.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Client</p>
                          <p>{p.client?.name || p.clientId}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Units</p>
                          <p>{p.unitIds.length} unit(s)</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Rent/mo</p>
                          <p className="font-medium">₹{(p.rentValue ?? 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Deposit</p>
                          <p>₹{(p.securityDeposit ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                      {p.validUntil && (
                        <p className="text-xs text-muted-foreground">
                          Valid until{" "}
                          {new Date(p.validUntil).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>

          {/* Desktop table view */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proposal</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Rent/mo</TableHead>
                    <TableHead>Deposit</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No proposals found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    proposals.map((p) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => window.location.href = `/proposals/${p.id}`}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{p.title}</p>
                            <p className="text-xs text-muted-foreground">{p.leaseTerms}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{p.client?.name || p.clientId}</TableCell>
                        <TableCell className="text-sm">{p.unitIds.length} unit(s)</TableCell>
                        <TableCell className="text-sm font-medium">
                          ₹{(p.rentValue ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          ₹{(p.securityDeposit ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.validUntil
                            ? new Date(p.validUntil).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge type="proposal" value={p.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setFilters((prev) => ({ ...prev, page: currentPage - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters((prev) => ({ ...prev, page: currentPage + 1 }))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
