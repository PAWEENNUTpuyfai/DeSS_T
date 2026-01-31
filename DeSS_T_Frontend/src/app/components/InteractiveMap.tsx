import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  Tooltip,
  Marker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../style/Output.css";
import type {
  SimulationResponse,
  SimulationSlotResult,
} from "../models/SimulationModel";
import type { PlaybackSeed } from "../pages/Outputpage";

type MockRoute = {
  id: string;
  name: string;
  color: string;
  coords: [number, number][]; // [lat, lon]
};

// Helper function to create bus icon with dynamic color
const createBusIcon = (color: string) => {
  return L.divIcon({
    html: `
      <svg width="32" height="38" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
        <path d="M0 28C0 29.77 0.78 31.34 2 32.44V36C2 37.1 2.9 38 4 38H6C6.53043 38 7.03914 37.7893 7.41421 37.4142C7.78929 37.0391 8 36.5304 8 36V34H24V36C24 36.5304 24.2107 37.0391 24.5858 37.4142C24.9609 37.7893 25.4696 38 26 38H28C29.1 38 30 37.1 30 36V32.44C31.22 31.34 32 29.77 32 28V8C32 1 24.84 0 16 0C7.16 0 0 1 0 8V28ZM7 30C5.34 30 4 28.66 4 27C4 25.34 5.34 24 7 24C8.66 24 10 25.34 10 27C10 28.66 8.66 30 7 30ZM25 30C23.34 30 22 28.66 22 27C22 25.34 23.34 24 25 24C26.66 24 28 25.34 28 27C28 28.66 26.66 30 25 30ZM28 18H4V8H28V18Z" fill="${color}"/>
      </svg>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -38],
    className: "bus-icon",
  });
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
    [activePlaybackData?.stations],
  );

  const mockRoutes: MockRoute[] = useMemo(
    () =>
      activePlaybackData?.routes?.length
        ? activePlaybackData.routes.map((r) => ({
            id: r.id,
            name: r.name,
            color: r.color,
            coords: r.segments.flatMap((seg) =>
              seg.coords.map(([lon, lat]) => [lat, lon] as [number, number]),
            ),
          }))
        : [],
    [activePlaybackData?.routes],
  );

  const [selectedStationId, setSelectedStationId] = useState<string>(
    stations[0]?.id ?? "",
  );
  const [visibleRoutes, setVisibleRoutes] = useState<Set<string>>(
    new Set(mockRoutes.map((r) => r.id)),
  );

  // Update visibleRoutes when mockRoutes changes (new routes added/removed)
  useEffect(() => {
    setVisibleRoutes(new Set(mockRoutes.map((r) => r.id)));
  }, [mockRoutes]);

  // Update selectedStationId when stations change
  useEffect(() => {
    if (
      stations.length > 0 &&
      !stations.find((st) => st.id === selectedStationId)
    ) {
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
    for (
      let totalMin = startTotalMin;
      totalMin <= endTotalMin;
      totalMin += timeSlotMin
    ) {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
    return times;
  };

  const timeLabels = useMemo(generateTimeLables, [
    activePlaybackData?.simWindow,
    activePlaybackData?.timeSlotMinutes,
  ]);

  // Helper function to convert "HH:MM" to minutes
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const [playbackState, setPlaybackState] = useState({ idx: 0, progress: 0 }); // progress: 0..1 within slot
  const { idx: frameIdx, progress: frameProgress } = playbackState;
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 4x, etc.

  // Smooth playback using requestAnimationFrame and interpolation within each time slot
  useEffect(() => {
    if (!playing || timeLabels.length <= 1) return;
    let rafId: number;
    let last = performance.now();
    const slotDurationMs = 1000 / playbackSpeed; // Adjust speed: higher speed = shorter duration

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
  }, [playing, timeLabels.length, playbackSpeed]);

  const timeSlotMinutes = activePlaybackData?.timeSlotMinutes ?? 5;
  const simWindow = activePlaybackData?.simWindow ?? "08:00-12:00";
  const [simStartMinutes, simEndMinutes] = useMemo(() => {
    const [startStr, endStr] = simWindow.split("-");
    return [timeToMinutes(startStr), timeToMinutes(endStr)];
  }, [simWindow]);

  const baseFrameMinutes = timeToMinutes(timeLabels[frameIdx] ?? "00:00");
  const currentTimeMinutes = baseFrameMinutes + frameProgress * timeSlotMinutes;
  const clampTimeMinutes = Math.min(
    Math.max(currentTimeMinutes, simStartMinutes),
    simEndMinutes,
  );

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const currentTimeLabel = formatTime(clampTimeMinutes);
  // Round to the current time slot boundary for label display
  const slotStartMinutes =
    Math.floor(baseFrameMinutes / timeSlotMinutes) * timeSlotMinutes;
  const slotEndMinutes = Math.min(
    slotStartMinutes + timeSlotMinutes,
    simEndMinutes,
  );
  const currentSlotLabel = `${formatTime(slotStartMinutes)}-${formatTime(slotEndMinutes)}`;

  // Calculate bus positions at an arbitrary time (supports intra-slot interpolation)
  const computeBusesAtTime = useCallback(
    (currentMinutes: number, logDebug = false) => {
      const buses: { id: string; coord: [number, number]; color: string }[] =
        [];

      mockRoutes.forEach((r) => {
        if (r.coords.length < 2) return;

        const routeBusInfo = playbackSeed?.busInfo?.find(
          (bi) => bi.route_id === r.id,
        );
        const maxBuses = routeBusInfo?.max_bus ?? 1;
        const routeSchedule = playbackSeed?.scheduleData?.find((s) =>
          s.route_id.startsWith(r.name),
        );
        const routeResult = playbackSeed?.routeResults?.find(
          (rr) => rr.route_id === r.id,
        );
        const totalTravelTimeSeconds = routeResult?.average_travel_time
          ? routeResult.average_travel_time * 60
          : 300;

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
          console.log(
            `    Available schedules:`,
            playbackSeed?.scheduleData?.map((s) => ({
              route_id: s.route_id,
              has_schedule: !!s.schedule_list,
            })),
          );
        }

        const departureTimes =
          routeSchedule?.schedule_list
            ?.split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0) || [];

        const validDepartureTimes = departureTimes.filter((depTime) => {
          const depTimeMinutes = timeToMinutes(depTime);
          return (
            depTimeMinutes >= simStartMinutes && depTimeMinutes <= simEndMinutes
          );
        });

        if (logDebug && validDepartureTimes.length > 0) {
          console.log(
            `  Valid Departure times (within sim period):`,
            validDepartureTimes,
          );
          console.log(`  Max buses for this route: ${maxBuses}`);
          console.log(`  Schedule list raw:`, routeSchedule?.schedule_list);
        }

        if (validDepartureTimes.length === 0) return;

        validDepartureTimes.forEach((departureTime, busIdxInSchedule) => {
          const departureTimeMinutes = timeToMinutes(departureTime);

          if (
            departureTimeMinutes <= currentMinutes &&
            currentMinutes >= simStartMinutes
          ) {
            const timeSinceDeparture = currentMinutes - departureTimeMinutes;
            const timeSinceDepartureSeconds = timeSinceDeparture * 60;

            let progress = 0;
            if (totalTravelTimeSeconds > 0) {
              progress = Math.min(
                timeSinceDepartureSeconds / totalTravelTimeSeconds,
                0.95,
              );
            } else {
              progress = Math.min(
                (busIdxInSchedule + 1) / (validDepartureTimes.length + 1),
                0.95,
              );
            }

            // Cycling: ถ้าผ่าน maxBuses แล้ว ให้หมุนเวียน (reuse บัสคนแรกที่จบเที่ยว)
            const displayBusIdx = busIdxInSchedule % maxBuses;

            const coordIdx = Math.min(
              Math.floor(progress * r.coords.length),
              r.coords.length - 1,
            );

            const coord = r.coords[coordIdx];
            buses.push({
              id: `${r.name || "route"}-bus${displayBusIdx + 1}`,
              coord: [coord[0], coord[1]] as [number, number],
              color: r.color,
            });
          }
        });
      });

      return buses;
    },
    [
      mockRoutes,
      playbackSeed?.busInfo,
      playbackSeed?.scheduleData,
      playbackSeed?.routeResults,
      simEndMinutes,
      simStartMinutes,
      activePlaybackData?.simWindow,
    ],
  );

  const currentBuses = useMemo(
    () =>
      computeBusesAtTime(
        clampTimeMinutes,
        frameIdx === 0 && frameProgress === 0,
      ),
    [clampTimeMinutes, computeBusesAtTime, frameIdx, frameProgress],
  );

  // Find station data from simulation response based on selected station and current time slot
  const activeSimulationResponse =
    playbackSeed?.simulationResponse || simulationResponse;
  const selectedStation =
    stations.find((st) => st.id === selectedStationId) ?? stations[0];

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
    matchingSlot =
      activeSimulationResponse?.simulation_result?.slot_results?.find(
        (slot) => slot.slot_name === slotName,
      );
  }

  // Match by station ID (station_detail_id), not display name
  // Simulation returns station_name as numeric ID
  const selectedStationData = matchingSlot?.result_station?.find(
    (st: { station_name: string }) => st.station_name === selectedStation?.id,
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
    stations[0]?.lon ?? 100.5,
  ];

  // Show empty state if no data
  if (!activePlaybackData || stations.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg mb-2">No data available</p>
        <p className="text-sm">
          Please configure stations and routes in Scenario page
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center mb-3 text-sm text-gray-700 ml-6">
        <p className="text-[18px]">Simulation Period:</p>
        <p className="ml-2 text-[18px] text-[#81069e]"> {simWindow}</p>
        <p className="ml-6 text-[18px]">Time Slot: </p>
        <p className="ml-2 text-[18px] text-[#81069e]">{timeSlotMinutes} min</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Map + legend */}
        <div className="flex-1 mx-4">
          <div className="interactive-map relative w-full h-[520px] rounded-[16px] overflow-hidden border border-gray-100">
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

              {mockRoutes.map(
                (route) =>
                  visibleRoutes.has(route.id) && (
                    <Polyline
                      key={route.id}
                      positions={route.coords}
                      pathOptions={{
                        color: route.color,
                        weight: 5,
                        opacity: 0.9,
                      }}
                    />
                  ),
              )}

              {stations.map((st) => (
                <CircleMarker
                  key={st.id}
                  center={[st.lat, st.lon]}
                  radius={6}
                  weight={2}
                  color="#eeb34b"
                  fillColor={
                    selectedStationId === st.id ? "#eeb34b" : "#ffffff"
                  }
                  fillOpacity={0.9}
                  eventHandlers={{
                    click: () => setSelectedStationId(st.id),
                  }}
                >
                  <Popup>{st.name}</Popup>
                </CircleMarker>
              ))}

              {/* Route station labels */}
              {activePlaybackData?.routeStations?.map(
                (routeDetail: { route_id: string; station_ids: string[] }) =>
                  visibleRoutes.has(routeDetail.route_id) &&
                  routeDetail.station_ids.map(
                    (stationId: string, idx: number) => {
                      const route = mockRoutes.find(
                        (r) => r.id === routeDetail.route_id,
                      );
                      if (!route || route.coords.length === 0) return null;

                      const station = stations.find((s) => s.id === stationId);
                      if (!station) return null;

                      // Use station's actual coordinates instead of computing from position
                      const coord: [number, number] = [
                        station.lat,
                        station.lon,
                      ];

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
                          <Tooltip
                            direction="top"
                            offset={[0, -10]}
                            opacity={0.95}
                          >
                            {station.name}
                          </Tooltip>
                        </CircleMarker>
                      );
                    },
                  ),
              )}

              {currentBuses.map((b) => (
                <Marker
                  key={b.id}
                  position={[b.coord[0], b.coord[1]]}
                  icon={createBusIcon(b.color)}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -38]}
                    opacity={0.95}
                    permanent
                  >
                    <span className="text-xs">
                      {b.id} @ {currentTimeLabel}
                    </span>
                  </Tooltip>
                </Marker>
              ))}
            </MapContainer>

            {/* Legend overlay */}
            <div className="absolute left-3 bottom-3 z-[1000] pointer-events-auto bg-white/80 rounded-[20px] p-3 text-xs space-y-2 shadow-sm max-w-[220px]">
              {mockRoutes.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-1 p-1 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <span
                    onClick={() => toggleRoute(r.id)}
                    className={`inline-block w-4 h-4 rounded cursor-pointer transition-all ${
                      visibleRoutes.has(r.id) ? "" : "bg-white"
                    }`}
                    style={
                      visibleRoutes.has(r.id)
                        ? { backgroundColor: r.color }
                        : { border: `2px solid ${r.color}` }
                    }
                  ></span>
                  <span className="text-sm">{r.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Timeline slider */}
          <div className="mt-4 px-4 interactive-map-timeline flex flex-col justify-center">
            <div className="flex items-center gap-3">
              <span
                className="mb-2 ml-1 text-2xl text-[#81069E] cursor-pointer hover:opacity-70 transition select-none"
                onClick={() => {
                  if (timeLabels.length > 1) {
                    setPlaying((p) => !p);
                  }
                }}
              >
                {playing ? (
                  <svg
                    width="25"
                    height="20"
                    viewBox="0 0 20 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clip-path="url(#clip0_722_4065)">
                      <path
                        d="M3.33333 0C2.44928 0 1.60143 0.361223 0.976311 1.00421C0.351189 1.64719 0 2.51926 0 3.42857V20.5714C0 21.4807 0.351189 22.3528 0.976311 22.9958C1.60143 23.6388 2.44928 24 3.33333 24C4.21739 24 5.06523 23.6388 5.69036 22.9958C6.31548 22.3528 6.66667 21.4807 6.66667 20.5714V3.42857C6.66667 2.51926 6.31548 1.64719 5.69036 1.00421C5.06523 0.361223 4.21739 0 3.33333 0ZM16.6667 0C15.7826 0 14.9348 0.361223 14.3096 1.00421C13.6845 1.64719 13.3333 2.51926 13.3333 3.42857V20.5714C13.3333 21.4807 13.6845 22.3528 14.3096 22.9958C14.9348 23.6388 15.7826 24 16.6667 24C17.5507 24 18.3986 23.6388 19.0237 22.9958C19.6488 22.3528 20 21.4807 20 20.5714V3.42857C20 2.51926 19.6488 1.64719 19.0237 1.00421C18.3986 0.361223 17.5507 0 16.6667 0Z"
                        fill="#81069E"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_722_4065">
                        <rect width="20" height="24" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                ) : (
                  <svg
                    width="25"
                    height="20"
                    viewBox="0 0 25 30"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.6579 12.2696C24.4695 13.4536 24.4695 16.1079 22.6579 17.2919L4.64132 29.0677C2.64598 30.3718 0 28.9402 0 26.5565V3.00503C0 0.62129 2.64598 -0.810322 4.64132 0.49384L22.6579 12.2696Z"
                      fill="#81069E"
                    />
                  </svg>
                )}
              </span>
              <div className="w-full">
                <div className="flex-1 relative mx-4">
                  {/* Timeline background with tick marks */}
                  <div className="absolute top-0 w-full h-full flex items-center pointer-events-none">
                    <div className="w-full h-1 bg-[#D9D9D9] rounded-full relative">
                      {/* Tick marks for each frame - thick marks only on hour boundaries */}
                      {timeLabels.map((label, idx) => {
                        // Check if this is an hour boundary (ends with :00)
                        const isHourBoundary = label.endsWith(":00");
                        return (
                          <div
                            key={`tick-${idx}`}
                            className={`absolute top-1/2 -translate-y-1/2 ${
                              isHourBoundary
                                ? "w-1 h-4 bg-[#9B9B9B]"
                                : "w-0.5 h-3 bg-[#D9D9D9]"
                            }`}
                            style={{
                              left: `${(idx / Math.max(1, timeLabels.length - 1)) * 100}%`,
                            }}
                          />
                        );
                      })}
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
                      setPlaybackState({
                        idx: Number(e.target.value),
                        progress: 0,
                      });
                    }}
                    className="timeline-slider flex-1 w-full accent-purple-600 relative z-10"
                    style={{
                      appearance: "none",
                      WebkitAppearance: "none",
                      width: "100%",
                      height: "6px",
                      background: "transparent",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  />
                </div>
                {/* Time labels */}
                <div className="flex justify-between text-[#9B9B9B] text-xs">
                  <span className="font-medium">{timeLabels[0] ?? "--"}</span>
                  <span className="font-medium">
                    {timeLabels[Math.floor(timeLabels.length / 2)] ?? "--"}
                  </span>
                  <span className="font-medium">
                    {timeLabels[timeLabels.length - 1] ?? "--"}
                  </span>
                </div>
              </div>

              {/* Playback Speed Controls */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={playbackSpeed}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value > 0 && value <= 10) {
                      setPlaybackSpeed(value);
                    }
                  }}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <span className="text-xs text-gray-600">x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="w-full lg:w-[340px] flex flex-col">
          <p className="text-[18px] text-[#4B4B4B]">
            Simulation Results by Time Slot{" "}
          </p>
          <p className="text-[20px] text-[#81069E] mt-2">
            @ {currentSlotLabel}
          </p>
          <div className="mt-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-10 bg-[#81069E] rounded-full" />
              <div className="flex items-center ">
                <p className="text-[18px] text-[#4B4B4B]">Station :</p>
                <p className="text-[18px] text-[#4B4B4B] ml-2">
                  {stationCard?.station_name ??
                    selectedStation?.id ??
                    "Unknown"}
                </p>
              </div>
            </div>
            <div className="interactive-map-side-container">
              <div className="py-12 px-8">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>
                    • Avg. Waiting Time{" "}
                    <span className=" text-[#81069E] text-[16px] font-bold ml-1">
                      {(stationCard?.average_waiting_time ?? 0).toFixed(1)} mins
                    </span>
                  </li>
                  <li>
                    • Avg. Queue Length{" "}
                    <span className="text-[#81069E] text-[16px] font-bold ml-1">
                      {(stationCard?.average_queue_length ?? 0).toFixed(1)}{" "}
                      persons
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {summary && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-10 bg-[#81069E] rounded-full" />
                <div>
                  <p className="text-[18px] text-[#4B4B4B]">
                    Average of All Stations
                  </p>
                </div>
              </div>
              <div className="interactive-map-side-container">
                <div className="py-12 px-8">
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>
                      • Avg. Waiting Time{" "}
                      <span className="text-[#81069E] text-[16px] font-bold ml-1">
                        {summary.average_waiting_time.toFixed(1)} mins
                      </span>
                    </li>
                    <li>
                      • Avg. Queue Length{" "}
                      <span className="text-[#81069E] text-[16px] font-bold ml-1">
                        {summary.average_queue_length.toFixed(1)} persons
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
