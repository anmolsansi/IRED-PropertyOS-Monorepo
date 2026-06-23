import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import type { ChangeRequest } from "@/types";

interface ApprovalCardProps {
  approval: ChangeRequest;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />,
  approved: <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />,
  rejected: <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />,
  deferred: <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />,
  conflict: <AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400" />,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  deferred: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  conflict: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export function ApprovalCard({ approval, onApprove, onReject }: ApprovalCardProps) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {STATUS_ICONS[approval.status]}
            <div>
              <p className="font-medium text-sm">{approval.entityName}</p>
              <p className="text-xs text-muted-foreground">
                {approval.entityType} · {approval.city}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={`text-xs ${STATUS_COLORS[approval.status]}`}>
            {approval.status}
          </Badge>
        </div>
        <div className="space-y-1 mb-3">
          {approval.fieldChanges.map((change) => (
            <div key={change.id} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{change.fieldLabel}:</span>
              <span className="line-through text-muted-foreground">{change.masterValue || "—"}</span>
              <span>→</span>
              <span className="font-medium">{change.workerValue || "—"}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
           <span>By {approval.worker?.fullName || "Worker"}</span>
          <span>{new Date(approval.requestedAt).toLocaleDateString("en-IN")}</span>
        </div>
        {approval.status === "pending" && (onApprove || onReject) && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onApprove?.(approval.id)}>
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => onReject?.(approval.id)}>
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
