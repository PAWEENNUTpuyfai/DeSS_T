import { useState, useEffect } from "react";
import Dashboard from "../components/Dashboard/Dashboard";
import InteractiveMap from "../components/InteractiveMap";
import type {
  SimulationResponse,
  ResultRoute,
} from "../models/SimulationModel";
import "../../style/Output.css";
import Nav from "../components/NavBar";

export type PlaybackSeed = {
  stations: Array<{ id: string; name: string; lat: number; lon: number }>;
  routes: Array<{
    id: string;
    name: string;
    color: string;
    segments: { coords: [number, number][] }[];
  }>;
  routeStations?: Array<{
    route_id: string;
    station_ids: string[];
  }>;
  simWindow?: string;
  timeSlotMinutes?: number;
  simulationResponse?: SimulationResponse | null;
  busInfo?: Array<{
    route_id: string;
    max_bus: number;
    speed: number;
    capacity: number;
  }>;
  routeResults?: ResultRoute[];
  scheduleData?: Array<{
    route_id: string;
    schedule_list: string; // Raw schedule string from Excel, e.g. "08:00,08:15,08:30..."
  }>;
};

export default function Outputpage({
  simulationResponse,
  playbackSeed,
  onBackClick,
  usermode = "guest",
}: {
  simulationResponse?: SimulationResponse;
  playbackSeed?: PlaybackSeed;
  onBackClick?: () => void;
  usermode?: "guest" | "user";
}) {
  const [mode, setMode] = useState<"dashboard" | "map">("map");

  useEffect(() => {
    console.log("simulationResponse:", simulationResponse);
  }, [simulationResponse]);

  return (
    <main>
      <Nav usermode={usermode} inpage="Output" onBackClick={onBackClick} />
      <div className="dashboard-bg flex flex-col items-center min-h-screen overflow-x-hidden">
        <div className="flex justify-between w-full items-center">
          <div className="flex gap-3 mb-4 w-full justify-start items-center">
            <button
              type="button"
              className={`px-8 ${
                mode === "map"
                  ? "output-mode-selected"
                  : "output-mode-unselected"
              }`}
              onClick={() => setMode("map")}
            >
              Interactive Map
            </button>
            <button
              type="button"
              className={`px-8 ${
                mode === "dashboard"
                  ? "output-mode-selected"
                  : "output-mode-unselected"
              }`}
              onClick={() => setMode("dashboard")}
              disabled={!simulationResponse}
              title={
                !simulationResponse ? "Run simulation to view dashboard" : ""
              }
            >
              Dashboard
            </button>
          </div>
          <div className="btn-export-pdf px-8 inline-flex items-center justify-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.6127 10.28L14.666 7.21333V20C14.666 20.3536 14.8065 20.6928 15.0565 20.9428C15.3066 21.1929 15.6457 21.3333 15.9993 21.3333C16.353 21.3333 16.6921 21.1929 16.9422 20.9428C17.1922 20.6928 17.3327 20.3536 17.3327 20V7.21333L20.386 10.28C20.51 10.405 20.6574 10.5042 20.8199 10.5718C20.9824 10.6395 21.1567 10.6744 21.3327 10.6744C21.5087 10.6744 21.683 10.6395 21.8455 10.5718C22.0079 10.5042 22.1554 10.405 22.2793 10.28C22.4043 10.156 22.5035 10.0086 22.5712 9.8461C22.6389 9.68362 22.6737 9.50934 22.6737 9.33333C22.6737 9.15731 22.6389 8.98304 22.5712 8.82056C22.5035 8.65808 22.4043 8.51061 22.2793 8.38666L16.946 3.05333C16.8192 2.93194 16.6697 2.83679 16.506 2.77333C16.1814 2.63997 15.8173 2.63997 15.4927 2.77333C15.329 2.83679 15.1795 2.93194 15.0527 3.05333L9.71935 8.38666C9.59503 8.51098 9.49642 8.65857 9.42914 8.821C9.36186 8.98342 9.32723 9.15752 9.32723 9.33333C9.32723 9.50914 9.36186 9.68323 9.42914 9.84566C9.49642 10.0081 9.59503 10.1557 9.71935 10.28C9.84367 10.4043 9.99125 10.5029 10.1537 10.5702C10.3161 10.6375 10.4902 10.6721 10.666 10.6721C10.8418 10.6721 11.0159 10.6375 11.1783 10.5702C11.3408 10.5029 11.4884 10.4043 11.6127 10.28ZM27.9993 16C27.6457 16 27.3066 16.1405 27.0565 16.3905C26.8065 16.6406 26.666 16.9797 26.666 17.3333V25.3333C26.666 25.687 26.5255 26.0261 26.2755 26.2761C26.0254 26.5262 25.6863 26.6667 25.3327 26.6667H6.66602C6.31239 26.6667 5.97326 26.5262 5.72321 26.2761C5.47316 26.0261 5.33268 25.687 5.33268 25.3333V17.3333C5.33268 16.9797 5.19221 16.6406 4.94216 16.3905C4.69211 16.1405 4.35297 16 3.99935 16C3.64573 16 3.30659 16.1405 3.05654 16.3905C2.80649 16.6406 2.66602 16.9797 2.66602 17.3333V25.3333C2.66602 26.3942 3.08744 27.4116 3.83759 28.1618C4.58773 28.9119 5.60515 29.3333 6.66602 29.3333H25.3327C26.3935 29.3333 27.411 28.9119 28.1611 28.1618C28.9113 27.4116 29.3327 26.3942 29.3327 25.3333V17.3333C29.3327 16.9797 29.1922 16.6406 28.9422 16.3905C28.6921 16.1405 28.353 16 27.9993 16Z"
                fill="#4B4B4B"
              />
            </svg>
            <p className="whitespace-nowrap">Export PDF</p>
          </div>
        </div>

        {mode === "dashboard" && simulationResponse ? (
          <Dashboard
            simulationResponse={simulationResponse}
            playbackSeed={playbackSeed}
          />
        ) : mode === "dashboard" && !simulationResponse ? (
          <div className="w-full flex justify-center items-center py-20">
            <div className="text-center text-gray-500">
              <p className="text-lg">
                Please run a simulation to view the dashboard
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <InteractiveMap
              simulationResponse={simulationResponse}
              playbackSeed={playbackSeed}
            />
          </div>
        )}
      </div>
    </main>
  );
}
