"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { FormField } from "@/components/shared/MultiStepForm";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useClient, useUpdateClient } from "@/hooks/use-clients";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { clientSchema } from "@/lib/validation";

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateClient = useUpdateClient();
  const { data: client, isLoading, error } = useClient(id);

  const [form, setForm] = useState(() => ({
    name: client?.name || "",
    company: client?.company || "",
    email: client?.email || "",
    phone: client?.phone || "",
    notes: client?.notes || "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (isLoading) return <LoadingSkeleton type="table" />;

  if (error || !client) {
    return (
      <EmptyState
        title="Client not found"
        description="The client you're trying to edit doesn't exist."
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = clientSchema.safeParse(form);
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
      await updateClient.mutateAsync({
        id: client!.id,
        data: {
          name: form.name,
          company: form.company || undefined,
          email: form.email || undefined,
          mobileNumber: form.phone || undefined,
          notes: form.notes || undefined,
        },
      });
      toast.success("Client updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients", client!.id] });
      router.push(`/clients/${client!.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update client");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${client.name}`}
        description="Update client information."
      >
        <Link href={`/clients/${client.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </Link>
      </PageHeader>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Full Name" required error={errors.name}>
                <Input
                  placeholder="e.g. Vikram Mehta"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </FormField>

              <FormField label="Company" error={errors.company}>
                <Input
                  placeholder="e.g. Mehta Properties Pvt Ltd"
                  value={form.company}
                  onChange={(e) => updateField("company", e.target.value)}
                />
              </FormField>

              <FormField label="Email" required error={errors.email}>
                <Input
                  type="email"
                  placeholder="e.g. vikram@example.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </FormField>

              <FormField label="Phone" required error={errors.phone}>
                <Input
                  placeholder="e.g. +91 98765 43210"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Notes" error={errors.notes}>
              <Textarea
                placeholder="Additional notes about this client..."
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-6">
          <Link href={`/clients/${client.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
