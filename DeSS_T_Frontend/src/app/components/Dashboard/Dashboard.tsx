import "../../../style/Output.css";
import { useMemo, useState } from "react";
import LineChart from "./LineChart";
import TopRoutesChart from "./TopRoutesChart";
import RouteBarChart from "./RouteBarChart";

export default function Dashboard() {
  const [moded1, setModed1] = useState<
    "avg-waiting-time" | "avg-queue-length" | "avg-utilization"
  >("avg-waiting-time");

  const [moded4, setModed4] = useState<
    "avg-traveling-time" | "avg-traveling-distance"
  >("avg-traveling-time");

  // All available routes with colors
  const allRoutes = useMemo(
    () =>
      [
        ["1", "สาย 1", "#76218a"],
        ["2", "สาย 2", "#3a8345"],
        ["3", "สาย 3", "#49fd36"],
        ["4", "สาย 4", "#f80512"],
        ["5", "สาย 5", "#f7bc16"],
        ["6", "สาย 6", "#fc2898"],
        ["7", "สาย 7", "#0e16b2"],
        ["8", "สาย 8", "#83c8f9"],
        ["9", "สาย 9", "#7a644e"],
      ] as [string, string, string][],
    []
  );

  // Track selected routes
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>(["2", "7"]);

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

  // Sample customer data for TopRoutesChart
  const customerData: [string, number][] = [
    ["2", 500],
    ["7", 380],
    ["4", 320],
    ["1", 280],
    ["5", 1250],
  ];

  // Mock data for RouteBarChart (avg traveling time in minutes)
  const travelingTimeData: [string, number][] = [
    ["1", 18.5],
    ["2", 15.2],
    ["3", 9.3],
    ["4", 21.0],
    ["5", 12.8],
    ["6", 8.9],
    ["7", 6.5],
    ["8", 18.2],
    ["9", 19.5],
  ];

  // Mock data for RouteBarChart (avg traveling distance in km)
  const travelingDistanceData: [string, number][] = [
    ["1", 12.5],
    ["2", 10.2],
    ["3", 8.3],
    ["4", 15.8],
    ["5", 9.7],
    ["6", 7.2],
    ["7", 5.8],
    ["8", 11.9],
    ["9", 13.2],
  ];

  const dataset = useMemo(
    () =>
      [
        // Route 1
        ["08:00", "1", 2.1],
        ["08:15", "1", 2.3],
        ["08:30", "1", 1.9],
        ["08:45", "1", 2.5],
        ["09:00", "1", 2.2],
        ["09:15", "1", 2.6],
        ["09:30", "1", 2.8],
        ["09:45", "1", 2.4],
        ["10:00", "1", 2.7],
        ["10:15", "1", 2.5],
        ["10:30", "1", 2.3],
        ["10:45", "1", 2.4],
        ["11:00", "1", 2.1],
        ["11:15", "1", 2.8],
        ["11:30", "1", 2.6],
        ["11:45", "1", 2.2],
        ["12:00", "1", 2.4],
        // Route 2
        ["08:00", "2", 3.5],
        ["08:15", "2", 3.2],
        ["08:30", "2", 3.0],
        ["08:45", "2", 2.1],
        ["09:00", "2", 3.4],
        ["09:15", "2", 2.9],
        ["09:30", "2", 3.8],
        ["09:45", "2", 3.6],
        ["10:00", "2", 3.9],
        ["10:15", "2", 3.5],
        ["10:30", "2", 3.4],
        ["10:45", "2", 2.9],
        ["11:00", "2", 3.1],
        ["11:15", "2", 3.3],
        ["11:30", "2", 2.4],
        ["11:45", "2", 2.2],
        ["12:00", "2", 3.3],
        // Route 3
        ["08:00", "3", 1.8],
        ["08:15", "3", 1.9],
        ["08:30", "3", 2.1],
        ["08:45", "3", 1.7],
        ["09:00", "3", 2.2],
        ["09:15", "3", 1.8],
        ["09:30", "3", 2.3],
        ["09:45", "3", 2.0],
        ["10:00", "3", 2.1],
        ["10:15", "3", 1.9],
        ["10:30", "3", 2.2],
        ["10:45", "3", 2.0],
        ["11:00", "3", 1.8],
        ["11:15", "3", 2.1],
        ["11:30", "3", 1.9],
        ["11:45", "3", 2.0],
        ["12:00", "3", 1.7],
        // Route 4
        ["08:00", "4", 2.9],
        ["08:15", "4", 3.0],
        ["08:30", "4", 2.8],
        ["08:45", "4", 3.1],
        ["09:00", "4", 2.6],
        ["09:15", "4", 2.9],
        ["09:30", "4", 3.2],
        ["09:45", "4", 2.8],
        ["10:00", "4", 3.0],
        ["10:15", "4", 2.9],
        ["10:30", "4", 3.1],
        ["10:45", "4", 2.7],
        ["11:00", "4", 2.9],
        ["11:15", "4", 3.0],
        ["11:30", "4", 2.8],
        ["11:45", "4", 2.6],
        ["12:00", "4", 2.9],
        // Route 5
        ["08:00", "5", 3.2],
        ["08:15", "5", 3.1],
        ["08:30", "5", 3.3],
        ["08:45", "5", 3.0],
        ["09:00", "5", 3.4],
        ["09:15", "5", 3.2],
        ["09:30", "5", 3.5],
        ["09:45", "5", 3.3],
        ["10:00", "5", 3.6],
        ["10:15", "5", 3.4],
        ["10:30", "5", 3.2],
        ["10:45", "5", 3.3],
        ["11:00", "5", 3.1],
        ["11:15", "5", 3.2],
        ["11:30", "5", 3.0],
        ["11:45", "5", 3.1],
        ["12:00", "5", 3.3],
        // Route 6
        ["08:00", "6", 2.4],
        ["08:15", "6", 2.5],
        ["08:30", "6", 2.3],
        ["08:45", "6", 2.6],
        ["09:00", "6", 2.2],
        ["09:15", "6", 2.4],
        ["09:30", "6", 2.7],
        ["09:45", "6", 2.5],
        ["10:00", "6", 2.6],
        ["10:15", "6", 2.4],
        ["10:30", "6", 2.3],
        ["10:45", "6", 2.5],
        ["11:00", "6", 2.2],
        ["11:15", "6", 2.4],
        ["11:30", "6", 2.3],
        ["11:45", "6", 2.1],
        ["12:00", "6", 2.2],
        // Route 7
        ["08:00", "7", 2.8],
        ["08:15", "7", 2.1],
        ["08:30", "7", 2.4],
        ["08:45", "7", 3.2],
        ["09:00", "7", 2.5],
        ["09:15", "7", 2.3],
        ["09:30", "7", 2.0],
        ["09:45", "7", 3.0],
        ["10:00", "7", 2.8],
        ["10:15", "7", 2.6],
        ["10:30", "7", 2.2],
        ["10:45", "7", 2.5],
        ["11:00", "7", 1.6],
        ["11:15", "7", 2.7],
        ["11:30", "7", 2.1],
        ["11:45", "7", 2.9],
        ["12:00", "7", 1.7],
        // Route 8
        ["08:00", "8", 1.9],
        ["08:15", "8", 2.0],
        ["08:30", "8", 1.8],
        ["08:45", "8", 2.1],
        ["09:00", "8", 1.9],
        ["09:15", "8", 2.0],
        ["09:30", "8", 1.8],
        ["09:45", "8", 2.2],
        ["10:00", "8", 2.0],
        ["10:15", "8", 1.9],
        ["10:30", "8", 2.1],
        ["10:45", "8", 1.8],
        ["11:00", "8", 1.9],
        ["11:15", "8", 2.0],
        ["11:30", "8", 1.8],
        ["11:45", "8", 2.1],
        ["12:00", "8", 1.7],
        // Route 9
        ["08:00", "9", 2.5],
        ["08:15", "9", 2.6],
        ["08:30", "9", 2.4],
        ["08:45", "9", 2.7],
        ["09:00", "9", 2.3],
        ["09:15", "9", 2.5],
        ["09:30", "9", 2.8],
        ["09:45", "9", 2.6],
        ["10:00", "9", 2.7],
        ["10:15", "9", 2.5],
        ["10:30", "9", 2.4],
        ["10:45", "9", 2.6],
        ["11:00", "9", 2.2],
        ["11:15", "9", 2.5],
        ["11:30", "9", 2.3],
        ["11:45", "9", 2.4],
        ["12:00", "9", 2.2],
      ] as [string, string, number][],
    []
  );

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
            <p className="chart-header">13 mins</p>
            <p className="chart-context">Avg. Waiting Time</p>
          </div>
          <div className="dashboard-card flex flex-col items-center justify-center">
            <p className="chart-header">5 persons</p>
            <p className="chart-context">Avg. Queue Length</p>
          </div>
          <div className="dashboard-card flex flex-col items-center justify-center">
            <p className="chart-header">24%</p>
            <p className="chart-context">Avg. Utilization</p>
          </div>
          <div className="dashboard-card flex flex-col items-center justify-center">
            <p className="chart-header">18 mins</p>
            <p className="chart-context">Avg. Traveling Time</p>
          </div>
          <div className="dashboard-card flex flex-col items-center justify-center">
            <p className="chart-header">48 km</p>
            <p className="chart-context">Avg. Traveling Distance</p>
          </div>
        </div>
      </div>
    </div>
  );
}
