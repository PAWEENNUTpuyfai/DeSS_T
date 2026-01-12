import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../../style/Output.css";
import type { SimulationResponse } from "../models/SimulationModel";
import type { PlaybackSeed } from "../pages/Outputpage";

type PlaybackFrame = {
  timeLabel: string;
  buses: { id: string; coord: [number, number] }[];
};

type MockRoute = {
  id: string;
  name: string;
  color: string;
  coords: [number, number][]; // [lat, lon]
};

export default function InteractiveMap({
  simulationResponse,
  playbackSeed,
}: {
  simulationResponse?: SimulationResponse;
  playbackSeed?: PlaybackSeed;
}) {
  // Use single-shot data from props only (no realtime playback)
  const activePlaybackData = playbackSeed;

  const stations = useMemo(
    () => activePlaybackData?.stations ?? [],
    [activePlaybackData?.stations]
  );

  const mockRoutes: MockRoute[] = useMemo(
    () => activePlaybackData?.routes?.length
      ? activePlaybackData.routes.map((r) => ({
          id: r.id,
          name: r.name,
          color: r.color,
          coords: r.segments.flatMap((seg) => seg.coords.map(([lon, lat]) => [lat, lon] as [number, number])),
        }))
      : [],
    [activePlaybackData?.routes]
  );

  const [selectedStationId, setSelectedStationId] = useState<string>(stations[0]?.id ?? "");
  const [visibleRoutes, setVisibleRoutes] = useState<Set<string>>(
    new Set(mockRoutes.map((r) => r.id))
  );

  // Update visibleRoutes when mockRoutes changes (new routes added/removed)
  useEffect(() => {
    setVisibleRoutes(new Set(mockRoutes.map((r) => r.id)));
  }, [mockRoutes]);

  // Update selectedStationId when stations change
  useEffect(() => {
    if (stations.length > 0 && !stations.find(st => st.id === selectedStationId)) {
      setSelectedStationId(stations[0].id);
    }
  }, [stations, selectedStationId]);

  const toggleRoute = (routeId: string) => {
    setVisibleRoutes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(routeId)) {
        newSet.delete(routeId);
      } else {
        newSet.add(routeId);
      }
      return newSet;
    });
  };

  // Generate time labels based on simWindow and timeSlotMinutes
  const generateTimeLables = (): string[] => {
    if (!activePlaybackData?.simWindow) return [];
    
    const [startStr, endStr] = activePlaybackData.simWindow.split("-");
    const [startHour, startMin] = startStr.split(":").map(Number);
    const [endHour, endMin] = endStr.split(":").map(Number);
    
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    const timeSlotMin = activePlaybackData.timeSlotMinutes || 5;
    
    const times: string[] = [];
    for (let totalMin = startTotalMin; totalMin <= endTotalMin; totalMin += timeSlotMin) {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
    return times;
  };

  const timeLabels = useMemo(generateTimeLables, [activePlaybackData?.simWindow, activePlaybackData?.timeSlotMinutes]);

  // Helper function to convert "HH:MM" to minutes
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const buildFrames = (): PlaybackFrame[] => {
    if (!mockRoutes.length || timeLabels.length === 0) return [];
    
    // Get simulation window times
    const [simStartStr, simEndStr] = activePlaybackData?.simWindow?.split("-") ?? ["08:00", "16:00"];
    const simStartMinutes = timeToMinutes(simStartStr);
    const simEndMinutes = timeToMinutes(simEndStr);
    
    return timeLabels.map((tLabel, frameIdx) => {
      const buses: { id: string; coord: [number, number] }[] = [];
      const currentTime = tLabel; // e.g., "08:00"
      const currentTimeMinutes = timeToMinutes(currentTime);
      
      mockRoutes.forEach((r) => {
        if (r.coords.length < 2) return;
        
        // Get max_bus and schedule info
        const routeBusInfo = playbackSeed?.busInfo?.find((bi) => bi.route_id === r.id);
        const maxBuses = routeBusInfo?.max_bus ?? 1;
        const routeSchedule = playbackSeed?.scheduleData?.find((s) => s.route_id === r.id);
        const routeOrders = playbackSeed?.routeOrders?.find((ro) => ro.route_id === r.id);
        const totalTravelTimeSeconds = routeOrders?.totalTravelTimeSeconds ?? 0;
        
        // Debug: Log schedule data
        if (frameIdx === 0) {
          console.log(`🚌 Route ${r.name} (${r.id}):`, {
            maxBuses,
            scheduleFound: !!routeSchedule,
            schedule_list: routeSchedule?.schedule_list,
            totalTravelTimeSeconds,
            simWindow: activePlaybackData?.simWindow,
          });
          console.log(`  DEBUG: Checking schedule data match:`);
          console.log(`    Looking for route_id = '${r.id}'`);
          console.log(`    Available schedules:`, 
            playbackSeed?.scheduleData?.map((s: any) => ({route_id: s.route_id, has_schedule: !!s.schedule_list}))
          );
        }
        
        // Parse schedule: "08:00,08:15,08:30,..." or "08:00, 08:15, 08:30,..."
        const departureTimes = routeSchedule?.schedule_list
          ?.split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0) || [];
        
        // Filter to only include departures within simulation period
        const validDepartureTimes = departureTimes.filter((depTime) => {
          const depTimeMinutes = timeToMinutes(depTime);
          return depTimeMinutes >= simStartMinutes && depTimeMinutes <= simEndMinutes;
        });
        
        if (frameIdx === 0 && validDepartureTimes.length > 0) {
          console.log(`  Valid Departure times (within sim period):`, validDepartureTimes);
          console.log(`  Max buses for this route: ${maxBuses}`);
          console.log(`  Schedule list raw:`, routeSchedule?.schedule_list);
        }
        
        // If no schedule, show no buses (don't use maxBuses fallback)
        if (validDepartureTimes.length === 0) {
          // Do nothing - no buses without schedule
        } else {
          // Create bus instances based on schedule
          // Each departure time = one bus instance, don't use maxBuses as limit
          validDepartureTimes.forEach((departureTime, busIdx) => {
            const departureTimeMinutes = timeToMinutes(departureTime);
            
            // Check if bus has departed at current time AND current time is within sim period
            if (departureTimeMinutes <= currentTimeMinutes && currentTimeMinutes >= simStartMinutes) {
              // Bus is active - interpolate position along coordinates
              // Calculate how many seconds since departure
              const timeSinceDeparture = currentTimeMinutes - departureTimeMinutes;
              const timeSinceDepartureSeconds = timeSinceDeparture * 60;
              
              // Calculate progress: if totalTravelTime > 0, use it; otherwise use fallback
              let progress = 0;
              if (totalTravelTimeSeconds > 0) {
                progress = Math.min(timeSinceDepartureSeconds / totalTravelTimeSeconds, 0.95);
              } else {
                // Fallback: distribute buses along time
                progress = Math.min((busIdx + 1) / (validDepartureTimes.length + 1), 0.95);
              }

              const coordIdx = Math.min(
                Math.floor(progress * r.coords.length),
                r.coords.length - 1
              );
              
              const coord = r.coords[coordIdx];
              buses.push({
                id: `${r.name || "route"}-bus${busIdx + 1}`,
                coord: [coord[0], coord[1]] as [number, number],
              });
            }
          });
        }
      });
      
      return { timeLabel: tLabel, buses };
    });
  };

  const frames = useMemo(buildFrames, [
    mockRoutes,
    timeLabels,
    playbackSeed?.busInfo,
    playbackSeed?.scheduleData,
    playbackSeed?.routeOrders,
  ]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || frames.length <= 1) return;
    const interval = window.setInterval(() => {
      setFrameIdx((i) => (i + 1) % frames.length);
    }, 600); // 600ms per frame for smooth playback
    return () => window.clearInterval(interval);
  }, [playing, frames.length]);

  const timeSlotMinutes = activePlaybackData?.timeSlotMinutes ?? 5;
  const simWindow = activePlaybackData?.simWindow ?? "08:00-12:00";

  // Find station data from simulation response based on selected station
  const activeSimulationResponse = playbackSeed?.simulationResponse || simulationResponse;
  const selectedStation = stations.find((st) => st.id === selectedStationId) ?? stations[0];
  const selectedStationData = activeSimulationResponse?.simulation_result?.slot_results?.[0]?.result_station?.find(
    (st) => st.station_name === selectedStation?.name
  );

  const stationCard = selectedStationData || {
    station_name: selectedStation?.name || "ศูนย์ ขส.มช.",
    average_waiting_time: 0,
    average_queue_length: 0,
  };
  const summary = activeSimulationResponse?.simulation_result?.result_summary;

  const mapCenter: [number, number] = [
    stations[0]?.lat ?? 13.75,
    stations[0]?.lon ?? 100.5
  ];

  // Show empty state if no data
  if (!activePlaybackData || stations.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg mb-2">No data available</p>
        <p className="text-sm">Please configure stations and routes in Scenario page</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Map + legend */}
        <div className="flex-1 bg-white rounded-[20px] shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-3 text-sm text-gray-700">
            <span>Simulation Period: {simWindow}</span>
            <span>Time Slot: {timeSlotMinutes} min</span>
          </div>
          <div className="relative w-full h-[520px] rounded-[16px] overflow-hidden border border-gray-100">
            <MapContainer
              key={`map-${stations[0]?.id}-${mockRoutes.length}`}
              center={mapCenter}
              zoom={activePlaybackData?.routes?.length ? 14 : 15}
              style={{ width: "100%", height: "100%" }}
              doubleClickZoom={false}
            >
              <TileLayer
                attribution="© OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {mockRoutes.map((route) => (
                visibleRoutes.has(route.id) && (
                  <Polyline
                    key={route.id}
                    positions={route.coords}
                    pathOptions={{ color: route.color, weight: 5, opacity: 0.9 }}
                  />
                )
              ))}

              {stations.map((st) => (
                <CircleMarker
                  key={st.id}
                  center={[st.lat, st.lon]}
                  radius={6}
                  weight={2}
                  color="#eeb34b"
                  fillColor={selectedStationId === st.id ? "#eeb34b" : "#ffffff"}
                  fillOpacity={0.9}
                  eventHandlers={{
                    click: () => setSelectedStationId(st.id),
                  }}
                >
                  <Popup>{st.name}</Popup>
                </CircleMarker>
              ))}

              {/* Route station labels */}
              {activePlaybackData?.routeStationDetails?.map((routeDetail) =>
                visibleRoutes.has(routeDetail.route_id) &&
                routeDetail.stations.map((stDetail, idx) => {
                  const route = mockRoutes.find((r) => r.id === routeDetail.route_id);
                  if (!route || route.coords.length === 0) return null;

                  const coordIdx = Math.min(
                    Math.floor(stDetail.position * (route.coords.length - 1)),
                    route.coords.length - 1
                  );
                  const coord = route.coords[coordIdx];

                  return (
                    <CircleMarker
                      key={`route-station-${routeDetail.route_id}-${idx}`}
                      center={[coord[0], coord[1]]}
                      radius={4}
                      weight={2}
                      color={route.color}
                      fillColor="white"
                      fillOpacity={0.95}
                    >
                      <Popup>{stDetail.station_name}</Popup>
                      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                        {stDetail.station_name}
                      </Tooltip>
                    </CircleMarker>
                  );
                })
              )}

              {frames[frameIdx]?.buses.map((b) => (
                <CircleMarker
                  key={b.id}
                  center={[b.coord[0], b.coord[1]]}
                  radius={8}
                  weight={2}
                  color="#2563eb"
                  fillColor="#2563eb"
                  fillOpacity={0.95}
                >
                  <Tooltip direction="top" offset={[0, -4]} opacity={0.95} permanent>
                    {b.id} @ {frames[frameIdx]?.timeLabel}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>

            {/* Legend overlay */}
            <div className="absolute left-3 bottom-3 z-30 pointer-events-auto bg-white/90 border border-gray-200 rounded-md p-3 text-xs space-y-2 shadow-sm max-w-[220px]">
              <div className="font-semibold text-gray-800 mb-2">Routes</div>
              {mockRoutes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => toggleRoute(r.id)}
                  className={`w-full flex items-center gap-2 p-1.5 rounded transition ${
                    visibleRoutes.has(r.id)
                      ? "bg-gray-100 border border-gray-300"
                      : "bg-gray-50 border border-gray-200 opacity-50"
                  } hover:bg-gray-100`}
                  type="button"
                >
                  <input
                    type="checkbox"
                    checked={visibleRoutes.has(r.id)}
                    onChange={() => {}}
                    className="cursor-pointer"
                  />
                  <span
                    className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: r.color }}
                  />
                  <span className="text-left">{r.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Timeline slider */}
          <div className="mt-4 px-4">
            <div className="flex items-center gap-3">
              <button
                className="w-9 h-9 rounded-full border flex items-center justify-center text-purple-600 border-purple-600 hover:bg-purple-50 transition"
                type="button"
                onClick={() => setPlaying((p) => !p)}
                disabled={frames.length <= 1}
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <div className="flex-1 relative">
                {/* Timeline background with tick marks */}
                <div className="absolute top-0 w-full h-full flex items-center pointer-events-none">
                  <div className="w-full h-1 bg-gray-300 rounded-full relative">
                    {/* Tick marks for each frame */}
                    {frames.map((_, idx) => (
                      <div
                        key={`tick-${idx}`}
                        className="absolute w-0.5 h-3 bg-gray-500 top-1/2 -translate-y-1/2"
                        style={{
                          left: `${(idx / Math.max(1, frames.length - 1)) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, frames.length - 1)}
                  step={1}
                  value={frameIdx}
                  onChange={(e) => {
                    setPlaying(false);
                    setFrameIdx(Number(e.target.value));
                  }}
                  className="flex-1 w-full accent-purple-600 relative z-10"
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    width: '100%',
                    height: '6px',
                    background: 'transparent',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
            {/* Time labels */}
            <div className="flex justify-between text-xs text-gray-600 mt-3">
              <span className="font-medium">{frames[0]?.timeLabel ?? "--"}</span>
              <span className="font-medium">{frames[Math.floor(frames.length / 2)]?.timeLabel ?? "--"}</span>
              <span className="font-medium">{frames[frames.length - 1]?.timeLabel ?? "--"}</span>
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="w-full lg:w-[340px] flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-[16px] shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-10 bg-purple-700 rounded-full" />
              <div>
                <p className="text-sm text-gray-600">Station :</p>
                <p className="text-base font-semibold text-gray-900">{stationCard?.station_name ?? "ศูนย์ ขส.มช."}</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                • Avg. Waiting Time <span className="font-semibold text-purple-700">{(stationCard?.average_waiting_time ?? 0).toFixed(1)} mins</span>
              </li>
              <li>
                • Avg. Queue Length <span className="font-semibold text-purple-700">{(stationCard?.average_queue_length ?? 0).toFixed(1)} persons</span>
              </li>
            </ul>
          </div>

          {summary && (
            <div className="bg-white border border-gray-200 rounded-[16px] shadow-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-10 bg-purple-700 rounded-full" />
                <div>
                  <p className="text-base font-semibold text-gray-900">Average of All Stations</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  • Avg. Waiting Time <span className="font-semibold text-purple-700">{summary.average_waiting_time.toFixed(1)} mins</span>
                </li>
                <li>
                  • Avg. Queue Length <span className="font-semibold text-purple-700">{summary.average_queue_length.toFixed(1)} persons</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
