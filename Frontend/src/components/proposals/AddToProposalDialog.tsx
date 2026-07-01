"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProposals, useCreateProposal, useAddProposalItem } from "@/hooks/use-proposals";
import { useClients } from "@/hooks/use-clients";
import { toast } from "sonner";
import { Plus, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddToProposalDialogProps {
  buildingId: string;
  trigger?: React.ReactNode;
}

export function AddToProposalDialog({ buildingId, trigger }: AddToProposalDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"existing" | "new">("existing");

  // Existing proposal state
  const [selectedProposalId, setSelectedProposalId] = useState("");

  // New proposal state
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");

  const { data: proposalsData, isLoading: loadingProposals } = useProposals({ status: "draft", pageSize: 50 });
  const proposals = proposalsData?.data || [];

  const { data: clientsData } = useClients({ pageSize: 200 });
  const clients = clientsData?.data || [];

  const createProposal = useCreateProposal();
  const addItem = useAddProposalItem();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      let proposalId = selectedProposalId;

      if (tab === "new") {
        if (!clientId) {
          toast.error("Please select a client.");
          return;
        }
        const newProposal = await createProposal.mutateAsync({
          clientId,
          title: title || undefined,
        });
        proposalId = newProposal.id;
      } else {
        if (!proposalId) {
          toast.error("Please select an existing proposal.");
          return;
        }
      }

      await addItem.mutateAsync({
        id: proposalId,
        data: {
          entityType: "building",
          buildingId,
        },
      });

      toast.success("Property added to proposal!");
      setOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add to proposal.");
    }
  }

  function resetForm() {
    setSelectedProposalId("");
    setClientId("");
    setTitle("");
    setTab("existing");
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
      {trigger ? (
        <DialogTrigger render={trigger as React.ReactElement} />
      ) : (
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          <FileText className="h-4 w-4 mr-2" />
          Add to Proposal
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Proposal</DialogTitle>
          <DialogDescription>
            Add this property to a client proposal for sharing.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "existing" | "new")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing Proposal</TabsTrigger>
            <TabsTrigger value="new">New Proposal</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <TabsContent value="existing" className="space-y-4">
              <div className="space-y-2">
                <Label>Select Draft Proposal</Label>
                <Select value={selectedProposalId} onValueChange={setSelectedProposalId} disabled={loadingProposals}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingProposals ? "Loading..." : "Select a proposal"} />
                  </SelectTrigger>
                  <SelectContent>
                    {proposals.length === 0 ? (
                      <SelectItem value="none" disabled>No draft proposals found</SelectItem>
                    ) : (
                      proposals.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title || `Proposal for ${p.client?.name}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title (Optional)</Label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Bandra Office Options" 
                />
              </div>
            </TabsContent>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createProposal.isPending || addItem.isPending || (tab === "existing" && proposals.length === 0)}
              >
                {createProposal.isPending || addItem.isPending ? "Adding..." : "Add to Proposal"}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
