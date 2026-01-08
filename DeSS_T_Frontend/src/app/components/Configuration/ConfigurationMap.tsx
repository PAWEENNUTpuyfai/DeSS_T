import { useState, useEffect } from "react";
import MapViewer from "../MapViewer";
import Scenario from "../Scenario";
import ConfigurationNav from "./ConfigurationNav";
import ConfigurationFiles from "./ConfigurationFiles";
import LoadingModal from "../LoadingModal";
import type { StationDetail } from "../../models/Network";
import HelpButton from "../HelpButton";
import type { Configuration } from "../../models/Configuration";

interface ConfigurationMapProps {
  mode?: "guest" | "user";
  configurationName?: string;
  configurationid?: string;
}

export default function ConfigurationMap({
  mode = "guest",
  configurationName,
  configurationid
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
  const [stationOrder, setStationOrder] = useState<string[]>([]); // Array of station_detail_ids in order

  const resetConfirmation = () => {
    if (mapConfirmed) {
      setMapConfirmed(false);
      setMapBounds(undefined);
      setStationDetails(null);
      setStationOrder([]);
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
    setStationOrder([]);
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
              : stop.tags?.name ?? `Bus Stop ${stop.id}`
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
        const areaOrder = stationDetails.map(s => s.station_detail_id || '');
        setStationOrder(areaOrder);
        console.log('📍 Area Mode - Stations Loaded:', areaOrder);
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
            : stop.tags?.name ?? `Bus Stop ${stop.id}`
        ),
        location: {
          type: "Point",
          coordinates: [stop.lon, stop.lat],
        },
        lat: stop.lat,
        lon: stop.lon,
        station_id_osm: String(stop.id),
      }));

      setStationDetails(stationDetails);      
      const newOrder = stationDetails.map(s => s.station_detail_id || '');
      setStationOrder(newOrder);
      console.log('📍 Manual Mode - Stations Loaded:', newOrder);
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
        const mapApi = await import("../../../utility/api/mapApi");
        const bb = await mapApi.fetchAreaBounds(areaCode);
        const busStopsData = await mapApi.fetchBusStopsInArea(areaCode);

        const stationDetails: StationDetail[] = busStopsData.map((stop) => ({
          station_detail_id: String(stop.id),
          name: String(
            typeof stop.tags?.name === "string"
              ? stop.tags.name
              : stop.tags?.name ?? `Bus Stop ${stop.id}`
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
        const newOrder = stationDetails.map(s => s.station_detail_id || '');
        setStationOrder(newOrder);
        console.log('🔍 Check Map (Area) - Stations:', newOrder);
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
            : stop.tags?.name ?? `Bus Stop ${stop.id}`
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
      const newOrder = stationDetails.map(s => s.station_detail_id || '');
      setStationOrder(newOrder);
      console.log('🔍 Check Map (Manual) - Stations:', newOrder);
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
    // Reorder stations based on stationOrder before passing to ConfigurationFiles
    const orderedStations = stationOrder
      .map(id => stationDetails.find(s => s.station_detail_id === id))
      .filter((s): s is StationDetail => s !== undefined);

    console.log('✅ Passing to ConfigurationFiles - Final Order:', stationOrder);
    console.log('   Ordered Stations:', orderedStations.map(s => ({ id: s.station_detail_id, name: s.name })));

    return (
      <ConfigurationFiles
        stationDetails={orderedStations}
        mapBounds={mapBounds}
        mode={mode}
        configurationName={configurationName}
        onBack={() => {
          setMapConfirmed(false);
          setMapBounds(undefined);
          setStationDetails(null);
          setStationOrder([]);
        }}
        onSubmit={(config) => setSubmittedConfig(config)}
      />
    );
  }

  // Default: render map configuration page
  return (
    <>
      <ConfigurationNav mode={mode} configurationName={configurationName} />
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
                      <div className="mb-2 px-3 py-2 bg-blue-50 rounded text-sm">
                        <strong>Tip:</strong> Drag rows to reorder stations for route planning
                      </div>
                      <div className="border rounded overflow-hidden max-h-64 overflow-y-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left px-3 py-2 border-b">
                                Order
                              </th>
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
                            {stationOrder.map((stationId, idx) => {
                              const s = stationDetails.find(st => st.station_detail_id === stationId);
                              if (!s) return null;
                              return (
                                <tr
                                  key={stationId}
                                  className="odd:bg-white even:bg-gray-50 cursor-move hover:bg-gray-100"
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData("text/plain", String(idx));
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
                                    const toIdx = idx;
                                    if (fromIdx === toIdx) return;
                                    const newOrder = [...stationOrder];
                                    const [moved] = newOrder.splice(fromIdx, 1);
                                    newOrder.splice(toIdx, 0, moved);
                                    setStationOrder(newOrder);
                                    console.log('🔄 Order Changed - From:', fromIdx, 'To:', toIdx, 'New Order:', newOrder);
                                  }}
                                >
                                  <td className="px-3 py-2 border-b align-top font-semibold">
                                    {idx + 1}
                                  </td>
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
                              );
                            })}
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
