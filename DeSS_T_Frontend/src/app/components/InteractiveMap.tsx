import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { SimulationResponse, SimulationSlotResult } from "../models/SimulationModel";
import type { PlaybackSeed } from "../pages/Outputpage";

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

  const [playbackState, setPlaybackState] = useState({ idx: 0, progress: 0 }); // progress: 0..1 within slot
  const { idx: frameIdx, progress: frameProgress } = playbackState;
  const [playing, setPlaying] = useState(false);

  // Smooth playback using requestAnimationFrame and interpolation within each time slot
  useEffect(() => {
    if (!playing || timeLabels.length <= 1) return;
    let rafId: number;
    let last = performance.now();
    const slotDurationMs = 1000; // real-time duration per slot

    const step = (now: number) => {
      const delta = now - last;
      last = now;
      setPlaybackState((prev) => {
        let newProgress = prev.progress + delta / slotDurationMs;
        let newIdx = prev.idx;
        while (newProgress >= 1) {
          newProgress -= 1;
          newIdx = (newIdx + 1) % timeLabels.length;
        }
        return { idx: newIdx, progress: newProgress };
      });
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [playing, timeLabels.length]);

  const timeSlotMinutes = activePlaybackData?.timeSlotMinutes ?? 5;
  const simWindow = activePlaybackData?.simWindow ?? "08:00-12:00";
  const [simStartMinutes, simEndMinutes] = useMemo(() => {
    const [startStr, endStr] = simWindow.split("-");
    return [timeToMinutes(startStr), timeToMinutes(endStr)];
  }, [simWindow]);

  const baseFrameMinutes = timeToMinutes(timeLabels[frameIdx] ?? "00:00");
  const currentTimeMinutes = baseFrameMinutes + frameProgress * timeSlotMinutes;
  const clampTimeMinutes = Math.min(Math.max(currentTimeMinutes, simStartMinutes), simEndMinutes);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const currentTimeLabel = formatTime(clampTimeMinutes);

  // Calculate bus positions at an arbitrary time (supports intra-slot interpolation)
  const computeBusesAtTime = useCallback(
    (currentMinutes: number, logDebug = false) => {
      const buses: { id: string; coord: [number, number] }[] = [];

      mockRoutes.forEach((r) => {
        if (r.coords.length < 2) return;

        const routeBusInfo = playbackSeed?.busInfo?.find((bi) => bi.route_id === r.id);
        const maxBuses = routeBusInfo?.max_bus ?? 1;
        const routeSchedule = playbackSeed?.scheduleData?.find((s) => s.route_id.startsWith(r.name));
        const routeResult = playbackSeed?.routeResults?.find((rr) => rr.route_id === r.id);
        const totalTravelTimeSeconds = routeResult?.average_travel_time ? routeResult.average_travel_time * 60 : 300;

        if (logDebug) {
          console.log(`🚌 Route ${r.name} (${r.id}):`, {
            maxBuses,
            scheduleFound: !!routeSchedule,
            schedule_list: routeSchedule?.schedule_list,
            totalTravelTimeSeconds,
            simWindow: activePlaybackData?.simWindow,
          });
          console.log(`  DEBUG: Checking schedule data match:`);
          console.log(`    Looking for route_name starting with '${r.name}'`);
          console.log(`    Available schedules:`,
            playbackSeed?.scheduleData?.map((s) => ({ route_id: s.route_id, has_schedule: !!s.schedule_list }))
          );
        }

        const departureTimes = routeSchedule?.schedule_list
          ?.split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0) || [];

        const validDepartureTimes = departureTimes.filter((depTime) => {
          const depTimeMinutes = timeToMinutes(depTime);
          return depTimeMinutes >= simStartMinutes && depTimeMinutes <= simEndMinutes;
        });

        if (logDebug && validDepartureTimes.length > 0) {
          console.log(`  Valid Departure times (within sim period):`, validDepartureTimes);
          console.log(`  Max buses for this route: ${maxBuses}`);
          console.log(`  Schedule list raw:`, routeSchedule?.schedule_list);
        }

        if (validDepartureTimes.length === 0) return;

        validDepartureTimes.forEach((departureTime, busIdx) => {
          const departureTimeMinutes = timeToMinutes(departureTime);

          if (departureTimeMinutes <= currentMinutes && currentMinutes >= simStartMinutes) {
            const timeSinceDeparture = currentMinutes - departureTimeMinutes;
            const timeSinceDepartureSeconds = timeSinceDeparture * 60;

            let progress = 0;
            if (totalTravelTimeSeconds > 0) {
              progress = Math.min(timeSinceDepartureSeconds / totalTravelTimeSeconds, 0.95);
            } else {
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
      });

      return buses;
    },
    [mockRoutes, playbackSeed?.busInfo, playbackSeed?.scheduleData, playbackSeed?.routeResults, simEndMinutes, simStartMinutes, activePlaybackData?.simWindow]
  );

  const currentBuses = useMemo(
    () => computeBusesAtTime(clampTimeMinutes, frameIdx === 0 && frameProgress === 0),
    [clampTimeMinutes, computeBusesAtTime, frameIdx, frameProgress]
  );

  // Find station data from simulation response based on selected station and current time slot
  const activeSimulationResponse = playbackSeed?.simulationResponse || simulationResponse;
  const selectedStation = stations.find((st) => st.id === selectedStationId) ?? stations[0];
  
  // Build the correct slot_name from current time and timeSlotMinutes
  let matchingSlot: SimulationSlotResult | undefined;
  
  if (currentTimeLabel && timeSlotMinutes) {
    // Convert time string to minutes
    const [hours, mins] = currentTimeLabel.split(":").map(Number);
    const currentMinutes = hours * 60 + mins;
    const endMinutes = currentMinutes + timeSlotMinutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    // Build slot name in format "HH:MM-HH:MM"
    const slotName = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}-${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;
    
    // Find matching slot
    matchingSlot = activeSimulationResponse?.simulation_result?.slot_results?.find(
      (slot) => slot.slot_name === slotName
    );
  }
  
  // Match by station ID (station_detail_id), not display name
  // Simulation returns station_name as numeric ID
  const selectedStationData = matchingSlot?.result_station?.find(
    (st: { station_name: string }) => st.station_name === selectedStation?.id
  );

  // Use the display name for the station card title
  const stationCard = selectedStationData 
    ? {
        ...selectedStationData,
        station_name: selectedStation?.name || selectedStation?.id || "Unknown",
      }
    : {
        station_name: selectedStation?.name || selectedStation?.id || "Unknown",
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
              {activePlaybackData?.routeStations?.map((routeDetail: { route_id: string; station_ids: string[] }) =>
                visibleRoutes.has(routeDetail.route_id) &&
                routeDetail.station_ids.map((stationId: string, idx: number) => {
                  const route = mockRoutes.find((r) => r.id === routeDetail.route_id);
                  if (!route || route.coords.length === 0) return null;

                  const station = stations.find((s) => s.id === stationId);
                  if (!station) return null;

                  // Use station's actual coordinates instead of computing from position
                  const coord: [number, number] = [station.lat, station.lon];

                  return (
                    <CircleMarker
                      key={`route-station-${routeDetail.route_id}-${idx}`}
                      center={coord}
                      radius={4}
                      weight={2}
                      color={route.color}
                      fillColor="white"
                      fillOpacity={0.95}
                      eventHandlers={{
                        click: () => setSelectedStationId(stationId),
                      }}
                    >
                      <Popup>{station.name}</Popup>
                      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                        {station.name}
                      </Tooltip>
                    </CircleMarker>
                  );
                })
              )}

              {currentBuses.map((b) => (
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
                    {b.id} @ {currentTimeLabel}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>

            {/* Legend overlay */}
            <div className="absolute left-3 bottom-3 z-[1000] pointer-events-auto bg-white/90 border border-gray-200 rounded-md p-3 text-xs space-y-2 shadow-sm max-w-[220px]">
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
                disabled={timeLabels.length <= 1}
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <div className="flex-1 relative">
                {/* Timeline background with tick marks */}
                <div className="absolute top-0 w-full h-full flex items-center pointer-events-none">
                  <div className="w-full h-1 bg-gray-300 rounded-full relative">
                    {/* Tick marks for each frame */}
                    {timeLabels.map((_, idx) => (
                      <div
                        key={`tick-${idx}`}
                        className="absolute w-0.5 h-3 bg-gray-500 top-1/2 -translate-y-1/2"
                        style={{
                          left: `${(idx / Math.max(1, timeLabels.length - 1)) * 100}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, timeLabels.length - 1)}
                  step={1}
                  value={frameIdx}
                  onChange={(e) => {
                    setPlaying(false);
                    setPlaybackState({ idx: Number(e.target.value), progress: 0 });
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
              <span className="font-medium">{timeLabels[0] ?? "--"}</span>
              <span className="font-medium">{timeLabels[Math.floor(timeLabels.length / 2)] ?? "--"}</span>
              <span className="font-medium">{timeLabels[timeLabels.length - 1] ?? "--"}</span>
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
                <p className="text-base font-semibold text-gray-900">{stationCard?.station_name ?? selectedStation?.id ?? "Unknown"}</p>
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
