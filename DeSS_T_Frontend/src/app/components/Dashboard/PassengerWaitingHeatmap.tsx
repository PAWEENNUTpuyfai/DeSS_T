import { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";
import type { SimulationResponse } from "../../models/SimulationModel";

interface StationInfo {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface HeatmapDataPoint {
  station_name: string;
  lat: number;
  lon: number;
  avg_waiting_time: number; // in minutes
  avg_queue_length: number;
}

// Component to add heatmap layer to the map
function HeatmapLayer({ data }: { data: HeatmapDataPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Get min/max for scaling
    const queueLengths = data.map((d) => d.avg_queue_length);
    const waitingTimes = data.map((d) => d.avg_waiting_time);
    // const minQueue = Math.min(...queueLengths);
    const maxQueue = Math.max(...queueLengths);
    const minWait = Math.min(...waitingTimes);
    const maxWait = Math.max(...waitingTimes);

    // Convert data to heatmap format: [lat, lng, intensity]
    // intensity = queue length (for color)
    const heatData = data.map((point) => [
      point.lat,
      point.lon,
      point.avg_queue_length, // Use queue length as intensity for color
    ]);

    // Function to scale radius/blur based on waiting time
    const getBlurFromWaitingTime = (waitingTime: number) => {
      if (maxWait === minWait) return 25;
      const normalized = (waitingTime - minWait) / (maxWait - minWait);
      return 10 + normalized * 50; // Range: 10-60
    };

    // Function to scale radius based on waiting time
    const getRadiusFromWaitingTime = (waitingTime: number) => {
      if (maxWait === minWait) return 35;
      const normalized = (waitingTime - minWait) / (maxWait - minWait);
      return 25 + normalized * 55; // Range: 25-80
    };

    // Calculate average waiting time for radius/blur calculation
    const avgWaitingTime =
      waitingTimes.reduce((a, b) => a + b, 0) / waitingTimes.length;

    // Create heatmap layer with custom options
    interface HeatLayerOptions {
      radius: number;
      blur: number;
      maxZoom: number;
      max: number;
      gradient: Record<string, string>;
    }
    
    interface HeatLayer {
      addTo: (map: ReturnType<typeof useMap>) => void;
      remove: () => void;
    }
    
    const heat = (L as typeof L & { 
      heatLayer: (data: number[][], options: HeatLayerOptions) => HeatLayer
    })
      .heatLayer(heatData, {
        radius: getRadiusFromWaitingTime(avgWaitingTime), // Size based on waiting time
        blur: getBlurFromWaitingTime(avgWaitingTime), // Blur based on waiting time
        maxZoom: 17,
        max: maxQueue, // Max queue length for color scaling
        gradient: {
          0.0: "#0096ff", // Blue (low queue)
          0.25: "#00ff00", // Green
          0.5: "#ffff00", // Yellow
          0.75: "#ff8800", // Orange
          1.0: "#ff0000", // Red (high queue)
        },
      })
      .addTo(map);

    // Add markers for station names (optional, smaller circles)
    const markers: ReturnType<typeof L.circleMarker>[] = [];
    data.forEach((point) => {
      const marker = L.circleMarker([point.lat, point.lon], {
        radius: 5,
        fillColor: "#333",
        fillOpacity: 0.6,
        color: "#fff",
        weight: 1,
      })
        .bindPopup(
          `<div style="font-size: 13px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${point.station_name}</div>
            <div style="color: #ff6b00;">Wait: ${point.avg_waiting_time.toFixed(1)}m</div>
            <div style="color: #0088cc;">Queue: ${point.avg_queue_length.toFixed(1)}p</div>
          </div>`,
        )
        .addTo(map);
      markers.push(marker);
    });

    // Cleanup on unmount
    return () => {
      map.removeLayer(heat);
      markers.forEach((marker) => map.removeLayer(marker));
    };
  }, [map, data]);

  return null;
}

export default function PassengerWaitingHeatmap({
  simulationResponse,
  stations,
}: {
  simulationResponse: SimulationResponse;
  stations: StationInfo[];
}) {
  // Build heatmap data from simulation results
  const heatmapData = useMemo(() => {
    if (!simulationResponse?.simulation_result?.slot_results) return [];

    // Map stations by BOTH id and name for flexible lookup
    const normalizeKey = (key: string) => key.trim().toLowerCase();
    const stationMap = new Map<string, (typeof stations)[0]>();

    stations.forEach((s) => {
      // Index by ID (primary)
      stationMap.set(normalizeKey(s.id), s);
      // Also index by name (fallback)
      stationMap.set(normalizeKey(s.name), s);
    });

    // Aggregate data across all slots
    const stationDataMap = new Map<
      string,
      {
        waiting_times: number[];
        queue_lengths: number[];
        originalName: string;
        stationInfo?: (typeof stations)[0];
      }
    >();

    simulationResponse.simulation_result.slot_results.forEach((slot) => {
      slot.result_station?.forEach((station) => {
        const normalized = normalizeKey(station.station_name);
        const existing = stationDataMap.get(normalized);
        if (existing) {
          existing.waiting_times.push(station.average_waiting_time);
          existing.queue_lengths.push(station.average_queue_length);
        } else {
          // Find station by ID or name
          const stationInfo = stationMap.get(normalized);
          stationDataMap.set(normalized, {
            waiting_times: [station.average_waiting_time],
            queue_lengths: [station.average_queue_length],
            originalName: station.station_name,
            stationInfo,
          });
        }
      });
    });

    // Convert to array and calculate averages
    const data: HeatmapDataPoint[] = Array.from(stationDataMap.entries())
      .map(([normalizedName, stats]) => {
        const stationGeo = stats.stationInfo;
        if (!stationGeo) {
          console.warn(
            `Station not found: "${stats.originalName}" (normalized: "${normalizedName}")`,
          );
          return null;
        }

        const avgWaitingTime =
          stats.waiting_times.reduce((a, b) => a + b, 0) /
          stats.waiting_times.length;
        const avgQueueLength =
          stats.queue_lengths.reduce((a, b) => a + b, 0) /
          stats.queue_lengths.length;

        return {
          station_name: stationGeo.name, // Use actual station name, not ID
          lat: stationGeo.lat,
          lon: stationGeo.lon,
          avg_waiting_time: avgWaitingTime / 60, // Convert to minutes
          avg_queue_length: avgQueueLength,
        };
      })
      .filter((d) => d !== null) as HeatmapDataPoint[];

    return data;
  }, [simulationResponse, stations]);

  if (heatmapData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Calculate bounds for map
  const minLat = Math.min(...heatmapData.map((d) => d.lat));
  const maxLat = Math.max(...heatmapData.map((d) => d.lat));
  const minLon = Math.min(...heatmapData.map((d) => d.lon));
  const maxLon = Math.max(...heatmapData.map((d) => d.lon));

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  return (
    <div className="w-full h-[90%] flex flex-col bg-white rounded-lg">
      {/* Map with density heatmap */}
      <div
        className="flex-1 rounded border border-gray-200 overflow-hidden"
        style={{ minHeight: "200px" }}
      >
        <MapContainer
          center={[centerLat, centerLon]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          bounds={[
            [minLat, minLon],
            [maxLat, maxLon],
          ]}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <HeatmapLayer data={heatmapData} />
        </MapContainer>
      </div>
    </div>
  );
}
