"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useProposal,
  useUpdateProposal,
  useDeleteProposal,
  useProposalItems,
  useRemoveProposalItem,
  useExportFields,
  useUpdateProposalFields,
  useExportProposalCsv
} from "@/hooks/use-proposals";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  Building2,
  Columns,
  Loader2,
  Save
} from "lucide-react";

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: proposal, isLoading, error } = useProposal(id);
  const { data: itemsData, isLoading: itemsLoading } = useProposalItems(id, { limit: 100 });
  const { data: exportFields = [], isLoading: fieldsLoading } = useExportFields();

  const updateProposal = useUpdateProposal();
  const deleteProposal = useDeleteProposal();
  const removeItem = useRemoveProposalItem();
  const updateFields = useUpdateProposalFields();
  const exportCsv = useExportProposalCsv();

  const items = itemsData?.data || [];

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (proposal?.fieldsConfig?.selectedFields && proposal.fieldsConfig.selectedFields.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFields(proposal.fieldsConfig.selectedFields);
    } else if (exportFields.length > 0 && selectedFields.length === 0) {
      const defaults = exportFields.filter(f => !f.restricted).map(f => f.key);
      setSelectedFields(defaults);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal, exportFields]);

  if (isLoading || fieldsLoading) {
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
      await updateProposal.mutateAsync({ id, data: { status: newStatus } });
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

  async function handleRemoveItem(itemId: string) {
    try {
      await removeItem.mutateAsync({ id, itemId });
      toast.success("Property removed from proposal");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove property");
    }
  }

  function handleToggleField(fieldKey: string, checked: boolean) {
    setSelectedFields(prev => {
      if (checked) {
        return [...prev, fieldKey];
      }
      return prev.filter(k => k !== fieldKey);
    });
    setIsDirty(true);
  }

  async function handleSaveFields() {
    try {
      await updateFields.mutateAsync({ id, selectedFields });
      setIsDirty(false);
      toast.success("Field configuration saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save fields");
    }
  }

  async function handleDownloadCsv() {
    try {
      const blob = await exportCsv.mutateAsync({ id, selectedFields });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${proposal?.title || "proposal"}-${id.slice(0, 8)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("CSV downloaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate CSV");
    }
  }

  const groupedFields = exportFields.reduce((acc, field) => {
    if (!acc[field.group]) acc[field.group] = [];
    acc[field.group].push(field);
    return acc;
  }, {} as Record<string, typeof exportFields>);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderCellValue(item: any, key: string): React.ReactNode {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = (item.building as any) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = (item.unit as any) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = (item.floor as any) || {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = "";

    switch (key) {
      case "buildingName": val = b?.name; break;
      case "buildingCode": val = b?.buildingCode; break;
      case "propertyType": val = b?.propertyType?.name || u?.propertyType?.name; break;
      case "entityType": val = item.unit ? "Unit" : "Building"; break;
      case "source": val = b?.source?.name; break;
      case "starRating": val = b?.starRating; break;
      case "verificationStatus": val = b?.verificationStatus?.name; break;
      case "address": val = b?.fullAddress; break;
      case "state": val = b?.state?.name; break;
      case "city": val = b?.city?.name; break;
      case "locality": val = b?.locality?.name; break;
      case "pincode": val = b?.pincode; break;
      case "latitude": val = b?.latitude; break;
      case "longitude": val = b?.longitude; break;
      case "googleMapsUrl": val = b?.googleMapsUrl; break;

      case "carpetArea": val = u?.carpetArea; break;
      case "builtUpArea": val = u?.builtUpArea; break;
      case "chargeableArea": val = u?.chargeableArea; break;
      case "superBuiltUpArea": val = u?.superBuiltUpArea; break;
      case "availableArea": val = u?.chargeableArea || b?.commercialTerms?.availableArea; break;
      case "totalArea": val = u?.carpetArea || b?.totalBuildingArea; break;

      case "rentPerSqFt": val = u?.rentPerSqftMonth || b?.commercialTerms?.rentPerSqFt; break;
      case "monthlyRent": val = u?.monthlyRent || (b?.commercialTerms?.rentPerSqFt && b?.commercialTerms?.availableArea ? b.commercialTerms.rentPerSqFt * b.commercialTerms.availableArea : undefined); break;
      case "maintenanceCharges": val = u?.maintenanceCharges || b?.commercialTerms?.maintenanceCharges; break;
      case "securityDeposit": val = u?.securityDeposit || b?.commercialTerms?.securityDeposit; break;
      case "lockInPeriod": val = u?.lockInPeriodMonths; break;
      case "leaseTenure": val = u?.leaseTermMonths || b?.commercialTerms?.leaseTerms; break;
      case "otherCharges": val = b?.commercialTerms?.otherCharges; break;
      case "escalation": val = b?.commercialTerms?.escalationDetails; break;
      case "brokerage": val = b?.commercialTerms?.brokerage; break;

      case "floorNumber": val = f?.floorNumber || u?.floor?.floorNumber; break;
      case "unitNumber": val = u?.unitNumber; break;
      case "unitStatus": val = u?.availabilityStatus?.name; break;
      case "unitArea": val = u?.chargeableArea; break;
      case "landlordName": val = b?.landlordName; break;

      case "availabilityStatus": val = u?.availabilityStatus?.name || b?.availabilityStatus?.name; break;
      case "availableFromDate": val = u?.availabilityDate ? new Date(u.availabilityDate).toLocaleDateString() : (b?.commercialTerms?.availabilityDate ? new Date(b.commercialTerms.availabilityDate).toLocaleDateString() : ""); break;

      case "furnishingStatus": val = u?.furnishingStatus?.name || (b?.commercialTerms?.furnishingStatusId ? "Provided" : ""); break;

      case "proposalItemNote": val = item.notes; break;
      case "publicNotes": val = b?.notes || u?.notes; break;
      case "internalNotes": val = b?.additionalFields ? JSON.stringify(b.additionalFields) : ""; break;
    }

    if (val === null || val === undefined || val === "") return "—";

    if (key === "rentPerSqFt" || key === "monthlyRent" || key === "maintenanceCharges" || key === "securityDeposit") {
      return `₹${val.toLocaleString("en-IN")}`;
    }
    if (key.toLowerCase().includes("area")) {
      return `${val.toLocaleString("en-IN")} sqft`;
    }

    if ((key === "buildingName" || key === "buildingCode") && b?.id) {
      return (
        <Link href={`/properties/${b.id}`} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
          {String(val)}
        </Link>
      );
    }

    return String(val);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getPropertyColumnLabel(item: any, index: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = (item.building as any) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = (item.unit as any) || {};
    return b?.name || u?.unitNumber || `Property ${index + 1}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getPropertyColumnCode(item: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = (item.building as any) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = (item.unit as any) || {};
    return b?.buildingCode || u?.unitCode || "";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={proposal.title || "Proposal"}
        description={`Created ${new Date(proposal.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/proposals")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadCsv} disabled={exportCsv.isPending}>
            <Download className="mr-2 h-4 w-4" />
            {exportCsv.isPending ? "Generating..." : "Export Excel"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge type="proposal" value={proposal.status} />
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Client: <span className="font-medium text-foreground">{proposal.client?.name || proposal.clientId}</span>
              </span>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Shortlisted Properties
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare shortlisted properties side by side. Fields are shown as rows and properties as columns.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button size="sm" variant="default" onClick={handleSaveFields} disabled={updateFields.isPending}>
                {updateFields.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Configuration
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                <Columns className="h-4 w-4 mr-2" />
                Fields
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
                {Object.entries(groupedFields).map(([group, fields]) => (
                  <DropdownMenuGroup key={group}>
                    <DropdownMenuLabel>{group}</DropdownMenuLabel>
                    {fields.map(f => (
                      <DropdownMenuCheckboxItem
                        key={f.key}
                        checked={selectedFields.includes(f.key)}
                        onCheckedChange={(c) => handleToggleField(f.key, c)}
                        disabled={f.restricted}
                      >
                        {f.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                  </DropdownMenuGroup>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table className="min-w-max border-separate border-spacing-0">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-20 min-w-[210px] border-r bg-background font-semibold">
                    Field
                  </TableHead>
                  {items.map((item, index) => {
                    const code = getPropertyColumnCode(item);
                    return (
                      <TableHead key={item.id} className="min-w-[240px] border-r last:border-r-0">
                        <div className="flex items-start justify-between gap-3 py-1">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground" title={getPropertyColumnLabel(item, index)}>
                              {getPropertyColumnLabel(item, index)}
                            </p>
                            {code && <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{code}</p>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                            title="Remove from Proposal"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsLoading ? (
                  <TableRow>
                    <TableCell colSpan={Math.max(items.length + 1, 2)} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                      No properties added yet. Go to a building and click &quot;Add to Proposal&quot;.
                    </TableCell>
                  </TableRow>
                ) : selectedFields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={items.length + 1} className="h-24 text-center text-muted-foreground">
                      No comparison fields selected. Use the Fields menu to choose what to compare.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedFields.map(key => {
                    const fieldDef = exportFields.find(f => f.key === key);
                    return (
                      <TableRow key={key} className="hover:bg-muted/20">
                        <TableCell className="sticky left-0 z-10 border-r bg-background font-medium">
                          <span className="whitespace-nowrap">{fieldDef?.label || key}</span>
                        </TableCell>
                        {items.map(item => (
                          <TableCell key={`${key}-${item.id}`} className="min-w-[240px] border-r align-top last:border-r-0">
                            <div className="max-w-[320px] whitespace-normal break-words">
                              {renderCellValue(item, key)}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
            <Button onClick={handleStatusChange} disabled={updateProposal.isPending}>
              {updateProposal.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
