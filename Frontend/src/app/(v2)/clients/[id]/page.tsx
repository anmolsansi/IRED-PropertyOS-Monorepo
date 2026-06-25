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
import { useClient, useDeleteClient } from "@/hooks/use-clients";
import { ArrowLeft, Pencil, Trash2, MapPin, IndianRupee, Maximize2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = { lease: "Lease", buy: "Buy", sell: "Sell" };
const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  fulfilled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

interface ClientRequirementSummary {
  id: string;
  title?: string | null;
  requirementType: string;
  preferredCity?: string | null;
  preferredLocality?: string | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  status: string;
}

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: client, isLoading, error } = useClient(id);
  const deleteClient = useDeleteClient();
  const [showDelete, setShowDelete] = useState(false);

  if (isLoading) return <LoadingSkeleton type="table" />;

  if (error || !client) {
    return (
      <EmptyState
        title="Client not found"
        description="The client you're looking for doesn't exist."
        action={
          <Link href="/clients">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
          </Link>
        }
      />
    );
  }

  async function handleDelete() {
    if (!client) return;
    try {
      await deleteClient.mutateAsync(client.id);
      toast.success("Client deleted successfully.");
      router.push("/clients");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete client");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={client.company || client.email}
      >
        <Link href="/clients">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Link href={`/clients/${client.id}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoSection
          title="Contact Information"
          fields={[
            { label: "Full Name", value: client.name },
            { label: "Company", value: client.company },
            { label: "Email", value: client.email },
            { label: "Phone", value: client.phone },
            { label: "Assigned Worker", value: client.assignedWorker?.fullName },
          ]}
        />

        <InfoSection
          title="Record Info"
          fields={[
            { label: "Client ID", value: client.id },
            {
              label: "Created At",
              value: new Date(client.createdAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
              }),
            },
            {
              label: "Last Updated",
              value: new Date(client.updatedAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
              }),
            },
          ]}
        />
      </div>

      {client.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Requirements</CardTitle>
          <Link href={`/requirements?clientId=${client.id}`}>
            <Button variant="outline" size="sm">Add Requirement</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {client.requirements && client.requirements.length > 0 ? (
            <div className="space-y-3">
              {client.requirements.map((req: ClientRequirementSummary) => (
                <Link key={req.id} href={`/requirements/${req.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{req.title || `${TYPE_LABELS[req.requirementType] || req.requirementType} Requirement`}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {req.preferredCity && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {req.preferredLocality ? `${req.preferredLocality}, ` : ""}{req.preferredCity}
                          </span>
                        )}
                        {req.minBudget != null && req.maxBudget != null && (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {req.minBudget}–{req.maxBudget}
                          </span>
                        )}
                        {req.minArea != null && req.maxArea != null && (
                          <span className="flex items-center gap-1">
                            <Maximize2 className="h-3 w-3" />
                            {req.minArea}–{req.maxArea} sqft
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className={STATUS_COLORS[req.status] || ""}>
                      {req.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No requirements yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href={`/site-visits?clientId=${client.id}`}>
              <Button variant="outline" size="sm">Schedule Site Visit</Button>
            </Link>
            <Link href={`/deals?clientId=${client.id}`}>
              <Button variant="outline" size="sm">Create Deal</Button>
            </Link>
            <Link href={`/tasks?clientId=${client.id}`}>
              <Button variant="outline" size="sm">Add Task</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{client.name}&quot;? This action cannot be undone.
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
