import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileQuestion, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              <FileQuestion className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">404</h1>
          <h2 className="text-lg font-semibold mb-2">Page Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/properties">
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Properties
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
