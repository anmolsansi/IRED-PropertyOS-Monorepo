"use client";

import { useAdminDashboard, useWorkerDashboard, useActivity } from "@/hooks/use-dashboard";
import { StatCardGrid } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { useAuthSession } from "@/hooks/use-session";
import {
  Building2,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  Eye,
  AlertTriangle,
  Users,
  CalendarCheck,
  Briefcase,
  Home,
  MapPin,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminDashboard();
  const { data: activities, isLoading: actLoading } = useActivity(10);

  if (statsLoading || actLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="cards" count={4} />
        <LoadingSkeleton type="cards" count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton type="table" />
          <LoadingSkeleton type="table" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Properties",
      value: stats.totalProperties.toLocaleString(),
      description: `${stats.availableProperties} available · ${stats.occupiedProperties} occupied`,
      icon: Building2,
      iconColor: "text-blue-600",
    },
    {
      title: "Total Units",
      value: stats.totalUnits.toLocaleString(),
      description: `${stats.availableUnits} available`,
      icon: Home,
      iconColor: "text-green-600",
    },
    {
      title: "Pending Approvals",
      value: stats.pendingApprovals.toLocaleString(),
      description: "Awaiting review",
      icon: Clock,
      iconColor: "text-orange-600",
    },
    {
      title: "Active Deals",
      value: stats.activeDeals.toLocaleString(),
      description: `${stats.closedDeals} closed`,
      icon: TrendingUp,
      iconColor: "text-purple-600",
    },
    {
      title: "Clients",
      value: stats.totalClients.toLocaleString(),
      description: "Registered",
      icon: Users,
      iconColor: "text-cyan-600",
    },
    {
      title: "Workers",
      value: stats.totalWorkers.toLocaleString(),
      description: "Active agents",
      icon: Briefcase,
      iconColor: "text-amber-600",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks.toLocaleString(),
      description: "Needing attention",
      icon: ClipboardList,
      iconColor: "text-rose-600",
    },
    {
      title: "Upcoming Site Visits",
      value: stats.upcomingSiteVisits.toLocaleString(),
      description: "Scheduled",
      icon: CalendarCheck,
      iconColor: "text-indigo-600",
    },
  ];

  const pendingActivities = (activities ?? []).filter(
    (a) => a.action.includes("pending") || a.action.includes("review") || a.action.includes("PENDING")
  );

  return (
    <div className="space-y-6">
      <StatCardGrid stats={statCards} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pending Approvals</CardTitle>
            <Link href="/approvals" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <Eye className="h-4 w-4 mr-1" />
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {pendingActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No pending approvals.</p>
            ) : (
              <div className="space-y-3">
                {pendingActivities.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.entityName}</p>
                      <p className="text-xs text-muted-foreground">{item.action}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{formatTimestamp(item.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <Link href="/activity" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <Eye className="h-4 w-4 mr-1" />
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {(activities ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {(activities ?? []).slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.entityName}</p>
                      <p className="text-xs text-muted-foreground">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.userName} · {formatTimestamp(item.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link
                href="/properties/new"
                className="flex items-center gap-3 w-full p-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4 text-primary" />
                Add Property
              </Link>
              <Link
                href="/approvals"
                className="flex items-center gap-3 w-full p-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
                Review Approvals
              </Link>
              <Link
                href="/deals"
                className="flex items-center gap-3 w-full p-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
              >
                <TrendingUp className="h-4 w-4 text-purple-600" />
                View Deals
              </Link>
              <Link
                href="/tasks"
                className="flex items-center gap-3 w-full p-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
              >
                <ClipboardList className="h-4 w-4 text-amber-600" />
                View Tasks
              </Link>
              <Link
                href="/site-visits"
                className="flex items-center gap-3 w-full p-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
              >
                <MapPin className="h-4 w-4 text-indigo-600" />
                Site Visits
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WorkerDashboard() {
  const { data: stats, isLoading: statsLoading } = useWorkerDashboard();
  const { data: activities, isLoading: actLoading } = useActivity(10);

  if (statsLoading || actLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="cards" count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton type="table" />
          <LoadingSkeleton type="table" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Assigned Properties",
      value: stats.assignedProperties.toLocaleString(),
      description: "Properties under you",
      icon: Building2,
      iconColor: "text-blue-600",
    },
    {
      title: "My Tasks",
      value: stats.myTasks.toLocaleString(),
      description: "Assigned to you",
      icon: ClipboardList,
      iconColor: "text-orange-600",
    },
    {
      title: "My Deals",
      value: stats.myDeals.toLocaleString(),
      description: "In progress",
      icon: TrendingUp,
      iconColor: "text-purple-600",
    },
    {
      title: "My Site Visits",
      value: stats.mySiteVisits.toLocaleString(),
      description: "Scheduled",
      icon: MapPin,
      iconColor: "text-indigo-600",
    },
    {
      title: "Pending Changes",
      value: stats.pendingChanges.toLocaleString(),
      description: "Awaiting approval",
      icon: Clock,
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <StatCardGrid stats={statCards} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">My Recent Activity</CardTitle>
            <Link href="/activity" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <Eye className="h-4 w-4 mr-1" />
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {(activities ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {(activities ?? []).slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.entityName}</p>
                      <p className="text-xs text-muted-foreground">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.userName} · {formatTimestamp(item.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link
                href="/properties"
                className="flex items-center gap-3 w-full p-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
              >
                <Building2 className="h-4 w-4 text-blue-600" />
                View My Properties
              </Link>
              <Link
                href="/tasks"
                className="flex items-center gap-3 w-full p-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
              >
                <ClipboardList className="h-4 w-4 text-orange-600" />
                View My Tasks
              </Link>
              <Link
                href="/site-visits"
                className="flex items-center gap-3 w-full p-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
              >
                <MapPin className="h-4 w-4 text-indigo-600" />
                View Site Visits
              </Link>
              <Link
                href="/deals"
                className="flex items-center gap-3 w-full p-3 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
              >
                <TrendingUp className="h-4 w-4 text-purple-600" />
                View My Deals
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { session, status } = useAuthSession();
  const router = useRouter();
  const role = session?.user?.role;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/sign-in");
    } else if (status === "authenticated" && role === "RIDER") {
      router.replace("/properties/new");
    }
  }, [router, status, role]);

  if (status !== "authenticated" || !role) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="cards" count={4} />
        <LoadingSkeleton type="cards" count={4} />
      </div>
    );
  }

  if (role === "ADMIN") {
    return <AdminDashboard />;
  }

  return <WorkerDashboard />;
}
