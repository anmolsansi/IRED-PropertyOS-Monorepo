"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useProposal, useUpdateProposalStatus, useDeleteProposal, useGeneratePdf } from "@/hooks/use-proposals";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  Clock,
  Building2,
  MapPin,
  IndianRupee,
} from "lucide-react";

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: proposal, isLoading, error } = useProposal(id);
  const updateStatus = useUpdateProposalStatus();
  const deleteProposal = useDeleteProposal();
  const generatePdf = useGeneratePdf();

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="table" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="space-y-6">
        <PageHeader title="Proposal Not Found" description="The proposal you're looking for doesn't exist." />
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">This proposal may have been deleted or you do not have access.</p>
            <Button variant="outline" onClick={() => router.push("/proposals")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Proposals
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusActions: Record<string, { label: string; nextStatus: string; icon: React.ReactNode; color: string }[]> = {
    draft: [
      { label: "Send", nextStatus: "sent", icon: <Send className="h-4 w-4" />, color: "text-blue-600" },
    ],
    sent: [
      { label: "Accept", nextStatus: "accepted", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600" },
      { label: "Reject", nextStatus: "rejected", icon: <XCircle className="h-4 w-4" />, color: "text-red-600" },
    ],
  };

  const availableActions = statusActions[proposal.status] || [];

  async function handleStatusChange() {
    if (!newStatus) return;
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      toast.success(`Proposal marked as ${newStatus}`);
      setStatusDialogOpen(false);
      setNewStatus("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleDelete() {
    try {
      await deleteProposal.mutateAsync(id);
      toast.success("Proposal deleted successfully");
      router.push("/proposals");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete proposal");
    }
  }

  async function handleDownloadPdf() {
    try {
      const blob = await generatePdf.mutateAsync(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${proposal?.title || "proposal"}-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDF downloaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={proposal.title || "Proposal"}
        description={`Created ${new Date(proposal.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={generatePdf.isPending}>
            <Download className="h-4 w-4 mr-1" />
            {generatePdf.isPending ? "Generating..." : "Download PDF"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </PageHeader>

      {/* Status bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge type="proposal" value={proposal.status} />
              {proposal.validUntil && (
                <span className="text-sm text-muted-foreground">
                  Valid until{" "}
                  {new Date(proposal.validUntil).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {availableActions.map((action) => (
                <Button
                  key={action.nextStatus}
                  variant="outline"
                  size="sm"
                  onClick={() => { setNewStatus(action.nextStatus); setStatusDialogOpen(true); }}
                >
                  <span className={action.color}>{action.icon}</span>
                  <span className="ml-1">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client info */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Client Details
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Client</dt>
                <dd className="font-medium">{proposal.client?.name || proposal.clientId}</dd>
              </div>
              {proposal.dealId && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Deal ID</dt>
                  <dd className="font-medium">{proposal.dealId}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Financial details */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              Financial Terms
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Monthly Rent</dt>
                <dd className="font-medium">₹{(proposal.rentValue ?? 0).toLocaleString()}</dd>
              </div>
              {proposal.camCharges != null && proposal.camCharges > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">CAM Charges</dt>
                  <dd className="font-medium">₹{proposal.camCharges.toLocaleString()}</dd>
                </div>
              )}
              {proposal.securityDeposit != null && proposal.securityDeposit > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Security Deposit</dt>
                  <dd className="font-medium">₹{proposal.securityDeposit.toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Lease terms */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Lease Terms
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="font-medium">{proposal.leaseTerms || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Valid Until</dt>
                <dd className="font-medium">
                  {proposal.validUntil
                    ? new Date(proposal.validUntil).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Units */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Units ({proposal.unitIds.length})
            </h3>
            {proposal.units && proposal.units.length > 0 ? (
              <ul className="space-y-2">
                {proposal.units.map((u) => (
                  <li key={u.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span className="font-medium">{u.unitNumber || u.unitCode || u.id}</span>
                    {u.building && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {u.building.name}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-2">
                {proposal.unitIds.map((uid) => (
                  <li key={uid} className="text-sm text-muted-foreground py-1 border-b last:border-0">
                    Unit ID: {uid}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {proposal.notes && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-2">Notes</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposal.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Status change dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Proposal Status</DialogTitle>
            <DialogDescription>
              Mark this proposal as <strong>{newStatus}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStatusChange} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Proposal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this proposal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProposal.isPending}>
              {deleteProposal.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
