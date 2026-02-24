import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { LatLng, StationDetail } from "../models/Network";

L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface ConfigurationDetailMapProps {
  stations: StationDetail[];
  onStationClick?: (stationId: string) => void;
  selectedStationIds?: [string | null, string | null];
}

export default function ConfigurationDetailMap({
  stations,
  onStationClick,
  selectedStationIds = [null, null],
}: ConfigurationDetailMapProps) {
  const initialCenter = useRef<LatLng>([13.75, 100.5]);
  const initialZoom = useRef(12);
  const [bounds, setBounds] = useState<
    [[number, number], [number, number]] | undefined
  >();
  const boundsCalculated = useRef(false);

  // Safe station to LatLng conversion with fallback
  const stationToLatLng = (s: StationDetail): LatLng => {
    if (s.lat !== undefined && s.lon !== undefined) {
      return [s.lat, s.lon];
    }
    return [13.75, 100.5];
  };

  // Auto calculate bounds from stations (only once on initial load)
  useEffect(() => {
    if (!stations || stations.length === 0 || boundsCalculated.current) return;

    let minLat = Infinity,
      minLon = Infinity,
      maxLat = -Infinity,
      maxLon = -Infinity;

    for (const st of stations) {
      const [lat, lon] = stationToLatLng(st);
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }

    // Add some padding
    const latPadding = (maxLat - minLat) * 0.25;
    const lonPadding = (maxLon - minLon) * 0.25;

    const calculatedBounds: [[number, number], [number, number]] = [
      [minLat - latPadding, minLon - lonPadding],
      [maxLat + latPadding, maxLon + lonPadding],
    ];

    setBounds(calculatedBounds);
    
    initialCenter.current = [(minLat + maxLat) / 2, (minLon + maxLon) / 2];
    boundsCalculated.current = true;
  }, [stations]);

  function UpdateMapView({
    boundsProp,
  }: {
    boundsProp?: [[number, number], [number, number]];
  }) {
    const map = useMap();
    const boundsApplied = useRef(false);
    
    useEffect(() => {
      if (!boundsProp || boundsApplied.current) return;
      map.fitBounds(boundsProp);
      boundsApplied.current = true;
    }, [map, boundsProp]);
    return null;
  }

  function AutoResize() {
    const map = useMap();

    useEffect(() => {
      const container = map.getContainer();

      if (typeof ResizeObserver === "undefined" || !container) {
        return undefined;
      }

      const observer = new ResizeObserver(() => {
        window.setTimeout(() => {
          map.invalidateSize({ pan: false });
        }, 0);
      });

      observer.observe(container);
      return () => observer.disconnect();
    }, [map]);

    return null;
  }

  const handleStationClick = (stationId: string) => {
    if (onStationClick) {
      onStationClick(stationId);
    }
  };

  return (
    <MapContainer
      center={initialCenter.current}
      zoom={initialZoom.current}
      style={{ width: "100%", height: "100%" }}
      dragging={true}
      doubleClickZoom={false}
      keyboard={false}
      touchZoom={false}
      boxZoom={false}
      inertia={false}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Render stations */}
      {stations.map((st) => {
        const stationId = st.station_detail_id || st.station_id_osm || "";
        const isSelected = selectedStationIds.includes(stationId);

        return (
          <CircleMarker
            key={stationId}
            center={stationToLatLng(st)}
            radius={5}
            color="#eeb34b"
            fillColor="#ffffff"
            fillOpacity={0.9}
            weight={2}
            eventHandlers={{
              click: () => handleStationClick(stationId),
            }}
          >
            {isSelected && (
              <Tooltip 
                permanent 
                direction="top" 
                offset={[0, -10]}
                autoPan={false}
              >
                <strong>{st.name || stationId}</strong>
              </Tooltip>
            )}
          </CircleMarker>
        );
      })}

      <UpdateMapView boundsProp={bounds} />
      <AutoResize />
    </MapContainer>
  );
}
