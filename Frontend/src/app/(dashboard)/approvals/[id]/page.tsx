"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  Loader2,
  Undo2,
  ShieldAlert,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  useApproval,
  useApproveChangeRequestItems,
  useRejectChangeRequestItems,
  useWithdrawChangeRequest,
} from "@/hooks/use-approvals";

type FieldStatus = "pending" | "approved" | "rejected" | "deferred" | "unchanged";

export default function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [globalComment, setGlobalComment] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: approval, isLoading, refetch } = useApproval(id);
  const approveItems = useApproveChangeRequestItems();
  const rejectItems = useRejectChangeRequestItems();
  const withdrawRequest = useWithdrawChangeRequest();

  const [fieldStatuses, setFieldStatuses] = useState<
    Record<string, FieldStatus>
  >({});
  const [fieldEdits, setFieldEdits] = useState<Record<string, string>>({});
  const [fieldComments, setFieldComments] = useState<Record<string, string>>(
    {}
  );
  const [editingField, setEditingField] = useState<string | null>(null);

  useEffect(() => {
    if (approval?.fieldChanges) {
      const initial: Record<string, FieldStatus> = {};
      const edits: Record<string, string> = {};
      approval.fieldChanges.forEach((fc) => {
        initial[fc.id] = fc.status === "conflict" ? "pending" : "pending";
        edits[fc.id] = fc.workerValue;
      });
      setFieldStatuses(initial);
      setFieldEdits(edits);
    }
  }, [approval?.fieldChanges]);

  const allReviewed = Object.values(fieldStatuses).every(
    (s) => s !== "pending"
  );
  const approvedCount = Object.values(fieldStatuses).filter(
    (s) => s === "approved"
  ).length;
  const rejectedCount = Object.values(fieldStatuses).filter(
    (s) => s === "rejected"
  ).length;
  const deferredCount = Object.values(fieldStatuses).filter(
    (s) => s === "deferred"
  ).length;
  const pendingCount = Object.values(fieldStatuses).filter(
    (s) => s === "pending"
  ).length;

  function setFieldStatus(fieldId: string, status: FieldStatus) {
    setFieldStatuses((prev) => ({ ...prev, [fieldId]: status }));
  }

  function setFieldValue(fieldId: string, value: string) {
    setFieldEdits((prev) => ({ ...prev, [fieldId]: value }));
  }

  function setFieldComment(fieldId: string, comment: string) {
    setFieldComments((prev) => ({ ...prev, [fieldId]: comment }));
  }

  async function handleApproveAll() {
    if (!approval) return;
    setActionLoading("approve");
    try {
      await approveItems.mutateAsync({
        id: approval.id,
        items: approval.fieldChanges
          .filter((fc) => fieldStatuses[fc.id] !== "rejected" && fieldStatuses[fc.id] !== "deferred")
          .map((fc) => ({
            changeItemId: fc.id,
            finalValue: fieldEdits[fc.id] || fc.workerValue,
            comment: fieldComments[fc.id] || globalComment || undefined,
          })),
      });
      toast.success("Changes approved!");
      refetch();
      router.push("/approvals");
    } catch {
      toast.error("Failed to approve changes");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectAll() {
    if (!approval) return;
    setActionLoading("reject");
    try {
      await rejectItems.mutateAsync({
        id: approval.id,
        items: approval.fieldChanges.map((fc) => ({
          changeItemId: fc.id,
          comment: fieldComments[fc.id] || globalComment || "Rejected by admin",
        })),
      });
      toast.success("All changes rejected.");
      refetch();
      router.push("/approvals");
    } catch {
      toast.error("Failed to reject changes");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApproveSelected() {
    if (!approval) return;
    setActionLoading("approve-selected");
    const selectedItems = approval.fieldChanges.filter(
      (fc) => fieldStatuses[fc.id] === "approved"
    );
    try {
      await approveItems.mutateAsync({
        id: approval.id,
        items: selectedItems.map((fc) => ({
          changeItemId: fc.id,
          finalValue: fieldEdits[fc.id] || fc.workerValue,
          comment: fieldComments[fc.id] || globalComment || undefined,
        })),
      });
      toast.success(`${selectedItems.length} change(s) approved!`);
      refetch();
      router.push("/approvals");
    } catch {
      toast.error("Failed to approve changes");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectSelected() {
    if (!approval) return;
    setActionLoading("reject-selected");
    const selectedItems = approval.fieldChanges.filter(
      (fc) => fieldStatuses[fc.id] === "rejected"
    );
    if (selectedItems.length === 0) {
      toast.error("No fields selected for rejection");
      setActionLoading(null);
      return;
    }
    try {
      await rejectItems.mutateAsync({
        id: approval.id,
        items: selectedItems.map((fc) => ({
          changeItemId: fc.id,
          comment: fieldComments[fc.id] || globalComment || "Rejected by admin",
        })),
      });
      toast.success(`${selectedItems.length} change(s) rejected.`);
      refetch();
      router.push("/approvals");
    } catch {
      toast.error("Failed to reject changes");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleWithdraw() {
    setActionLoading("withdraw");
    try {
      await withdrawRequest.mutateAsync(id);
      toast.success("Change request withdrawn.");
      refetch();
      router.push("/approvals");
    } catch {
      toast.error("Failed to withdraw request");
    } finally {
      setActionLoading(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading..." description="Loading approval details">
          <Link href="/approvals">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </PageHeader>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Not Found"
          description="Approval request not found"
        >
          <Link href="/approvals">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </PageHeader>
      </div>
    );
  }

  const isPending = approval.status === "pending";
  const hasConflicts = approval.fieldChanges.some(
    (fc) => fc.status === "conflict"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Review ${approval.requestId}`}
        description={`Change request for ${approval.entityName}`}
      >
        <div className="flex items-center gap-2">
          {isPending && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading !== null}
              onClick={handleWithdraw}
            >
              {actionLoading === "withdraw" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4 mr-2" />
              )}
              Withdraw
            </Button>
          )}
          <Link href="/approvals">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Request Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Request</p>
                <p className="text-xs text-muted-foreground">
                  {approval.requestId} &middot; {approval.entityType}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Worker</p>
                <p className="text-xs text-muted-foreground">
                  {approval.worker?.fullName} &middot; {approval.worker?.email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <div className="flex items-center gap-2">
                  <StatusBadge type="approval" value={approval.status} />
                  <StatusBadge type="priority" value={approval.priority} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conflict Warning */}
      {hasConflicts && (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  Conflict Detected
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-300">
                  Some fields have conflicts that need resolution. Review each
                  field and choose the appropriate value.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field Changes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Field Changes</CardTitle>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-600">{approvedCount} approved</span>
              <span className="text-red-600">{rejectedCount} rejected</span>
              <span className="text-blue-600">{deferredCount} deferred</span>
              <span className="text-yellow-600">{pendingCount} pending</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {approval.fieldChanges.map((change) => {
            const status = fieldStatuses[change.id];
            const isConflict = change.status === "conflict";
            const isEditing = editingField === change.id;
            return (
              <div
                key={change.id}
                className={`p-4 rounded-lg border transition-colors ${
                  status === "approved"
                    ? "border-green-200 bg-green-50/50"
                    : status === "rejected"
                      ? "border-red-200 bg-red-50/50"
                      : status === "deferred"
                        ? "border-blue-200 bg-blue-50/50"
                        : isConflict
                          ? "border-orange-200 bg-orange-50/30"
                          : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">{change.fieldLabel}</h4>
                    {isConflict && (
                      <StatusBadge type="approval" value="conflict" />
                    )}
                    {change.status === "deferred" && (
                      <StatusBadge type="approval" value="deferred" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={status === "approved" ? "default" : "outline"}
                      className="h-7"
                      onClick={() =>
                        setFieldStatus(
                          change.id,
                          status === "approved" ? "pending" : "approved"
                        )
                      }
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        status === "rejected" ? "destructive" : "outline"
                      }
                      className="h-7"
                      onClick={() =>
                        setFieldStatus(
                          change.id,
                          status === "rejected" ? "pending" : "rejected"
                        )
                      }
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant={status === "deferred" ? "secondary" : "outline"}
                      className="h-7"
                      onClick={() =>
                        setFieldStatus(
                          change.id,
                          status === "deferred" ? "pending" : "deferred"
                        )
                      }
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Defer
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      Current (Master)
                    </p>
                    <p className="font-medium">{change.masterValue || "\u2014"}</p>
                  </div>
                  <div className="p-3 rounded bg-primary/5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">Proposed</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1"
                        onClick={() =>
                          setEditingField(isEditing ? null : change.id)
                        }
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    {isEditing ? (
                      <Input
                        value={fieldEdits[change.id] || ""}
                        onChange={(e) =>
                          setFieldValue(change.id, e.target.value)
                        }
                        className="h-7 text-sm"
                      />
                    ) : (
                      <p className="font-medium">
                        {fieldEdits[change.id] || "\u2014"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Per-field admin comment */}
                <div className="mb-2">
                  <Textarea
                    placeholder="Add a comment for this field (optional)..."
                    value={fieldComments[change.id] || ""}
                    onChange={(e) =>
                      setFieldComment(change.id, e.target.value)
                    }
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Changed{" "}
                  {new Date(change.changedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Global Admin Comment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Global Admin Comment</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add a comment (optional, applies to all fields without per-field comments)..."
            value={globalComment}
            onChange={(e) => setGlobalComment(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
        <p className="text-sm text-muted-foreground">
          {approvedCount + rejectedCount + deferredCount} of{" "}
          {approval.fieldChanges.length} changes reviewed
        </p>
        <div className="flex items-center gap-2">
          {rejectedCount > 0 && (
            <Button
              variant="outline"
              disabled={actionLoading !== null}
              onClick={handleRejectSelected}
            >
              {actionLoading === "reject-selected" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject Selected ({rejectedCount})
            </Button>
          )}
          <Button
            variant="outline"
            disabled={actionLoading !== null}
            onClick={handleRejectAll}
          >
            {actionLoading === "reject" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Reject All
          </Button>
          {allReviewed && approvedCount > 0 && (
            <Button
              variant="default"
              disabled={actionLoading !== null}
              onClick={handleApproveSelected}
            >
              {actionLoading === "approve-selected" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approve Selected ({approvedCount})
            </Button>
          )}
          <Button
            variant="default"
            disabled={actionLoading !== null}
            onClick={handleApproveAll}
          >
            {actionLoading === "approve" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Approve All
          </Button>
        </div>
      </div>
    </div>
  );
}
