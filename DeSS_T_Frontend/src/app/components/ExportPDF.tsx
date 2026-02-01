import "../../style/pdf.css";
import "../../style/Output.css";
import type { SimulationResponse } from "../models/SimulationModel";
import type { PlaybackSeed } from "../pages/Outputpage";
import {
  analyzeSimulationResponse,
  compareWithScenario,
} from "../utility/simulationDebug";
import { useEffect, useMemo, useState } from "react";
import LineChart from "./Dashboard/LineChart";
import RouteBarChart from "./Dashboard/RouteBarChart";
import PassengerWaitingHeatmap from "./Dashboard/PassengerWaitingHeatmap";
import TopRoutesChart from "./Dashboard/TopRoutesChart";
import Nav from "./NavBar";

export default function ExportPDF({
  simulationResponse,
  playbackSeed,
  onBackClick,
  usermode = "user",
}: {
  simulationResponse: SimulationResponse;
  playbackSeed?: PlaybackSeed;
  onBackClick?: () => void;
  usermode?: "guest" | "user";
}) {
  // Validate that simulation routes match what user configured in Scenario
  useEffect(() => {
    // Analyze simulation response structure
    analyzeSimulationResponse(simulationResponse);

    // Compare with scenario
    if (simulationResponse && playbackSeed?.routes) {
      const scenarioRouteIds = playbackSeed.routes.map((r) => r.id);
      compareWithScenario(simulationResponse, scenarioRouteIds);
    }

    if (!simulationResponse || !playbackSeed?.routes) return;

    const seedRoutes = playbackSeed.routes;
    const seedRouteNames = new Set(seedRoutes.map((r) => r.name));

    // Extract unique routes from simulation
    const simRouteSet = new Map<string, string>();
    simulationResponse.simulation_result.slot_results.forEach((slot) => {
      slot.result_route.forEach((route) => {
        if (!simRouteSet.has(route.route_id)) {
          // Extract route name from route_id (backend may append suffixes)
          const nameMatch = route.route_id.match(
            /^(.*?)(?:-scenario-detail-|-bus-scenario-|-\d{13,})/i,
          );
          const routeName = nameMatch ? nameMatch[1].trim() : route.route_id;
          simRouteSet.set(route.route_id, routeName);
        }
      });
    });

    const simRouteNames = new Set(Array.from(simRouteSet.values()));
    const missingRoutes: string[] = [];
    const unexpectedRoutes: string[] = [];

    seedRoutes.forEach((r) => {
      if (!simRouteNames.has(r.name)) {
        missingRoutes.push(r.name);
      }
    });

    simRouteNames.forEach((name) => {
      if (!seedRouteNames.has(name)) {
        unexpectedRoutes.push(name);
      }
    });
  }, [simulationResponse, playbackSeed?.routes]);

  // Extract data from simulationResponse, using route names from playbackSeed
  const allRoutes = useMemo(() => {
    const routes: [string, string, string][] = [];
    const colors = [
      "#76218a",
      "#3a8345",
      "#49fd36",
      "#f80512",
      "#f7bc16",
      "#fc2898",
      "#0e16b2",
      "#83c8f9",
      "#7a644e",
    ];

    // Build route map from playbackSeed by name for matching
    const seedRoutesByName = new Map(
      (playbackSeed?.routes ?? []).map((r) => [
        r.name,
        { color: r.color, id: r.id },
      ]),
    );

    simulationResponse.simulation_result.slot_results.forEach((slot) => {
      slot.result_route.forEach((route) => {
        if (!routes.find((r) => r[0] === route.route_id)) {
          // Extract route name from backend's route_id
          const nameMatch = route.route_id.match(
            /^(.*?)(?:-scenario-detail-|-bus-scenario-|-\d{13,})/i,
          );
          const extractedName = nameMatch
            ? nameMatch[1].trim()
            : route.route_id;

          // Try to find matching seed route by name
          const seedRoute = seedRoutesByName.get(extractedName);
          const displayName = seedRoute
            ? extractedName
            : playbackSeed?.routes?.[routes.length]?.name || extractedName;
          const color =
            seedRoute?.color ||
            playbackSeed?.routes?.[routes.length]?.color ||
            colors[routes.length % colors.length];

          routes.push([route.route_id, displayName, color]);
        }
      });
    });

    return routes;
  }, [simulationResponse, playbackSeed?.routes]);

  // Track selected routes
  const [selectedRoutes] = useState<string[]>(() => allRoutes.map((r) => r[0]));

  // Filter routes for display
  const routes = useMemo(
    () => allRoutes.filter((r) => selectedRoutes.includes(r[0])),
    [selectedRoutes, allRoutes],
  );

  // Extract customer data from simulationResponse
  const customerData: [string, number][] = useMemo(() => {
    return simulationResponse.simulation_result.slot_results.flatMap((slot) =>
      slot.result_route.map(
        (route) => [route.route_id, route.customers_count] as [string, number],
      ),
    );
  }, [simulationResponse]);

  // Aggregate customer data by route (sum across all time slots)
  const aggregatedCustomerData: [string, number][] = useMemo(() => {
    const map = new Map<string, number>();
    customerData.forEach(([routeId, count]) => {
      map.set(routeId, (map.get(routeId) || 0) + count);
    });
    return Array.from(map.entries());
  }, [customerData]);

  // Extract traveling time data
  const travelingTimeData: [string, number][] = useMemo(() => {
    const routeTimeMap = new Map<string, { sum: number; count: number }>();

    simulationResponse.simulation_result.slot_results.forEach((slot) => {
      slot.result_route.forEach((route) => {
        // Skip slots with 0 or near-zero values (no real data)
        if (route.average_travel_time <= 0) return;

        const existing = routeTimeMap.get(route.route_id);
        if (existing) {
          existing.sum += route.average_travel_time;
          existing.count += 1;
        } else {
          routeTimeMap.set(route.route_id, {
            sum: route.average_travel_time,
            count: 1,
          });
        }
      });
    });

    const result = Array.from(routeTimeMap.entries()).map(
      ([routeId, data]) =>
        [routeId, data.count > 0 ? data.sum / data.count : 0] as [
          string,
          number,
        ],
    );
    return result;
  }, [simulationResponse]);

  // Extract traveling distance data
  const travelingDistanceData: [string, number][] = useMemo(() => {
    const routeDistanceMap = new Map<string, { sum: number; count: number }>();

    simulationResponse.simulation_result.slot_results.forEach((slot) => {
      slot.result_route.forEach((route) => {
        // Skip slots with 0 or near-zero values (no real data)
        if (route.average_travel_distance <= 0) return;

        const existing = routeDistanceMap.get(route.route_id);
        if (existing) {
          existing.sum += route.average_travel_distance;
          existing.count += 1;
        } else {
          routeDistanceMap.set(route.route_id, {
            sum: route.average_travel_distance,
            count: 1,
          });
        }
      });
    });

    const result = Array.from(routeDistanceMap.entries()).map(
      ([routeId, data]) =>
        [routeId, data.count > 0 ? data.sum / data.count : 0] as [
          string,
          number,
        ],
    );
    return result;
  }, [simulationResponse]);

  // Build separate datasets for each metric
  const avgWaitingTimeDataset = useMemo(() => {
    const data: [string, string, number][] = [];

    simulationResponse.simulation_result.slot_results.forEach((slot) => {
      slot.result_route.forEach((route) => {
        // Convert seconds to minutes
        const value = route.average_waiting_time / 60;
        const timeStr = slot.slot_name.split("-")[0].trim();
        data.push([timeStr, route.route_id, value]);
      });
    });

    return data;
  }, [simulationResponse]);

  const avgQueueLengthDataset = useMemo(() => {
    const data: [string, string, number][] = [];

    simulationResponse.simulation_result.slot_results.forEach((slot) => {
      slot.result_route.forEach((route) => {
        const value = route.average_queue_length;
        const timeStr = slot.slot_name.split("-")[0].trim();
        data.push([timeStr, route.route_id, value]);
      });
    });

    return data;
  }, [simulationResponse]);

  const avgUtilizationDataset = useMemo(() => {
    const data: [string, string, number][] = [];

    simulationResponse.simulation_result.slot_results.forEach((slot) => {
      slot.result_route.forEach((route) => {
        // Convert to percentage
        const value = route.average_utilization * 100;
        const timeStr = slot.slot_name.split("-")[0].trim();
        data.push([timeStr, route.route_id, value]);
      });
    });

    return data;
  }, [simulationResponse]);

  // Filter datasets by selected routes
  const filteredAvgWaitingTimeDataset = useMemo(() => {
    return avgWaitingTimeDataset.filter(([, routeId]) =>
      selectedRoutes.includes(routeId),
    );
  }, [avgWaitingTimeDataset, selectedRoutes]);

  const filteredAvgQueueLengthDataset = useMemo(() => {
    return avgQueueLengthDataset.filter(([, routeId]) =>
      selectedRoutes.includes(routeId),
    );
  }, [avgQueueLengthDataset, selectedRoutes]);

  const filteredAvgUtilizationDataset = useMemo(() => {
    return avgUtilizationDataset.filter(([, routeId]) =>
      selectedRoutes.includes(routeId),
    );
  }, [avgUtilizationDataset, selectedRoutes]);

  const filteredTravelingTimeData = useMemo(() => {
    return travelingTimeData.filter(([routeId]) =>
      selectedRoutes.includes(routeId),
    );
  }, [travelingTimeData, selectedRoutes]);

  const filteredTravelingDistanceData = useMemo(() => {
    return travelingDistanceData.filter(([routeId]) =>
      selectedRoutes.includes(routeId),
    );
  }, [travelingDistanceData, selectedRoutes]);

  // Extract timeslot from simulation data (assume consistent intervals)
  const timeslot = useMemo(() => {
    const slots = simulationResponse.simulation_result.slot_results;

    if (slots.length < 2) return 15; // default 15 minutes

    // Parse time slots (e.g., "08:00-08:15", "08:15-08:30")
    // Extract start time from range format
    const parseTime = (timeStr: string): number => {
      const firstTime = timeStr.split("-")[0].trim();
      const [h, m] = firstTime.split(":").map(Number);
      return h * 60 + m;
    };

    const first = parseTime(slots[0].slot_name);
    const second = parseTime(slots[1].slot_name);
    const interval = second - first;
    return interval > 0 ? interval : 15;
  }, [simulationResponse]);

  // Extract summary statistics
  const summaryStats = useMemo(() => {
    const summary = simulationResponse.simulation_result.result_summary;

    // Convert waiting time from seconds to minutes (or keep as seconds if very small)
    const waitingTimeMinutes = summary.average_waiting_time / 60;
    const waitingTimeDisplay =
      waitingTimeMinutes > 1
        ? `${waitingTimeMinutes.toFixed(1)} mins`
        : `${summary.average_waiting_time.toFixed(1)} mins`;

    // Convert traveling time from seconds to minutes
    const travelingTimeMinutes = summary.average_travel_time / 60;
    const travelingTimeDisplay =
      travelingTimeMinutes > 1
        ? `${travelingTimeMinutes.toFixed(1)} mins`
        : `${summary.average_travel_time.toFixed(1)} mins`;

    // Convert traveling distance from meters to km
    const travelingDistanceKm = summary.average_travel_distance / 1000;
    const travelingDistanceDisplay =
      travelingDistanceKm > 1
        ? `${travelingDistanceKm.toFixed(1)} km`
        : `${summary.average_travel_distance.toFixed(1)} m`;

    return {
      avgWaitingTime: waitingTimeDisplay,
      avgQueueLength: summary.average_queue_length.toFixed(1),
      avgUtilization: (summary.average_utilization * 100).toFixed(0),
      avgTravelingTime: travelingTimeDisplay,
      avgTravelingDistance: travelingDistanceDisplay,
    };
  }, [simulationResponse]);

  // Extract time slot data for tabular display
  const timeSlotData = useMemo(() => {
    return simulationResponse.simulation_result.slot_results.map((slot) => ({
      slotName: slot.slot_name,
      routes: slot.result_route.map((route) => {
        const routeInfo = routes.find((r) => r[0] === route.route_id);
        return {
          routeId: route.route_id,
          routeName: routeInfo?.[1] || route.route_id,
          routeColor: routeInfo?.[2] || "#9ca3af",
          avgWaitingTime: (route.average_waiting_time / 60).toFixed(1),
          avgQueueLength: route.average_queue_length.toFixed(1),
          avgUtilization: (route.average_utilization * 100).toFixed(0),
        };
      }),
    }));
  }, [simulationResponse, routes]);

  // Extract simulation period info
  const simulationPeriod = useMemo(() => {
    const slots = simulationResponse.simulation_result.slot_results;
    if (slots.length === 0) return "N/A";

    const firstSlot = slots[0].slot_name;
    const lastSlot = slots[slots.length - 1].slot_name;

    // Extract start time from first slot and end time from last slot
    const startTime = firstSlot.split("-")[0].trim();
    const endTime =
      lastSlot.split("-")[1]?.trim() || lastSlot.split("-")[0].trim();

    return `${startTime} - ${endTime}`;
  }, [simulationResponse]);

  // Extract station time-based data for tabular display
  const stationTimeSlotData = useMemo(() => {
    const stationMap = new Map<string, string>();
    (playbackSeed?.stations ?? []).forEach((s) => {
      stationMap.set(s.id, s.name);
    });

    return simulationResponse.simulation_result.slot_results.map((slot) => ({
      slotName: slot.slot_name,
      stations: (slot.result_station ?? []).map((station) => ({
        stationId: station.station_name,
        stationName:
          stationMap.get(station.station_name) ?? station.station_name,
        avgWaitingTime: (station.average_waiting_time / 60).toFixed(1),
        avgQueueLength: station.average_queue_length.toFixed(1),
      })),
    }));
  }, [simulationResponse, playbackSeed?.stations]);

  return (
    <main>
      <Nav usermode={usermode} inpage="Output" onBackClick={onBackClick} />
      <div className="pdf-wrapper">
        {/* Page 1 - Header & Overall Statistics & Heatmap */}
        <div className="page">
          <h1 className="text-bold text-center mb-6">Simulation Report</h1>

          <div className="mb-6 text-center">
            <div className="text-lg mb-2">
              <span className="font-semibold">Simulation Period:</span>{" "}
              {simulationPeriod}
            </div>
            <div className="text-lg">
              <span className="font-semibold">Time Slot:</span> {timeslot}{" "}
              minutes
            </div>
          </div>

          <h2 className="text-[#81069e] mb-4">Overall Statistics</h2>
          <div className="grid grid-cols-5 gap-2 mb-6">
            <div className="dashboard-card flex flex-col items-center justify-center">
              <p className="chart-header">{summaryStats.avgWaitingTime}</p>
              <p className="chart-context">Avg. Waiting Time</p>
            </div>
            <div className="dashboard-card flex flex-col items-center justify-center">
              <p className="chart-header">{summaryStats.avgQueueLength}</p>
              <p className="chart-context">Avg. Queue Length</p>
            </div>
            <div className="dashboard-card flex flex-col items-center justify-center">
              <p className="chart-header">{summaryStats.avgUtilization}%</p>
              <p className="chart-context">Avg. Utilization</p>
            </div>
            <div className="dashboard-card flex flex-col items-center justify-center">
              <p className="chart-header">{summaryStats.avgTravelingTime}</p>
              <p className="chart-context">Avg. Traveling Time</p>
            </div>
            <div className="dashboard-card flex flex-col items-center justify-center">
              <p className="chart-header">
                {summaryStats.avgTravelingDistance}
              </p>
              <p className="chart-context">Avg. Traveling Distance</p>
            </div>
          </div>

          <h2 className="text-[#81069e] mb-3">Passenger Waiting Density</h2>
          <div
            className="mb-4 border border-gray-200 rounded-lg overflow-hidden"
            style={{ height: 280 }}
          >
            <PassengerWaitingHeatmap
              simulationResponse={simulationResponse}
              stations={playbackSeed?.stations ?? []}
            />
          </div>
          <div className="text-sm text-gray-700 mb-4 leading-relaxed">
            <p className="mb-2">
              <strong>Heatmap Legend:</strong> The heatmap visualizes passenger
              waiting patterns across all stations:
            </p>
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="mb-3">
                <div className="text-sm mb-2">Queue Length (Color)</div>
                <div className="flex items-center gap-2 ml-8">
                  <span className="text-xs text-gray-600">Low</span>
                  <div
                    className="flex-1 h-4 rounded"
                    style={{
                      background:
                        "linear-gradient(to right, #0096ff, #00ff00, #ffff00, #ff8800, #ff0000)",
                    }}
                  ></div>
                  <span className="text-xs text-gray-600">High</span>
                </div>
              </div>
              <div>
                <div className="text-sm mb-2">Waiting Time (Blur Width)</div>
                <p className="text-xs text-gray-600 ml-8">
                  Thicker/wider blur = longer waiting time
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Page 2 - Route Statistics */}
        <div className="page">
          <h2 className="text-[#81069e] mb-4">Route Statistics</h2>

          <h3
            style={{
              fontSize: "16px",
              marginBottom: "12px",
              fontWeight: "600",
            }}
          >
            All Lines: Most Popular by Customer
          </h3>
          <div className="mb-6">
            <TopRoutesChart
              route={routes}
              customerData={aggregatedCustomerData}
              limit={routes.length}
            />
          </div>

          <h3
            style={{
              fontSize: "16px",
              marginBottom: "12px",
              fontWeight: "600",
            }}
          >
            Average Traveling Time
          </h3>
          <div className="mb-6">
            <RouteBarChart
              route={routes}
              dataset={filteredTravelingTimeData}
              mode="avg-traveling-time"
              compactMode={true}
            />
          </div>

          <h3
            style={{
              fontSize: "16px",
              marginBottom: "12px",
              fontWeight: "600",
            }}
          >
            Average Traveling Distance
          </h3>
          <div className="mb-4">
            <RouteBarChart
              route={routes}
              dataset={filteredTravelingDistanceData}
              mode="avg-traveling-distance"
              compactMode={true}
            />
          </div>
        </div>

        {/* Page 3+ - Time-based Statistics (Tabular) */}
        <div className="page">
          <h2 className="text-[#81069e] mb-4">Time-based Statistics</h2>

          <div className="space-y-4">
            {timeSlotData.map((slot, slotIdx) => (
              <div
                key={`slot-${slotIdx}`}
                className="border-b border-gray-300 pb-3"
              >
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: "bold",
                    marginBottom: "10px",
                    color: "#1e40af",
                  }}
                >
                  {slot.slotName}
                </h3>
                <div className="space-y-2">
                  {slot.routes.map((route, routeIdx) => (
                    <div key={`route-${slotIdx}-${routeIdx}`} className="ml-4">
                      <div
                        className="font-semibold mb-1 flex items-center gap-2"
                        style={{ color: route.routeColor, fontSize: "14px" }}
                      >
                        <span
                          className="inline-block rounded-full"
                          style={{
                            backgroundColor: route.routeColor,
                            width: "10px",
                            height: "10px",
                          }}
                        ></span>
                        {route.routeName}
                      </div>
                      <div
                        className="ml-5 grid grid-cols-3 gap-3"
                        style={{ fontSize: "12px" }}
                      >
                        <div>
                          <span className="text-gray-600">
                            Avg. Waiting Time:
                          </span>{" "}
                          <span className="font-medium">
                            {route.avgWaitingTime} mins
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            Avg. Queue Length:
                          </span>{" "}
                          <span className="font-medium">
                            {route.avgQueueLength} persons
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            Avg. Utilization:
                          </span>{" "}
                          <span className="font-medium">
                            {route.avgUtilization}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Page 4 - Line Charts */}
        <div className="page">
          <h2 className="text-[#81069e] mb-4">Time Series Analysis</h2>

          <div className="no-break" style={{ marginBottom: "20px" }}>
            <h3
              style={{
                fontSize: "16px",
                marginBottom: "10px",
                fontWeight: "600",
              }}
            >
              Average Waiting Time
            </h3>
            <LineChart
              timeslot={timeslot}
              route={routes}
              dataset={filteredAvgWaitingTimeDataset}
              mode="avg-waiting-time"
              compactMode={true}
            />
          </div>

          <div className="no-break" style={{ marginBottom: "20px" }}>
            <h3
              style={{
                fontSize: "16px",
                marginBottom: "10px",
                fontWeight: "600",
              }}
            >
              Average Queue Length
            </h3>
            <LineChart
              timeslot={timeslot}
              route={routes}
              dataset={filteredAvgQueueLengthDataset}
              mode="avg-queue-length"
              compactMode={true}
            />
          </div>

          <div className="no-break" style={{ marginBottom: "20px" }}>
            <h3
              style={{
                fontSize: "16px",
                marginBottom: "10px",
                fontWeight: "600",
              }}
            >
              Average Utilization
            </h3>
            <LineChart
              timeslot={timeslot}
              route={routes}
              dataset={filteredAvgUtilizationDataset}
              mode="avg-utilization"
              compactMode={true}
            />
          </div>
        </div>

        {/* Page 5 - Station Time-based Statistics */}
        <div className="page">
          <h2 className="text-[#81069e] mb-4">
            Station Statistics (Time-based)
          </h2>

          <div className="space-y-6">
            {stationTimeSlotData.map((slot, slotIdx) => {
              // Calculate average of all stations for this time slot
              const avgOfAllStations =
                slot.stations.length > 0
                  ? {
                      avgWaitingTime: (
                        slot.stations.reduce(
                          (sum, s) => sum + parseFloat(s.avgWaitingTime),
                          0,
                        ) / slot.stations.length
                      ).toFixed(1),
                      avgQueueLength: (
                        slot.stations.reduce(
                          (sum, s) => sum + parseFloat(s.avgQueueLength),
                          0,
                        ) / slot.stations.length
                      ).toFixed(1),
                    }
                  : { avgWaitingTime: "0.0", avgQueueLength: "0.0" };

              return (
                <div
                  key={`station-slot-${slotIdx}`}
                  className="border-b border-gray-300 pb-4"
                >
                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: "bold",
                      marginBottom: "10px",
                      color: "#1e40af",
                    }}
                  >
                    {slot.slotName}
                  </h3>

                  {/* Average of All Stations */}
                  <div className="bg-blue-50 border border-blue-200 rounded px-4 py-3 mb-3">
                    <div
                      className="font-semibold text-blue-900 mb-2"
                      style={{ fontSize: "13px" }}
                    >
                      Average of All Stations
                    </div>
                    <div
                      className="grid grid-cols-2 gap-4"
                      style={{ fontSize: "12px" }}
                    >
                      <div>
                        <span className="text-gray-700">
                          • Avg. Waiting Time:
                        </span>{" "}
                        <span className="font-medium text-blue-900">
                          {avgOfAllStations.avgWaitingTime} mins
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-700">
                          • Avg. Queue Length:
                        </span>{" "}
                        <span className="font-medium text-blue-900">
                          {avgOfAllStations.avgQueueLength} persons
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Station Details Table */}
                  <div className="overflow-hidden rounded border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2">Station Name</th>
                          <th className="text-left px-3 py-2">
                            Avg. Waiting Time
                          </th>
                          <th className="text-left px-3 py-2">
                            Avg. Queue Length
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {slot.stations.map((station, stationIdx) => (
                          <tr
                            key={`station-${slotIdx}-${stationIdx}`}
                            className="border-t"
                          >
                            <td className="px-3 py-2">{station.stationName}</td>
                            <td className="px-3 py-2">
                              {station.avgWaitingTime} mins
                            </td>
                            <td className="px-3 py-2">
                              {station.avgQueueLength} persons
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Print button (hidden when printing) */}
        <div className="no-print" style={{ padding: 20 }}>
          <button onClick={() => window.print()}>Export PDF</button>
        </div>
      </div>
    </main>
  );
}
