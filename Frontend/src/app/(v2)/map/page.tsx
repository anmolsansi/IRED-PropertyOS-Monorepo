"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import "leaflet/dist/leaflet.css";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Maximize2,
  IndianRupee,
  Navigation,
  Search,
  X,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { AVAILABILITY_COLORS } from "@/lib/constants";
import { api } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";

interface MapProperty {
  id: string;
  name: string;
  buildingCode: string;
  city: { name: string } | null;
  locality: { name: string } | null;
  propertyType: { name: string } | null;
  latitude: number;
  longitude: number;
  availabilityStatus: { name: string } | null;
  totalBuildingArea: number | null;
  totalUnits: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  Available: "Available",
  Occupied: "Occupied",
  "Under Negotiation": "Under Negotiation",
  "On Hold": "On Hold",
};

function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

function LeafletMap({
  properties,
  selectedId,
  onSelect,
}: {
  properties: MapProperty[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  const [map, setMap] = useState<import("leaflet").Map | null>(null);

  useEffect(() => {
    import("leaflet").then((leaflet) => {
      setL(leaflet);
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    });
  }, []);

  const center = useMemo(() => {
    if (properties.length > 0) {
      const avgLat =
        properties.reduce((s, p) => s + p.latitude, 0) / properties.length;
      const avgLng =
        properties.reduce((s, p) => s + p.longitude, 0) / properties.length;
      return [avgLat, avgLng] as [number, number];
    }
    return [19.076, 72.8777] as [number, number];
  }, [properties]);

  useEffect(() => {
    if (!L || map) return;
    const m = L.map("property-map", { scrollWheelZoom: true }).setView(
      center,
      12,
    );
    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    ).addTo(m);
    setMap(m);
    return () => {
      m.remove();
      setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L]);

  useEffect(() => {
    if (!L || !map) return;
    map.setView(center, map.getZoom());
  }, [L, map, center]);

  useEffect(() => {
    if (!L || !map) return;
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    properties.forEach((p) => {
      const status = p.availabilityStatus?.name ?? "";
      const color =
        status === "Available"
          ? "#22c55e"
          : status === "Occupied"
            ? "#ef4444"
            : status === "Under Negotiation"
              ? "#eab308"
              : status === "On Hold"
                ? "#f97316"
                : "#6b7280";

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;cursor:pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([p.latitude, p.longitude], { icon })
        .addTo(map)
        .on("click", () => onSelect(p.id));

      marker.bindPopup(
        `<div style="font-size:13px"><b>${p.name}</b><br/>${p.locality?.name ?? ""}, ${p.city?.name ?? ""}</div>`,
      );
    });
  }, [L, map, properties, onSelect]);

  return (
    <div
      id="property-map"
      style={{ height: "100%", width: "100%", borderRadius: "0 0 0.5rem 0.5rem" }}
    />
  );
}

export default function MapPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: allProperties, isLoading } = useQuery({
    queryKey: ["map-properties"],
    queryFn: () => api.get<{ data: MapProperty[] }>("/map/properties"),
    select: (res) => (res.data ?? res) as unknown as MapProperty[],
  });

  const properties = allProperties ?? [];

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      if (
        search &&
        !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !(p.city?.name ?? "").toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (statusFilter !== "all" && p.availabilityStatus?.name !== statusFilter)
        return false;
      return true;
    });
  }, [properties, search, statusFilter]);

  const selected = properties.find((p) => p.id === selectedId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Map View"
        description="Explore properties on an interactive map."
      >
        <Button variant="outline" size="sm">
          <Navigation className="h-4 w-4 mr-2" />
          My Location
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or city..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Occupied">Occupied</SelectItem>
            <SelectItem value="Under Negotiation">Under Negotiation</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filtered.length} properties
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardContent className="h-full p-0 relative overflow-hidden">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ClientOnly>
                  <LeafletMap
                    properties={filtered}
                    selectedId={selectedId}
                    onSelect={(id) =>
                      setSelectedId(id === selectedId ? null : id)
                    }
                  />
                </ClientOnly>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {selected && (
            <Card className="border-primary/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold">{selected.name}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setSelectedId(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    {selected.locality?.name}, {selected.city?.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${AVAILABILITY_COLORS[selected.availabilityStatus?.name ?? ""] ?? ""}`}
                    >
                      {STATUS_LABELS[selected.availabilityStatus?.name ?? ""] ??
                        selected.availabilityStatus?.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {selected.propertyType?.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Area</p>
                      <p className="font-medium flex items-center gap-1">
                        <Maximize2 className="h-3 w-3" />
                        {(selected.totalBuildingArea ?? 0).toLocaleString()} sqft
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Units</p>
                      <p className="font-medium">
                        {selected.totalUnits ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
                    <span>
                      {selected.latitude.toFixed(4)},{" "}
                      {selected.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button size="sm" className="flex-1">
                    <a href={`/properties/${selected.id}`}>View Details</a>
                  </Button>
                  <Button size="sm" variant="outline">
                    <a
                      href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Maps
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <h3 className="text-sm font-semibold">
            Properties ({filtered.length})
          </h3>
          {filtered.map((p) => (
            <Card
              key={p.id}
              className={`cursor-pointer transition-all ${
                p.id === selectedId
                  ? "border-primary shadow-sm"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${AVAILABILITY_COLORS[p.availabilityStatus?.name ?? ""] ?? ""}`}
                  >
                    {STATUS_LABELS[p.availabilityStatus?.name ?? ""] ??
                      p.availabilityStatus?.name}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {p.locality?.name}, {p.city?.name}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Maximize2 className="h-3 w-3" />
                    {(p.totalBuildingArea ?? 0).toLocaleString()} sqft
                  </span>
                  <span className="flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" />
                    {p.totalUnits ?? 0} units
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
