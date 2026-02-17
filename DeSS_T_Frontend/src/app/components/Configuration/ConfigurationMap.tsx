import { useState, useEffect } from "react";
import MapViewer from "../MapViewer";
import Scenario from "../Scenario";
import ConfigurationFiles from "./ConfigurationFiles";
import LoadingModal from "../LoadingModal";
import type { StationDetail } from "../../models/Network";
import HelpButton from "../HelpButton";
import type { ConfigurationDetail } from "../../models/Configuration";
import Nav from "../NavBar";
import "../../../style/configuration.css";

interface ConfigurationMapProps {
  usermode?: "guest" | "user";
  configurationName?: string;
  configuration?: ConfigurationDetail;
}

export default function ConfigurationMap({
  usermode = "guest",
  configurationName,
}: ConfigurationMapProps = {}) {
  // File upload state - cleared when going back
  const [submittedConfig, setSubmittedConfig] =
    useState<ConfigurationDetail | null>(null);

  // Map States
  const [mapMode, setMapMode] = useState<"area" | "manual">("area");
  const [areaCode, setAreaCode] = useState("189632187");
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
    null,
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
    // Keep current stationDetails while loading to avoid flicker

    if (mapMode === "area") {
      if (areaCode.trim() === "") {
        setLoadingStops(false);
        return alert("กรุณากรอก Area Code");
      }

      try {
        const mapApi = await import("../../../utility/api/mapApi");
        const bb = await mapApi.fetchAreaBounds(areaCode);

        // Fetch bus stops within the administrative area (use area query to avoid extra outside stops)
        const busStopsData = await mapApi.fetchBusStopsInArea(areaCode);

        // Build NetworkGraph with bus stops (StationDetail format)
        const stationDetails: StationDetail[] = busStopsData.map((stop) => ({
          station_detail_id: String(stop.id),
          name: String(
            typeof stop.tags?.name === "string"
              ? stop.tags.name
              : (stop.tags?.name ?? `Bus Stop ${stop.id}`),
          ),
          location: {
            type: "Point",
            coordinates: [stop.lon, stop.lat],
          },
          lat: stop.lat,
          lon: stop.lon,
          station_id_osm: String(stop.id),
        }));

        setMapBounds({
          minLat: bb.minlat,
          maxLat: bb.maxlat,
          minLon: bb.minlon,
          maxLon: bb.maxlon,
        });

        // Validate if stations were found
        if (stationDetails.length === 0) {
          alert("ไม่พบสถานีรถเมล์ในพื้นที่นี้ กรุณาเลือกพื้นที่อื่น");
          setLoadingStops(false);
          return;
        }

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
      const mapApi = await import("../../../utility/api/mapApi");
      const busStopsData = await mapApi.fetchBusStops([
        [minLat, minLon],
        [maxLat, maxLon],
      ]);

      const stationDetails: StationDetail[] = busStopsData.map((stop) => ({
        station_detail_id: String(stop.id),
        name: String(
          typeof stop.tags?.name === "string"
            ? stop.tags.name
            : (stop.tags?.name ?? `Bus Stop ${stop.id}`),
        ),
        location: {
          type: "Point",
          coordinates: [stop.lon, stop.lat],
        },
        lat: stop.lat,
        lon: stop.lon,
        station_id_osm: String(stop.id),
      }));

      // Validate if stations were found
      if (stationDetails.length === 0) {
        alert("ไม่พบสถานีรถเมล์ในพื้นที่นี้ กรุณาเลือกพื้นที่อื่น");
        setLoadingStops(false);
        return;
      }

      setStationDetails(stationDetails);
      setMapConfirmed(true);
    } catch (err: unknown) {
      console.error("Failed to fetch bus stops for manual bounds:", err);
      alert(
        "ไม่สามารถโหลดสถานีได้: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
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
        const mapApi = await import("../../../utility/api/mapApi");
        const bb = await mapApi.fetchAreaBounds(areaCode);
        const busStopsData = await mapApi.fetchBusStopsInArea(areaCode);

        const stationDetails: StationDetail[] = busStopsData.map((stop) => ({
          station_detail_id: String(stop.id),
          name: String(
            typeof stop.tags?.name === "string"
              ? stop.tags.name
              : (stop.tags?.name ?? `Bus Stop ${stop.id}`),
          ),
          location: {
            type: "Point",
            coordinates: [stop.lon, stop.lat],
          },
          lat: stop.lat,
          lon: stop.lon,
          station_id_osm: String(stop.id),
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
      const mapApi = await import("../../../utility/api/mapApi");
      const busStopsData = await mapApi.fetchBusStops([
        [minLat, minLon],
        [maxLat, maxLon],
      ]);

      const stationDetails: StationDetail[] = busStopsData.map((stop) => ({
        station_detail_id: String(stop.id),
        name: String(
          typeof stop.tags?.name === "string"
            ? stop.tags.name
            : (stop.tags?.name ?? `Bus Stop ${stop.id}`),
        ),
        location: {
          type: "Point",
          coordinates: [stop.lon, stop.lat],
        },
        lat: stop.lat,
        lon: stop.lon,
        station_id_osm: String(stop.id),
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

  const onBackClick = () => {
    if (usermode === "guest") {
      window.location.href = "/guest/decision";
      return;
    }
  };

  // Render GuestScenario if config submitted
  if (submittedConfig) {
    return (
      <Scenario
        configuration={submittedConfig}
        usermode={usermode}
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
        usermode={usermode}
        configurationName={configurationName}
        onBack={() => {
          setMapConfirmed(false);
          setMapBounds(undefined);
          setStationDetails(null);
        }}
        onBackClick={onBackClick}
        OnBackScenario={onBackClick}
        onSubmit={(config) => setSubmittedConfig(config)}
      />
    );
  }

  // Default: render map configuration page
  return (
    <>
      <Nav
        usermode={usermode}
        inpage="Configuration"
        configurationName={configurationName}
        onBackClick={onBackClick}
      />
      <main>
        <div className="h-[12vh]"></div>
        <div className="content h-full mx-auto">
          <div className="flex gap-12 w-full h-full px-6 max-w-7xl mx-auto">
            {/* Left: Map */}
            <div
              className="flex-1 border rounded-[25px] overflow-hidden my-8 ml-2"
              style={{ position: "relative", zIndex: 1 }}
            >
              <MapViewer
                minLat={mapBounds?.minLat}
                maxLat={mapBounds?.maxLat}
                minLon={mapBounds?.minLon}
                maxLon={mapBounds?.maxLon}
                areaCode={mapMode === "area" ? areaCode : undefined}
                stationDetails={stationDetails || undefined}
              />
            </div>

            {/* Right: Map Configuration */}
            <div className="flex-1 flex flex-col gap-3 h-full py-6">
              <div className="flex justify-between items-center mt-2 pr-1">
                <h3 className="content_title">Map Area Configuration</h3>{" "}
                <HelpButton helpType="Map" />
              </div>
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
                    area code
                  </button>

                  <button
                    type="button"
                    aria-pressed={mapMode === "manual"}
                    onClick={() => setMapMode("manual")}
                    className={`ml-2 ${
                      mapMode === "manual"
                        ? "mapareabtn_selected"
                        : "mapareabtn_unselected"
                    }`}
                  >
                    coordinate
                  </button>
                </div>
                <div>
                  {mapMode === "area" ? (
                    <input
                      type="text"
                      placeholder="e.g. 189632187 (Chiang Mai University)"
                      value={areaCode}
                      onChange={(e) => setAreaCode(e.target.value)}
                      className="border p-3 w-[90%] rounded-[20px] mx-4 mb-4 bg-white"
                    />
                  ) : (
                    <div className="mx-4 mb-4">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-start-2 flex flex-col items-center">
                          <label className="text-xs text-gray-600 mb-1">
                            North - Max Latitude
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={maxLat}
                            onChange={(e) =>
                              setMaxLat(parseFloat(e.target.value))
                            }
                            className="border p-2 rounded-[20px] bg-white w-full"
                            placeholder="Max Lat"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="flex flex-col items-center">
                          <label className="text-xs text-gray-600 mb-1">
                            West - Min Longitude
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={minLon}
                            onChange={(e) =>
                              setMinLon(parseFloat(e.target.value))
                            }
                            className="border p-2 rounded-[20px] bg-white w-full"
                            placeholder="Min Lon"
                          />
                        </div>
                        <div className="flex items-center justify-center">
                          <span className="text-gray-400 text-sm">
                            Map Area
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <label className="text-xs text-gray-600 mb-1">
                            East - Max Longitude
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={maxLon}
                            onChange={(e) =>
                              setMaxLon(parseFloat(e.target.value))
                            }
                            className="border p-2 rounded-[20px] bg-white w-full"
                            placeholder="Max Lon"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="col-start-2 flex flex-col items-center">
                          <label className="text-xs text-gray-600 mb-1">
                            South - Min Latitude
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={minLat}
                            onChange={(e) =>
                              setMinLat(parseFloat(e.target.value))
                            }
                            className="border p-2 rounded-[20px] bg-white w-full"
                            placeholder="Min Lat"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-4 mb-2">
                <h3 className="content_title">Station Lists</h3>
                {stationDetails && stationDetails.length > 0 && (
                  <span className="text-sm text-gray-600 mr-2">
                    Total: {stationDetails.length} stations
                  </span>
                )}
              </div>
              <div
                className="border border-[#81069e] rounded-[20px]  bg-white space-y-4 p-2"
                style={{ borderWidth: "2px" }}
              >
                {loadingStops && (
                  <div className="border rounded px-3 py-3 text-sm text-gray-600">
                    Loading data ...
                  </div>
                )}

                {!loadingStops && !stationDetails && (
                  <div className="px-3 py-3 text-sm text-gray-600 flex gap-2">
                    Click <p className="text-[#81069e]">Check Map</p> to display
                    station list
                  </div>
                )}

                {!loadingStops &&
                  stationDetails &&
                  stationDetails.length > 0 && (
                    <div className="">
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
                                key={s.station_detail_id}
                                className="odd:bg-white even:bg-gray-50"
                              >
                                <td className="px-3 py-2 border-b align-top">
                                  {s.station_detail_id}
                                </td>
                                <td className="px-3 py-2 border-b align-top">
                                  {s.name || "-"}
                                </td>
                                <td className="px-3 py-2 border-b align-top">
                                  {s.lat}
                                </td>
                                <td className="px-3 py-2 border-b align-top">
                                  {s.lon}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>

              <div className="mt-2 flex gap-3 justify-end">
                <button onClick={handleCheckMap} className="btn_secondary">
                  Check Map
                </button>
                <button onClick={handleConfirmMap} className="btn_primary">
                  Confirm Map
                </button>
              </div>
            </div>
          </div>
        </div>

        <LoadingModal isOpen={loadingStops} message="Loading data..." />
      </main>
    </>
  );
}
