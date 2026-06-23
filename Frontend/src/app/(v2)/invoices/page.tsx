"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
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
import { useDeals } from "@/hooks/use-deals";
import { Search, Receipt, Clock, CheckCircle2 } from "lucide-react";
import type { Invoice } from "@/types";
import { cn } from "@/lib/utils";

interface InvoiceRow extends Invoice {
  dealTitle: string;
  dealId: string;
  invoiceNumber: string;
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function InvoicesPage() {
  const [filters] = useState({ page: 1, pageSize: 50 });
  const { data, isLoading } = useDeals(filters);
  const deals = data?.data || [];

  const [searchQuery, setSearchQuery] = useState("");

  const allInvoices: InvoiceRow[] = [];
  for (const deal of deals) {
    if (deal.invoices && deal.invoices.length > 0) {
      for (const inv of deal.invoices) {
        allInvoices.push({
          ...inv,
          dealTitle: deal.title,
          dealId: deal.id,
          invoiceNumber: `INV-${deal.id.slice(0, 6).toUpperCase()}-${inv.id.slice(0, 4).toUpperCase()}`,
        });
      }
    }
  }

  const filtered = allInvoices.filter(
    (inv) =>
      !searchQuery ||
      inv.dealTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmount = allInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const pendingAmount = allInvoices
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const paidCount = allInvoices.filter((inv) => inv.status === "paid").length;

  if (isLoading) return <LoadingSkeleton type="table" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Track invoices issued across all deals."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Receipt className="h-4 w-4" />
              <span className="text-xs">Total Invoiced</span>
            </div>
            <p className="text-2xl font-bold">
              ₹{totalAmount.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Pending Amount</span>
            </div>
            <p className="text-2xl font-bold">
              ₹{pendingAmount.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="h-4 w-4" />
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
            placeholder="Search invoices..."
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
            title="No invoices found"
            description="Invoices will appear here once deals have invoice data."
          />
        ) : (
          filtered.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{inv.dealTitle}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {inv.invoiceNumber}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      INVOICE_STATUS_COLORS[inv.status] || INVOICE_STATUS_COLORS.draft
                    )}
                  >
                    {inv.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground text-xs">Amount</span>
                  <span className="text-xs font-medium">
                    ₹{inv.amount?.toLocaleString("en-IN") || "—"}
                  </span>
                  {inv.dueDate && (
                    <>
                      <span className="text-muted-foreground text-xs">Due Date</span>
                      <span className="text-xs">
                        {new Date(inv.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </>
                  )}
                  <span className="text-muted-foreground text-xs">Created</span>
                  <span className="text-xs">
                    {new Date(inv.createdAt).toLocaleDateString("en-IN", {
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
                <TableHead>Invoice #</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <EmptyState
                      title="No invoices found"
                      description="Invoices will appear here once deals have invoice data."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{inv.dealTitle}</p>
                        <p className="text-xs text-muted-foreground">{inv.dealId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      ₹{inv.amount?.toLocaleString("en-IN") || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.dueDate
                        ? new Date(inv.dueDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                          INVOICE_STATUS_COLORS[inv.status] || INVOICE_STATUS_COLORS.draft
                        )}
                      >
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString("en-IN", {
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
