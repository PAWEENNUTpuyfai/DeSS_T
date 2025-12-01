import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Popup, CircleMarker, useMap , Rectangle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type LatLng = [number, number];
type BusStop = { id: number; position: LatLng; name?: string };

interface MapViewerProps {
  minLat?: number;
  maxLat?: number;
  minLon?: number;
  maxLon?: number;
  areaName?: string;
}

export default function MapViewer({
  minLat,
  maxLat,
  minLon,
  maxLon,
  areaCode,
}: MapViewerProps) {
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [center, setCenter] = useState<LatLng>([13.75, 100.5]);
  const [bounds, setBounds] =
    useState<[[number, number], [number, number]] | undefined>();

  // คำนวณ bounds ใหม่
  useEffect(() => {
    if (
      minLat !== undefined &&
      maxLat !== undefined &&
      minLon !== undefined &&
      maxLon !== undefined
    ) {
      setBounds([
        [minLat, minLon],
        [maxLat, maxLon],
      ]);
      setCenter([(minLat + maxLat) / 2, (minLon + maxLon) / 2]);
    }
  }, [minLat, maxLat, minLon, maxLon]);

  // โหลดป้ายรถเมล์จาก Overpass (ใช้ bounds)
  useEffect(() => {
    if (!bounds) return;

    const [sw, ne] = bounds;

    const query = `
      [out:json][timeout:25];
      node["highway"="bus_stop"]
      (${sw[0]},${sw[1]},${ne[0]},${ne[1]});
      out body;
    `;

    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    })
      .then((r) => r.json())
      .then((data) => {
        const stops = data.elements.map((n: any) => ({
          id: n.id,
          position: [n.lat, n.lon] as LatLng,
          name: n.tags?.name,
        }));
        setBusStops(stops);
      });
  }, [bounds]);

  function UpdateMapView() {
    const map = useMap();
    useEffect(() => {
      if (bounds) map.fitBounds(bounds);
    }, [bounds]);
    return null;
  }

  return (
<MapContainer
  center={center}
  zoom={13}
  style={{ width: "100%", height: "600px" }}
  dragging={false}
  scrollWheelZoom={false}
  doubleClickZoom={false}
  zoomControl={false}
  keyboard={false}
  touchZoom={false}
  boxZoom={false}
  inertia={false}
>
  <TileLayer
    attribution="© OpenStreetMap contributors"
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />

{bounds && (
  <Rectangle
    bounds={bounds}
    pathOptions={{
      color: "red",
      weight: 2,
      fill: false,
    }}
  />
)}

  {busStops.map((stop) => (
    <CircleMarker
      key={stop.id}
      center={stop.position}
      radius={6}
      color="#eeb34b"
      fillColor="#eeb34b"
      fillOpacity={1}
    >
      <Popup>{stop.name ?? `ID:${stop.id}`}</Popup>
    </CircleMarker>
  ))}

  <UpdateMapView />
</MapContainer>

  );
}
