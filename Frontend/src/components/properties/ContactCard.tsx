"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Phone,
  Mail,
  User,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/types";
import {
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useLogContactView,
} from "@/hooks/use-contacts";

const CONTACT_TYPE_LABELS: Record<string, string> = {
  owner: "Owner",
  caretaker: "Caretaker",
  security: "Security",
  guest: "Guest",
  broker: "Broker",
  tenant: "Tenant",
  alternate: "Alternate",
};

const CONTACT_TYPES: { value: string; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "caretaker", label: "Caretaker" },
  { value: "security", label: "Security" },
  { value: "guest", label: "Guest" },
  { value: "broker", label: "Broker" },
  { value: "tenant", label: "Tenant" },
  { value: "alternate", label: "Alternate" },
];

interface ContactFormData {
  contactType: string;
  name: string;
  phone: string;
  email: string;
  designation: string;
  isPrimary: boolean;
}

const defaultFormData: ContactFormData = {
  contactType: "owner",
  name: "",
  phone: "",
  email: "",
  designation: "",
  isPrimary: false,
};

interface ContactFormProps {
  formData: ContactFormData;
  isPending: boolean;
  onCancel: () => void;
  onFormDataChange: (updater: (current: ContactFormData) => ContactFormData) => void;
  onSubmit: () => void;
  submitLabel: string;
}

function ContactForm({
  formData,
  isPending,
  onCancel,
  onFormDataChange,
  onSubmit,
  submitLabel,
}: ContactFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contactType">Type</Label>
        <Select
          value={formData.contactType}
          onValueChange={(value) =>
            value &&
            onFormDataChange((current) => ({ ...current, contactType: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactName">Name *</Label>
        <Input
          id="contactName"
          value={formData.name}
          onChange={(event) =>
            onFormDataChange((current) => ({
              ...current,
              name: event.target.value,
            }))
          }
          placeholder="Contact name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactPhone">Phone *</Label>
        <Input
          id="contactPhone"
          value={formData.phone}
          onChange={(event) =>
            onFormDataChange((current) => ({
              ...current,
              phone: event.target.value,
            }))
          }
          placeholder="Phone number"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactEmail">Email</Label>
        <Input
          id="contactEmail"
          type="email"
          value={formData.email}
          onChange={(event) =>
            onFormDataChange((current) => ({
              ...current,
              email: event.target.value,
            }))
          }
          placeholder="Email address"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactDesignation">Designation</Label>
        <Input
          id="contactDesignation"
          value={formData.designation}
          onChange={(event) =>
            onFormDataChange((current) => ({
              ...current,
              designation: event.target.value,
            }))
          }
          placeholder="Job title or role"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="contactPrimary"
          checked={formData.isPrimary}
          onChange={(event) =>
            onFormDataChange((current) => ({
              ...current,
              isPrimary: event.target.checked,
            }))
          }
          className="h-4 w-4"
        />
        <Label htmlFor="contactPrimary">Primary contact</Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!formData.name || !formData.phone || isPending}
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

interface ContactCardProps {
  contacts: Contact[];
  entityId?: string;
  entityType?: "building" | "floor" | "unit";
  onContactsChange?: () => void;
}

export function ContactCard({ contacts, entityId, entityType = "building", onContactsChange }: ContactCardProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(defaultFormData);
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());

  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const logView = useLogContactView();

  const toggleReveal = (contactId: string) => {
    setRevealedPhones((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
        logView.mutateAsync(contactId).catch(() => {});
      }
      return next;
    });
  };

  const maskPhone = (phone: string) => {
    if (phone.length <= 4) return "****";
    return phone.slice(0, 2) + "*".repeat(phone.length - 4) + phone.slice(-2);
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setCreateOpen(false);
    setEditContact(null);
  };

  const handleCreate = async () => {
    if (!entityId) {
      toast.error("No entity associated");
      return;
    }
    try {
      await createContact.mutateAsync({
        entityType,
        entityId,
        contactType: formData.contactType as Contact["contactType"],
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        designation: formData.designation || undefined,
        isPrimary: formData.isPrimary,
      });
      toast.success("Contact created");
      resetForm();
      onContactsChange?.();
    } catch {
      toast.error("Failed to create contact");
    }
  };

  const handleEdit = async () => {
    if (!editContact) return;
    try {
      await updateContact.mutateAsync({
        id: editContact.id,
        data: {
          contactType: formData.contactType as Contact["contactType"],
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          designation: formData.designation || undefined,
          isPrimary: formData.isPrimary,
        },
      });
      toast.success("Contact updated");
      resetForm();
      onContactsChange?.();
    } catch {
      toast.error("Failed to update contact");
    }
  };

  const handleDelete = async (contactId: string) => {
    try {
      await deleteContact.mutateAsync(contactId);
      toast.success("Contact deleted");
      onContactsChange?.();
    } catch {
      toast.error("Failed to delete contact");
    }
  };

  const openEdit = (contact: Contact) => {
    setFormData({
      contactType: contact.contactType,
      name: contact.name,
      phone: contact.phone,
      email: contact.email || "",
      designation: contact.designation || "",
      isPrimary: contact.isPrimary,
    });
    setEditContact(contact);
  };

  const formIsPending = createContact.isPending || updateContact.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Contacts ({contacts.length})
          </CardTitle>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Contact</DialogTitle>
                <DialogDescription>
                  Add a new contact for this property.
                </DialogDescription>
              </DialogHeader>
              <ContactForm
                formData={formData}
                isPending={formIsPending}
                onCancel={resetForm}
                onFormDataChange={setFormData}
                onSubmit={handleCreate}
                submitLabel="Create"
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts added yet.</p>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => {
              const phoneRevealed = revealedPhones.has(contact.id);
              return (
                <div
                  key={contact.id}
                  className="flex items-start justify-between p-3 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{contact.name}</span>
                      {contact.isPrimary && (
                        <Badge variant="secondary" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {phoneRevealed ? contact.phone : maskPhone(contact.phone)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => toggleReveal(contact.id)}
                        >
                          {phoneRevealed ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </span>
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                    </div>
                    {contact.designation && (
                      <p className="text-xs text-muted-foreground">
                        {contact.designation}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {CONTACT_TYPE_LABELS[contact.contactType] || contact.contactType}
                    </Badge>
                    <Dialog
                      open={editContact?.id === contact.id}
                      onOpenChange={(open) => {
                        if (!open) resetForm();
                      }}
                    >
                      <DialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(contact)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Contact</DialogTitle>
                          <DialogDescription>
                            Update contact details.
                          </DialogDescription>
                        </DialogHeader>
                        <ContactForm
                          formData={formData}
                          isPending={formIsPending}
                          onCancel={resetForm}
                          onFormDataChange={setFormData}
                          onSubmit={handleEdit}
                          submitLabel="Save"
                        />
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {contact.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => handleDelete(contact.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
