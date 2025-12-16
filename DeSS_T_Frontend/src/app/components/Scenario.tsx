import React, { useMemo, useState } from "react";
import type { Configuration } from "../models/Configuration";
import type { StationDetail, StationPair } from "../models/Network";
import ScenarioMap from "./ScenarioMap";
import type { RouteSegment } from "./ScenarioMap";
import { fetchRouteGeometry } from "../../utility/api/routeApi";
import "../../style/Scenario.css";

export default function Scenario({
  configuration,
  onBack,
  mode = "guest",
  projectName,
}: {
  configuration: Configuration;
  onBack?: () => void;
  mode?: "guest" | "user";
  projectName?: string;
}) {
  const nodes: StationDetail[] =
    configuration?.Network_model?.Station_detail ?? [];
  const edges: StationPair[] = configuration?.Network_model?.StationPair ?? [];
  const [transportMode, setTransportMode] = useState<"Route" | "Bus">("Route");
  console.log("🔍 Scenario nodes count:", nodes.length, "nodes:", nodes);
  const colorOptions = useMemo(
    () => [
      "#3b82f6",
      "#22c55e",
      "#f97316",
      "#ef4444",
      "#8b5cf6",
      "#06b6d4",
      "#f59e0b",
      "#10b981",
    ],
    []
  );

  type SimpleRoute = {
    id: string;
    name: string;
    color: string;
    stations: string[];
    segments: RouteSegment[];
    hidden: boolean;
    locked: boolean;
    maxDistance: number;
    speed: number;
    capacity: number;
    maxBuses: number;
  };

  const createRoute = (idx: number): SimpleRoute => ({
    id: `${Date.now()}-${idx}`,
    name: `Route ${idx + 1}`,
    color: colorOptions[idx % colorOptions.length],
    stations: [], // stations will be selected from map later
    segments: [],
    hidden: false,
    locked: false,
    maxDistance: 40,
    speed: 40,
    capacity: 21,
    maxBuses: 21,
  });

  const [routes, setRoutes] = useState<SimpleRoute[]>([createRoute(0)]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isFetchingSegment, setIsFetchingSegment] = useState(false);

  const updateBusInfo = (
    routeId: string,
    key: "maxDistance" | "speed" | "capacity" | "maxBuses",
    value: number
  ) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, [key]: value } : r))
    );
  };

  const cycleColor = (routeId: string) => {
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId) return r;
        const currentIdx = colorOptions.indexOf(r.color);
        const nextIdx =
          currentIdx >= 0 ? (currentIdx + 1) % colorOptions.length : 0;
        return { ...r, color: colorOptions[nextIdx] };
      })
    );
  };

  const updateName = (routeId: string, name: string) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, name } : r))
    );
  };

  const addRoute = () => {
    setRoutes((prev) => [...prev, createRoute(prev.length)]);
  };

  const toggleHidden = (routeId: string) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === routeId
          ? {
              ...r,
              hidden: !r.hidden,
            }
          : r
      )
    );
  };

  const toggleLocked = (routeId: string) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === routeId
          ? {
              ...r,
              locked: !r.locked,
            }
          : r
      )
    );
  };

  const removeRoute = (routeId: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== routeId));
  };

  const editRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
  };

  const resetRoutePath = (routeId: string) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === routeId ? { ...r, stations: [], segments: [] } : r
      )
    );
  };

  // Helper: Get station name from ID
  const getStationName = (stationId: string): string => {
    const station = nodes.find((n) => n.StationID === stationId);
    return station?.StationName || stationId;
  };

  // Helper: Get pre-computed route geometry from network model if available
  const getRouteGeometryFromModel = (fromStationId: string, toStationId: string): [number, number][] | null => {
    const pair = edges.find(
      (p) => p.FstStation === fromStationId && p.SndStation === toStationId
    );
    if (pair?.RouteBetween?.Route?.coordinates) {
      return pair.RouteBetween.Route.coordinates;
    }
    return null;
  };

  const handleSelectStationOnMap = async (stationId: string) => {
    if (!selectedRouteId) return;
    const route = routes.find((r) => r.id === selectedRouteId);
    if (!route || route.locked) return;

    // If first station, just set it
    if (route.stations.length === 0) {
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === route.id ? { ...r, stations: [stationId], segments: [] } : r
        )
      );
      return;
    }

    const lastStationId = route.stations[route.stations.length - 1];
    if (lastStationId === stationId) return;

    const lastStation = nodes.find((n) => n.StationID === lastStationId);
    const nextStation = nodes.find((n) => n.StationID === stationId);
    if (!lastStation || !nextStation) return;

    setIsFetchingSegment(true);
    try {
      // Try to get route geometry from pre-computed network model first
      let segmentCoords = getRouteGeometryFromModel(lastStationId, stationId);
      
      // If not available in model, fetch from backend API
      if (!segmentCoords) {
        console.log(`ℹ️ Route geometry not in model, fetching from API...`);
        const getCoordinates = (st: StationDetail): [number, number] | null => {
          if (st.Location?.coordinates) return st.Location.coordinates as [number, number];
          if (st.location?.coordinates) return st.location.coordinates as [number, number];
          return null;
        };

        const lastCoords = getCoordinates(lastStation);
        const nextCoords = getCoordinates(nextStation);
        if (!lastCoords || !nextCoords) {
          console.error("Station missing coordinates", { lastStation, nextStation });
          return;
        }

        const segment = await fetchRouteGeometry(lastCoords, nextCoords);
        segmentCoords = segment.coordinates;
      } else {
        console.log(`✅ Using route geometry from network model`);
      }

      const newSeg: RouteSegment = {
        from: lastStationId,
        to: stationId,
        coords: segmentCoords,
      };

      setRoutes((prev) =>
        prev.map((r) =>
          r.id === route.id
            ? {
                ...r,
                stations: [...r.stations, stationId],
                segments: [...r.segments, newSeg],
              }
            : r
        )
      );
    } catch (err) {
      console.error("Fetch route failed", err);
    } finally {
      setIsFetchingSegment(false);
    }
  };

  return (
    <main className="">
      <div className="">
        <span
          role="button"
          tabIndex={0}
          onClick={() => onBack && onBack()}
          onKeyDown={(e) => e.key === "Enter" && onBack && onBack()}
          className="inline-block px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
        >
          Back
        </span>
      </div>
      <div className="flex flex-col">
        <div className="flex gap-2">
          <span
            role="button"
            tabIndex={0}
            className={`flex items-center gap-2 pl-4 pr-7 py-2 ${
              transportMode === "Route" ? "mode-selected" : "mode-unselected"
            }`}
            onClick={() => setTransportMode("Route")}
            onKeyDown={(e) => e.key === "Enter" && setTransportMode("Route")}
          >
            <svg
              width="5"
              height="25"
              viewBox="0 0 5 41"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="5" height="40.3292" fill="#81069E" />
            </svg>
            Route
          </span>
          <span
            role="button"
            tabIndex={0}
            className={`flex items-center gap-2 pl-5 pr-8 py-2 ${
              transportMode === "Bus" ? "mode-selected" : "mode-unselected"
            }`}
            onClick={() => setTransportMode("Bus")}
            onKeyDown={(e) => e.key === "Enter" && setTransportMode("Bus")}
          >
            <svg
              width="5"
              height="25"
              viewBox="0 0 5 41"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="5" height="40.3292" fill="#81069E" />
            </svg>
            Bus
          </span>
        </div>

        <div className="flex gap-4">
          <div className="side-bar h-[90vb] w-[25%]">
          {transportMode === "Route" && (
            <div className="mt-4 p-4 w-full h-[85vh] flex flex-col">
              {/* Scrollable Routes List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {routes.map((r, idx) => (
                  <div
                    key={r.id}
                    className={`bg-white rounded-xl shadow-md border border-gray-200 p-4 flex-shrink-0 ${
                      r.hidden ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        role="button"
                        tabIndex={0}
                        className="h-9 w-9 rounded-lg border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                        style={{ backgroundColor: r.color }}
                        onClick={() => cycleColor(r.id)}
                        onKeyDown={(e) => e.key === "Enter" && cycleColor(r.id)}
                        aria-label="Change color"
                      />
                      <span className="text-sm text-gray-600">Name</span>
                      <input
                        className="flex-1 border border-gray-300 rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                        value={r.name}
                        onChange={(e) => updateName(r.id, e.target.value)}
                        disabled={r.locked}
                      />
                    </div>
                    <div className="mt-3 text-sm text-gray-800 flex flex-wrap items-center gap-1">
                      {r.stations.map((s, sIdx) => (
                        <React.Fragment key={`${r.id}-st-${sIdx}`}>
                          <span className="font-medium">{getStationName(s)}</span>
                          {sIdx < r.stations.length - 1 && (
                            <span className="text-gray-500">→</span>
                          )}
                        </React.Fragment>
                      ))}
                      {r.stations.length === 0 && (
                        <span className="text-gray-400">
                          Select stations from map
                        </span>
                      )}
                    </div>
                    {idx === routes.length - 1 && r.stations.length === 0 && (
                      <div className="text-center text-gray-400 text-sm mt-2">
                        Empty
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600 ml-auto">
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Hide or show route"
                        className="hover:text-purple-700 cursor-pointer"
                        onClick={() => toggleHidden(r.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && toggleHidden(r.id)
                        }
                      >
                        {r.hidden ? "👁️‍🗨️" : "👁️"}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Lock or unlock route"
                        className="hover:text-purple-700 cursor-pointer"
                        onClick={() => toggleLocked(r.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && toggleLocked(r.id)
                        }
                      >
                        {r.locked ? "🔒" : "🔓"}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Edit route"
                        className="hover:text-purple-700 cursor-pointer"
                        onClick={() => editRoute(r.id)}
                        onKeyDown={(e) => e.key === "Enter" && editRoute(r.id)}
                      >
                        ✏️
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Delete route"
                        className="hover:text-purple-700 cursor-pointer"
                        onClick={() => removeRoute(r.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && removeRoute(r.id)
                        }
                      >
                        🗑️
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* New Route Button */}
              <div className="flex justify-center mt-4">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={addRoute}
                  onKeyDown={(e) => e.key === "Enter" && addRoute()}
                  className="inline-block px-4 py-2 bg-purple-700 text-white rounded-full shadow hover:bg-purple-800 cursor-pointer"
                >
                  New route +
                </span>
              </div>
            </div>
          )}
          {transportMode === "Bus" && (
            <div className="mt-4 p-4 w-full h-[85vh] flex flex-col">
              {/* File Upload */}
              <div className="mb-6">
                <div className="text-sm font-semibold mb-2 text-purple-700">
                  Bus Schedule (.xlsx)
                </div>
                <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center cursor-pointer hover:bg-purple-50">
                  <div className="text-gray-400">drop file (.xlsx)</div>
                </div>
              </div>

              {/* Scrollable Routes List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className="bg-white rounded-xl shadow-md border border-gray-200 p-4 flex-shrink-0"
                  >
                    <div
                      className="text-white rounded-t-lg -mx-4 -mt-4 px-4 py-3 mb-4"
                      style={{ backgroundColor: route.color }}
                    >
                      <h4 className="text-lg font-semibold">
                        Bus Information - {route.name}
                      </h4>
                    </div>

                    {/* Parameters */}
                    <div className="space-y-4">
                      {[
                        {
                          label: "Max Distance :",
                          key: "maxDistance" as const,
                          unit: "km",
                        },
                        {
                          label: "Speed :",
                          key: "speed" as const,
                          unit: "km/hr",
                        },
                        {
                          label: "Capacity :",
                          key: "capacity" as const,
                          unit: "persons",
                        },
                        {
                          label: "Max Bus :",
                          key: "maxBuses" as const,
                          unit: "buses",
                        },
                      ].map((field) => (
                        <div
                          key={field.key}
                          className="flex items-center gap-3"
                        >
                          <span className="text-sm font-medium text-gray-700 min-w-fit">
                            {field.label}
                          </span>
                          <input
                            type="number"
                            value={route[field.key] || 0}
                            onChange={(e) =>
                              updateBusInfo(
                                route.id,
                                field.key,
                                Number(e.target.value)
                              )
                            }
                            className="border border-gray-300 rounded px-3 py-1 w-20 text-center focus:outline-none focus:ring-2 focus:ring-purple-300"
                          />
                          <span className="text-sm text-gray-600">
                            {field.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

          {/* Map editor */}
          {transportMode === "Route" && (
            <div className="flex-1 h-[85vh] mt-4">
              <ScenarioMap
                stations={nodes}
                route={
                  routes.find((r) => r.id === selectedRouteId) ||
                  (routes.length ? routes[0] : null)
                }
                onSelectStation={handleSelectStationOnMap}
                onResetRoute={() =>
                  selectedRouteId && resetRoutePath(selectedRouteId)
                }
              />
              {isFetchingSegment && (
                <div className="text-sm text-gray-600 mt-2">Building route...</div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
