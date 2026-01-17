import { useMemo } from "react";
import { Circle, Popup, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
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
    const stationMap = new Map<string, typeof stations[0]>();
    
    stations.forEach((s) => {
      // Index by ID (primary)
      stationMap.set(normalizeKey(s.id), s);
      // Also index by name (fallback)
      stationMap.set(normalizeKey(s.name), s);
    });

    // Aggregate data across all slots
    const stationDataMap = new Map<
      string,
      { waiting_times: number[]; queue_lengths: number[]; originalName: string; stationInfo?: typeof stations[0] }
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
          console.warn(`Station not found: "${stats.originalName}" (normalized: "${normalizedName}")`);
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

  // Calculate color scale based on waiting time
  const getWaitingTimeColor = (waitingTime: number, minWait: number, maxWait: number) => {
    if (maxWait === minWait) return "rgba(100, 150, 255, 0.7)";

    // Normalize to 0-1
    const normalized = (waitingTime - minWait) / (maxWait - minWait);

    // Blue (cool) -> Red (hot) gradient
    const r = Math.round(255 * normalized);
    const b = Math.round(255 * (1 - normalized));
    const g = Math.round(150 * (1 - Math.abs(normalized - 0.5) * 2));

    return `rgba(${r}, ${g}, ${b}, 0.7)`;
  };

  // Calculate bubble size based on queue length (in meters, stays constant on zoom)
  const getRadius = (queueLength: number, minQueue: number, maxQueue: number) => {
    if (maxQueue === minQueue) return 100; // meters

    const normalized = (queueLength - minQueue) / (maxQueue - minQueue);
    const minRadius = 50; // meters
    const maxRadius = 300; // meters

    return minRadius + normalized * (maxRadius - minRadius);
  };

  if (heatmapData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Get min/max for scaling
  const waitingTimes = heatmapData.map((d) => d.avg_waiting_time);
  const queueLengths = heatmapData.map((d) => d.avg_queue_length);

  const minWait = Math.min(...waitingTimes);
  const maxWait = Math.max(...waitingTimes);
  const minQueue = Math.min(...queueLengths);
  const maxQueue = Math.max(...queueLengths);

  // Calculate bounds for map
  const minLat = Math.min(...heatmapData.map((d) => d.lat));
  const maxLat = Math.max(...heatmapData.map((d) => d.lat));
  const minLon = Math.min(...heatmapData.map((d) => d.lon));
  const maxLon = Math.max(...heatmapData.map((d) => d.lon));

  const latRange = maxLat - minLat || 0.01;
  const lonRange = maxLon - minLon || 0.01;

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg">
      {/* Map with heatmap bubbles */}
      <div className="flex-1 rounded border border-gray-200 overflow-hidden" style={{ minHeight: "250px" }}>
        <MapContainer
          center={[centerLat, centerLon]}
          zoom={14}
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

          {/* Heatmap bubbles */}
          {heatmapData.map((data, idx) => {
            const radius = getRadius(data.avg_queue_length, minQueue, maxQueue);
            const color = getWaitingTimeColor(data.avg_waiting_time, minWait, maxWait);

            return (
              <Circle
                key={idx}
                center={[data.lat, data.lon]}
                radius={radius}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.7,
                  color: "#333",
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold mb-1">{data.station_name}</div>
                    <div className="text-orange-600">
                      Wait: {data.avg_waiting_time.toFixed(1)}m
                    </div>
                    <div className="text-sky-600">
                      Queue: {data.avg_queue_length.toFixed(1)}p
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
