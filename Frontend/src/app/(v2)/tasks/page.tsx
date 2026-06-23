"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { useUsers } from "@/hooks/use-users";
import { useClients } from "@/hooks/use-clients";
import { useProperties } from "@/hooks/use-properties";
import { useQueryClient } from "@tanstack/react-query";
import { taskSchema } from "@/lib/validation";
import { Plus, Calendar, Trash2 } from "lucide-react";
import type { FilterParams, Task } from "@/types";
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

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "bg-red-100 text-red-800",
  High: "bg-orange-100 text-orange-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-blue-100 text-blue-800",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TASK_TYPES = [
  { value: "general", label: "General" },
  { value: "follow_up", label: "Follow-up" },
  { value: "site_visit", label: "Site Visit" },
  { value: "other", label: "Other" },
];

export default function TasksPage() {
  const [filters] = useState<FilterParams>({ page: 1, pageSize: 10 });
  const { data, isLoading } = useTasks(filters);
  const tasks = data?.data || [];
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const { data: usersData } = useUsers({ pageSize: 100 });
  const users = useMemo(() => usersData?.data || [], [usersData]);
  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => { map[u.id] = u.fullName; });
    return map;
  }, [users]);

  const { data: clientsData } = useClients({ pageSize: 100 });
  const clients = useMemo(() => clientsData?.data || [], [clientsData]);

  const { data: propertiesData } = useProperties({ pageSize: 100 });
  const buildings = useMemo(() => propertiesData?.data || [], [propertiesData]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", priority: "Medium" as "Low" | "Medium" | "High" | "Urgent", type: "general", assignedTo: "", clientId: "", buildingId: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", dueDate: "", priority: "Medium" as "Low" | "Medium" | "High" | "Urgent", type: "general", assignedTo: "", clientId: "", buildingId: "" });
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
    const result = taskSchema.safeParse({ title: form.title, description: form.description, dueDate: form.dueDate, priority: form.priority.toLowerCase() });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please fix the errors below.");
      return;
    }
    try {
      await createTask.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        dueDate: form.dueDate,
        priority: form.priority,
        type: form.type,
        assignedTo: form.assignedTo || undefined,
        clientId: form.clientId || undefined,
        buildingId: form.buildingId || undefined,
      });
      toast.success("Task created successfully!");
      setDialogOpen(false);
      setForm({ title: "", description: "", dueDate: "", priority: "Medium", type: "general", assignedTo: "", clientId: "", buildingId: "" });
      setErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      await updateTask.mutateAsync({ id: taskId, data: { status: newStatus } });
      toast.success(`Task marked as ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTask.mutateAsync(id);
      toast.success("Task deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  function openEditDialog(task: Task) {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate.split("T")[0],
      priority: task.priority,
      type: task.type,
      assignedTo: task.assignedToId || "",
      clientId: task.clientId || "",
      buildingId: task.buildingId || "",
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
    const result = taskSchema.safeParse({ title: editForm.title, description: editForm.description, dueDate: editForm.dueDate, priority: editForm.priority.toLowerCase() });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      setEditErrors(fieldErrors);
      toast.error("Please fix the errors below.");
      return;
    }
    try {
      await updateTask.mutateAsync({ id: editingTask!.id, data: editForm });
      toast.success("Task updated successfully!");
      setEditDialogOpen(false);
      setEditingTask(null);
      setEditForm({ title: "", description: "", dueDate: "", priority: "Medium", type: "general", assignedTo: "", clientId: "", buildingId: "" });
      setEditErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Track and manage your daily tasks."
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button size="sm" />}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
              <DialogDescription>Add a new task to track.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Title *</Label>
                <Input
                  id="task-title"
                  placeholder="e.g. Follow up with client"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  aria-invalid={!!errors.title}
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-desc">Description</Label>
                <Input
                  id="task-desc"
                  placeholder="Optional details"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-due">Due Date *</Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => updateField("dueDate", e.target.value)}
                    aria-invalid={!!errors.dueDate}
                  />
                  {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Priority *</Label>
                  <Select value={form.priority} onValueChange={(v) => v && updateField("priority", v)}>
                    <SelectTrigger aria-invalid={!!errors.priority}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.priority && <p className="text-sm text-destructive">{errors.priority}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Select value={form.type} onValueChange={(v) => v && updateField("type", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select value={form.assignedTo} onValueChange={(v) => updateField("assignedTo", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={form.clientId} onValueChange={(v) => updateField("clientId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="No client" />
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
                      <SelectValue placeholder="No building" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.buildingName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {editingTask && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>Update task details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-task-title">Title *</Label>
                <Input
                  id="edit-task-title"
                  placeholder="e.g. Follow up with client"
                  value={editForm.title}
                  onChange={(e) => updateEditField("title", e.target.value)}
                  aria-invalid={!!editErrors.title}
                />
                {editErrors.title && <p className="text-sm text-destructive">{editErrors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-task-desc">Description</Label>
                <Input
                  id="edit-task-desc"
                  placeholder="Optional details"
                  value={editForm.description}
                  onChange={(e) => updateEditField("description", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-task-due">Due Date *</Label>
                  <Input
                    id="edit-task-due"
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => updateEditField("dueDate", e.target.value)}
                    aria-invalid={!!editErrors.dueDate}
                  />
                  {editErrors.dueDate && <p className="text-sm text-destructive">{editErrors.dueDate}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Priority *</Label>
                  <Select value={editForm.priority} onValueChange={(v) => v && updateEditField("priority", v)}>
                    <SelectTrigger aria-invalid={!!editErrors.priority}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  {editErrors.priority && <p className="text-sm text-destructive">{editErrors.priority}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Select value={editForm.type} onValueChange={(v) => v && updateEditField("type", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select value={editForm.assignedTo} onValueChange={(v) => updateEditField("assignedTo", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={editForm.clientId} onValueChange={(v) => updateEditField("clientId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="No client" />
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
                      <SelectValue placeholder="No building" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.buildingName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STATUS_LABELS).map(([key, label]) => {
          const count = tasks.filter((t) => t.status === key).length;
          return (
            <Card key={key}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingSkeleton type="table" />
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm cursor-pointer hover:underline" onClick={() => openEditDialog(task)}>{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS["Medium"]}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground text-xs">Status</span>
                    <span className="text-xs">
                      <StatusBadge type="task" value={task.status} />
                    </span>
                    <span className="text-muted-foreground text-xs">Due</span>
                    <span className="text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                    <span className="text-muted-foreground text-xs">Assigned</span>
                    <span className="text-xs">{userMap[task.assignedToId] || "—"}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t flex items-center gap-2">
                    <Select
                      value={task.status}
                      onValueChange={(v) => v && handleStatusChange(task.id, v)}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" />}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Task</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(task.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tasks.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No tasks found.
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
                  <TableHead>Task</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No tasks found.
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm cursor-pointer hover:underline" onClick={() => openEditDialog(task)}>{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS["Medium"]}`}>
                          {task.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                      <StatusBadge type="task" value={task.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{userMap[task.assignedToId] || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Select
                            value={task.status}
                            onValueChange={(v) => v && handleStatusChange(task.id, v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <AlertDialog>
                            <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(task.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
