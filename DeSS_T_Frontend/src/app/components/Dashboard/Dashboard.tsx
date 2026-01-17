import "../../../style/Output.css";
import { useEffect, useMemo, useState } from "react";
import type { SimulationResponse } from "../../models/SimulationModel";
import type { PlaybackSeed } from "../../pages/Outputpage";
import { analyzeSimulationResponse, compareWithScenario } from "../../utility/simulationDebug";
import LineChart from "./LineChart";
import TopRoutesChart from "./TopRoutesChart";
import RouteBarChart from "./RouteBarChart";
import PassengerWaitingHeatmap from "./PassengerWaitingHeatmap";

export default function Dashboard({
  simulationResponse,
  playbackSeed,
}: {
  simulationResponse: SimulationResponse;
  playbackSeed?: PlaybackSeed;
}) {
  const [moded1, setModed1] = useState<
    "avg-waiting-time" | "avg-queue-length" | "avg-utilization"
  >("avg-waiting-time");

  const [moded4, setModed4] = useState<
    "avg-traveling-time" | "avg-traveling-distance"
  >("avg-traveling-time");

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
          const nameMatch = route.route_id.match(/^(.*?)(?:-scenario-detail-|-bus-scenario-|-\d{13,})/i);
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
      (playbackSeed?.routes ?? []).map((r) => [r.name, { color: r.color, id: r.id }])
    );

    simulationResponse.simulation_result.slot_results.forEach((slot) => {
      slot.result_route.forEach((route) => {
        if (!routes.find((r) => r[0] === route.route_id)) {
          // Extract route name from backend's route_id
          const nameMatch = route.route_id.match(/^(.*?)(?:-scenario-detail-|-bus-scenario-|-\d{13,})/i);
          const extractedName = nameMatch ? nameMatch[1].trim() : route.route_id;
          
          // Try to find matching seed route by name
          const seedRoute = seedRoutesByName.get(extractedName);
          const displayName = seedRoute ? extractedName : (playbackSeed?.routes?.[routes.length]?.name || extractedName);
          const color = seedRoute?.color || (playbackSeed?.routes?.[routes.length]?.color) || colors[routes.length % colors.length];
          
          routes.push([
            route.route_id,
            displayName,
            color,
          ]);
        }
      });
    });

    return routes;
  }, [simulationResponse, playbackSeed?.routes]);

  // Track selected routes
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>(() =>
    allRoutes.slice(0, 2).map((r) => r[0])
  );

  // Filter routes for display
  const routes = useMemo(
    () => allRoutes.filter((r) => selectedRoutes.includes(r[0])),
    [selectedRoutes, allRoutes]
  );

  // Toggle route selection
  const toggleRoute = (routeId: string) => {
    setSelectedRoutes((prev) =>
      prev.includes(routeId)
        ? prev.filter((id) => id !== routeId)
        : [...prev, routeId]
    );
  };

  // Extract customer data from simulationResponse
  const customerData: [string, number][] = useMemo(() => {
    return simulationResponse.simulation_result.slot_results.flatMap((slot) =>
      slot.result_route.map(
        (route) => [route.route_id, route.customers_count] as [string, number]
      )
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
          routeTimeMap.set(route.route_id, { sum: route.average_travel_time, count: 1 });
        }
      });
    });
    
    const result = Array.from(routeTimeMap.entries()).map(([routeId, data]) => [
      routeId,
      data.count > 0 ? data.sum / data.count : 0,
    ] as [string, number]);
    
    console.log('⏱️ RouteBarChart Time Data:', {
      raw: result,
      inMinutes: result.map(([id, seconds]) => [id, (seconds / 60).toFixed(2) + ' mins']),
      sample: simulationResponse.simulation_result.slot_results.slice(0, 2).map(s => ({
        slot: s.slot_name,
        routes: s.result_route.map(r => ({
          id: r.route_id,
          time_seconds: r.average_travel_time,
          time_minutes: (r.average_travel_time / 60).toFixed(2)
        }))
      }))
    });
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
          routeDistanceMap.set(route.route_id, { sum: route.average_travel_distance, count: 1 });
        }
      });
    });
    
    const result = Array.from(routeDistanceMap.entries()).map(([routeId, data]) => [
      routeId,
      data.count > 0 ? data.sum / data.count : 0,
    ] as [string, number]);
    
    console.log('🚗 RouteBarChart Distance Data:', {
      raw: result,
      inKm: result.map(([id, meters]) => [id, (meters / 1000).toFixed(2) + ' km']),
      sample: simulationResponse.simulation_result.slot_results.slice(0, 2).map(s => ({
        slot: s.slot_name,
        routes: s.result_route.map(r => ({
          id: r.route_id,
          distance_meters: r.average_travel_distance,
          distance_km: (r.average_travel_distance / 1000).toFixed(2)
        }))
      }))
    });
    return result;
  }, [simulationResponse]);

  // Build dataset from slot results based on selected mode
  const dataset = useMemo(() => {
    const data: [string, string, number][] = [];

    simulationResponse.simulation_result.slot_results.forEach((slot) => {
      slot.result_route.forEach((route) => {
        let value: number;
        switch (moded1) {
          case "avg-waiting-time":
            // Convert seconds to minutes
            value = route.average_waiting_time / 60;
            break;
          case "avg-queue-length":
            value = route.average_queue_length;
            break;
          case "avg-utilization":
            // Convert to percentage
            value = route.average_utilization * 100;
            break;
          default:
            value = route.average_queue_length;
        }
        
        // Extract start time from range format (e.g., "08:00-08:15" -> "08:00")
        const timeStr = slot.slot_name.split("-")[0].trim();
        data.push([timeStr, route.route_id, value]);
      });
    });

    console.log('📊 LineChart Dataset:', {
      mode: moded1,
      dataPoints: data.length,
      routes: Array.from(new Set(data.map(d => d[1]))),
      sample: data.slice(0, 5),
      values: data.slice(0, 5).map(d => d[2]),
      rawData: simulationResponse.simulation_result.slot_results.slice(0, 2).map(s => ({
        slot: s.slot_name,
        routes: s.result_route.map(r => ({
          id: r.route_id,
          waiting: r.average_waiting_time,
          queue: r.average_queue_length,
          util: r.average_utilization
        }))
      }))
    });
    return data;
  }, [simulationResponse, moded1]);

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
    const waitingTimeDisplay = waitingTimeMinutes > 1 
      ? `${waitingTimeMinutes.toFixed(1)} mins`
      : `${summary.average_waiting_time.toFixed(1)} mins`;
    
    // Convert traveling time from seconds to minutes
    const travelingTimeMinutes = summary.average_travel_time / 60;
    const travelingTimeDisplay = travelingTimeMinutes > 1
      ? `${travelingTimeMinutes.toFixed(1)} mins`
      : `${summary.average_travel_time.toFixed(1)} mins`;
    
    // Convert traveling distance from meters to km
    const travelingDistanceKm = summary.average_travel_distance / 1000;
    const travelingDistanceDisplay = travelingDistanceKm > 1
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
    <div className="w-[100vw] flex flex-col ">
      <div className="flex gap-3 w-full justify-center items-stretch">
        <div className="w-[50%] dashboard-block flex">
          <div className="w-[85%]">
            <div className="flex flex-wrap mx-auto gap-4">
              <button
                type="button"
                className={`whitespace-nowrap ${
                  moded1 === "avg-waiting-time"
                    ? "dashboard-btn_selected"
                    : "dashboard-btn_unselected"
                }`}
                onClick={() => setModed1("avg-waiting-time")}
              >
                Avg. Waiting Time
              </button>
              <button
                type="button"
                className={`whitespace-nowrap ${
                  moded1 === "avg-queue-length"
                    ? "dashboard-btn_selected"
                    : "dashboard-btn_unselected"
                }`}
                onClick={() => setModed1("avg-queue-length")}
              >
                Avg. Queue Length
              </button>
              <button
                type="button"
                className={`whitespace-nowrap ${
                  moded1 === "avg-utilization"
                    ? "dashboard-btn_selected"
                    : "dashboard-btn_unselected"
                }`}
                onClick={() => setModed1("avg-utilization")}
              >
                Avg. Utilization
              </button>
            </div>
            <div className="m-3 items-end h-full">
              <LineChart
                timeslot={timeslot}
                route={routes}
                dataset={dataset}
                mode={moded1}
              />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center w-[15%]">
            <div className="legend-container p-3 flex-col justify-center items-center mx-auto overflow-y-auto max-h-[600px]">
              {allRoutes.map(([id, name, color]) => (
                <label
                  key={id}
                  className="flex items-center gap-1 p-1 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <span
                    onClick={() => toggleRoute(id)}
                    className={`inline-block w-4 h-4 rounded cursor-pointer transition-all ${
                      selectedRoutes.includes(id) ? "" : "bg-white"
                    }`}
                    style={
                      selectedRoutes.includes(id)
                        ? { backgroundColor: color }
                        : { border: `2px solid ${color}` }
                    }
                  ></span>
                  <span className="text-sm">{name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="w-[45%] dashboard-block flex flex-col">
          <p className="chart-header mb-2">
            Top 3 : Most popular line by customer
          </p>
          <TopRoutesChart
            route={allRoutes}
            customerData={aggregatedCustomerData}
            limit={3}
          />
        </div>
      </div>

      {/* Route Bar Charts Section */}
      <div className="flex gap-3 w-full mt-3 justify-center items-stretch">
        <div className="w-[40%] dashboard-block">
          <p className="chart-header mb-2">Passenger Waiting Density</p>
          <PassengerWaitingHeatmap
            simulationResponse={simulationResponse}
            stations={playbackSeed?.stations ?? []}
          />
        </div>
        <div className="w-[40%] dashboard-block">
          <div className="flex flex-wrap mb-4 mx-auto gap-4">
            <button
              type="button"
              className={`whitespace-nowrap ${
                moded4 === "avg-traveling-time"
                  ? "dashboard-btn_selected"
                  : "dashboard-btn_unselected"
              }`}
              onClick={() => setModed4("avg-traveling-time")}
            >
              Avg. Traveling Time
            </button>
            <button
              type="button"
              className={`whitespace-nowrap ${
                moded4 === "avg-traveling-distance"
                  ? "dashboard-btn_selected"
                  : "dashboard-btn_unselected"
              }`}
              onClick={() => setModed4("avg-traveling-distance")}
            >
              Avg. Traveling Distance
            </button>
          </div>
          <RouteBarChart
            route={allRoutes}
            dataset={
              moded4 === "avg-traveling-time"
                ? travelingTimeData
                : travelingDistanceData
            }
            mode={moded4}
          />
        </div>
        <div className="w-[14%] flex flex-col justify-between">
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
      </div>
    </div>
  );
}
