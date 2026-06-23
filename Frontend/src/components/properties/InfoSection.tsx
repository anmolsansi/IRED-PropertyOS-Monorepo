import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InfoField {
  label: string;
  value: React.ReactNode;
  className?: string;
}

interface InfoSectionProps {
  title: string;
  fields: InfoField[];
  className?: string;
}

export function InfoSection({ title, fields, className }: InfoSectionProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {fields.map((field) => (
            <div key={field.label} className={cn("space-y-1", field.className)}>
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="text-sm font-medium">{field.value || "—"}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
