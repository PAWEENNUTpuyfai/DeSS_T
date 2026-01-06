import "../../../style/Output.css";
import { useMemo, useState } from "react";
import type { SimulationResponse } from "../../models/SimulationModel";
import LineChart from "./LineChart";
import TopRoutesChart from "./TopRoutesChart";
import RouteBarChart from "./RouteBarChart";

export default function Dashboard({
  simulationResponse,
}: {
  simulationResponse: SimulationResponse;
}) {
  const [moded1, setModed1] = useState<
    "avg-waiting-time" | "avg-queue-length" | "avg-utilization"
  >("avg-waiting-time");

  const [moded4, setModed4] = useState<
    "avg-traveling-time" | "avg-traveling-distance"
  >("avg-traveling-time");

  // Extract data from simulationResponse
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

    simulationResponse.simulation_result.slot_results.forEach((slot) => {
      slot.result_route.forEach((route, idx) => {
        if (!routes.find((r) => r[0] === route.route_id)) {
          routes.push([
            route.route_id,
            `${route.route_id}`,
            colors[routes.length % colors.length],
          ]);
        }
      });
    });

    return routes;
  }, [simulationResponse]);

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

  // Extract traveling time data
  const travelingTimeData: [string, number][] = useMemo(() => {
    return simulationResponse.simulation_result.slot_results
      .flatMap((slot) =>
        slot.result_route.map(
          (route) =>
            [route.route_id, route.average_travel_time] as [string, number]
        )
      )
      .reduce((acc, [routeId, time]) => {
        const existing = acc.find((item) => item[0] === routeId);
        if (existing) {
          existing[1] = (existing[1] + time) / 2;
        } else {
          acc.push([routeId, time]);
        }
        return acc;
      }, [] as [string, number][]);
  }, [simulationResponse]);

  // Extract traveling distance data
  const travelingDistanceData: [string, number][] = useMemo(() => {
    return simulationResponse.simulation_result.slot_results
      .flatMap((slot) =>
        slot.result_route.map(
          (route) =>
            [route.route_id, route.average_travel_distance] as [string, number]
        )
      )
      .reduce((acc, [routeId, distance]) => {
        const existing = acc.find((item) => item[0] === routeId);
        if (existing) {
          existing[1] = (existing[1] + distance) / 2;
        } else {
          acc.push([routeId, distance]);
        }
        return acc;
      }, [] as [string, number][]);
  }, [simulationResponse]);

  // Build dataset from slot results
  const dataset = useMemo(() => {
    const data: [string, string, number][] = [];

    simulationResponse.simulation_result.slot_results.forEach((slot) => {
      slot.result_route.forEach((route) => {
        data.push([slot.slot_name, route.route_id, route.average_queue_length]);
      });
    });

    return data;
  }, [simulationResponse]);

  // Extract summary statistics
  const summaryStats = useMemo(() => {
    const summary = simulationResponse.simulation_result.result_summary;
    return {
      avgWaitingTime: summary.average_waiting_time.toFixed(1),
      avgQueueLength: summary.average_queue_length.toFixed(1),
      avgUtilization: (summary.average_utilization * 100).toFixed(0),
      avgTravelingTime: summary.average_travel_time.toFixed(1),
      avgTravelingDistance: summary.average_travel_distance.toFixed(1),
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
                timeslot={15}
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
            customerData={customerData}
            limit={3}
          />
        </div>
      </div>

      {/* Route Bar Charts Section */}
      <div className="flex gap-3 w-full mt-3 justify-center items-stretch">
        <div className="w-[40%] dashboard-block">
          <p className="chart-header mb-2">Passenger Waiting Density</p>
          <div className="bg-gray-200 rounded flex items-center justify-center h-[90%]">
            <span className="text-gray-500">Map placeholder</span>
          </div>
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
            <p className="chart-header">{summaryStats.avgWaitingTime} mins</p>
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
            <p className="chart-header">{summaryStats.avgTravelingTime} mins</p>
            <p className="chart-context">Avg. Traveling Time</p>
          </div>
          <div className="dashboard-card flex flex-col items-center justify-center">
            <p className="chart-header">
              {summaryStats.avgTravelingDistance} km
            </p>
            <p className="chart-context">Avg. Traveling Distance</p>
          </div>
        </div>
      </div>
    </div>
  );
}
