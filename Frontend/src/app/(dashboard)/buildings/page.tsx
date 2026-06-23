"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  MoreHorizontal,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Layers,
  DoorOpen,
  CheckCircle,
} from "lucide-react";
import { useProperties } from "@/hooks/use-properties";
import { PROPERTY_TYPE_LABELS, INDIAN_STATES, MAJOR_CITIES } from "@/lib/constants";
import type { FilterParams } from "@/types";
import Link from "next/link";

export default function BuildingsPage() {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string | undefined>();
  const [cityFilter, setCityFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filters: FilterParams = useMemo(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      state: stateFilter,
      city: cityFilter,
      propertyType: typeFilter as FilterParams["propertyType"],
    }),
    [page, search, stateFilter, cityFilter, typeFilter]
  );

  const { data, isLoading } = useProperties(filters);

  const buildings = useMemo(() => {
    const allProperties = data?.data || [];
    return allProperties.filter((p) => p.entryType === "building");
  }, [data]);

  const totalPages = data?.totalPages || 1;

  const stats = useMemo(() => {
    const totalBuildings = buildings.length;
    const totalFloors = buildings.reduce((sum, b) => {
      const floors = (b as unknown as { floors?: unknown[] }).floors;
      return sum + (floors?.length || 0);
    }, 0);
    const totalUnits = buildings.reduce((sum, b) => {
      const units = (b as unknown as { units?: unknown[] }).units;
      return sum + (units?.length || 0);
    }, 0);
    const available = buildings.filter((b) => b.availabilityStatus === "available").length;
    return { totalBuildings, totalFloors, totalUnits, available };
  }, [buildings]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buildings"
        description="View and manage all building properties in your inventory."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg dark:bg-blue-500/20">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalBuildings}</p>
                <p className="text-xs text-muted-foreground">Total Buildings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg dark:bg-purple-500/20">
                <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalFloors}</p>
                <p className="text-xs text-muted-foreground">Total Floors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg dark:bg-orange-500/20">
                <DoorOpen className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUnits}</p>
                <p className="text-xs text-muted-foreground">Total Units</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg dark:bg-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input
              placeholder="Search buildings..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Select
              value={stateFilter || "all"}
              onValueChange={(v) => {
                setStateFilter(v === "all" ? undefined : v ?? undefined);
                setCityFilter(undefined);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={cityFilter || "all"}
              onValueChange={(v) => {
                setCityFilter(v === "all" ? undefined : v ?? undefined);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {(MAJOR_CITIES[stateFilter || ""] || []).map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter || "all"}
              onValueChange={(v) => {
                setTypeFilter(v === "all" ? undefined : v ?? undefined);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton type="table" />
          ) : buildings.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No buildings found"
                description="No buildings match your current filters."
                icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Building Name</TableHead>
                    <TableHead>Property ID</TableHead>
                    <TableHead>City / State</TableHead>
                    <TableHead>Locality</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Floors</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Area (sqft)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buildings.map((building) => {
                    const floorsCount = (building as unknown as { floors?: unknown[] }).floors?.length || 0;
                    const unitsCount = (building as unknown as { units?: unknown[] }).units?.length || 0;
                    return (
                      <TableRow key={building.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/properties/${building.id}`}
                            className="hover:underline"
                          >
                            {building.buildingName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/properties/${building.id}`}
                            className="font-mono text-sm text-primary hover:underline"
                          >
                            {building.propertyId}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {building.city}, {building.state}
                        </TableCell>
                        <TableCell>{building.locality}</TableCell>
                        <TableCell>
                          {PROPERTY_TYPE_LABELS[building.propertyType]}
                        </TableCell>
                        <TableCell className="text-right">
                          {floorsCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {unitsCount}
                        </TableCell>
                        <TableCell className="text-right">
                          {building.availableArea.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            type="availability"
                            value={building.availabilityStatus}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            type="verification"
                            value={building.verificationStatus}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Link
                                  href={`/properties/${building.id}`}
                                  className="flex items-center w-full"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link
                                  href={`/properties/${building.id}/edit`}
                                  className="flex items-center w-full"
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
