"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import {
  Download,
  Filter,
  Map,
  MoreHorizontal,
  Plus,
  SlidersHorizontal,
  TableProperties,
  AlertTriangle,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  PROPERTY_TYPE_LABELS,
  FURNISHING_LABELS,
  AVAILABILITY_LABELS,
} from "@/lib/constants";
import { useProperties } from "@/hooks/use-properties";
import { useDeleteProperty } from "@/hooks/use-properties";
import { useStates, useCities, useLocalities } from "@/hooks/use-reference";
import type { FilterParams } from "@/types";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function PropertiesPage() {
  const queryClient = useQueryClient();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [view, setView] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    pageSize: 10,
  });

  const { data, isLoading } = useProperties(filters);
  const deleteProperty = useDeleteProperty();
  const properties = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const { data: states = [] } = useStates();
  const { data: cities = [] } = useCities(filters.state);
  const { data: localities = [] } = useLocalities(filters.city);

  const updateFilter = useCallback((key: keyof FilterParams, value: string | number | undefined) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value === undefined || value === "" || value === "all") {
        delete newFilters[key];
      } else {
        (newFilters as Record<string, unknown>)[key] = value;
      }
      newFilters.page = 1;
      return newFilters;
    });
    setSelectedRows([]);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ page: 1, pageSize: 10 });
    setSelectedRows([]);
  }, []);

  const hasActiveFilters =
    filters.state || filters.city || filters.locality || filters.propertyType || filters.furnishingStatus || filters.availabilityStatus;

  const refreshProperties = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["properties"] });
  }, [queryClient]);

  const deleteProperties = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) {
        toast.error("Select at least one property first.");
        return;
      }

      try {
        await Promise.all(ids.map((id) => deleteProperty.mutateAsync(id)));
        setSelectedRows([]);
        await refreshProperties();
        toast.success(`${ids.length} propert${ids.length === 1 ? "y" : "ies"} deleted`);
      } catch {
        toast.error("Failed to delete selected properties");
      }
    },
    [deleteProperty, refreshProperties],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Search, filter and manage your property inventory across India."
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" />
            }
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Bulk Actions
            {selectedRows.length > 0 ? ` (${selectedRows.length})` : ""}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setSelectedRows(properties.map((p) => p.id))}>
              Select visible
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedRows([])}>
              Clear selection
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => deleteProperties(selectedRows)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Link
          href="/properties/new"
          className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Link>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Select
              value={filters.state || "all"}
              onValueChange={(v) => {
                setFilters((prev) => ({
                  ...prev,
                  state: v === "all" ? undefined : v,
                  city: undefined,
                  locality: undefined,
                  page: 1,
                }));
                setSelectedRows([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state.id} value={state.id}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.city || "all"}
              onValueChange={(v) => {
                setFilters((prev) => ({
                  ...prev,
                  city: v === "all" ? undefined : v,
                  locality: undefined,
                  page: 1,
                }));
                setSelectedRows([]);
              }}
              disabled={!filters.state}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.locality || "all"}
              onValueChange={(v) => {
                setFilters((prev) => ({
                  ...prev,
                  locality: v === "all" ? undefined : v,
                  page: 1,
                }));
                setSelectedRows([]);
              }}
              disabled={!filters.city}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Localities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Localities</SelectItem>
                {localities.map((locality) => (
                  <SelectItem key={locality.id} value={locality.id}>
                    {locality.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.furnishingStatus || "all"}
              onValueChange={(v) => updateFilter("furnishingStatus", v || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Furnishing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(FURNISHING_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.availabilityStatus || "all"}
              onValueChange={(v) => updateFilter("availabilityStatus", v || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(AVAILABILITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger>
                <SelectValue placeholder="All Workers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                className="w-20"
                value={filters.minArea || ""}
                onChange={(e) =>
                  updateFilter("minArea", e.target.value ? Number(e.target.value) : undefined)
                }
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                placeholder="Max"
                className="w-20"
                value={filters.maxArea || ""}
                onChange={(e) =>
                  updateFilter("maxArea", e.target.value ? Number(e.target.value) : undefined)
                }
              />
              <span className="text-xs text-muted-foreground">Area (sqft)</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                className="w-20"
                value={filters.minRent || ""}
                onChange={(e) =>
                  updateFilter("minRent", e.target.value ? Number(e.target.value) : undefined)
                }
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                placeholder="Max"
                className="w-20"
                value={filters.maxRent || ""}
                onChange={(e) =>
                  updateFilter("maxRent", e.target.value ? Number(e.target.value) : undefined)
                }
              />
              <span className="text-xs text-muted-foreground">Rent (₹/sqft)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                More Filters
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={clearFilters}
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle + Results */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
          >
            <TableProperties className="h-4 w-4 mr-2" />
            List View
          </Button>
          <Button
            variant={view === "map" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("map")}
          >
            <Map className="h-4 w-4 mr-2" />
            Map View
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {total.toLocaleString()} properties found
          </span>
          <Select
            value={filters.sortBy || "updatedAt"}
            onValueChange={(v) => updateFilter("sortBy", v || undefined)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Sort by: Last Updated</SelectItem>
              <SelectItem value="buildingName">Sort by: Name</SelectItem>
              <SelectItem value="rentPerSqFt">Sort by: Rent</SelectItem>
              <SelectItem value="availableArea">Sort by: Area</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Properties Table */}
      {view === "list" ? (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <LoadingSkeleton type="table" />
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="md:hidden space-y-3 p-4">
                  {properties.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No properties found matching your filters.
                    </div>
                  ) : (
                    properties.map((property) => (
                      <Card key={property.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Link
                                href={`/properties/${property.id}`}
                                className="font-medium hover:underline"
                              >
                                {property.buildingName}
                              </Link>
                              <p className="text-xs text-muted-foreground font-mono">
                                {property.propertyId}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors">
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Link href={`/properties/${property.id}`} className="flex items-center w-full">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link href={`/properties/${property.id}/edit`} className="flex items-center w-full">
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <span className="text-muted-foreground text-xs">City</span>
                            <span className="text-xs">{property.city}, {property.state}</span>
                            <span className="text-muted-foreground text-xs">Type</span>
                            <span className="text-xs">{PROPERTY_TYPE_LABELS[property.propertyType]}</span>
                            <span className="text-muted-foreground text-xs">Area</span>
                            <span className="text-xs">{property.availableArea.toLocaleString()} sqft</span>
                            <span className="text-muted-foreground text-xs">Rent</span>
                            <span className="text-xs">₹{property.rentPerSqFt}/sqft</span>
                            <span className="text-muted-foreground text-xs">Status</span>
                            <span className="text-xs"><StatusBadge type="availability" value={property.availabilityStatus} /></span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedRows.length === properties.length &&
                            properties.length > 0
                          }
                          onCheckedChange={(checked) => {
                            setSelectedRows(
                              checked ? properties.map((p) => p.id) : []
                            );
                          }}
                        />
                      </TableHead>
                      <TableHead>Property ID</TableHead>
                      <TableHead>Building Name</TableHead>
                      <TableHead>City / State</TableHead>
                      <TableHead>Locality</TableHead>
                      <TableHead>Property Type</TableHead>
                      <TableHead className="text-right">
                        Available Area (sqft)
                      </TableHead>
                      <TableHead className="text-right">
                        Rent (₹/sqft)
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Duplicate</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={13}
                          className="text-center py-12 text-muted-foreground"
                        >
                          No properties found matching your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      properties.map((property) => (
                        <TableRow key={property.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.includes(property.id)}
                              onCheckedChange={(checked) => {
                                setSelectedRows(
                                  checked
                                    ? [...selectedRows, property.id]
                                    : selectedRows.filter(
                                        (id) => id !== property.id
                                      )
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/properties/${property.id}`}
                              className="font-mono text-sm text-primary hover:underline"
                            >
                              {property.propertyId}
                            </Link>
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              href={`/properties/${property.id}`}
                              className="hover:underline"
                            >
                              {property.buildingName}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {property.city}, {property.state}
                          </TableCell>
                          <TableCell>{property.locality}</TableCell>
                          <TableCell>
                            {PROPERTY_TYPE_LABELS[property.propertyType]}
                          </TableCell>
                          <TableCell className="text-right">
                            {property.availableArea.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{property.rentPerSqFt}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              type="availability"
                              value={property.availabilityStatus}
                            />
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              type="verification"
                              value={property.verificationStatus}
                            />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(property.updatedAt).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </TableCell>
                          <TableCell>
                            {property.duplicateWarning && (
                              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-xs">Duplicate</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors">
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Link href={`/properties/${property.id}`} className="flex items-center w-full">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link
                                    href={`/properties/${property.id}/edit`}
                                    className="flex items-center w-full"
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => deleteProperties([property.id])}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Rows per page:
                    </span>
                    <Select
                      value={String(filters.pageSize || 10)}
                      onValueChange={(v) =>
                        updateFilter("pageSize", v ? Number(v) : undefined)
                      }
                    >
                      <SelectTrigger className="w-16 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page === 1}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          page: (prev.page || 1) - 1,
                        }))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={
                            filters.page === page ? "default" : "outline"
                          }
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            setFilters((prev) => ({ ...prev, page }))
                          }
                        >
                          {page}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && (
                      <span className="text-muted-foreground px-2">...</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page === totalPages}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          page: (prev.page || 1) + 1,
                        }))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Map Placeholder */
        <Card>
          <CardContent className="p-0 h-[600px] bg-muted flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Map className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-medium">Map View</p>
              <p className="text-sm">
                Google Maps / Mapbox integration coming in V2
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
