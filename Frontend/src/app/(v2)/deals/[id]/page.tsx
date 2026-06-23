"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { InfoSection } from "@/components/properties/InfoSection";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDeal, useUpdateDeal, useDeleteDeal } from "@/hooks/use-deals";
import type { Commission, Invoice } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { DEAL_STAGE_LABELS, DEAL_STAGES_ORDER } from "@/lib/constants";
import { ArrowLeft, ChevronRight, ChevronLeft, IndianRupee, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: deal, isLoading, error } = useDeal(id);
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const queryClient = useQueryClient();

  async function handleStageChange(newStage: string) {
    try {
      await updateDeal.mutateAsync({ id, data: { status: newStage } });
      toast.success(`Deal moved to ${DEAL_STAGE_LABELS[newStage]}`);
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update deal");
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this deal?")) return;
    try {
      await deleteDeal.mutateAsync(id);
      toast.success("Deal deleted");
      router.push("/deals");
    } catch {
      toast.error("Failed to delete deal");
    }
  }

  if (isLoading) return <LoadingSkeleton type="detail" />;

  if (error || !deal) {
    return (
      <EmptyState
        title="Deal not found"
        description="The deal you're looking for doesn't exist."
        action={
          <Link href="/deals">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Deals
            </Button>
          </Link>
        }
      />
    );
  }

  const currentIndex = DEAL_STAGES_ORDER.indexOf(deal.status);
  const prevStage = currentIndex > 0 ? DEAL_STAGES_ORDER[currentIndex - 1] : null;
  const nextStage = currentIndex < DEAL_STAGES_ORDER.length - 1 ? DEAL_STAGES_ORDER[currentIndex + 1] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={deal.title}
        description={DEAL_STAGE_LABELS[deal.status]}
      >
        <Link href="/deals">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {prevStage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStageChange(prevStage)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {DEAL_STAGE_LABELS[prevStage]}
          </Button>
        )}
        {nextStage && (
          <Button
            size="sm"
            onClick={() => handleStageChange(nextStage)}
          >
            {DEAL_STAGE_LABELS[nextStage]}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoSection
          title="Deal Information"
          fields={[
            { label: "Title", value: deal.title },
            {
              label: "Status",
              value: (
                <Badge variant="secondary">{DEAL_STAGE_LABELS[deal.status]}</Badge>
              ),
            },
            {
              label: "Value",
              value: deal.dealValue ? `₹${deal.dealValue.toLocaleString()}` : "—",
            },
            { label: "Client", value: deal.client?.name || deal.clientId || "—" },
            { label: "Building", value: deal.building?.buildingName || "—" },
            { label: "Unit", value: "—" },
          ]}
        />

        <InfoSection
          title="Record Info"
          fields={[
            { label: "Deal ID", value: deal.id },
            {
              label: "Created At",
              value: new Date(deal.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
            {
              label: "Last Updated",
              value: new Date(deal.updatedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
          ]}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            Commissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deal.commissions && deal.commissions.length > 0 ? (
            <div className="space-y-2">
              {deal.commissions.map((commission: Commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">
                      ₹{commission.amount?.toLocaleString() || "—"}
                    </p>
                    {commission.rate && (
                      <p className="text-xs text-muted-foreground">
                        Rate: {commission.rate}%
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{commission.status || "Pending"}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No commissions recorded.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {deal.invoices && deal.invoices.length > 0 ? (
            <div className="space-y-2">
              {deal.invoices.map((invoice: Invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">
                      ₹{invoice.amount?.toLocaleString() || "—"}
                    </p>
                    {invoice.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{invoice.status || "Pending"}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No invoices found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
