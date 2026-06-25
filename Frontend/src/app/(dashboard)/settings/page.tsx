"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-auth";
import { User, Bell, Shield, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";

interface ProfileSettingsProps {
  defaultEmail: string;
  defaultFullName: string;
  defaultPhone: string;
  isSaving: boolean;
  role?: string;
  onSave: (profile: {
    email: string;
    fullName: string;
    phone: string;
  }) => Promise<void>;
}

function ProfileSettings({
  defaultEmail,
  defaultFullName,
  defaultPhone,
  isSaving,
  role,
  onSave,
}: ProfileSettingsProps) {
  const [fullName, setFullName] = useState(defaultFullName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              disabled
              value={role === "ADMIN" ? "Administrator" : "Worker"}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => onSave({ email, fullName, phone })}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, setUser } = useCurrentUser();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSaveProfile({
    email,
    fullName,
    phone,
  }: {
    email: string;
    fullName: string;
    phone: string;
  }) {
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Valid email is required");
      return;
    }
    setIsSaving(true);
    try {
      const response = await api.patch<{ data: typeof user }>("/auth/me", {
        fullName,
        email,
        mobileNumber: phone || undefined,
      });
      const updated = response.data ?? (response as unknown as typeof user);
      if (updated) {
        const updatedUser = { ...user, ...updated };
        setUser(updatedUser);
        if (typeof window !== "undefined") {
          localStorage.setItem("auth-user", JSON.stringify(updatedUser));
        }
      }
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  function handleChangePassword() {
    toast.info("Password reset link sent to your email.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and application preferences."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">
                    {user?.fullName || "Admin User"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user?.email || "admin@ired.com"}
                  </p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {user?.role === "ADMIN" ? "Administrator" : "Worker"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <ProfileSettings
            key={user?.id ?? "anonymous"}
            defaultEmail={user?.email ?? ""}
            defaultFullName={user?.fullName ?? ""}
            defaultPhone={user?.mobileNumber ?? ""}
            isSaving={isSaving}
            role={user?.role}
            onSave={handleSaveProfile}
          />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: "New approval requests",
                  description:
                    "Get notified when a worker submits a change request",
                  defaultChecked: true,
                },
                {
                  label: "Property updates",
                  description:
                    "Get notified when assigned properties are updated",
                  defaultChecked: true,
                },
                {
                  label: "Task reminders",
                  description: "Get reminded about upcoming task deadlines",
                  defaultChecked: false,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={item.defaultChecked}
                    className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-700"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Change Password</p>
                  <p className="text-xs text-muted-foreground">
                    Update your account password
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleChangePassword}>
                  Change Password
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Badge variant="outline">Not enabled</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
