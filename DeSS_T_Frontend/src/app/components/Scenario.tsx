import React, { useMemo, useState } from "react";
import type { Configuration } from "../models/Configuration";
import type { StationDetail, StationPair } from "../models/Network";
import ScenarioMap from "./ScenarioMap";
import type { RouteSegment } from "./ScenarioMap";
import { computeRouteSegments } from "../../utility/api/routeBatch";
import { saveRoutes } from "../../utility/api/routeSave";
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
  const [originalStations, setOriginalStations] = useState<Record<string, string[]>>({});

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
    const route = routes.find(r => r.id === routeId);
    if (route) {
      // Save original stations before editing
      setOriginalStations(prev => ({ ...prev, [routeId]: [...route.stations] }));
      // Clear stations to start from scratch
      setRoutes(prev =>
        prev.map(r => (r.id === routeId ? { ...r, stations: [], segments: [] } : r))
      );
      setSelectedRouteId(routeId);
    }
  };

  const confirmEdit = async (routeId: string) => {
    // Fetch route geometry for all consecutive station pairs
    const route = routes.find((r) => r.id === routeId);
    if (!route || route.stations.length < 2) {
      // No stations to build route, just exit editing
      setSelectedRouteId(null);
      setOriginalStations(prev => {
        const newState = { ...prev };
        delete newState[routeId];
        return newState;
      });
      return;
    }

    setIsFetchingSegment(true);
    try {
      // Build input points for backend: [lon,lat]
      const pickCoord = (st: StationDetail): [number, number] | null => {
        if ((st as any).Location?.coordinates) return (st as any).Location.coordinates as [number, number];
        if ((st as any).location?.coordinates) return (st as any).location.coordinates as [number, number];
        return null;
      };

      const points = route.stations
        .map((id) => {
          const st = nodes.find((n) => n.StationID === id);
          const coord = st ? pickCoord(st) : null;
          return coord ? { id, coord } : null;
        })
        .filter((p): p is { id: string; coord: [number, number] } => !!p);

      if (points.length < 2) {
        throw new Error("Not enough stations with coordinates to build route");
      }

      const apiSegments = await computeRouteSegments(points);
      const newSegments: RouteSegment[] = apiSegments.map((s) => ({
        from: s.from,
        to: s.to,
        coords: s.coords,
      }));

      // Update route with all segments
      setRoutes((prev) =>
        prev.map((r) => (r.id === routeId ? { ...r, segments: newSegments } : r))
      );

      // Clear editing state
      setSelectedRouteId(null);
      setOriginalStations(prev => {
        const newState = { ...prev };
        delete newState[routeId];
        return newState;
      });
    } catch (err) {
      console.error("Failed to build route geometry", err);
    } finally {
      setIsFetchingSegment(false);
    }
  };

  const cancelEdit = (routeId: string) => {
    // Restore original stations
    const original = originalStations[routeId];
    if (original) {
      setRoutes(prev =>
        prev.map(r => (r.id === routeId ? { ...r, stations: original } : r))
      );
    }
    setSelectedRouteId(null);
    setOriginalStations(prev => {
      const newState = { ...prev };
      delete newState[routeId];
      return newState;
    });
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

  const handleSelectStationOnMap = (stationId: string) => {
    if (!selectedRouteId) return;
    const route = routes.find((r) => r.id === selectedRouteId);
    if (!route || route.locked) return;

    // If already in the route, don't add again
    if (route.stations.includes(stationId)) return;

    // Just add the station without fetching geometry yet
    // Geometry will be fetched when confirm is clicked
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === route.id ? { ...r, stations: [...r.stations, stationId] } : r
      )
    );
  };

  const handleSelectStationDisabled = () => {
    // Do nothing - other routes disabled during edit mode
    return;
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
                {routes.map((r, idx) => {
                  const isLocked = r.locked;
                  const isHidden = r.hidden;
                  const isBeingEdited = selectedRouteId === r.id;
                  const isOtherRouteBeingEdited = selectedRouteId !== null && selectedRouteId !== r.id;
                  const isDisabled = isLocked || isHidden || isOtherRouteBeingEdited;
                  const bodyStyle = {
                    opacity: isDisabled ? 0.5 : 1,
                    pointerEvents: isDisabled ? "none" : "auto",
                  } as const;

                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border border-gray-200 overflow-hidden"
                    >
                      {/* Top row: Eye icon on left purple bg | Rest on white bg */}
                      <div className="flex">
                        {/* Left: Eye icon with purple background, rounded left corners, shadow */}
                        <div className="flex items-center justify-center px-3 py-3 rounded-tl-xl rounded-bl-xl shadow-md" style={{ backgroundColor: "#81069E" }}>
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label="Hide or show route"
                            className="hover:opacity-80 cursor-pointer text-white text-lg"
                            onClick={() => toggleHidden(r.id)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && toggleHidden(r.id)
                            }
                          >
                            {r.hidden ? "👁️‍🗨️" : "👁️"}
                          </span>
                        </div>
                        
                        {/* Right: Color, Name, Lock, Edit, Delete on white bg, rounded right top and bottom, shadow */}
                        <div
                          className="flex-1 flex items-center gap-2 px-4 py-3 bg-white rounded-tr-xl rounded-br-xl shadow-md"
                          style={bodyStyle}
                        >
                          <span
                            role="button"
                            tabIndex={0}
                            className={`h-7 w-7 rounded border border-gray-300 flex-shrink-0 ${
                              isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:opacity-80"
                            }`}
                            style={{ backgroundColor: r.color }}
                            onClick={() => !isDisabled && cycleColor(r.id)}
                            onKeyDown={(e) => e.key === "Enter" && !isDisabled && cycleColor(r.id)}
                            aria-label="Change color"
                            aria-disabled={isDisabled}
                          />
                          <input
                            className="flex-1 border border-gray-300 rounded-full px-3 py-1 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                            placeholder="Route name"
                            value={r.name}
                            onChange={(e) => updateName(r.id, e.target.value)}
                            disabled={isDisabled}
                          />
                          {selectedRouteId === r.id ? (
                            <>
                              <button
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded-full hover:bg-green-700 transition-colors disabled:opacity-50"
                                onClick={() => confirmEdit(r.id)}
                                disabled={isFetchingSegment}
                              >
                                {isFetchingSegment ? "⏳ Building..." : "Confirm"}
                              </button>
                              <button
                                className="px-3 py-1 bg-gray-500 text-white text-xs rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50"
                                onClick={() => cancelEdit(r.id)}
                                disabled={isFetchingSegment}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <span
                                role="button"
                                tabIndex={0}
                                aria-label="Lock or unlock route"
                                className="hover:text-purple-700 cursor-pointer text-gray-600"
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
                                className={`text-gray-600 ${
                                  isDisabled ? "opacity-50 cursor-not-allowed" : "hover:text-purple-700 cursor-pointer"
                                }`}
                                onClick={() => !isDisabled && editRoute(r.id)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && !isDisabled && editRoute(r.id)
                                }
                                aria-disabled={isDisabled}
                              >
                                ✏️
                              </span>
                              <span
                                role="button"
                                tabIndex={0}
                                aria-label="Delete route"
                                className={`text-gray-600 ${
                                  isDisabled ? "opacity-50 cursor-not-allowed" : "hover:text-purple-700 cursor-pointer"
                                }`}
                                onClick={() => !isDisabled && removeRoute(r.id)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && !isDisabled && removeRoute(r.id)
                                }
                                aria-disabled={isDisabled}
                              >
                                🗑️
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bottom row: Station names with light gray background */}
                      <div
                        className="text-sm text-gray-800 flex flex-wrap items-center gap-1 min-h-[32px] px-4 py-2"
                        style={{ backgroundColor: "#F4F4F4", ...bodyStyle }}
                      >
                        {r.stations.length > 0 ? (
                          r.stations.map((s, sIdx) => (
                            <React.Fragment key={`${r.id}-st-${sIdx}`}>
                              <span className="font-medium">{getStationName(s)}</span>
                              {sIdx < r.stations.length - 1 && (
                                <span className="text-gray-500">→</span>
                              )}
                            </React.Fragment>
                          ))
                        ) : (
                          <span className="text-gray-400 italic w-full text-center">
                            empty
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                {routes.map((route) => {
                  const busLocked = route.locked;
                  const busCardStyle = {
                    opacity: busLocked ? 0.5 : 1,
                    pointerEvents: busLocked ? "none" : "auto",
                  } as const;

                  return (
                    <div
                      key={route.id}
                      className="bg-white rounded-xl shadow-md border border-gray-200 p-4 flex-shrink-0"
                      style={busCardStyle}
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
                              disabled={busLocked}
                              className="border border-gray-300 rounded px-3 py-1 w-20 text-center focus:outline-none focus:ring-2 focus:ring-purple-300"
                            />
                            <span className="text-sm text-gray-600">
                              {field.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

          {/* Shared map for both Route and Bus modes */}
          <div className="flex-1 h-[85vh] mt-4">
            <ScenarioMap
              stations={nodes}
              route={
                transportMode === "Route"
                  ? routes.find((r) => r.id === selectedRouteId) ||
                    (routes.length ? routes[0] : null)
                  : null
              }
              allRoutes={
                transportMode === "Route"
                  ? routes.filter(r => !r.hidden && r.id !== selectedRouteId)
                  : routes.filter(r => !r.hidden)
              }
              onSelectStation={transportMode === "Route" && selectedRouteId ? handleSelectStationOnMap : handleSelectStationDisabled}
              onResetRoute={() =>
                selectedRouteId && resetRoutePath(selectedRouteId)
              }
              isEditingMode={transportMode === "Route" && !!selectedRouteId}
            />
            {isFetchingSegment && transportMode === "Route" && (
              <div className="text-sm text-gray-600 mt-2">Building route...</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
