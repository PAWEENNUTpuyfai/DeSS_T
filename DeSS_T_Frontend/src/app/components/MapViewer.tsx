import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import type { LatLng, StationDetail, GeoPoint } from "../models/Network";

L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewerProps {
  minLat?: number;
  maxLat?: number;
  minLon?: number;
  maxLon?: number;
  areaCode?: string;
  stationDetails?: StationDetail[]; // NEW ✔
}

export default function MapViewer({
  minLat,
  maxLat,
  minLon,
  maxLon,
  areaCode,
  stationDetails,
}: MapViewerProps) {
  const [center, setCenter] = useState<LatLng>([13.75, 100.5]);
  const [bounds, setBounds] = useState<
    [[number, number], [number, number]] | undefined
  >();
  const [areaPolygons, setAreaPolygons] = useState<
    [number, number][][] | undefined
  >();

  // Convert GeoPoint → LatLng (Leaflet format)
  const geoPointToLatLng = (g: GeoPoint): LatLng => {
    const [lon, lat] = g.coordinates; // GeoJSON = [lon, lat]
    return [lat, lon]; // Leaflet = [lat, lon]
  };

  // Safe station to LatLng conversion with fallback
  const stationToLatLng = (s: StationDetail): LatLng => {
    if (s.lat && s.lon) {
      return [s.lat, s.lon];
    }
    return [13.75, 100.5];
  };

  // If manual bounds provided
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

  // Auto calculate bounds from stationDetails
  useEffect(() => {
    if (!stationDetails || stationDetails.length === 0) return;

    let minLat = Infinity,
      minLon = Infinity,
      maxLat = -Infinity,
      maxLon = -Infinity;

    for (const st of stationDetails) {
      const [lat, lon] = stationToLatLng(st);
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }

    setBounds([
      [minLat, minLon],
      [maxLat, maxLon],
    ]);

    setCenter([(minLat + maxLat) / 2, (minLon + maxLon) / 2]);
  }, [stationDetails]);

  // Load area polygons
  useEffect(() => {
    if (!areaCode) return;

    (async () => {
      try {
        const mapApi = await import("../../utility/api/mapApi");
        const polys = await mapApi.fetchAreaGeometry(areaCode);
        if (!polys || polys.length === 0) return;

        setAreaPolygons(polys);

        let minLat = Infinity,
          minLon = Infinity,
          maxLat = -Infinity,
          maxLon = -Infinity;
        for (const poly of polys) {
          for (const [lat, lon] of poly) {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
          }
        }

        setBounds([
          [minLat, minLon],
          [maxLat, maxLon],
        ]);
        setCenter([(minLat + maxLat) / 2, (minLon + maxLon) / 2]);
      } catch (err) {
        console.error("fetchAreaGeometry failed:", err);
      }
    })();
  }, [areaCode]);

  function UpdateMapView({
    boundsProp,
  }: {
    boundsProp?: [[number, number], [number, number]];
  }) {
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
        style={{ width: "100%", height: "100%" }}
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
        {stationDetails?.map((st) => (
          <CircleMarker
            key={st.station_detail_id}
            center={stationToLatLng(st)}
            radius={5}
            color="#eeb34b"
            fillColor="#ffffffff"
            fillOpacity={0.9}
          >
            <Popup>{st.name || st.station_detail_id}</Popup>
          </CircleMarker>
        ))}

        <UpdateMapView boundsProp={bounds} />
      </MapContainer>
    </>
  );
}
