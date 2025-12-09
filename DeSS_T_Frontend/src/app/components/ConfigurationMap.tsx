import { useState, useEffect } from "react";
import MapViewer from "./MapViewer";
import Scenario from "./Scenario";
import ConfigurationNav from "./ConfigurationNav";
import ConfigurationFiles from "./ConfigurationFiles";
import type { StationDetail } from "../models/Network";
import type { Configuration } from "../models/Configuration";

interface ConfigurationMapProps {
  mode?: "guest" | "user";
  configurationName?: string;
}

export default function ConfigurationMap({
  mode = "guest",
  configurationName,
}: ConfigurationMapProps = {}) {
  // File upload state - cleared when going back
  const [submittedConfig, setSubmittedConfig] = useState<Configuration | null>(
    null
  );

  // Map States
  const [mapMode, setMapMode] = useState<"area" | "manual">("manual");
  const [areaCode, setAreaCode] = useState("");
  const [minLat, setMinLat] = useState(13.72);
  const [maxLat, setMaxLat] = useState(13.75);
  const [minLon, setMinLon] = useState(100.5);
  const [maxLon, setMaxLon] = useState(100.53);

  const [mapBounds, setMapBounds] = useState<
    | { minLat: number; maxLat: number; minLon: number; maxLon: number }
    | undefined
  >(undefined);

  const [mapConfirmed, setMapConfirmed] = useState(false);
  const [stationDetails, setStationDetails] = useState<StationDetail[] | null>(
    null
  );
  const [loadingStops, setLoadingStops] = useState(false);

  const resetConfirmation = () => {
    if (mapConfirmed) {
      setMapConfirmed(false);
      setMapBounds(undefined);
      setStationDetails(null);
    }
  };

  useEffect(() => {
    resetConfirmation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaCode, mapMode, minLat, maxLat, minLon, maxLon]);

  // Reset table when switching between modes
  useEffect(() => {
    setStationDetails(null);
    setLoadingStops(false);
  }, [mapMode]);

  const handleConfirmMap = async () => {
    setLoadingStops(true);
    setStationDetails(null);

    if (mapMode === "area") {
      if (areaCode.trim() === "") {
        setLoadingStops(false);
        return alert("กรุณากรอก Area Code");
      }

      try {
        const mapApi = await import("../../utility/api/mapApi");
        const bb = await mapApi.fetchAreaBounds(areaCode);

        // Fetch bus stops within the administrative area (use area query to avoid extra outside stops)
        const busStopsData = await mapApi.fetchBusStopsInArea(areaCode);

        // Build NetworkGraph with bus stops (StationDetail format)
        const stationDetails: StationDetail[] = busStopsData.map((stop) => ({
          StationID: String(stop.id),
          StationName: stop.tags?.name || `Bus Stop ${stop.id}`,
          location: { type: "Point", coordinates: [stop.lon, stop.lat] },
          Lat: String(stop.lat),
          Lon: String(stop.lon),
        }));

        setMapBounds({
          minLat: bb.minlat,
          maxLat: bb.maxlat,
          minLon: bb.minlon,
          maxLon: bb.maxlon,
        });
        setStationDetails(stationDetails);
        setMapConfirmed(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert(msg ?? "โหลด area code ไม่สำเร็จ");
      } finally {
        setLoadingStops(false);
      }

      return;
    }

    // manual lat/lon mode
    setMapBounds({ minLat, maxLat, minLon, maxLon });

    // For manual mode, also fetch bus stops and create NetworkGraph
    try {
      const mapApi = await import("../../utility/api/mapApi");
      const busStopsData = await mapApi.fetchBusStops([
        [minLat, minLon],
        [maxLat, maxLon],
      ]);

      const stationDetails: StationDetail[] = busStopsData.map((stop) => ({
        StationID: String(stop.id),
        StationName: stop.tags?.name || `Bus Stop ${stop.id}`,
        location: { type: "Point", coordinates: [stop.lon, stop.lat] },
        Lat: String(stop.lat),
        Lon: String(stop.lon),
      }));

      setStationDetails(stationDetails);
      setMapConfirmed(true);
    } catch (err: unknown) {
      console.error("Failed to fetch bus stops for manual bounds:", err);
    } finally {
      setLoadingStops(false);
    }
  };

  // Check map without confirming
  const handleCheckMap = async () => {
    setLoadingStops(true);
    setStationDetails(null);

    if (mapMode === "area") {
      if (areaCode.trim() === "") {
        setLoadingStops(false);
        return alert("กรุณากรอก Area Code");
      }

      try {
        const mapApi = await import("../../utility/api/mapApi");
        const bb = await mapApi.fetchAreaBounds(areaCode);
        const busStopsData = await mapApi.fetchBusStopsInArea(areaCode);

        const stationDetails: StationDetail[] = busStopsData.map((stop) => ({
          StationID: String(stop.id),
          StationName: stop.tags?.name || `Bus Stop ${stop.id}`,
          location: { type: "Point", coordinates: [stop.lon, stop.lat] },
          Lat: String(stop.lat),
          Lon: String(stop.lon),
        }));

        setMapBounds({
          minLat: bb.minlat,
          maxLat: bb.maxlat,
          minLon: bb.minlon,
          maxLon: bb.maxlon,
        });
        setStationDetails(stationDetails);
        // alert(`พบสถานีทั้งหมด ${stationDetails.length} แห่ง`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert(msg ?? "โหลด area code ไม่สำเร็จ");
      } finally {
        setLoadingStops(false);
      }
      return;
    }

    // manual lat/lon mode
    try {
      const mapApi = await import("../../utility/api/mapApi");
      const busStopsData = await mapApi.fetchBusStops([
        [minLat, minLon],
        [maxLat, maxLon],
      ]);

      const stationDetails: StationDetail[] = busStopsData.map((stop) => ({
        StationID: String(stop.id),
        StationName: stop.tags?.name || `Bus Stop ${stop.id}`,
        location: { type: "Point", coordinates: [stop.lon, stop.lat] },
        Lat: String(stop.lat),
        Lon: String(stop.lon),
      }));

      setMapBounds({ minLat, maxLat, minLon, maxLon });
      setStationDetails(stationDetails);
      // alert(`พบสถานีทั้งหมด ${stationDetails.length} แห่ง`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg ?? "ไม่สามารถโหลดสถานีได้");
    } finally {
      setLoadingStops(false);
    }
  };

  // Render GuestScenario if config submitted
  if (submittedConfig) {
    return (
      <Scenario
        configuration={submittedConfig}
        mode={mode}
        onBack={() => setSubmittedConfig(null)}
      />
    );
  }

  // Render file upload page if map confirmed
  if (mapConfirmed && mapBounds && stationDetails) {
    return (
      <ConfigurationFiles
        stationDetails={stationDetails}
        mapBounds={mapBounds}
        mode={mode}
        configurationName={configurationName}
        onBack={() => {
          setMapConfirmed(false);
          setMapBounds(undefined);
          setStationDetails(null);
        }}
        onSubmit={(config) => setSubmittedConfig(config)}
      />
    );
  }

  // Default: render map configuration page
  return (
    <>
      <ConfigurationNav mode={mode} configurationName={configurationName} />
      <main style={{ marginTop: "50px" }}>
        <div className="content h-full">
          <div className="flex gap-12 w-full h-full px-6 max-w-7xl mx-auto">
            {/* Left: Map */}
            <div
              className="flex-1 border rounded rounded-[25px] overflow-hidden my-8 ml-2"
              style={{ position: "relative", zIndex: 1 }}
            >
              <MapViewer
                minLat={mapBounds?.minLat}
                maxLat={mapBounds?.maxLat}
                minLon={mapBounds?.minLon}
                maxLon={mapBounds?.maxLon}
                areaCode={mapMode === "area" ? areaCode : undefined}
              />
            </div>

            {/* Right: Map Configuration */}
            <div className="flex-1 flex flex-col gap-6 h-full py-8">
              <h3 className="content_title">Map Area Configuration</h3>
              <div
                className="border border-[#81069e] rounded-[20px]  bg-white space-y-4 p-2"
                style={{ borderWidth: "2px" }}
              >
                <div className="flex">
                  <button
                    type="button"
                    aria-pressed={mapMode === "area"}
                    onClick={() => setMapMode("area")}
                    className={`${
                      mapMode === "area"
                        ? "mapareabtn_selected"
                        : "mapareabtn_unselected"
                    }`}
                  >
                    Area Code
                  </button>

                  <button
                    type="button"
                    aria-pressed={mapMode === "manual"}
                    onClick={() => setMapMode("manual")}
                    className={`${
                      mapMode === "manual"
                        ? "mapareabtn_selected"
                        : "mapareabtn_unselected"
                    }`}
                  >
                    Lat / Lon
                  </button>
                </div>
                <div>
                  {mapMode === "area" ? (
                    <input
                      type="text"
                      placeholder="กรอก area code เช่น 189632187 (มหาวิทยาลัยเชียงใหม่)"
                      value={areaCode}
                      onChange={(e) => setAreaCode(e.target.value)}
                      className="border p-3 w-[90%] rounded mx-4 mb-4"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mx-4 mb-4">
                      <input
                        type="number"
                        step="0.0001"
                        value={minLat}
                        onChange={(e) => setMinLat(parseFloat(e.target.value))}
                        className="border p-2 rounded"
                        placeholder="minLat"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        value={maxLat}
                        onChange={(e) => setMaxLat(parseFloat(e.target.value))}
                        className="border p-2 rounded"
                        placeholder="maxLat"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        value={minLon}
                        onChange={(e) => setMinLon(parseFloat(e.target.value))}
                        className="border p-2 rounded"
                        placeholder="minLon"
                      />
                      <input
                        type="number"
                        step="0.0001"
                        value={maxLon}
                        onChange={(e) => setMaxLon(parseFloat(e.target.value))}
                        className="border p-2 rounded"
                        placeholder="maxLon"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 flex gap-3 justify-end">
                <button onClick={handleCheckMap} className="btn_secondary">
                  Check Map
                </button>
                <button onClick={handleConfirmMap} className="btn_primary">
                  Confirm Map
                </button>
              </div>

              <div className="min-h-[100px]">
                {loadingStops && (
                  <div className="border rounded px-3 py-3 text-sm text-gray-600">
                    กำลังโหลดข้อมูลป้ายรถ...
                  </div>
                )}

                {!loadingStops &&
                  stationDetails &&
                  stationDetails.length > 0 && (
                    <div className="">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">Bus Stops</h4>
                        <span className="text-xs text-gray-500">
                          {stationDetails.length} stops
                        </span>
                      </div>
                      <div className="border rounded overflow-hidden max-h-64 overflow-y-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left px-3 py-2 border-b">
                                ID
                              </th>
                              <th className="text-left px-3 py-2 border-b">
                                Name
                              </th>
                              <th className="text-left px-3 py-2 border-b">
                                Lat
                              </th>
                              <th className="text-left px-3 py-2 border-b">
                                Lon
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {stationDetails.map((s) => (
                              <tr
                                key={s.StationID}
                                className="odd:bg-white even:bg-gray-50"
                              >
                                <td className="px-3 py-2 border-b align-top">
                                  {s.StationID}
                                </td>
                                <td className="px-3 py-2 border-b align-top">
                                  {s.StationName || "-"}
                                </td>
                                <td className="px-3 py-2 border-b align-top">
                                  {s.Lat}
                                </td>
                                <td className="px-3 py-2 border-b align-top">
                                  {s.Lon}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
