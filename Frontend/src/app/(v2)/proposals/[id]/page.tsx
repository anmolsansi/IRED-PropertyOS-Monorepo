"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
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
      // Use defaults if nothing saved
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
      } else {
        return prev.filter(k => k !== fieldKey);
      }
    });
    setIsDirty(true);
  }

  async function handleSaveColumns() {
    try {
      await updateFields.mutateAsync({ id, selectedFields });
      setIsDirty(false);
      toast.success("Column configuration saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save columns");
    }
  }

  async function handleDownloadCsv() {
    try {
      const blob = await exportCsv.mutateAsync({ id, selectedFields });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${proposal?.title || "proposal"}-${id.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("CSV downloaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate CSV");
    }
  }

  // Group fields for dropdown
  const groupedFields = exportFields.reduce((acc, field) => {
    if (!acc[field.group]) acc[field.group] = [];
    acc[field.group].push(field);
    return acc;
  }, {} as Record<string, typeof exportFields>);

  // Render cell value dynamically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderCellValue(item: any, key: string): React.ReactNode {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = (item.building as any) || {};
    const u = (item.unit as any) || {};
    const f = (item.floor as any) || {};
    
    let val: any = "";
    
    switch (key) {
      case "buildingName": val = b?.name; break;
      case "buildingCode": val = b?.buildingCode; break;
      case "propertyType": val = b?.propertyType?.name || u?.propertyType?.name; break;
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
      case "availableArea": val = u?.chargeableArea || b?.totalBuildingArea; break;

      case "rentPerSqFt": val = u?.rentPerSqftMonth || b?.commercialTerms?.rentPerSqFt; break;
      case "monthlyRent": val = u?.monthlyRent || (b?.commercialTerms?.rentPerSqFt && b?.commercialTerms?.availableArea ? b.commercialTerms.rentPerSqFt * b.commercialTerms.availableArea : undefined); break;
      case "maintenanceCharges": val = u?.maintenanceCharges || b?.commercialTerms?.maintenanceCharges; break;
      case "securityDeposit": val = u?.securityDeposit || b?.commercialTerms?.securityDeposit; break;
      case "lockInPeriod": val = u?.lockInPeriodMonths; break;
      case "leaseTenure": val = u?.leaseTermMonths || b?.commercialTerms?.leaseTerms; break;

      case "floorNumber": val = f?.floorNumber || u?.floor?.floorNumber; break;
      case "unitNumber": val = u?.unitNumber; break;
      case "unitStatus": val = u?.availabilityStatus?.name; break;
      case "unitArea": val = u?.chargeableArea; break;

      case "availabilityStatus": val = u?.availabilityStatus?.name || b?.availabilityStatus?.name; break;
      case "availableFromDate": val = u?.availabilityDate ? new Date(u.availabilityDate).toLocaleDateString() : (b?.commercialTerms?.availabilityDate ? new Date(b.commercialTerms.availabilityDate).toLocaleDateString() : ""); break;
      
      case "furnishingStatus": val = u?.furnishingStatus?.name || (b?.commercialTerms?.furnishingStatusId ? "Provided" : ""); break;

      case "proposalItemNote": val = item.notes; break;
      case "publicNotes": val = b?.notes || u?.notes; break;
      case "internalNotes": val = b?.additionalFields ? JSON.stringify(b.additionalFields) : ""; break;
    }

    if (val === null || val === undefined || val === "") return "—";
    
    // Formatting
    if (key === "rentPerSqFt" || key === "monthlyRent" || key === "maintenanceCharges" || key === "securityDeposit") {
      return `₹${val.toLocaleString("en-IN")}`;
    }
    if (key.toLowerCase().includes("area")) {
      return `${val.toLocaleString("en-IN")} sqft`;
    }
    
    return String(val);
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
            <Download className="h-4 w-4 mr-1" />
            {exportCsv.isPending ? "Generating..." : "Export CSV"}
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Shortlisted Properties
          </CardTitle>
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button size="sm" variant="default" onClick={handleSaveColumns} disabled={updateFields.isPending}>
                {updateFields.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save Configuration
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                <Columns className="h-4 w-4 mr-2" />
                Columns
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
                {Object.entries(groupedFields).map(([group, fields]) => (
                  <div key={group}>
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
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  {/* Render headers based on selectedFields */}
                  {selectedFields.map(key => {
                    const fieldDef = exportFields.find(f => f.key === key);
                    return (
                      <TableHead key={key} className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={true}
                            onCheckedChange={(c) => handleToggleField(key, !!c)}
                          />
                          <span>{fieldDef?.label || key}</span>
                        </div>
                      </TableHead>
                    );
                  })}
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsLoading ? (
                  <TableRow>
                    <TableCell colSpan={selectedFields.length + 1} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={selectedFields.length + 1} className="h-24 text-center text-muted-foreground">
                      No properties added yet. Go to a building and click &quot;Add to Proposal&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map(item => (
                    <TableRow key={item.id}>
                      {selectedFields.map(key => (
                        <TableCell key={`${item.id}-${key}`} className="whitespace-nowrap">
                          {renderCellValue(item, key)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remove from Proposal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
            <Button onClick={handleStatusChange} disabled={updateProposal.isPending}>
              {updateProposal.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
