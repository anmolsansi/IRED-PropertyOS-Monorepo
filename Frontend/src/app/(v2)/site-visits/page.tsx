"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useSiteVisits, useCreateSiteVisit, useUpdateSiteVisit, useDeleteSiteVisit } from "@/hooks/use-site-visits";
import { useClients } from "@/hooks/use-clients";
import { useProperties } from "@/hooks/use-properties";
import { useUsers } from "@/hooks/use-users";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { Plus, CalendarCheck, Trash2, CheckCircle2, XCircle, Search } from "lucide-react";
import type { FilterParams, SiteVisit } from "@/types";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  confirmed: { label: "Confirmed", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" },
  rescheduled: { label: "Rescheduled", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

export default function SiteVisitsPage() {
  const [filters] = useState<FilterParams>({ page: 1, pageSize: 10 });
  const { data, isLoading } = useSiteVisits(filters);
  const visits = data?.data || [];
  const queryClient = useQueryClient();
  const createSiteVisit = useCreateSiteVisit();
  const updateSiteVisit = useUpdateSiteVisit();
  const deleteSiteVisit = useDeleteSiteVisit();

  const { data: clientsData } = useClients({ pageSize: 100 });
  const clients = useMemo(() => clientsData?.data || [], [clientsData]);
  const clientMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [clients]);

  const { data: propertiesData } = useProperties({ pageSize: 100 });
  const buildings = useMemo(() => propertiesData?.data || [], [propertiesData]);
  const buildingMap = useMemo(() => {
    const map: Record<string, string> = {};
    buildings.forEach((b) => { map[b.id] = b.buildingName; });
    return map;
  }, [buildings]);

  const { data: usersData } = useUsers({ pageSize: 100 });
  const users = useMemo(() => usersData?.data || [], [usersData]);
  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => { map[u.id] = u.fullName; });
    return map;
  }, [users]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ scheduledAt: "", notes: "", clientId: "", buildingId: "", unitId: "", assignedTo: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [editingVisit, setEditingVisit] = useState<SiteVisit | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ scheduledAt: "", notes: "", clientId: "", buildingId: "", unitId: "", assignedTo: "" });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState("");

  const filteredVisits = useMemo(() => {
    if (!searchQuery.trim()) return visits;
    const q = searchQuery.toLowerCase();
    return visits.filter((v) => {
      const clientName = (clientMap[v.clientId] || "").toLowerCase();
      const buildingName = (buildingMap[v.buildingId || ""] || "").toLowerCase();
      const workerName = (userMap[v.assignedToId] || "").toLowerCase();
      return clientName.includes(q) || buildingName.includes(q) || workerName.includes(q) || v.id.toLowerCase().includes(q);
    });
  }, [visits, searchQuery, clientMap, buildingMap, userMap]);

  function updateField(field: string, value: string | null) {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleCreate() {
    const fieldErrors: Record<string, string> = {};
    if (!form.scheduledAt) fieldErrors.scheduledAt = "Scheduled date/time is required";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      toast.error("Please fix the errors below.");
      return;
    }
    try {
      const scheduledAt = new Date(form.scheduledAt).toISOString();
      await createSiteVisit.mutateAsync({
        scheduledAt,
        notes: form.notes || undefined,
        clientId: form.clientId || undefined,
        buildingId: form.buildingId || undefined,
        unitId: form.unitId || undefined,
        assignedTo: form.assignedTo || undefined,
      });
      toast.success("Site visit scheduled successfully!");
      setDialogOpen(false);
      setForm({ scheduledAt: "", notes: "", clientId: "", buildingId: "", unitId: "", assignedTo: "" });
      setErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule site visit");
    }
  }

  function openEditDialog(visit: SiteVisit) {
    setEditingVisit(visit);
    setEditForm({
      scheduledAt: visit.scheduledAt.split("T")[0],
      notes: visit.notes || "",
      clientId: visit.clientId || "",
      buildingId: visit.buildingId || "",
      unitId: visit.unitId || "",
      assignedTo: visit.assignedToId || "",
    });
    setEditErrors({});
    setEditDialogOpen(true);
  }

  function updateEditField(field: string, value: string | null) {
    setEditForm((prev) => ({ ...prev, [field]: value ?? "" }));
    if (editErrors[field]) {
      setEditErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleEdit() {
    const fieldErrors: Record<string, string> = {};
    if (!editForm.scheduledAt) fieldErrors.scheduledAt = "Scheduled date/time is required";
    if (Object.keys(fieldErrors).length > 0) {
      setEditErrors(fieldErrors);
      toast.error("Please fix the errors below.");
      return;
    }
    try {
      const scheduledAt = new Date(editForm.scheduledAt).toISOString();
      await updateSiteVisit.mutateAsync({
        id: editingVisit!.id,
        data: { scheduledAt, notes: editForm.notes || undefined, clientId: editForm.clientId || undefined, buildingId: editForm.buildingId || undefined, unitId: editForm.unitId || undefined, assignedTo: editForm.assignedTo || undefined },
      });
      toast.success("Site visit updated successfully!");
      setEditDialogOpen(false);
      setEditingVisit(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update site visit");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSiteVisit.mutateAsync(id);
      toast.success("Site visit deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete site visit");
    }
  }

  async function handleComplete(id: string) {
    try {
      await api.post(`/site-visits/${id}/complete`);
      toast.success("Site visit marked as completed");
      queryClient.invalidateQueries({ queryKey: ["siteVisits"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleCancel(id: string) {
    try {
      await api.post(`/site-visits/${id}/cancel`);
      toast.success("Site visit cancelled");
      queryClient.invalidateQueries({ queryKey: ["siteVisits"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site Visits"
        description="Schedule and track property visits with clients."
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Visit
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Site Visit</DialogTitle>
              <DialogDescription>Plan a property visit with a client.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sv-date">Scheduled At *</Label>
                <Input
                  id="sv-date"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => updateField("scheduledAt", e.target.value)}
                  aria-invalid={!!errors.scheduledAt}
                />
                {errors.scheduledAt && <p className="text-sm text-destructive">{errors.scheduledAt}</p>}
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={form.clientId} onValueChange={(v) => updateField("clientId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Building</Label>
                <Select value={form.buildingId} onValueChange={(v) => updateField("buildingId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.buildingName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Worker</Label>
                <Select value={form.assignedTo} onValueChange={(v) => updateField("assignedTo", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sv-notes">Notes</Label>
                <Input
                  id="sv-notes"
                  placeholder="Any special instructions..."
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Site Visit</DialogTitle>
              <DialogDescription>Update the details for this visit.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sv-date">Scheduled At *</Label>
                <Input
                  id="edit-sv-date"
                  type="datetime-local"
                  value={editForm.scheduledAt}
                  onChange={(e) => updateEditField("scheduledAt", e.target.value)}
                  aria-invalid={!!editErrors.scheduledAt}
                />
                {editErrors.scheduledAt && <p className="text-sm text-destructive">{editErrors.scheduledAt}</p>}
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={editForm.clientId} onValueChange={(v) => updateEditField("clientId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Building</Label>
                <Select value={editForm.buildingId} onValueChange={(v) => updateEditField("buildingId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.buildingName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Worker</Label>
                <Select value={editForm.assignedTo} onValueChange={(v) => updateEditField("assignedTo", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sv-notes">Notes</Label>
                <Input
                  id="edit-sv-notes"
                  placeholder="Any special instructions..."
                  value={editForm.notes}
                  onChange={(e) => updateEditField("notes", e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client, building, or worker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = visits.filter((v) => v.status === key).length;
          return (
            <Card key={key}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingSkeleton type="table" />
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {filteredVisits.map((visit) => {
              const statusConfig = STATUS_CONFIG[visit.status] || STATUS_CONFIG.scheduled;
              return (
                <Card key={visit.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm cursor-pointer hover:underline" onClick={() => openEditDialog(visit)}>
                          {clientMap[visit.clientId] || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">{buildingMap[visit.buildingId || ""] || "—"}</p>
                      </div>
                      <Badge variant="secondary" className={statusConfig.color}>{statusConfig.label}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <span className="text-muted-foreground">Scheduled</span>
                      <span>{new Date(visit.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      <span className="text-muted-foreground">Worker</span>
                      <span>{userMap[visit.assignedToId] || "—"}</span>
                    </div>
                    {(visit.status === "scheduled" || visit.status === "confirmed") && (
                      <div className="mt-2 pt-2 border-t flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleComplete(visit.id)}>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCancel(visit.id)}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" />}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Site Visit</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this site visit? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(visit.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {filteredVisits.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No site visits scheduled.</CardContent></Card>}
          </div>

          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVisits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No site visits scheduled.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVisits.map((visit) => {
                      const statusConfig = STATUS_CONFIG[visit.status] || STATUS_CONFIG.scheduled;
                      return (
                        <TableRow key={visit.id}>
                          <TableCell className="font-medium">{clientMap[visit.clientId] || "—"}</TableCell>
                          <TableCell>{buildingMap[visit.buildingId || ""] || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
                              <div>
                                <p>{new Date(visit.scheduledAt).toLocaleDateString("en-IN", {
                                  day: "numeric", month: "short", year: "numeric",
                                })}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{userMap[visit.assignedToId] || "—"}</TableCell>
                          <TableCell>
                            {(visit.status === "scheduled" || visit.status === "confirmed") && (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleComplete(visit.id)}>
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCancel(visit.id)}>
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Site Visit</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this site visit? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(visit.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
