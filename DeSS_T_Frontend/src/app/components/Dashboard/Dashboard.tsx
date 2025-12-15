import "../../../style/Output.css";
import "../../../style/configuration.css";
import { useMemo, useState } from "react";
import LineChart from "./LineChart";
import TopRoutesChart from "./TopRoutesChart";

export default function Dashboard() {
  const [mode, setMode] = useState<
    "avg-waiting-time" | "avg-queue-length" | "avg-utilization"
  >("avg-waiting-time");

  // All available routes with colors
  const allRoutes = useMemo(
    () =>
      [
        ["1", "สาย 1", "#c084fc"],
        ["2", "สาย 2", "#2e9f4d"],
        ["3", "สาย 3", "#86efac"],
        ["4", "สาย 4", "#ef4444"],
        ["5", "สาย 5", "#fbbf24"],
        ["6", "สาย 6", "#ec4899"],
        ["7", "สาย 7", "#2747b3"],
        ["8", "สาย 8", "#87ceeb"],
        ["9", "สาย 9", "#9ca3af"],
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
    <div className="dashboard-bg ">
      <div className="flex gap-6 w-full">
        <div className="w-[50%] dashboard-block flex">
          <div className="w-[85%]">
            <div className="flex flex-wrap justify-around mb-4 mx-auto">
              <button
                type="button"
                className={`whitespace-nowrap ${
                  mode === "avg-waiting-time"
                    ? "mapareabtn_selected"
                    : "mapareabtn_unselected"
                }`}
                onClick={() => setMode("avg-waiting-time")}
              >
                Avg. Waiting Time
              </button>
              <button
                type="button"
                className={`whitespace-nowrap ${
                  mode === "avg-queue-length"
                    ? "mapareabtn_selected"
                    : "mapareabtn_unselected"
                }`}
                onClick={() => setMode("avg-queue-length")}
              >
                Avg. Queue Length
              </button>
              <button
                type="button"
                className={`whitespace-nowrap ${
                  mode === "avg-utilization"
                    ? "mapareabtn_selected"
                    : "mapareabtn_unselected"
                }`}
                onClick={() => setMode("avg-utilization")}
              >
                Avg. Utilization
              </button>
            </div>
            <div className="m-3 items-end h-full">
              <LineChart
                timeslot={15}
                route={routes}
                dataset={dataset}
                mode={mode}
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

          <TopRoutesChart route={allRoutes} customerData={customerData} limit={3} />
      </div>
    </div>
  );
}
