"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { InfoSection } from "@/components/properties/InfoSection";
import { ContactCard } from "@/components/properties/ContactCard";
import { MediaGallery } from "@/components/properties/MediaGallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useProperty, useBuildingFloors, useCreateFloor, useCreateUnit, useDeleteFloor, useDeleteUnit, useDeleteProperty } from "@/hooks/use-properties";
import { useMediaByBuilding } from "@/hooks/use-media";
import {
  PROPERTY_TYPE_LABELS,
  FURNISHING_LABELS,
  AVAILABILITY_LABELS,
} from "@/lib/constants";
import {
  Pencil,
  Trash2,
  ArrowLeft,
  MapPin,
  Building2,
  AlertTriangle,
  Plus,
  Layers,
  DoorOpen,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: property, isLoading, error } = useProperty(id);
  const { data: floors = [] } = useBuildingFloors(id);
  const { data: media = [] } = useMediaByBuilding(id);
  const createFloor = useCreateFloor();
  const createUnit = useCreateUnit();
  const deleteFloor = useDeleteFloor();
  const deleteUnit = useDeleteUnit();

  const [addFloorOpen, setAddFloorOpen] = useState(false);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [floorForm, setFloorForm] = useState({ floorName: "", floorNumber: "" });
  const [unitForm, setUnitForm] = useState({ unitNumber: "", carpetArea: "", builtUpArea: "", monthlyRent: "" });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="table" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <EmptyState
        title="Property not found"
        description="The property you're looking for doesn't exist or has been removed."
        action={
          <Link href="/properties">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Properties
            </Button>
          </Link>
        }
      />
    );
  }

  const deleteProperty = useDeleteProperty();

  async function handleDelete() {
    try {
      await deleteProperty.mutateAsync(id);
      toast.success("Property deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["buildings"] });
      router.push("/properties");
    } catch (error) {
      toast.error("Failed to delete property");
    }
  }

  async function handleCreateFloor() {
    if (!floorForm.floorName || !floorForm.floorNumber) {
      toast.error("Floor name and number are required");
      return;
    }
    try {
      await createFloor.mutateAsync({
        buildingId: id,
        data: { floorName: floorForm.floorName, floorNumber: parseInt(floorForm.floorNumber) },
      });
      toast.success("Floor added successfully");
      queryClient.invalidateQueries({ queryKey: ["buildingFloors", id] });
      setAddFloorOpen(false);
      setFloorForm({ floorName: "", floorNumber: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add floor");
    }
  }

  async function handleCreateUnit(floorId: string) {
    if (!unitForm.unitNumber) {
      toast.error("Unit number is required");
      return;
    }
    try {
      await createUnit.mutateAsync({
        unitNumber: unitForm.unitNumber,
        buildingId: id,
        floorId,
        carpetArea: unitForm.carpetArea ? parseFloat(unitForm.carpetArea) : undefined,
        builtUpArea: unitForm.builtUpArea ? parseFloat(unitForm.builtUpArea) : undefined,
        monthlyRent: unitForm.monthlyRent ? parseFloat(unitForm.monthlyRent) : undefined,
      });
      toast.success("Unit added successfully");
      queryClient.invalidateQueries({ queryKey: ["buildingFloors", id] });
      setAddUnitOpen(false);
      setSelectedFloorId(null);
      setUnitForm({ unitNumber: "", carpetArea: "", builtUpArea: "", monthlyRent: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add unit");
    }
  }

  async function handleDeleteFloor(floorId: string) {
    try {
      await deleteFloor.mutateAsync({ buildingId: id, floorId });
      toast.success("Floor deleted");
      queryClient.invalidateQueries({ queryKey: ["buildingFloors", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete floor");
    }
  }

  async function handleDeleteUnit(unitId: string) {
    try {
      await deleteUnit.mutateAsync(unitId);
      toast.success("Unit deleted");
      queryClient.invalidateQueries({ queryKey: ["buildingFloors", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete unit");
    }
  }

  const monthlyRent = property.availableArea * property.rentPerSqFt;
  const totalMonthlyCharges =
    monthlyRent +
    property.availableArea * property.camCharges +
    property.availableArea * property.maintenanceCharges;

  return (
    <div className="space-y-6">
      <PageHeader
        title={property.buildingName}
        description={`${property.propertyId} · ${property.address}`}
      >
        <Link href="/properties">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <Link href={`/properties/${property.id}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Property</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {property.buildingName}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>

      {/* Status Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge type="availability" value={property.availabilityStatus} />
        <StatusBadge type="verification" value={property.verificationStatus} />
        {property.duplicateWarning && (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Duplicate of {property.duplicateOfId}</span>
          </div>
        )}
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-xs">Type</span>
            </div>
            <p className="text-sm font-semibold">
              {PROPERTY_TYPE_LABELS[property.propertyType]}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-xs">Location</span>
            </div>
            <p className="text-sm font-semibold">
              {property.city}, {property.state}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-xs">Area</span>
            </div>
            <p className="text-sm font-semibold">
              {property.availableArea.toLocaleString()} / {property.totalArea.toLocaleString()} sqft
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-xs">Rent</span>
            </div>
            <p className="text-sm font-semibold">
              ₹{property.rentPerSqFt}/sqft
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InfoSection
          title="Location Details"
          fields={[
            { label: "Full Address", value: property.address, className: "col-span-2" },
            { label: "State", value: property.state },
            { label: "City", value: property.city },
            { label: "Locality", value: property.locality },
            { label: "Pincode", value: property.pincode },
            {
              label: "GPS Coordinates",
              value:
                property.latitude && property.longitude
                  ? `${property.latitude}, ${property.longitude}`
                  : null,
            },
            {
              label: "Maps URL",
              value: property.mapsUrl ? (
                <a
                  href={property.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Open in Google Maps
                </a>
              ) : null,
            },
          ]}
        />

        <InfoSection
          title="Commercial Terms"
          fields={[
            { label: "Total Area", value: `${property.totalArea.toLocaleString()} sqft` },
            { label: "Available Area", value: `${property.availableArea.toLocaleString()} sqft` },
            { label: "Rent per sqft", value: `₹${property.rentPerSqFt}` },
            { label: "CAM Charges", value: `₹${property.camCharges}/sqft` },
            { label: "Maintenance Charges", value: `₹${property.maintenanceCharges}/sqft` },
            { label: "Security Deposit", value: `₹${property.securityDeposit.toLocaleString()}` },
            { label: "Lease Terms", value: property.leaseTerms },
            { label: "Escalation", value: property.escalationDetails },
            { label: "Brokerage", value: property.brokerage },
            {
              label: "Est. Monthly Rent",
              value: `₹${monthlyRent.toLocaleString()}`,
              className: "col-span-2",
            },
            {
              label: "Est. Total Monthly Cost",
              value: `₹${totalMonthlyCharges.toLocaleString()}`,
              className: "col-span-2",
            },
          ]}
        />

        <InfoSection
          title="Availability & Status"
          fields={[
            {
              label: "Availability Status",
              value: AVAILABILITY_LABELS[property.availabilityStatus],
            },
            {
              label: "Furnishing Status",
              value: FURNISHING_LABELS[property.furnishingStatus],
            },
            { label: "Entry Type", value: property.entryType.charAt(0).toUpperCase() + property.entryType.slice(1) },
            { label: "Source", value: property.source ? property.source.charAt(0).toUpperCase() + property.source.slice(1) : null },
            {
              label: "Availability Date",
              value: property.availabilityDate
                ? new Date(property.availabilityDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : null,
            },
            {
              label: "Possession Date",
              value: property.possessionDate
                ? new Date(property.possessionDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : null,
            },
          ]}
        />

        <InfoSection
          title="Record Info"
          fields={[
            { label: "Property ID", value: property.propertyId },
            {
              label: "Created At",
              value: new Date(property.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
            {
              label: "Last Updated",
              value: new Date(property.updatedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
            { label: "Created By", value: property.createdBy },
            { label: "Assigned Worker", value: property.assignedWorkerId },
          ]}
        />
      </div>

      {/* Floors & Units */}
      {property.entryType === "building" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Floors & Units
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setAddFloorOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Floor
            </Button>
          </CardHeader>
          <CardContent>
            {floors.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No floors added yet. Add floors to organize units within this building.
              </p>
            ) : (
              <div className="space-y-3">
                {floors
                  .sort((a, b) => a.floorNumber - b.floorNumber)
                  .map((floor) => (
                    <div key={floor.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-sm font-medium">
                            {floor.floorNumber}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{floor.floorName}</p>
                            <p className="text-xs text-muted-foreground">
                              {floor.units?.length || 0} units
                              {floor.totalArea ? ` · ${floor.totalArea.toLocaleString()} sqft` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedFloorId(floor.id);
                              setAddUnitOpen(true);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Floor</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete &quot;{floor.floorName}&quot;? All units on this floor will also be removed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteFloor(floor.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {floor.units && floor.units.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                          {floor.units?.map((unit) => (
                            <div
                              key={unit.id}
                              className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <DoorOpen className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{unit.unitNumber}</span>
                                {unit.carpetArea && (
                                  <span className="text-xs text-muted-foreground">
                                    {unit.carpetArea} sqft
                                  </span>
                                )}
                                {unit.monthlyRent && (
                                  <span className="text-xs text-muted-foreground">
                                    ₹{unit.monthlyRent.toLocaleString()}/mo
                                  </span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteUnit(unit.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {property.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {property.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contacts */}
      <ContactCard contacts={property.contacts || []} />

      {/* Media */}
      <MediaGallery
        media={media}
        canDelete={true}
        onDeleteComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["media", { buildingId: id }] });
        }}
      />

      {/* Add Floor Dialog */}
      <Dialog open={addFloorOpen} onOpenChange={setAddFloorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Floor</DialogTitle>
            <DialogDescription>Add a new floor to {property.buildingName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="floor-name">Floor Name *</Label>
              <Input
                id="floor-name"
                placeholder="e.g. Ground Floor, First Floor"
                value={floorForm.floorName}
                onChange={(e) => setFloorForm((p) => ({ ...p, floorName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor-number">Floor Number *</Label>
              <Input
                id="floor-number"
                type="number"
                placeholder="e.g. 0, 1, 2"
                value={floorForm.floorNumber}
                onChange={(e) => setFloorForm((p) => ({ ...p, floorNumber: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFloorOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFloor}>Add Floor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Unit Dialog */}
      <Dialog open={addUnitOpen} onOpenChange={setAddUnitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Unit</DialogTitle>
            <DialogDescription>Add a new unit to this floor</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit-number">Unit Number *</Label>
              <Input
                id="unit-number"
                placeholder="e.g. 101, A, B"
                value={unitForm.unitNumber}
                onChange={(e) => setUnitForm((p) => ({ ...p, unitNumber: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="carpet-area">Carpet Area (sqft)</Label>
                <Input
                  id="carpet-area"
                  type="number"
                  placeholder="0"
                  value={unitForm.carpetArea}
                  onChange={(e) => setUnitForm((p) => ({ ...p, carpetArea: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="built-up-area">Built-up Area (sqft)</Label>
                <Input
                  id="built-up-area"
                  type="number"
                  placeholder="0"
                  value={unitForm.builtUpArea}
                  onChange={(e) => setUnitForm((p) => ({ ...p, builtUpArea: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-rent">Monthly Rent (₹)</Label>
              <Input
                id="monthly-rent"
                type="number"
                placeholder="0"
                value={unitForm.monthlyRent}
                onChange={(e) => setUnitForm((p) => ({ ...p, monthlyRent: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddUnitOpen(false); setSelectedFloorId(null); }}>Cancel</Button>
            <Button onClick={() => selectedFloorId && handleCreateUnit(selectedFloorId)}>Add Unit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
