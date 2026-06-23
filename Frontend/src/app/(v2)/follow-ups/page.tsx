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
import { useCreateFollowUp, useUpdateFollowUp, type FollowUp } from "@/hooks/use-follow-ups";
import { useTasks } from "@/hooks/use-tasks";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Phone, Mail, Users, MapPin, Calendar, CheckCircle2, SkipForward } from "lucide-react";
import type { FilterParams } from "@/types";
import { toast } from "sonner";

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  call: { icon: <Phone className="h-3.5 w-3.5" />, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  email: { icon: <Mail className="h-3.5 w-3.5" />, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  meeting: { icon: <Users className="h-3.5 w-3.5" />, color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  site_visit: { icon: <MapPin className="h-3.5 w-3.5" />, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  other: { icon: <Calendar className="h-3.5 w-3.5" />, color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  skipped: { label: "Skipped", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" },
};

function getDueDateColor(dueDate: string, status: string) {
  if (status !== "pending") return "";
  const now = new Date();
  const due = new Date(dueDate);
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (diffHours < 0) return "text-destructive font-medium";
  if (diffHours < 24) return "text-orange-600 font-medium";
  return "";
}

export default function FollowUpsPage() {
  const [filters] = useState<FilterParams>({ page: 1, pageSize: 100 });
  const { data: tasksData } = useTasks(filters);
  const tasks = useMemo(() => tasksData?.data || [], [tasksData]);

  const followUps = useMemo(() => {
    const result: (FollowUp & { taskTitle?: string })[] = [];
    tasks.forEach((task) => {
      const taskRaw = task as unknown as Record<string, unknown>;
      if (taskRaw.followUps && Array.isArray(taskRaw.followUps)) {
        (taskRaw.followUps as Array<Record<string, unknown>>).forEach((fu) => {
          result.push({
            id: (fu.id as string) || "",
            taskId: task.id,
            clientId: (fu.clientId as string) || "",
            title: (fu.title as string) || "",
            description: (fu.description as string) || "",
            dueDate: (fu.dueDate as string) || "",
            type: ((fu.type as string) || "call") as FollowUp["type"],
            status: ((fu.status as string) || "pending") as FollowUp["status"],
            assignedToId: (fu.assignedTo as string) || "",
            createdAt: (fu.createdAt as string) || "",
            updatedAt: (fu.updatedAt as string) || "",
            taskTitle: task.title,
          });
        });
      }
    });
    return result;
  }, [tasks]);

  const queryClient = useQueryClient();
  const createFollowUp = useCreateFollowUp();
  const updateFollowUp = useUpdateFollowUp();

  const pending = followUps.filter((f) => f.status === "pending").length;
  const completed = followUps.filter((f) => f.status === "completed").length;
  const overdue = followUps.filter((f) => {
    if (f.status !== "pending") return false;
    return new Date(f.dueDate) < new Date();
  }).length;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "call" as "call" | "email" | "meeting" | "site_visit" | "other", dueDate: "", clientId: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", type: "call" as "call" | "email" | "meeting" | "site_visit" | "other", dueDate: "", clientId: "" });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

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
    if (!form.title.trim() || !form.dueDate) {
      toast.error("Title and due date are required.");
      return;
    }
    try {
      await createFollowUp.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        dueDate: form.dueDate,
        type: form.type,
      });
      toast.success("Follow-up created successfully!");
      setDialogOpen(false);
      setForm({ title: "", description: "", type: "call", dueDate: "", clientId: "" });
      setErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create follow-up");
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateFollowUp.mutateAsync({ id, data: { status } });
      toast.success(`Follow-up marked as ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update follow-up");
    }
  }

  function openEditDialog(fu: FollowUp) {
    setEditingFollowUp(fu);
    setEditForm({
      title: fu.title,
      description: fu.description || "",
      type: fu.type,
      dueDate: fu.dueDate.split("T")[0],
      clientId: fu.clientId,
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
    if (!editForm.title.trim() || !editForm.dueDate) {
      toast.error("Title and due date are required.");
      return;
    }
    try {
      await updateFollowUp.mutateAsync({
        id: editingFollowUp!.id,
        data: editForm,
        taskId: editingFollowUp!.taskId,
      });
      toast.success("Follow-up updated successfully!");
      setEditDialogOpen(false);
      setEditingFollowUp(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update follow-up");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description="Track follow-up tasks for clients and deals."
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-2" />
            Add Follow-up
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Follow-up</DialogTitle>
              <DialogDescription>Schedule a follow-up action for a client.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fu-title">Title *</Label>
                <Input
                  id="fu-title"
                  placeholder="e.g. Call back to confirm visit"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  aria-invalid={!!errors.title}
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fu-desc">Description</Label>
                <Input
                  id="fu-desc"
                  placeholder="Optional details"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                    <SelectTrigger aria-invalid={!!errors.type}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="site_visit">Site Visit</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fu-due">Due Date *</Label>
                  <Input
                    id="fu-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => updateField("dueDate", e.target.value)}
                    aria-invalid={!!errors.dueDate}
                  />
                  {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate}</p>}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Follow-up</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Follow-up</DialogTitle>
              <DialogDescription>Update the follow-up details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-fu-title">Title *</Label>
                <Input
                  id="edit-fu-title"
                  placeholder="e.g. Call back to confirm visit"
                  value={editForm.title}
                  onChange={(e) => updateEditField("title", e.target.value)}
                  aria-invalid={!!editErrors.title}
                />
                {editErrors.title && <p className="text-sm text-destructive">{editErrors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fu-desc">Description</Label>
                <Input
                  id="edit-fu-desc"
                  placeholder="Optional details"
                  value={editForm.description}
                  onChange={(e) => updateEditField("description", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select value={editForm.type} onValueChange={(v) => updateEditField("type", v)}>
                    <SelectTrigger aria-invalid={!!editErrors.type}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="site_visit">Site Visit</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {editErrors.type && <p className="text-sm text-destructive">{editErrors.type}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-fu-due">Due Date *</Label>
                  <Input
                    id="edit-fu-due"
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => updateEditField("dueDate", e.target.value)}
                    aria-invalid={!!editErrors.dueDate}
                  />
                  {editErrors.dueDate && <p className="text-sm text-destructive">{editErrors.dueDate}</p>}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-orange-600">{overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="md:hidden space-y-3">
        {followUps.map((fu) => {
          const typeConfig = TYPE_CONFIG[fu.type] || TYPE_CONFIG.other;
          const statusConfig = STATUS_CONFIG[fu.status] || STATUS_CONFIG.pending;
          return (
            <Card key={fu.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm cursor-pointer hover:underline" onClick={() => openEditDialog(fu)}>{fu.title}</p>
                    {fu.description && <p className="text-xs text-muted-foreground line-clamp-1">{fu.description}</p>}
                  </div>
                  <Badge variant="secondary" className={statusConfig.color}>{statusConfig.label}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Task</span>
                  <span>{fu.taskTitle || "—"}</span>
                  <span className="text-muted-foreground">Type</span>
                  <span className="flex items-center gap-1">{typeConfig.icon} {fu.type.replace("_", " ")}</span>
                  <span className="text-muted-foreground">Due</span>
                  <span className={getDueDateColor(fu.dueDate, fu.status)}>{new Date(fu.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </div>
                {fu.status === "pending" && (
                  <div className="mt-2 pt-2 border-t flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStatusChange(fu.id, "completed")}>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStatusChange(fu.id, "skipped")}>
                      <SkipForward className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {followUps.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No follow-ups found.</CardContent></Card>}
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Follow-up</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {followUps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No follow-ups found.
                  </TableCell>
                </TableRow>
              ) : (
                followUps.map((fu) => {
                  const typeConfig = TYPE_CONFIG[fu.type] || TYPE_CONFIG.other;
                  const statusConfig = STATUS_CONFIG[fu.status] || STATUS_CONFIG.pending;
                  return (
                    <TableRow key={fu.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm cursor-pointer hover:underline" onClick={() => openEditDialog(fu)}>{fu.title}</p>
                          {fu.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {fu.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{fu.taskTitle || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${typeConfig.color} flex items-center gap-1 w-fit`}>
                          {typeConfig.icon}
                          {fu.type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-sm ${getDueDateColor(fu.dueDate, fu.status)}`}>
                        {new Date(fu.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {fu.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleStatusChange(fu.id, "completed")}
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleStatusChange(fu.id, "skipped")}
                            >
                              <SkipForward className="h-4 w-4 text-muted-foreground" />
                            </Button>
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
    </div>
  );
}
