"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useApprovals } from "@/hooks/use-approvals";
import type { ChangeRequest } from "@/types";
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const ENTITY_TYPES = ["building", "floor", "unit", "contact", "media"] as const;

export default function ApprovalsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: approvals, isLoading } = useApprovals({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    pageSize,
  });

  const filteredApprovals: ChangeRequest[] = (
    approvals?.data || []
  ).filter((a: ChangeRequest) => {
    if (priorityFilter !== "all" && a.priority !== priorityFilter) return false;
    if (entityTypeFilter !== "all" && a.entityType !== entityTypeFilter)
      return false;
    return true;
  });

  const allData: ChangeRequest[] = approvals?.data || [];
  const pendingCount = allData.filter(
    (a) => a.status === "pending"
  ).length;
  const highPriorityCount = allData.filter(
    (a) => a.priority === "high" && a.status === "pending"
  ).length;
  const rejectedCount = allData.filter(
    (a) => a.status === "rejected"
  ).length;
  const approvedTodayCount = allData.filter((a) => {
    if (a.status !== "approved" || !a.reviewedAt) return false;
    const today = new Date().toISOString().slice(0, 10);
    return a.reviewedAt.startsWith(today);
  }).length;

  const totalPages = approvals?.totalPages || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review and manage pending change requests from Workers."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedTodayCount}</p>
                <p className="text-xs text-muted-foreground">Approved Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{highPriorityCount}</p>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by requester or entity name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v || "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
                <SelectItem value="conflict">Conflict</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={entityTypeFilter}
              onValueChange={(v) => {
                setEntityTypeFilter(v || "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {ENTITY_TYPES.map((et) => (
                  <SelectItem key={et} value={et}>
                    {et.charAt(0).toUpperCase() + et.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={priorityFilter}
              onValueChange={(v) => {
                setPriorityFilter(v || "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Approvals */}
      {isLoading ? (
        <LoadingSkeleton type="table" />
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredApprovals.map((approval) => (
              <Card key={approval.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono text-sm text-primary">
                        {approval.requestId}
                      </span>
                      <p className="font-medium text-sm">
                        {approval.entityName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {approval.city}, {approval.state}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge
                        type="approval"
                        value={approval.status}
                      />
                      <StatusBadge
                        type="priority"
                        value={approval.priority}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 mb-2">
                    {approval.fieldChanges.slice(0, 2).map((change) => (
                      <p key={change.id} className="text-xs">
                        <span className="text-muted-foreground">
                          {change.fieldLabel}:
                        </span>{" "}
                        {change.masterValue} &rarr; {change.workerValue}
                      </p>
                    ))}
                    {approval.fieldChanges.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{approval.fieldChanges.length - 2} more
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>By {approval.worker?.fullName}</span>
                    <Link
                      href={`/approvals/${approval.id}`}
                      className="inline-flex items-center justify-center h-7 px-2.5 rounded-md text-xs font-medium hover:bg-muted hover:text-foreground transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredApprovals.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No approval requests found.
                </CardContent>
              </Card>
            )}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>City / State</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApprovals.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-12 text-muted-foreground"
                      >
                        No approval requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredApprovals.map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell>
                          <span className="font-mono text-sm text-primary">
                            {approval.requestId}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {approval.entityName}
                        </TableCell>
                        <TableCell>
                          {approval.city}, {approval.state}
                        </TableCell>
                        <TableCell>{approval.worker?.fullName}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {approval.fieldChanges
                              .slice(0, 2)
                              .map((change) => (
                                <p key={change.id} className="text-xs">
                                  <span className="text-muted-foreground">
                                    {change.fieldLabel}:
                                  </span>{" "}
                                  {change.masterValue} &rarr;{" "}
                                  {change.workerValue}
                                </p>
                              ))}
                            {approval.fieldChanges.length > 2 && (
                              <p className="text-xs text-muted-foreground">
                                +{approval.fieldChanges.length - 2} more
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            type="approval"
                            value={approval.status}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            type="priority"
                            value={approval.priority}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(
                            approval.requestedAt
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/approvals/${approval.id}`}
                            className="inline-flex items-center justify-center h-7 px-2.5 rounded-md text-sm font-medium hover:bg-muted hover:text-foreground transition-colors"
                          >
                            Review
                          </Link>
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
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
