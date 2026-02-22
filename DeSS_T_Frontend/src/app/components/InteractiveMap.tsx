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
      <svg width="32" height="38" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
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

  // Debug: Log playbackSeed data on mount and when it changes
  useEffect(() => {
    console.log("=== InteractiveMap Data Debug ===");
    console.log("PlaybackSeed:", playbackSeed);
    console.log("Bus Info:", playbackSeed?.busInfo);
    console.log("Route Results:", playbackSeed?.routeResults);
    console.log("Schedule Data:", playbackSeed?.scheduleData);
    console.log("Simulation Response:", playbackSeed?.simulationResponse || simulationResponse);
    console.log("=================================");
  }, [playbackSeed, simulationResponse]);

  const stations = useMemo(() => {
    const allStations = activePlaybackData?.stations ?? [];
    const routeStationIds = new Set(
      activePlaybackData?.routeStations
        ?.flatMap((rs) => rs.station_ids ?? [])
        .filter(Boolean) ?? [],
    );

    if (routeStationIds.size === 0) {
      return allStations;
    }

    return allStations.filter((st) => routeStationIds.has(st.id));
  }, [activePlaybackData?.stations, activePlaybackData?.routeStations]);

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

  const defaultStationId = useMemo(() => {
    const firstRouteStationId =
      activePlaybackData?.routeStations?.[0]?.station_ids?.[0];
    return firstRouteStationId ?? stations[0]?.id ?? "";
  }, [activePlaybackData?.routeStations, stations]);

  const [selectedStationId, setSelectedStationId] =
    useState<string>(defaultStationId);
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
      setSelectedStationId(defaultStationId);
    }
  }, [stations, selectedStationId, defaultStationId]);

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
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

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

        // Try multiple matching strategies to find schedule
        const routeSchedule = 
          playbackSeed?.scheduleData?.find((s) => s.route_id === r.id) || // Exact ID match first
          playbackSeed?.scheduleData?.find((s) => s.route_id.startsWith(r.name)) || // Name prefix match
          playbackSeed?.scheduleData?.find((s) => s.route_id.includes(r.name)) || // Name contains
          playbackSeed?.scheduleData?.[0]; // Fallback to first schedule if only one exists
          
        // ✅ ใช้ busInfo.speed และ routeDistance แทน routeResult
        const busInfo = playbackSeed?.busInfo?.find(
          (bi) => bi.route_id === r.id,
        );
        
        // ดึง maxDistance จาก playbackSeed.routeDetails หรือ busInfo
        const routeDetails = playbackSeed?.routeDetails?.find(
          (rd) => rd?.route_id === r.id,
        );
        const maxDistance = routeDetails?.max_dis || 68; // Fallback to 68 km
        
        // คำนวณ travel time จาก speed และ distance
        let totalTravelTimeSeconds = 300; // default 5 minutes
        if (busInfo?.speed && busInfo.speed > 0) {
          const travelTimeMinutes = (maxDistance / busInfo.speed) * 60;
          totalTravelTimeSeconds = travelTimeMinutes * 60;
        }

        if (logDebug) {
          console.log(`🚌 Route: ${r.name}`);
          console.log(`   busInfo.speed: ${busInfo?.speed} km/h`);
          console.log(`   maxDistance: ${maxDistance} km`);
          console.log(`   Calculated travelTimeSeconds: ${totalTravelTimeSeconds}`);
          console.log(`   Expected: ${maxDistance} km ÷ ${busInfo?.speed} km/h = ${(maxDistance / (busInfo?.speed || 1)).toFixed(2)} hours`);
        }

        const departureTimes =
          routeSchedule?.schedule_list
            ?.split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0) || [];

        const validDepartureTimes = departureTimes.filter((depTime) => {
          const depTimeMinutes = timeToMinutes(depTime);
          return depTimeMinutes >= simStartMinutes && depTimeMinutes <= simEndMinutes;
        });

        if (validDepartureTimes.length === 0) {
          if (logDebug) {
            console.log(`❌ No valid departure times for route ${r.name} (check schedule)`);
          }
          return;
        }

        const travelTimeMinutes = totalTravelTimeSeconds / 60;
        
        if (logDebug) {
          console.log(`   travelTimeMinutes: ${travelTimeMinutes.toFixed(2)} min`);
          console.log(`   Expected: ~68 km ÷ 30 km/h = ~136 minutes`);
        }
        
        // Find active buses: those that have departed but not yet finished
        const activeDepartures = [...validDepartureTimes]
          .map((dep) => {
            const depMin = timeToMinutes(dep);
            const arrivalMin = depMin + travelTimeMinutes;
            return { dep, depMin, arrivalMin };
          })
          .filter(
            ({ depMin, arrivalMin }) =>
              depMin <= currentMinutes && currentMinutes <= arrivalMin,
          );

        // Show all active buses (can have multiple buses on same route)
        activeDepartures.forEach((activeDeparture, busIdx) => {
          const timeSinceDepartureMinutes =
            currentMinutes - activeDeparture.depMin;
          const timeSinceDepartureSeconds = timeSinceDepartureMinutes * 60;

          const progress =
            totalTravelTimeSeconds > 0
              ? Math.min(timeSinceDepartureSeconds / totalTravelTimeSeconds, 1)
              : 1;

          const coordIdx = Math.min(
            Math.floor(progress * r.coords.length),
            r.coords.length - 1,
          );

          const coord = r.coords[coordIdx];
          
          buses.push({
            id: `${r.name || "route"}-bus${busIdx + 1}`,
            coord: [coord[0], coord[1]] as [number, number],
            color: r.color,
          });
        });
      });

      return buses;
    },
    [
      mockRoutes,
      playbackSeed?.scheduleData,
      playbackSeed?.busInfo,
      playbackSeed?.routeDetails,
      simEndMinutes,
      simStartMinutes,
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
  // Use currentSlotLabel which is already correctly calculated
  let matchingSlot: SimulationSlotResult | undefined;

  if (currentSlotLabel && activeSimulationResponse?.simulation_result?.slot_results) {
    // Use currentSlotLabel directly as it matches the slot_name format "HH:MM-HH:MM"
    matchingSlot = activeSimulationResponse.simulation_result.slot_results.find(
      (slot) => slot.slot_name === currentSlotLabel,
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

  // Use backend-provided totals for current time slot
  const summary =
    matchingSlot?.result_total_station ||
    activeSimulationResponse?.simulation_result?.result_summary;

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
                    step={0.001}
                    value={Math.min(
                      frameIdx + frameProgress,
                      Math.max(0, timeLabels.length - 1),
                    )}
                    onChange={(e) => {
                      setPlaying(false);
                      const snappedIdx = Math.round(Number(e.target.value));
                      setPlaybackState({
                        idx: snappedIdx,
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
              <div className="relative mb-2">
                <span
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-4 py-3 text-sm text-[#81069E] rounded-[20px] hover:bg-gray-200 transition hover:boarder-none focus:outline-none"
                >
                  {playbackSpeed.toFixed(2)}x
                </span>

                {showSpeedMenu && (
                  <>
                    {/* Backdrop to close menu when clicking outside */}
                    <div
                      className="fixed inset-0 z-[1000] "
                      onClick={() => setShowSpeedMenu(false)}
                    />
                    {/* Speed menu */}
                    <div className="flex flex-col absolute rounded-[20px] bottom-full right-0 mb-2 bg-white border border-gray-200 shadow-lg py-1 z-[1001] min-w-[80px]">
                      {[0.25, 0.5, 1.0, 1.5, 2.0].map((speed) => (
                        <span
                          key={speed}
                          onClick={() => {
                            setPlaybackSpeed(speed);
                            setShowSpeedMenu(false);
                          }}
                          className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-100 hover:rounded-[20px] transition ${
                            playbackSpeed === speed
                              ? "text-[#81069E]"
                              : "text-gray-700"
                          }`}
                        >
                          {speed.toFixed(2)}x
                        </span>
                      ))}
                    </div>
                  </>
                )}
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
                      {(stationCard?.average_waiting_time ?? 0).toFixed(2)} mins
                    </span>
                  </li>
                  <li>
                    • Avg. Queue Length{" "}
                    <span className="text-[#81069E] text-[16px] font-bold ml-1">
                      {(stationCard?.average_queue_length ?? 0).toFixed(2)}{" "}
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
                        {summary.average_waiting_time.toFixed(2)} mins
                      </span>
                    </li>
                    <li>
                      • Avg. Queue Length{" "}
                      <span className="text-[#81069E] text-[16px] font-bold ml-1">
                        {summary.average_queue_length.toFixed(2)} persons
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
