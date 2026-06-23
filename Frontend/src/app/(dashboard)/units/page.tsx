"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
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
import { useProperties } from "@/hooks/use-properties";
import { PROPERTY_TYPE_LABELS, AVAILABILITY_LABELS } from "@/lib/constants";
import { MoreHorizontal, Eye, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import type { FilterParams } from "@/types";
import Link from "next/link";

export default function UnitsPage() {
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    pageSize: 10,
  });

  const { data, isLoading } = useProperties(filters);
  const allProperties = data?.data || [];

  const units = allProperties.filter((p) => p.entryType === "unit");
  const total = units.length;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Units"
        description="Manage individual units across all properties."
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search units..."
              className="max-w-sm"
              value={filters.search || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  search: e.target.value || undefined,
                  page: 1,
                }))
              }
            />
            <Select
              value={filters.availabilityStatus || "all"}
              onValueChange={(v) =>
                setFilters((prev) => ({
                  ...prev,
                  availabilityStatus: v === "all" ? undefined : (v as FilterParams["availabilityStatus"]),
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="w-40">
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton type="table" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit Number</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>City / State</TableHead>
                    <TableHead>Property Type</TableHead>
                    <TableHead className="text-right">Area (sqft)</TableHead>
                    <TableHead className="text-right">Rent (₹/sqft)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No units found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell>
                          <Link
                            href={`/properties/${unit.id}`}
                            className="font-mono text-sm text-primary hover:underline"
                          >
                            {unit.propertyId}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link href={`/properties/${unit.id}`} className="hover:underline">
                            {unit.buildingName}
                          </Link>
                        </TableCell>
                        <TableCell>{unit.city}, {unit.state}</TableCell>
                        <TableCell>{PROPERTY_TYPE_LABELS[unit.propertyType]}</TableCell>
                        <TableCell className="text-right">{unit.availableArea.toLocaleString()}</TableCell>
                        <TableCell className="text-right">₹{unit.rentPerSqFt}</TableCell>
                        <TableCell>
                          <StatusBadge type="availability" value={unit.availabilityStatus} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Link href={`/properties/${unit.id}`} className="flex items-center w-full">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link href={`/properties/${unit.id}/edit`} className="flex items-center w-full">
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-sm text-muted-foreground">
                  {total} unit{total !== 1 ? "s" : ""} found
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page === 1}
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page === totalPages}
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
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
