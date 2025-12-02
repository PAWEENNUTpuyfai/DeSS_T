import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Popup,
  CircleMarker,
  useMap,
  Rectangle,
  Polygon,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import type { LatLng, BusStop } from "../models/Network";
import type { OverpassNode } from "../../utility/api/mapApi";
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewerProps {
  minLat?: number;
  maxLat?: number;
  minLon?: number;
  maxLon?: number;
  areaCode?: string;
  areaName?: string;
}

export default function MapViewer({
  minLat,
  maxLat,
  minLon,
  maxLon,
  areaCode: propsAreaCode,
}: MapViewerProps) {
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [center, setCenter] = useState<LatLng>([13.75, 100.5]);
  const [bounds, setBounds] =
    useState<[[number, number], [number, number]] | undefined>();
  const [areaPolygons, setAreaPolygons] = useState<[number, number][][] | undefined>(undefined);

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

  useEffect(() => {
    if (!bounds) return;

    (async () => {
      try {
        const mapApi = await import("../../utility/api/mapApi");
        const nodes = await mapApi.fetchBusStops(bounds as [[number, number], [number, number]]);

        const stops: BusStop[] = (nodes as OverpassNode[]).map((n) => ({
          id: n.id,
          position: [n.lat, n.lon] as LatLng,
          name: n.tags?.name,
        }));

        setBusStops(stops);
      } catch (err) {
        console.error("fetchBusStops failed:", err);
      }
    })();
  }, [bounds]);

  useEffect(() => {
    if (!propsAreaCode) return;

    (async () => {
      try {
        const mapApi = await import("../../utility/api/mapApi");
        const polys = await mapApi.fetchAreaGeometry(propsAreaCode);
        if (!polys || polys.length === 0) return;

        setAreaPolygons(polys);

        let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity;
        for (const poly of polys) {
          for (const [lat, lon] of poly) {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
          }
        }

        setBounds([[minLat, minLon], [maxLat, maxLon]]);
        setCenter([(minLat + maxLat) / 2, (minLon + maxLon) / 2]);
      } catch (err) {
        console.error("fetchAreaGeometry failed:", err);
      }
    })();
  }, [propsAreaCode]);

  function UpdateMapView({ boundsProp }: { boundsProp?: [[number, number], [number, number]] }) {
    const map = useMap();
    useEffect(() => {
      if (!boundsProp) return;
      map.fitBounds(boundsProp);
    }, [map, boundsProp]);
    return null;
  }

  return (
    <>
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: "100%", height: "600px" }}
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

        {areaPolygons && areaPolygons.length > 0 ? (
          areaPolygons.map((poly, idx) => (
            <Polygon
              key={idx}
              positions={poly as LatLng[]}
              pathOptions={{ color: "red", weight: 2, fill: false }}
            />
          ))
        ) : (
          bounds && (
            <Rectangle
              bounds={bounds}
              pathOptions={{
                color: "red",
                weight: 2,
                fill: false,
              }}
            />
          )
        )}

        {busStops.map((stop) => (
          <CircleMarker
            key={stop.id}
            center={stop.position}
            radius={5}
            color="#eeb34b"
            fillColor="#eeb34b"
            fillOpacity={0.8}
            weight={1}
          >
            <Popup>{stop.name ?? `ID:${stop.id}`}</Popup>
          </CircleMarker>
        ))}

        <UpdateMapView boundsProp={bounds} />
      </MapContainer>
    </>
  );
}
