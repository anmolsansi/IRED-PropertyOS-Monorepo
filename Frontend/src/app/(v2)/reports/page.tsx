"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Building2, Users, Handshake, TrendingUp, Download } from "lucide-react";
import { useProperties } from "@/hooks/use-properties";
import { useClients } from "@/hooks/use-clients";
import { useDeals } from "@/hooks/use-deals";

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#a855f7", "#3b82f6", "#ec4899"];
const DEAL_STAGE_COLORS: Record<string, string> = {
  requirement_received: "#94a3b8",
  shortlisted: "#a855f7",
  site_visit_scheduled: "#f59e0b",
  site_visit_completed: "#f97316",
  negotiation: "#ef4444",
  agreement_shared: "#3b82f6",
  closed: "#22c55e",
  lost: "#6b7280",
};

const DEAL_STAGE_LABELS: Record<string, string> = {
  requirement_received: "Requirement",
  shortlisted: "Shortlisted",
  site_visit_scheduled: "SV Scheduled",
  site_visit_completed: "SV Done",
  negotiation: "Negotiation",
  agreement_shared: "Agreement",
  closed: "Closed",
  lost: "Lost",
};

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
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
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: propertiesData, isLoading: loadingProps } = useProperties({ pageSize: 1000 });
  const { data: clientsData, isLoading: loadingClients } = useClients({ pageSize: 1000 });
  const { data: dealsData, isLoading: loadingDeals } = useDeals({ pageSize: 1000 });

  const properties = useMemo(() => {
    let list = propertiesData?.data || [];
    if (dateFrom) list = list.filter((p) => p.createdAt >= dateFrom);
    if (dateTo) list = list.filter((p) => p.createdAt <= dateTo + "T23:59:59");
    return list;
  }, [propertiesData, dateFrom, dateTo]);

  const clients = useMemo(() => {
    let list = clientsData?.data || [];
    if (dateFrom) list = list.filter((c) => c.createdAt >= dateFrom);
    if (dateTo) list = list.filter((c) => c.createdAt <= dateTo + "T23:59:59");
    return list;
  }, [clientsData, dateFrom, dateTo]);

  const deals = useMemo(() => {
    let list = dealsData?.data || [];
    if (dateFrom) list = list.filter((d) => d.createdAt >= dateFrom);
    if (dateTo) list = list.filter((d) => d.createdAt <= dateTo + "T23:59:59");
    return list;
  }, [dealsData, dateFrom, dateTo]);

  const isLoading = loadingProps || loadingClients || loadingDeals;

  const stats = useMemo(() => {
    const openDeals = deals.filter((d) => !["closed", "lost"].includes(d.status));
    const pipelineValue = openDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
    return {
      totalProperties: properties.length,
      activeClients: clients.length,
      openDeals: openDeals.length,
      pipelineValue,
    };
  }, [properties, clients, deals]);

  const propertiesByCity = useMemo(() => {
    const counts: Record<string, number> = {};
    properties.forEach((p) => {
      counts[p.city] = (counts[p.city] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [properties]);

  const dealsByStage = useMemo(() => {
    const counts: Record<string, number> = {};
    deals.forEach((d) => {
      counts[d.status] = (counts[d.status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({
        name: DEAL_STAGE_LABELS[name] || name,
        value,
        color: DEAL_STAGE_COLORS[name] || "#6b7280",
      }))
      .filter((d) => d.value > 0);
  }, [deals]);

  const availabilityData = useMemo(() => {
    const counts: Record<string, number> = {};
    properties.forEach((p) => {
      const label =
        p.availabilityStatus === "available"
          ? "Available"
          : p.availabilityStatus === "occupied"
            ? "Occupied"
            : p.availabilityStatus === "under_negotiation"
              ? "Negotiation"
              : p.availabilityStatus === "on_hold"
                ? "On Hold"
                : "Other";
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value], i) => ({
        name,
        value,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
      .filter((d) => d.value > 0);
  }, [properties]);

  const rentDistribution = useMemo(() => {
    const buckets: Record<string, number> = {};
    properties.forEach((p) => {
      const rent = p.rentPerSqFt;
      if (rent <= 80) buckets["≤₹80"] = (buckets["≤₹80"] || 0) + 1;
      else if (rent <= 100) buckets["₹81-100"] = (buckets["₹81-100"] || 0) + 1;
      else if (rent <= 130) buckets["₹101-130"] = (buckets["₹101-130"] || 0) + 1;
      else if (rent <= 170) buckets["₹131-170"] = (buckets["₹131-170"] || 0) + 1;
      else buckets["₹170+"] = (buckets["₹170+"] || 0) + 1;
    });
    return Object.entries(buckets).map(([name, count]) => ({ name, count }));
  }, [properties]);

  function handleExportReport() {
    const reportRows: unknown[][] = [];

    reportRows.push(["Metric", "Value"]);
    reportRows.push(["Total Properties", stats.totalProperties]);
    reportRows.push(["Active Clients", stats.activeClients]);
    reportRows.push(["Open Deals", stats.openDeals]);
    reportRows.push(["Pipeline Value", `₹${stats.pipelineValue}`]);
    reportRows.push([]);

    reportRows.push(["Properties by City"]);
    propertiesByCity.forEach((row) => reportRows.push([row.name, row.count]));
    reportRows.push([]);

    reportRows.push(["Deals by Stage"]);
    dealsByStage.forEach((row) => reportRows.push([row.name, row.value]));
    reportRows.push([]);

    reportRows.push(["Availability"]);
    availabilityData.forEach((row) => reportRows.push([row.name, row.value]));
    reportRows.push([]);

    reportRows.push(["Rent Distribution"]);
    rentDistribution.forEach((row) => reportRows.push([row.name, row.count]));

    downloadCsv(
      `report-${new Date().toISOString().split("T")[0]}.csv`,
      ["Category", "Label", "Value"],
      reportRows
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Analytics and insights across your property portfolio." />
        <LoadingSkeleton type="cards" />
        <LoadingSkeleton type="cards" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Analytics and insights across your property portfolio."
      >
        <Button variant="outline" size="sm" onClick={handleExportReport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">From:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">To:</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDateFrom(""); setDateTo(""); }}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-xs">Total Properties</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalProperties}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Active Clients</span>
            </div>
            <p className="text-2xl font-bold">{stats.activeClients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Handshake className="h-4 w-4" />
              <span className="text-xs">Open Deals</span>
            </div>
            <p className="text-2xl font-bold">{stats.openDeals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Pipeline Value</span>
            </div>
            <p className="text-2xl font-bold">
              ₹{(stats.pipelineValue / 100000).toFixed(1)}L
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Properties by City</CardTitle>
          </CardHeader>
          <CardContent>
            {propertiesByCity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No property data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={propertiesByCity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {dealsByStage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No deal data</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={dealsByStage}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {dealsByStage.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Availability Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {availabilityData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No availability data</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={availabilityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {availabilityData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rent Distribution (₹/sqft)</CardTitle>
          </CardHeader>
          <CardContent>
            {rentDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No rent data</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={rentDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
