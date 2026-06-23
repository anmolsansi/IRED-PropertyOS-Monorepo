"use client";

import { useRef, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useImports,
  useUploadImport,
  useMapColumns,
  useValidateImport,
  useConfirmImport,
  type ImportJob,
} from "@/hooks/use-imports";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  uploaded: <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
  mapped: <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
  validated: <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />,
  processing: <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />,
  completed: <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />,
  failed: <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
  partial: <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
  success: <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />,
};

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Uploaded",
  mapped: "Mapped",
  validated: "Validated",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  partial: "Partial",
  success: "Success",
};

type WorkflowStep = "upload" | "map" | "validate" | "confirm";

export default function ImportsPage() {
  const { data, isLoading } = useImports();
  const uploadImport = useUploadImport();
  const mapColumns = useMapColumns();
  const validateImport = useValidateImport();
  const confirmImport = useConfirmImport();
  const fileRef = useRef<HTMLInputElement>(null);

  const imports = data?.data ?? [];

  const [selectedEntity, setSelectedEntity] = useState<string>("property");
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("upload");
  const [workflowImportId, setWorkflowImportId] = useState<string | null>(null);
  const [workflowColumns, setWorkflowColumns] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<{
    totalRows: number;
    validRows: number;
    errorRows: number;
    errors: Array<{ row: number; field: string; message: string; value: string }>;
  } | null>(null);
  const [stepLoading, setStepLoading] = useState(false);

  const ENTITY_FIELDS: Record<string, string[]> = {
    property: ["buildingName", "address", "city", "state", "locality", "pincode", "propertyType", "totalArea", "availableArea", "rentPerSqFt", "camCharges", "maintenanceCharges", "securityDeposit", "furnishingStatus", "availabilityStatus", "notes"],
    contact: ["name", "phone", "email", "company", "notes"],
    client: ["name", "company", "email", "phone", "notes"],
  };

  async function handleFileUpload(file: File) {
    setStepLoading(true);
    try {
      const result = await uploadImport.mutateAsync({ file, entityType: selectedEntity }) as Record<string, unknown>;
      const importData = (result?.data ?? result) as Record<string, unknown> | undefined;
      const importId = importData?.id || (importData?.data as Record<string, unknown>)?.id;
      const columns = (importData?.columns || (importData?.data as Record<string, unknown>)?.columns || []) as string[];

      if (!importId) {
        toast.error("Upload succeeded but no import ID returned");
        return;
      }

      setWorkflowImportId(importId as string);
      setWorkflowColumns(columns);
      const initialMap: Record<string, string> = {};
      columns.forEach((col: string) => { initialMap[col] = col; });
      setColumnMap(initialMap);
      setWorkflowStep("map");
      toast.success(`${file.name} uploaded successfully`);
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setStepLoading(false);
    }
  }

  async function handleMapColumns() {
    if (!workflowImportId) return;
    setStepLoading(true);
    try {
      await mapColumns.mutateAsync({ id: workflowImportId, columnMap });
      setWorkflowStep("validate");
      toast.success("Columns mapped successfully");
    } catch {
      toast.error("Failed to map columns");
    } finally {
      setStepLoading(false);
    }
  }

  async function handleValidate() {
    if (!workflowImportId) return;
    setStepLoading(true);
    try {
      const rawResult = await validateImport.mutateAsync(workflowImportId) as Record<string, unknown>;
      const data = (rawResult?.data ?? rawResult) as NonNullable<typeof validationResult>;
      setValidationResult(data);
      if (data.errorRows === 0) {
        setWorkflowStep("confirm");
      } else {
        setWorkflowStep("validate");
      }
      toast.success(`Validation complete: ${data.validRows} valid, ${data.errorRows} errors`);
    } catch {
      toast.error("Validation failed");
    } finally {
      setStepLoading(false);
    }
  }

  async function handleConfirm() {
    if (!workflowImportId) return;
    setStepLoading(true);
    try {
      await confirmImport.mutateAsync(workflowImportId);
      toast.success("Import confirmed and processing!");
      resetWorkflow();
    } catch {
      toast.error("Failed to confirm import");
    } finally {
      setStepLoading(false);
    }
  }

  function resetWorkflow() {
    setWorkflowStep("upload");
    setWorkflowImportId(null);
    setWorkflowColumns([]);
    setColumnMap({});
    setValidationResult(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Imports"
        description="Bulk import data from CSV and Excel files."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step indicators */}
          <div className="flex items-center gap-2 text-xs">
            {(["upload", "map", "validate", "confirm"] as WorkflowStep[]).map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  workflowStep === step
                    ? "bg-primary text-primary-foreground"
                    : ["upload", "map", "validate", "confirm"].indexOf(workflowStep) > i
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                }`}>
                  {["upload", "map", "validate", "confirm"].indexOf(workflowStep) > i ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={workflowStep === step ? "font-medium" : "text-muted-foreground"}>
                  {step === "upload" ? "Upload" : step === "map" ? "Map Columns" : step === "validate" ? "Validate" : "Confirm"}
                </span>
                {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {/* Upload Step */}
          {workflowStep === "upload" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <label className="text-sm font-medium">Entity Type</label>
                <Select value={selectedEntity} onValueChange={(v) => v && setSelectedEntity(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="property">Properties</SelectItem>
                    <SelectItem value="contact">Contacts</SelectItem>
                    <SelectItem value="client">Clients</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload CSV or Excel file</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .csv, .xlsx (max 5MB)</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
            </div>
          )}

          {/* Map Columns Step */}
          {workflowStep === "map" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Map your file columns to the expected fields.
              </p>
              <div className="grid gap-3">
                {workflowColumns.map((col) => (
                  <div key={col} className="flex items-center gap-3">
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded w-48 truncate">
                      {col}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select
                      value={columnMap[col] || ""}
                      onValueChange={(v) => setColumnMap((prev) => ({ ...prev, [col]: v || "" }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Skip this column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Skip</SelectItem>
                        {(ENTITY_FIELDS[selectedEntity] || []).map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetWorkflow}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button onClick={handleMapColumns} disabled={stepLoading}>
                  {stepLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Validate Step */}
          {workflowStep === "validate" && (
            <div className="space-y-4">
              {validationResult ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 border rounded-lg text-center">
                      <p className="text-2xl font-bold">{validationResult.totalRows}</p>
                      <p className="text-xs text-muted-foreground">Total Rows</p>
                    </div>
                    <div className="p-3 border rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{validationResult.validRows}</p>
                      <p className="text-xs text-muted-foreground">Valid</p>
                    </div>
                    <div className="p-3 border rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">{validationResult.errorRows}</p>
                      <p className="text-xs text-muted-foreground">Errors</p>
                    </div>
                  </div>
                  {validationResult.errors && validationResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Error Details
                      </h4>
                      <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                        {validationResult.errors.slice(0, 50).map((err, i) => (
                          <div key={i} className="p-2 text-xs flex items-start gap-2">
                            <span className="font-mono text-muted-foreground shrink-0">Row {err.row}</span>
                            <span className="text-red-600">{err.field}: {err.message}</span>
                            {err.value && <span className="text-muted-foreground">({err.value})</span>}
                          </div>
                        ))}
                        {validationResult.errors.length > 50 && (
                          <div className="p-2 text-xs text-muted-foreground text-center">
                            ...and {validationResult.errors.length - 50} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running validation...
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setWorkflowStep("map")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button onClick={handleValidate} disabled={stepLoading || (validationResult !== null && validationResult.errorRows > 0)}>
                  {stepLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {validationResult && validationResult.errorRows === 0 ? "Continue to Confirm" : "Validate"}
                </Button>
              </div>
            </div>
          )}

          {/* Confirm Step */}
          {workflowStep === "confirm" && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/10 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Validation Passed</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your data is ready to be imported. Click confirm to proceed.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setWorkflowStep("validate")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button onClick={handleConfirm} disabled={stepLoading}>
                  {stepLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Confirm Import
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Imports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : imports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No import jobs yet. Upload a file above to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {imports.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {STATUS_ICONS[item.status] ?? (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{item.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.entityType} · {item.totalRows ?? 0} rows
                        {item.errorRows ? ` · ${item.errorRows} errors` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString("en-IN")}
                    </span>
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
