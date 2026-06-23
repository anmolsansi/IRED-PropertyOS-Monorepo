"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeals } from "@/hooks/use-deals";
import { Search, DollarSign, TrendingUp, Clock } from "lucide-react";
import type { Commission } from "@/types";

interface CommissionRow extends Commission {
  dealTitle: string;
  dealId: string;
  agent: string;
  dealStatus: string;
  createdAt: string;
}

export default function CommissionsPage() {
  const [filters] = useState({ page: 1, pageSize: 50 });
  const { data, isLoading } = useDeals(filters);
  const deals = data?.data || [];

  const [searchQuery, setSearchQuery] = useState("");

  const allCommissions: CommissionRow[] = [];
  for (const deal of deals) {
    if (deal.commissions && deal.commissions.length > 0) {
      for (const comm of deal.commissions) {
        allCommissions.push({
          ...comm,
          dealTitle: deal.title,
          dealId: deal.id,
          agent: deal.assignedTo || "Unassigned",
          dealStatus: deal.status,
          createdAt: comm.createdAt || deal.createdAt,
        });
      }
    }
  }

  const filtered = allCommissions.filter(
    (c) =>
      !searchQuery ||
      c.dealTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.agent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCommission = allCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
  const pendingCount = allCommissions.filter(
    (c) => c.status === "pending" || c.status === "unpaid"
  ).length;
  const paidCount = allCommissions.filter(
    (c) => c.status === "paid" || c.status === "completed"
  ).length;

  if (isLoading) return <LoadingSkeleton type="table" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commissions"
        description="Track commissions earned across all deals."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Total Commission</span>
            </div>
            <p className="text-2xl font-bold">
              ₹{totalCommission.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Pending</span>
            </div>
            <p className="text-2xl font-bold">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Paid</span>
            </div>
            <p className="text-2xl font-bold">{paidCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search commissions..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            title="No commissions found"
            description="Commissions will appear here once deals have commission data."
          />
        ) : (
          filtered.map((comm) => (
            <Card key={comm.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{comm.dealTitle}</p>
                    <p className="text-xs text-muted-foreground">{comm.agent}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {comm.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground text-xs">Amount</span>
                  <span className="text-xs font-medium">
                    ₹{comm.amount?.toLocaleString("en-IN") || "—"}
                  </span>
                  {comm.rate != null && (
                    <>
                      <span className="text-muted-foreground text-xs">Rate</span>
                      <span className="text-xs">{comm.rate}%</span>
                    </>
                  )}
                  <span className="text-muted-foreground text-xs">Created</span>
                  <span className="text-xs">
                    {new Date(comm.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Commission %</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <EmptyState
                      title="No commissions found"
                      description="Commissions will appear here once deals have commission data."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((comm) => (
                  <TableRow key={comm.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{comm.dealTitle}</p>
                        <p className="text-xs text-muted-foreground">{comm.dealId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{comm.agent}</TableCell>
                    <TableCell className="text-sm">
                      {comm.rate != null ? `${comm.rate}%` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      ₹{comm.amount?.toLocaleString("en-IN") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {comm.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(comm.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
