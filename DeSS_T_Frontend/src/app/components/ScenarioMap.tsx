import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { StationDetail, GeoPoint } from "../models/Network";

export type RouteSegment = {
  from: string;
  to: string;
  coords: [number, number][];
};

export type EditableRoute = {
  id: string;
  name: string;
  color: string;
  stations: string[];
  segments: RouteSegment[];
  locked?: boolean;
};

L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface ScenarioMapProps {
  stations: StationDetail[];
  route: EditableRoute | null;
  onSelectStation: (stationId: string) => void;
  onResetRoute: () => void;
}

function geoPointToLatLng(g: GeoPoint): [number, number] {
  const [lon, lat] = g.coordinates; // GeoJSON [lon, lat]
  return [lat, lon];
}

function stationToLatLng(s: StationDetail): [number, number] {
  // Try Location (with capital L) first
  if (s.Location && s.Location.coordinates) {
    const [lon, lat] = s.Location.coordinates;
    return [lat, lon];
  }
  // Try lowercase location as fallback
  if (s.location && s.location.coordinates) {
    const [lon, lat] = s.location.coordinates;
    return [lat, lon];
  }
  if (s.Lat && s.Lon) {
    return [parseFloat(s.Lat), parseFloat(s.Lon)];
  }
  // Fallback to Bangkok center if no coordinates
  return [13.75, 100.5];
}

function BoundsUpdater({ bounds }: { bounds?: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);
  return null;
}

export default function ScenarioMap({
  stations,
  route,
  onSelectStation,
  onResetRoute,
}: ScenarioMapProps) {
  const [center, setCenter] = useState<[number, number]>([13.75, 100.5]);
  const bounds = useMemo(() => {
    if (!stations || stations.length === 0) return undefined;
    let minLat = Infinity,
      minLon = Infinity,
      maxLat = -Infinity,
      maxLon = -Infinity;
    stations.forEach((s) => {
      const [lat, lon] = stationToLatLng(s);
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    });
    return [
      [minLat, minLon],
      [maxLat, maxLon],
    ] as [[number, number], [number, number]];
  }, [stations]);

  useEffect(() => {
    if (bounds) {
      const [[minLat, minLon], [maxLat, maxLon]] = bounds;
      setCenter([(minLat + maxLat) / 2, (minLon + maxLon) / 2]);
    }
  }, [bounds]);

  return (
    <div className="w-full h-full relative">
      <div className="absolute right-3 top-3 z-[1000] flex gap-2">
        <button
          className="px-3 py-1 rounded bg-white border text-sm shadow"
          onClick={onResetRoute}
          disabled={!route || route.stations.length === 0}
        >
          Clear path
        </button>
        {route && (
          <div className="px-3 py-1 rounded bg-white border text-sm shadow flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ background: route.color }}
            />
            <span className="font-semibold">{route.name}</span>
          </div>
        )}
      </div>
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        doubleClickZoom={false}
        keyboard={false}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Stations */}
        {stations.map((st) => (
          <CircleMarker
            key={st.StationID}
            center={stationToLatLng(st)}
            radius={6}
            color={route?.stations.includes(st.StationID) ? route?.color : "#eeb34b"}
            fillColor="#fff"
            fillOpacity={0.9}
            eventHandlers={{
              click: () => onSelectStation(st.StationID),
            }}
          >
            <Popup>{st.StationName || st.StationID}</Popup>
          </CircleMarker>
        ))}

        {/* Route segments */}
        {route?.segments.map((seg, idx) => (
          <Polyline
            key={`${seg.from}-${seg.to}-${idx}`}
            positions={seg.coords.map(([lon, lat]) => [lat, lon])}
            pathOptions={{
              color: route.color,
              weight: 4,
              opacity: 0.85,
              dashArray: undefined,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        ))}

        <BoundsUpdater bounds={bounds} />
      </MapContainer>
    </div>
  );
}
