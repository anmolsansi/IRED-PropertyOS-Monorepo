"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Building2, Users, Handshake, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useExportData } from "@/hooks/use-exports";

const EXPORT_TYPES = [
  {
    id: "buildings",
    label: "Properties",
    icon: Building2,
    description: "Export all property data with addresses, commercial terms, and status.",
    fields: ["Building Code", "Name", "State", "City", "Locality", "Property Type", "Address", "Total Floors", "Total Units", "Total Area", "Availability", "Verification", "Notes"],
  },
  {
    id: "units",
    label: "Units",
    icon: Building2,
    description: "Export unit data with building, floor, area, rent, and furnishing status.",
    fields: ["Unit Code", "Unit Number", "Building", "Floor", "Property Type", "Carpet Area", "Built Up Area", "Monthly Rent", "Furnishing", "Availability", "Notes"],
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: Users,
    description: "Export contact records with role, building, and communication preferences.",
    fields: ["Full Name", "Mobile", "Email", "Role", "Building", "WhatsApp", "Preferred Communication", "Notes"],
  },
  {
    id: "clients",
    label: "Clients",
    icon: Users,
    description: "Export client records with contact information and notes.",
    fields: ["Name", "Company", "Email", "Mobile", "Requirements", "Deals"],
  },
  {
    id: "deals",
    label: "Deals",
    icon: Handshake,
    description: "Export deal pipeline data with stage, value, and expected close dates.",
    fields: ["Title", "Client", "Building", "Unit", "Deal Value", "Status", "Assigned To", "Created At"],
  },
];

function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const escape = (val: unknown) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n");
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportsPage() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const [exporting, setExporting] = useState<string | null>(null);
  const exportData = useExportData();

  function toggleType(id: string) {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function toggleField(entityId: string, field: string) {
    setSelectedFields((prev) => {
      const current = prev[entityId] || [];
      const next = current.includes(field) ? current.filter((f) => f !== field) : [...current, field];
      return { ...prev, [entityId]: next };
    });
  }

  function selectAllFields(entityId: string, fields: string[]) {
    setSelectedFields((prev) => {
      const current = prev[entityId] || [];
      if (current.length === fields.length) return { ...prev, [entityId]: [] };
      return { ...prev, [entityId]: [...fields] };
    });
  }

  async function handleExport() {
    if (selectedTypes.length === 0) {
      toast.error("Select at least one data type to export");
      return;
    }

    for (const entityType of selectedTypes) {
      setExporting(entityType);
      try {
        const result = await exportData.mutateAsync({ entityType });
        const payload = result?.data ?? result;
        const headers: string[] = payload?.headers || [];
        const rows: unknown[][] = payload?.rows || [];

        const typeInfo = EXPORT_TYPES.find((t) => t.id === entityType);
        const fields = selectedFields[entityType];

        let finalHeaders = headers;
        let finalRows = rows;

        if (fields && fields.length > 0 && headers.length > 0) {
          const fieldIndices = fields
            .map((f) => headers.findIndex((h) => h.toLowerCase() === f.toLowerCase()))
            .filter((i) => i >= 0);
          finalHeaders = fieldIndices.map((i) => headers[i]);
          finalRows = rows.map((row) => fieldIndices.map((i) => row[i]));
        }

        const csv = rowsToCsv(finalHeaders, finalRows);
        downloadBlob(csv, `${entityType}-export.csv`, "text/csv");
        toast.success(`${typeInfo?.label || entityType} exported successfully`);
      } catch {
        toast.error(`Failed to export ${entityType}`);
      } finally {
        setExporting(null);
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exports"
        description="Export your data in CSV format."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORT_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedTypes.includes(type.id);
          const fields = selectedFields[type.id] || [];
          return (
            <Card
              key={type.id}
              className={`cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"}`}
              onClick={() => toggleType(type.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleType(type.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{type.description}</p>
                    <div className="space-y-2">
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectAllFields(type.id, type.fields);
                        }}
                      >
                        {fields.length === type.fields.length ? "Deselect All" : "Select All Fields"}
                      </button>
                      <div className="flex flex-wrap gap-1">
                        {type.fields.map((f) => {
                          const active = fields.length === 0 || fields.includes(f);
                          return (
                            <button
                              key={f}
                              className={`text-xs px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground opacity-50"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleField(type.id, f);
                              }}
                            >
                              {f}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedTypes.length} type{selectedTypes.length !== 1 ? "s" : ""} selected
              </span>
            </div>
            <Button
              onClick={handleExport}
              disabled={selectedTypes.length === 0 || exporting !== null}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exporting ? `Exporting ${exporting}...` : "Export CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
