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
  Layers,
  MoreHorizontal,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useProperties } from "@/hooks/use-properties";
import { PROPERTY_TYPE_LABELS, AVAILABILITY_LABELS } from "@/lib/constants";
import type { FilterParams } from "@/types";
import Link from "next/link";

export default function FloorsPage() {
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filters: FilterParams = useMemo(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      availabilityStatus: availabilityFilter as FilterParams["availabilityStatus"],
    }),
    [page, search, availabilityFilter]
  );

  const { data, isLoading } = useProperties(filters);

  const floors = useMemo(() => {
    const allProperties = data?.data || [];
    return allProperties.filter((p) => p.entryType === "floor");
  }, [data]);

  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Floors"
        description="View and manage all floors across your buildings."
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search floors..."
              className="max-w-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Select
              value={availabilityFilter || "all"}
              onValueChange={(v) => {
                setAvailabilityFilter(v === "all" ? undefined : v ?? undefined);
                setPage(1);
              }}
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton type="table" />
          ) : floors.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No floors found"
                description="No floors match your current filters."
                icon={<Layers className="h-8 w-8 text-muted-foreground" />}
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Floor Name</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>City / State</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Floor #</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Area (sqft)</TableHead>
                    <TableHead className="text-right">Rent (₹/sqft)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {floors.map((floor) => {
                    const flr = floor as unknown as { floorNumber?: number; floorName?: string; buildingName?: string; units?: unknown[] };
                    return (
                      <TableRow key={floor.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/properties/${floor.id}`}
                            className="hover:underline"
                          >
                            {flr.floorName || floor.buildingName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {flr.buildingName || "—"}
                        </TableCell>
                        <TableCell>
                          {floor.city}, {floor.state}
                        </TableCell>
                        <TableCell>
                          {PROPERTY_TYPE_LABELS[floor.propertyType]}
                        </TableCell>
                        <TableCell className="text-right">
                          {flr.floorNumber ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {flr.units?.length || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {floor.availableArea.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{floor.rentPerSqFt}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            type="availability"
                            value={floor.availabilityStatus}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            type="verification"
                            value={floor.verificationStatus}
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
                                  href={`/properties/${floor.id}`}
                                  className="flex items-center w-full"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Link
                                  href={`/properties/${floor.id}/edit`}
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
