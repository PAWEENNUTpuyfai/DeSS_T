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
import type { StationDetail } from "../models/Network";

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
  hidden?: boolean;
};

L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface ScenarioMapProps {
  stations: StationDetail[];
  allStations?: StationDetail[]; // All stations for bounds calculation (prevent zoom when filtering)
  route: EditableRoute | null;
  allRoutes?: EditableRoute[]; // For Route mode - show all non-hidden routes
  onSelectStation: (stationId: string) => void;
  onResetRoute: () => void;
  isEditingMode?: boolean; // True when editing a route
}

function stationToLatLng(s: StationDetail): [number, number] {
  const rec = s as unknown as Record<string, unknown>;

  const toNum = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };

  // Prefer explicit lat/lon if present (handle string or number)
  const latFromFields = toNum(rec.lat);
  const lonFromFields = toNum(rec.lon);
  if (latFromFields !== undefined && lonFromFields !== undefined) {
    return [latFromFields, lonFromFields];
  }

  // Fallback to GeoJSON location.coordinates [lon, lat]
  const locationLower = rec.location as unknown;
  const locationUpper = rec.Location as unknown;
  const coordinates = (
    (locationLower as Record<string, unknown> | undefined)?.coordinates ||
    (locationUpper as Record<string, unknown> | undefined)?.coordinates
  ) as unknown;
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const lon = toNum(coordinates[0]);
    const lat = toNum(coordinates[1]);
    if (lat !== undefined && lon !== undefined) {
      return [lat, lon];
    }
  }

  // Last resort: Bangkok center to avoid crashing
  return [13.75, 100.5];
}

function stationDisplayName(s: StationDetail): string {
  const rec = s as unknown as Record<string, unknown>;
  const name =
    (rec.name as string | undefined) ||
    (rec.station_name as string | undefined) ||
    (rec.StationName as string | undefined) ||
    (rec.name_th as string | undefined);
  return (
    name ??
    "Unnamed station"
  );
}

function stationIdFor(s: StationDetail): string {
  const rec = s as unknown as Record<string, unknown>;
  const id =
    (rec.station_detail_id as string | undefined) ||
    (rec.StationID as string | undefined) ||
    (rec.station_id_osm as string | undefined);
  if (id && id.trim().length > 0) return id;
  const [lat, lon] = stationToLatLng(s);
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function BoundsUpdater({
  bounds,
}: {
  bounds?: [[number, number], [number, number]];
}) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);
  return null;
}

export default function ScenarioMap({
  stations,
  allStations,
  route,
  allRoutes,
  onSelectStation,
  onResetRoute,
  isEditingMode = false,
}: ScenarioMapProps) {
  const [center, setCenter] = useState<[number, number]>([13.75, 100.5]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Use allStations for bounds calculation to prevent zoom when filtering
  // If not provided, fall back to stations
  const stationsForBounds = allStations || stations;
  
  const bounds = useMemo(() => {
    if (!stationsForBounds || stationsForBounds.length === 0) return undefined;
    let minLat = Infinity,
      minLon = Infinity,
      maxLat = -Infinity,
      maxLon = -Infinity;
    stationsForBounds.forEach((s) => {
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
  }, [stationsForBounds]);

  useEffect(() => {
    if (bounds) {
      const [[minLat, minLon], [maxLat, maxLon]] = bounds;
      setCenter([(minLat + maxLat) / 2, (minLon + maxLon) / 2]);
    }
  }, [bounds]);

  return (
    <div className="w-full h-full relative">
      <div className="absolute right-3 top-3 z-[1000] flex gap-2">
        {route && isEditingMode && (
          <button
            className="px-4 py-1 rounded-[15px] bg-white border text-sm text-red-600 shadow hover:bg-red-600 hover:border-red-700 hover:text-white flex items-center gap-2"
            onClick={() => setShowConfirmModal(true)}
            disabled={!route || route.stations.length === 0}
          >
            <svg
              width="14"
              height="20"
              viewBox="0 0 18 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 14.4665V8.67989C10 8.4241 10.1054 8.1788 10.2929 7.99793C10.4804 7.81706 10.7348 7.71545 11 7.71545C11.2652 7.71545 11.5196 7.81706 11.7071 7.99793C11.8946 8.1788 12 8.4241 12 8.67989V14.4665C12 14.7223 11.8946 14.9676 11.7071 15.1484C11.5196 15.3293 11.2652 15.4309 11 15.4309C10.7348 15.4309 10.4804 15.3293 10.2929 15.1484C10.1054 14.9676 10 14.7223 10 14.4665ZM7 15.4309C7.26522 15.4309 7.51957 15.3293 7.70711 15.1484C7.89464 14.9676 8 14.7223 8 14.4665V8.67989C8 8.4241 7.89464 8.1788 7.70711 7.99793C7.51957 7.81706 7.26522 7.71545 7 7.71545C6.73478 7.71545 6.48043 7.81706 6.29289 7.99793C6.10536 8.1788 6 8.4241 6 8.67989V14.4665C6 14.7223 6.10536 14.9676 6.29289 15.1484C6.48043 15.3293 6.73478 15.4309 7 15.4309ZM18 4.82216C18 5.07794 17.8946 5.32325 17.7071 5.50412C17.5196 5.68498 17.2652 5.78659 17 5.78659H16V16.3375C16 17.1048 15.6839 17.8407 15.1213 18.3833C14.5587 18.9259 13.7956 19.2308 13 19.2308H5C4.20435 19.2308 3.44129 18.9259 2.87868 18.3833C2.31607 17.8407 2 17.1048 2 16.3375V5.78659H1C0.734784 5.78659 0.48043 5.68498 0.292893 5.50412C0.105357 5.32325 0 5.07794 0 4.82216C0 4.56638 0.105357 4.32107 0.292893 4.1402C0.48043 3.95934 0.734784 3.85773 1 3.85773H5V2.8933C5 2.12595 5.31607 1.39002 5.87868 0.847427C6.44129 0.304829 7.20435 0 8 0H10C10.7956 0 11.5587 0.304829 12.1213 0.847427C12.6839 1.39002 13 2.12595 13 2.8933V3.85773H17C17.2652 3.85773 17.5196 3.95934 17.7071 4.1402C17.8946 4.32107 18 4.56638 18 4.82216ZM7 3.85773H11V2.8933C11 2.63751 10.8946 2.39221 10.7071 2.21134C10.5196 2.03047 10.2652 1.92886 10 1.92886H8C7.73478 1.92886 7.48043 2.03047 7.29289 2.21134C7.10536 2.39221 7 2.63751 7 2.8933V3.85773ZM14 5.78659H4V16.3375C4 16.5933 4.10536 16.8386 4.29289 17.0194C4.48043 17.2003 4.73478 17.3019 5 17.3019H13C13.2652 17.3019 13.5196 17.2003 13.7071 17.0194C13.8946 16.8386 14 16.5933 14 16.3375V5.78659Z"
                fill="currentColor"
              />
            </svg>
            Clear path
          </button>
        )}
        {route && isEditingMode && (
          <div className="px-5 py-1 rounded-[15px] bg-white text-sm border shadow flex items-center gap-2">
            <span className="">Editing : </span>
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ background: route.color }}
            />
            <span style={{ color: route.color }}>{route.name}</span>
          </div>
        )}
      </div>
      {showConfirmModal && (
        <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-[20px] shadow-lg max-w-md w-full p-6 space-y-4 flex justify-center flex-col">
            <div className="text-lg text-gray-800 mx-10 text-center">
              Are you sure you want to clear all selected stations?
            </div>
            <div className="text-sm text-gray-600 text-center">
              This deletion cannot be undone once performed.
            </div>
            <div className="flex justify-center gap-4 pt-2">
              <button
                className="border-2 border-gray-500 bg-white px-8 py-2 rounded-[20px] text-sm text-gray-700 hover:bg-gray-100 hover:border-gray-700"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-8 py-2 rounded-[20px] text-sm bg-red-500 text-white hover:bg-red-600 hover:border-red-700"
                onClick={() => {
                  onResetRoute();
                  setShowConfirmModal(false);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        doubleClickZoom={false}
        keyboard={false}
      >
        {/* <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        /> */}

        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Stations */}
        {stations.map((st, idx) => (
          <CircleMarker
            key={`station-${stationIdFor(st)}-${idx}`}
            center={stationToLatLng(st)}
            radius={6}
            weight={2}
            color={"#eeb34b"}
            fillColor="#fff"
            fillOpacity={0.9}
            eventHandlers={{
              click: () => {
                // In editing mode: only prevent clicking if it's the last station (consecutive duplicate)
                // Otherwise allow re-selection at different positions
                const stId = stationIdFor(st);
                const isLastStation = route?.stations[route.stations.length - 1] === stId;
                
                if (!isEditingMode || !isLastStation) {
                  onSelectStation(stId);
                }
              },
            }}
          >
            <Popup>{stationDisplayName(st)}</Popup>
          </CircleMarker>
        ))}

        {/* Route segments */}
        {!route?.hidden &&
          route?.segments.map((seg, idx) => (
            <Polyline
              key={`route-${route.id}-${seg.from}-${seg.to}-${idx}`}
              positions={seg.coords.map(([lon, lat]) => [lat, lon])}
              pathOptions={{
                color: route.color,
                weight: 4,
                opacity: 0.85,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          ))}

        {/* Editing mode: Show dashed lines between consecutive stations */}
        {isEditingMode && route && route.stations.length > 1 && (
          <>
            {route.stations.map((stationId, idx) => {
              if (idx >= route.stations.length - 1) return null;

              const currentStation = stations.find(
                (s) => s.station_detail_id === stationId
              );
              const nextStation = stations.find(
                (s) => s.station_detail_id === route.stations[idx + 1]
              );

              if (!currentStation || !nextStation) return null;

              const currentCoords = stationToLatLng(currentStation);
              const nextCoords = stationToLatLng(nextStation);

              return (
                <Polyline
                  key={`editing-line-${idx}`}
                  positions={[currentCoords, nextCoords]}
                  pathOptions={{
                    color: route.color,
                    weight: 2,
                    opacity: 0.5,
                    dashArray: "5, 5",
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              );
            })}
          </>
        )}

        {/* All routes (for Bus mode) */}
        {allRoutes
          ?.filter((r) => !r.hidden)
          .flatMap((r) =>
            r.segments.map((seg, idx) => (
              <Polyline
                key={`${r.id}-${seg.from}-${seg.to}-${idx}`}
                positions={seg.coords.map(([lon, lat]) => [lat, lon])}
                pathOptions={{
                  color: r.color,
                  weight: 4,
                  opacity: 0.85,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            ))
          )}

        <BoundsUpdater bounds={bounds} />
      </MapContainer>
    </div>
  );
}
