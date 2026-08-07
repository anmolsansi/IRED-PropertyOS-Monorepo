import Link from "next/link";
import { CheckCircle2, ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PropertySubmittedPage() {
  return (
    <div className="mx-auto grid min-h-[70vh] w-full max-w-2xl place-items-center px-4 py-10">
      <div className="w-full rounded-3xl border bg-card p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Property submitted successfully</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          The property has been saved in Property Intake. A telecaller will review the rider information, call the contact, complete any missing details, and then add the record to master Properties.
        </p>

        <div className="mt-6 rounded-2xl border bg-muted/20 p-4 text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">What happens next?</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                This submission will not appear in Properties until the intake workflow is completed by the telecaller.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/properties/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Another Property
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings">Done</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
