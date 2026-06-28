"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
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
import {
  useUsers,
  useInviteUser,
  useUpdateUser,
  useDeleteUser,
  useAssignGeography,
  useAdminResetPassword,
} from "@/hooks/use-users";
import { useStates, useCities, useLocalities } from "@/hooks/use-reference";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Users,
  MapPin,
  KeyRound,
  Power,
} from "lucide-react";
import type { FilterParams, User, GeographicAssignment } from "@/types";
import { toast } from "sonner";

const ROLE_OPTIONS = ["ADMIN", "WORKER", "RIDER"];
const STATUS_OPTIONS = ["active", "inactive"];

const ROLE_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300",
};

export default function AdminUsersPage() {
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    pageSize: 10,
  });
  const { data, isLoading } = useUsers(filters);
  const users = data?.data || [];
  const inviteUser = useInviteUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const assignGeography = useAssignGeography();
  const resetPassword = useAdminResetPassword();

  // Invite dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    role: "WORKER",
    mobileNumber: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Edit dialog state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    role: "WORKER",
    status: "active",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Geography dialog state
  const [geoUser, setGeoUser] = useState<User | null>(null);
  const [geoDialogOpen, setGeoDialogOpen] = useState(false);
  const [geoForm, setGeoForm] = useState<{
    stateId?: string;
    cityId?: string;
    localityId?: string;
  }>({});
  const { data: states } = useStates();
  const { data: cities } = useCities(geoForm.stateId);
  const { data: localities } = useLocalities(geoForm.cityId);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validateInviteForm() {
    const errs: Record<string, string> = {};
    if (!form.fullName || form.fullName.trim().length < 2)
      errs.fullName = "Name must be at least 2 characters.";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Valid email is required.";
    return errs;
  }

  async function handleInvite() {
    const formErrors = validateInviteForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast.error("Please fix the errors below.");
      return;
    }
    try {
      const result = await inviteUser.mutateAsync({
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        mobileNumber: form.mobileNumber || undefined,
      });
      toast.success(
        result.tempPassword
          ? `User invited. Temporary password: ${result.tempPassword}`
          : "User invited successfully!"
      );
      setDialogOpen(false);
      setForm({ fullName: "", email: "", role: "WORKER", mobileNumber: "" });
      setErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite user");
    }
  }

  function openEditDialog(user: User) {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setEditErrors({});
    setEditDialogOpen(true);
  }

  function updateEditField(field: string, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleEdit() {
    if (!editingUser) return;
    const errs: Record<string, string> = {};
    if (!editForm.fullName || editForm.fullName.trim().length < 2)
      errs.fullName = "Name must be at least 2 characters.";
    if (!editForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email))
      errs.email = "Valid email is required.";
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      toast.error("Please fix the errors below.");
      return;
    }
    try {
      await updateUser.mutateAsync({
        id: editingUser.id,
        data: {
          fullName: editForm.fullName,
          email: editForm.email,
          role: editForm.role,
          status: editForm.status,
        },
      });
      toast.success("User updated successfully!");
      setEditDialogOpen(false);
      setEditingUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteUser.mutateAsync(id);
      toast.success("User deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  async function handleToggleStatus(user: User) {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: { status: newStatus },
      });
      toast.success(
        newStatus === "active"
          ? `${user.fullName} reactivated`
          : `${user.fullName} deactivated`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleResetPassword(userId: string) {
    try {
      const result = await resetPassword.mutateAsync(userId);
      toast.success(result?.message || "Password reset email sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    }
  }

  function openGeoDialog(user: User) {
    setGeoUser(user);
    setGeoForm({});
    setGeoDialogOpen(true);
  }

  function updateGeoField(field: string, value: string | null) {
    setGeoForm((prev) => {
      const next = { ...prev };
      if (field === "stateId") {
        next.stateId = value || undefined;
        next.cityId = undefined;
        next.localityId = undefined;
      } else if (field === "cityId") {
        next.cityId = value || undefined;
        next.localityId = undefined;
      } else {
        next.localityId = value || undefined;
      }
      return next;
    });
  }

  async function handleAssignGeography() {
    if (!geoUser) return;
    if (!geoForm.stateId && !geoForm.cityId && !geoForm.localityId) {
      toast.error("Select at least one geographic assignment.");
      return;
    }
    try {
      await assignGeography.mutateAsync({
        userId: geoUser.id,
        data: {
          stateId: geoForm.stateId || undefined,
          cityId: geoForm.cityId || undefined,
          localityId: geoForm.localityId || undefined,
        },
      });
      toast.success("Geographic assignment added");
      setGeoDialogOpen(false);
      setGeoUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign geography");
    }
  }

  function handleSearch() {
    setFilters((prev) => ({ ...prev, search: searchQuery || undefined, page: 1 }));
  }

  function handleRoleFilter(role: string) {
    setRoleFilter(role);
    setFilters((prev) => ({
      ...prev,
      page: 1,
    }));
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter && roleFilter !== "all" && u.role !== roleFilter) return false;
    return true;
  });

  function renderGeoAssignments(user: User) {
    const assignments = user.geographicAssignments;
    if (!assignments || assignments.length === 0) {
      return <span className="text-xs text-muted-foreground">No assignments</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {assignments.map((a: GeographicAssignment, i: number) => {
          const label = a.locality?.name || a.city?.name || a.state?.name || "Unknown";
          return (
            <span
              key={i}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
            >
              {label}
            </span>
          );
        })}
      </div>
    );
  }

  if (isLoading) return <LoadingSkeleton type="table" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage system users, roles, and access."
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Create a user. A temporary password will be generated for you to share securely.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Full Name *</Label>
                <Input
                  id="invite-name"
                  placeholder="e.g. John Doe"
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  aria-invalid={!!errors.fullName}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-phone">Mobile Number</Label>
                <Input
                  id="invite-phone"
                  placeholder="e.g. +91 98765 43210"
                  value={form.mobileNumber}
                  onChange={(e) => updateField("mobileNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => v && updateField("role", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r === "ADMIN" ? "Administrator" : r === "WORKER" ? "Worker" : "Rider"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviteUser.isPending}>
                {inviteUser.isPending ? "Inviting..." : "Invite User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Edit Dialog */}
      {editingUser && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user details and role.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.fullName}
                  onChange={(e) => updateEditField("fullName", e.target.value)}
                  aria-invalid={!!editErrors.fullName}
                />
                {editErrors.fullName && (
                  <p className="text-sm text-destructive">{editErrors.fullName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => updateEditField("email", e.target.value)}
                  aria-invalid={!!editErrors.email}
                />
                {editErrors.email && (
                  <p className="text-sm text-destructive">{editErrors.email}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(v) => v && updateEditField("role", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r === "ADMIN" ? "Administrator" : r === "WORKER" ? "Worker" : "Rider"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) => v && updateEditField("status", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={updateUser.isPending}>
                {updateUser.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Geography Assignment Dialog */}
      {geoUser && (
        <Dialog open={geoDialogOpen} onOpenChange={setGeoDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Geography</DialogTitle>
              <DialogDescription>
                Add a geographic assignment for {geoUser.fullName}. Select a state, city, or
                locality.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Select
                  value={geoForm.stateId || ""}
                  onValueChange={(v) => updateGeoField("stateId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {(states || []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Select
                  value={geoForm.cityId || ""}
                  onValueChange={(v) => updateGeoField("cityId", v)}
                  disabled={!geoForm.stateId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {(cities || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Locality</Label>
                <Select
                  value={geoForm.localityId || ""}
                  onValueChange={(v) => updateGeoField("localityId", v)}
                  disabled={!geoForm.cityId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select locality" />
                  </SelectTrigger>
                  <SelectContent>
                    {(localities || []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {geoUser.geographicAssignments &&
                geoUser.geographicAssignments.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Current assignments
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {geoUser.geographicAssignments.map(
                        (a: GeographicAssignment, i: number) => {
                          const label =
                            a.locality?.name || a.city?.name || a.state?.name;
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            >
                              {label}
                            </span>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGeoDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignGeography} disabled={assignGeography.isPending}>
                {assignGeography.isPending ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Select
          value={roleFilter || "all"}
          onValueChange={(v) => handleRoleFilter(v || "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r === "ADMIN" ? "Administrator" : r === "WORKER" ? "Worker" : "Rider"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Invite your first user to get started."
            icon={<Users className="h-8 w-8 text-muted-foreground" />}
          />
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {user.role}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground text-xs">Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STATUS_COLORS[user.status] || ROLE_STATUS_COLORS.inactive}`}
                  >
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </span>
                  <span className="text-muted-foreground text-xs">Created</span>
                  <span className="text-xs">
                    {new Date(user.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-muted-foreground text-xs">Geography</span>
                  <span className="text-xs">{renderGeoAssignments(user)}</span>
                </div>
                <div className="mt-2 pt-2 border-t flex items-center gap-1 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openEditDialog(user)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openGeoDialog(user)}
                  >
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    Geo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleToggleStatus(user)}
                  >
                    <Power className="h-3.5 w-3.5 mr-1" />
                    {user.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleResetPassword(user.id)}
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1" />
                    Reset Pwd
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive"
                        />
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{user.fullName}&quot;? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(user.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Geography</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <EmptyState
                      title="No users found"
                      description="Invite your first user to get started."
                      icon={<Users className="h-8 w-8 text-muted-foreground" />}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{user.fullName}</p>
                      {user.mobileNumber && (
                        <p className="text-xs text-muted-foreground">{user.mobileNumber}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_STATUS_COLORS[user.status] || ROLE_STATUS_COLORS.inactive}`}
                      >
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>{renderGeoAssignments(user)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(user)}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openGeoDialog(user)}
                          title="Geographic assignments"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleToggleStatus(user)}
                          title={user.status === "active" ? "Deactivate" : "Reactivate"}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleResetPassword(user.id)}
                          title="Reset password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button variant="ghost" size="icon" className="h-7 w-7" />
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{user.fullName}&quot;?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(user.id)}>
                                Delete
                              </AlertDialogAction>
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

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(filters.page! - 1) * filters.pageSize! + 1}–
            {Math.min(filters.page! * filters.pageSize!, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.page || data.page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {data.page} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
