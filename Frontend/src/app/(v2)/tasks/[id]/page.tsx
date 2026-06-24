"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { InfoSection } from "@/components/properties/InfoSection";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useTask, useUpdateTask } from "@/hooks/use-tasks";
import { useFollowUps, useCreateFollowUp } from "@/hooks/use-follow-ups";
import { useUsers } from "@/hooks/use-users";
import { useAuthSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { PRIORITY_COLORS } from "@/lib/constants";
import { ArrowLeft, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TASK_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const FOLLOW_UP_TYPES = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "site_visit", label: "Site Visit" },
  { value: "other", label: "Other" },
];

const FOLLOW_UP_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  skipped: "bg-gray-100 text-gray-800",
};

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: task, isLoading, error } = useTask(id);
  const { data: followUps = [] } = useFollowUps(id);
  const updateTask = useUpdateTask();
  const createFollowUp = useCreateFollowUp();
  const queryClient = useQueryClient();
  const { session } = useAuthSession();
  const user = session?.user;
  const { data: usersData } = useUsers();
  const users = usersData?.data ?? [];
  const isAdmin = user?.role === "ADMIN";

  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState("");
  const [followUpDescription, setFollowUpDescription] = useState("");
  const [followUpDueDate, setFollowUpDueDate] = useState("");
  const [followUpType, setFollowUpType] = useState("call");

  async function handleStatusChange(newStatus: string) {
    try {
      await updateTask.mutateAsync({ id, data: { status: newStatus } });
      toast.success(`Task marked as ${TASK_STATUS_LABELS[newStatus]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  async function handleAssigneeChange(userId: string) {
    try {
      await updateTask.mutateAsync({ id, data: { assignedTo: userId } });
      toast.success("Task reassigned successfully");
      queryClient.invalidateQueries({ queryKey: ["task", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reassign task");
    }
  }

  async function handleAddFollowUp() {
    if (!followUpTitle.trim()) {
      toast.error("Please enter a follow-up title");
      return;
    }
    try {
      await createFollowUp.mutateAsync({
        title: followUpTitle,
        description: followUpDescription,
        dueDate: followUpDueDate || new Date().toISOString(),
        type: followUpType,
        taskId: id,
      });
      toast.success("Follow-up added successfully");
      setShowFollowUpForm(false);
      setFollowUpTitle("");
      setFollowUpDescription("");
      setFollowUpDueDate("");
      setFollowUpType("call");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add follow-up");
    }
  }

  if (isLoading) return <LoadingSkeleton type="detail" />;

  if (error || !task) {
    return (
      <EmptyState
        title="Task not found"
        description="The task you're looking for doesn't exist."
        action={
          <Link href="/tasks">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tasks
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.title}
        description={task.description || `Priority: ${task.priority}`}
      >
        <Link href="/tasks">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {task.status !== "completed" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange("completed")}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Mark Complete
          </Button>
        )}
        {task.status !== "in_progress" && task.status !== "completed" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange("in_progress")}
          >
            <Clock className="h-4 w-4 mr-1" />
            Start
          </Button>
        )}
        {task.status !== "cancelled" && task.status !== "completed" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange("cancelled")}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoSection
          title="Task Information"
          fields={[
            { label: "Title", value: task.title },
            {
              label: "Status",
              value: (
                <Badge variant="secondary" className={TASK_STATUS_COLORS[task.status]}>
                  {TASK_STATUS_LABELS[task.status]}
                </Badge>
              ),
            },
            {
              label: "Priority",
              value: (
                <Badge variant="secondary" className={PRIORITY_COLORS[task.priority?.toLowerCase()]}>
                  {task.priority}
                </Badge>
              ),
            },
            { label: "Type", value: task.type },
            {
              label: "Due Date",
              value: task.dueDate
                ? new Date(task.dueDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—",
            },
            {
              label: "Assigned To",
              value: isAdmin ? (
                <Select
                  value={task.assignedTo?.id || ""}
                  onValueChange={(v) => v && handleAssigneeChange(v)}
                >
                  <SelectTrigger className="h-8 w-auto min-w-[160px]">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                task.assignedTo?.fullName || "—"
              ),
            },
            { label: "Client", value: task.client?.name || "—" },
            { label: "Building", value: task.buildingId || "—" },
          ]}
        />

        <InfoSection
          title="Record Info"
          fields={[
            { label: "Task ID", value: task.id },
            {
              label: "Created At",
              value: new Date(task.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
            {
              label: "Last Updated",
              value: new Date(task.updatedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
          ]}
        />
      </div>

      {task.description && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {task.description}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Follow-ups ({followUps.length})</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFollowUpForm(!showFollowUpForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Follow-up
          </Button>
        </CardHeader>
        <CardContent>
          {showFollowUpForm && (
            <div className="mb-4 p-4 border rounded-lg space-y-3">
              <Input
                placeholder="Follow-up title"
                value={followUpTitle}
                onChange={(e) => setFollowUpTitle(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={followUpDescription}
                onChange={(e) => setFollowUpDescription(e.target.value)}
                rows={2}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={followUpDueDate}
                  onChange={(e) => setFollowUpDueDate(e.target.value)}
                />
                <Select value={followUpType} onValueChange={(v) => v && setFollowUpType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOW_UP_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddFollowUp}>
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFollowUpForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No follow-ups yet. Add one above.
            </p>
          ) : (
            <div className="space-y-3">
              {followUps.map((fu) => (
                <div key={fu.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{fu.title}</p>
                      <Badge variant="secondary" className={FOLLOW_UP_STATUS_COLORS[fu.status]}>
                        {fu.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {fu.type}
                      </Badge>
                    </div>
                    {fu.description && (
                      <p className="text-xs text-muted-foreground">{fu.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(fu.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
