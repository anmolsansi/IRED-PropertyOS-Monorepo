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
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import type { FilterParams } from "@/types";

const INITIAL_FORM = {
  title: "",
  clientId: "",
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      setErrors({ clientId: "Client is required" });
      toast.error("Please select a client.");
      return;
    }
    
    try {
      await createProposal.mutateAsync({
        clientId: form.clientId,
        title: form.title || undefined,
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
        description="Create and manage client proposals and shortlists."
      >
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-2" />
            New Proposal
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Proposal</DialogTitle>
              <DialogDescription>Create a new proposal for a client to start adding properties.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Proposal Title" error={errors.title}>
                <Input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Bandra Office Shortlist" />
                <p className="text-xs text-muted-foreground mt-1">Leave blank to auto-generate from client name.</p>
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

              <FormField label="Notes" error={errors.notes}>
                <Input name="notes" value={form.notes} onChange={handleChange} placeholder="Optional notes about this proposal" />
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
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <p className="text-2xl font-bold">{data?.total || proposals.length}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Proposals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-600">
              {proposals.filter((p) => p.status === "draft").length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">
              {proposals.filter((p) => p.status === "exported").length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Exported</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">
              {proposals.filter((p) => p.status === "accepted").length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Accepted</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Input
              placeholder="Search proposals by title or client..."
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
                <SelectItem value="exported">Exported</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
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
                          <p className="font-medium text-sm">{p.title || `Proposal - ${p.client?.name}`}</p>
                          <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("en-IN")}</p>
                        </div>
                        <StatusBadge type="proposal" value={p.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Client</p>
                          <p>{p.client?.name || p.clientId}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Items</p>
                          <p>{p.itemCount || 0} property(s)</p>
                        </div>
                      </div>
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
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
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
                          <p className="font-medium text-sm">{p.title || `Proposal - ${p.client?.name}`}</p>
                        </TableCell>
                        <TableCell className="text-sm">{p.client?.name || p.clientId}</TableCell>
                        <TableCell className="text-sm">{p.itemCount || 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
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
