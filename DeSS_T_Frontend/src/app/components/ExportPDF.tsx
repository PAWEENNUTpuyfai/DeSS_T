import "../../style/pdf.css";
import "../../style/Output.css";
import type { SimulationResponse } from "../models/SimulationModel";
import type { PlaybackSeed } from "../pages/Outputpage";
import {
  analyzeSimulationResponse,
  compareWithScenario,
} from "../utility/simulationDebug";
import { useEffect, useMemo, useState } from "react";

export default function ExportPDF({
  simulationResponse,
  playbackSeed,
}: {
  simulationResponse: SimulationResponse;
  playbackSeed?: PlaybackSeed;
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
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>(() =>
    allRoutes.map((r) => r[0]),
  );

  // Filter routes for display
  const routes = useMemo(
    () => allRoutes.filter((r) => selectedRoutes.includes(r[0])),
    [selectedRoutes, allRoutes],
  );

  // Toggle route selection
  const toggleRoute = (routeId: string) => {
    setSelectedRoutes((prev) =>
      prev.includes(routeId)
        ? prev.filter((id) => id !== routeId)
        : [...prev, routeId],
    );
  };

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
  return (
    <div className="pdf-wrapper">
      <div className="page">
        <h1 className="text-bold">Simulation Report</h1>
        <h2 className="text-[#81069e]">Overall Statistics</h2>
        <div className="w-full flex justify-center gap-2 mb-4">
          <div className="dashboard-card flex flex-col items-center justify-center">
            <p className="chart-header">{summaryStats.avgWaitingTime}</p>
            <p className="chart-context">Avg. Waiting Time</p>
          </div>
          <div className="dashboard-card flex flex-col items-center justify-center">
            <p className="chart-header">
              {summaryStats.avgQueueLength} persons
            </p>
            <p className="chart-context">Avg. Queue Length</p>
          </div>
        </div>
        <div className="w-full flex justify-center gap-2 mb-4">
          <div className="dashboard-card flex flex-col items-center justify-center">
            <p className="chart-header">{summaryStats.avgUtilization}%</p>
            <p className="chart-context">Avg. Utilization</p>
          </div>
          <div className="dashboard-card flex flex-col items-center justify-center">
            <p className="chart-header">{summaryStats.avgTravelingTime}</p>
            <p className="chart-context">Avg. Traveling Time</p>
          </div>
          <div className="dashboard-card flex flex-col items-center justify-center">
            <p className="chart-header">{summaryStats.avgTravelingDistance}</p>
            <p className="chart-context">Avg. Traveling Distance</p>
          </div>
        </div>

        <div className="no-break">
          <h2>Summary</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </div>

        <div className="no-break">
          <h2>Statistics</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 15 }).map((_, i) => (
                <tr key={i}>
                  <td>Item {i + 1}</td>
                  <td>{Math.floor(Math.random() * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Page 2 */}
      <div className="page">
        <h2>Detail</h2>
        <p>This content will always start on a new A4 page.</p>
      </div>

      {/* Print button (hidden when printing) */}
      <div className="no-print" style={{ padding: 20 }}>
        <button onClick={() => window.print()}>Export PDF</button>
      </div>
    </div>
  );
}
